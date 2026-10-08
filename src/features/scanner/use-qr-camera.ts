import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export type CameraStatus = "idle" | "starting" | "live" | "denied" | "missing" | "error";

type QrScanner = {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: { width: number; height: number } },
    onRead: (value: string) => void,
    onError: (errorMessage: string) => void,
  ) => Promise<unknown>;
  stop: () => Promise<void>;
  clear: () => void;
  isScanning: boolean;
};

export function useQrCamera(onPayload: (payload: string) => void) {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const onPayloadRef = useRef(onPayload);
  const scannerRef = useRef<QrScanner | null>(null);
  onPayloadRef.current = onPayload;

  const release = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      /* the stream is already closed */
    }
  }, []);

  const stop = useCallback(async () => {
    await release();
    setMessage(null);
    setStatus("idle");
  }, [release]);

  const start = useCallback(async () => {
    setMessage(null);
    await release();
    flushSync(() => setStatus("starting"));
    let scanner: QrScanner | null = null;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("orion-qr-reader", false);
      scannerRef.current = scanner;
      const config = { fps: 8, qrbox: { width: 220, height: 220 } };
      const onRead = (value: string) => onPayloadRef.current(value);
      try {
        await scanner.start({ facingMode: "environment" }, config, onRead, () => undefined);
      } catch (first) {
        if (permissionDenied(first)) throw first;
        await scanner.start({ facingMode: "user" }, config, onRead, () => undefined);
      }
      setStatus("live");
    } catch (caught) {
      scannerRef.current = null;
      if (scanner) {
        try {
          if (scanner.isScanning) await scanner.stop();
          scanner.clear();
        } catch {
          /* nothing to release */
        }
      }
      if (permissionDenied(caught)) {
        setStatus("denied");
        setMessage("Permissão da câmera negada.");
        return;
      }
      if (cameraMissing(caught)) {
        setStatus("missing");
        setMessage("Nenhuma câmera disponível.");
        return;
      }
      setStatus("error");
      setMessage("Não foi possível iniciar a câmera.");
    }
  }, [release]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { status, message, start, stop };
}

function permissionDenied(caught: unknown): boolean {
  const name = caught instanceof Error ? caught.name : "";
  const message = caught instanceof Error ? caught.message : String(caught ?? "");
  return name === "NotAllowedError" || /notallowed|permission/i.test(message);
}

function cameraMissing(caught: unknown): boolean {
  const name = caught instanceof Error ? caught.name : "";
  const message = caught instanceof Error ? caught.message : String(caught ?? "");
  return (
    name === "NotFoundError" ||
    name === "OverconstrainedError" ||
    /not found|no camera|requested device|no device/i.test(message)
  );
}
