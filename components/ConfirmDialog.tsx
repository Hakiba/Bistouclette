import { useEffect, useRef } from "react";
import { Button, ButtonRow, Dialog, Overlay } from "./ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation d'une action destructrice, focalisée et fermable au clavier. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    confirmRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <Overlay role='presentation' onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <Dialog role='alertdialog' aria-modal='true' aria-labelledby='confirm-title'>
        <h3 id='confirm-title'>{title}</h3>
        <p>{message}</p>
        <ButtonRow>
          <Button ref={confirmRef} type='button' $variant='danger' onClick={onConfirm} disabled={busy}>
            {busy ? "En cours…" : confirmLabel}
          </Button>
          <Button type='button' $variant='secondary' onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
        </ButtonRow>
      </Dialog>
    </Overlay>
  );
}
