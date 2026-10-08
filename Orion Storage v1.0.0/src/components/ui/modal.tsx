import { forwardRef, useRef, type ComponentPropsWithoutRef, type ComponentRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { cn } from "@/components/ui/class-names";

const modalClass =
  "catalog-dialog fixed top-4 right-4 left-4 z-50 mx-auto overflow-y-auto rounded-dialog border border-line bg-surface p-6 shadow-dialog md:top-8 md:max-w-3xl";
export const Modal = forwardRef<
  ComponentRef<typeof Dialog.Content>,
  ComponentPropsWithoutRef<typeof Dialog.Content>
>(function Modal({ className, onOpenAutoFocus, onCloseAutoFocus, ...props }, ref) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Content
      ref={ref}
      className={cn(modalClass, className)}
      {...props}
      onOpenAutoFocus={(event) => {
        opener.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        onOpenAutoFocus?.(event);
      }}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event);
        if (!event.defaultPrevented && opener.current?.isConnected) {
          event.preventDefault();
          opener.current.focus();
        }
      }}
    />
  );
});

// Content primitive only; Root/Action/Cancel and confirmation logic remain explicit.
export const ConfirmDialog = forwardRef<
  ComponentRef<typeof AlertDialog.Content>,
  ComponentPropsWithoutRef<typeof AlertDialog.Content>
>(function ConfirmDialog({ className, ...props }, ref) {
  return (
    <AlertDialog.Content
      ref={ref}
      className={cn(modalClass, "md:max-w-lg", className)}
      {...props}
    />
  );
});

export const ModalOverlay = forwardRef<
  ComponentRef<typeof Dialog.Overlay>,
  ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(function ModalOverlay({ className, ...props }, ref) {
  return (
    <Dialog.Overlay
      ref={ref}
      className={cn("fixed inset-0 z-40 bg-graphite-950/60", className)}
      {...props}
    />
  );
});
