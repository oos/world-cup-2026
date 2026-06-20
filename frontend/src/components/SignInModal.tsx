import { useEffect } from "react";
import { X } from "lucide-react";
import { AuthForm } from "./AuthForm";

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function SignInModal({ open, onClose, onSuccess }: SignInModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sign-in-overlay" onClick={onClose}>
      <div
        className="sign-in-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sign-in-close"
          aria-label="Close sign in"
          data-track-button="close_sign_in_modal"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div id="sign-in-modal-title" className="visually-hidden">
          Sign in or sign up
        </div>
        <AuthForm
          emailInputId="sign-in-email"
          onSuccess={() => {
            if (onSuccess) {
              onSuccess();
              return;
            }
            onClose();
          }}
        />
      </div>
    </div>
  );
}
