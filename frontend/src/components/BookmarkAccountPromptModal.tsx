import { Bookmark, X } from "lucide-react";
import { useEffect } from "react";

type BookmarkAccountPromptModalProps = {
  open: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onContinueWithoutAccount: () => void;
};

export function BookmarkAccountPromptModal({
  open,
  onClose,
  onCreateAccount,
  onContinueWithoutAccount,
}: BookmarkAccountPromptModalProps) {
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
        className="sign-in-modal bookmark-account-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookmark-account-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="sign-in-close"
          aria-label="Close"
          data-track-button="close_bookmark_account_prompt"
          onClick={onClose}
        >
          <X size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>

        <div className="sign-in-header">
          <span className="sign-in-icon" aria-hidden="true">
            <Bookmark size={22} strokeWidth={2} />
          </span>
          <h2 id="bookmark-account-prompt-title">Create an account to keep your bookmarks</h2>
          <p>
            The best way to make sure your bookmarks are not lost and to get notifications is to
            create an account. Without one, we cannot guarantee your data will not be lost.
          </p>
        </div>

        <div className="bookmark-account-prompt-actions">
          <button
            type="button"
            className="btn btn-primary btn-block"
            data-track-button="bookmark_prompt_create_account"
            onClick={onCreateAccount}
          >
            Create account
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            data-track-button="bookmark_prompt_continue_guest"
            onClick={onContinueWithoutAccount}
          >
            Continue without account
          </button>
        </div>
      </div>
    </div>
  );
}
