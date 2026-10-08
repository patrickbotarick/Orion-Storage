import { QRCodeSVG } from "qrcode.react";

type QrCodeProps = {
  value: string;
  title: string;
};

/** Drawn from the payload on each render. Nothing is stored in localStorage. */
export function QrCode({ value, title }: QrCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      title={title}
      size={256}
      level="M"
      marginSize={4}
      bgColor="#ffffff"
      fgColor="#111111"
      className="orion-qr"
    />
  );
}
