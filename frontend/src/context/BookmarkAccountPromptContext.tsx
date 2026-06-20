import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BookmarkAccountPromptModal } from "../components/BookmarkAccountPromptModal";
import { SignInModal } from "../components/SignInModal";
import { useAuth } from "./AuthContext";

const BOOKMARK_GUEST_PROMPT_DISMISSED_KEY = "wc26_bookmark_guest_prompt_dismissed";

type PendingBookmarkAction = () => void | Promise<void>;

type BookmarkAccountPromptContextValue = {
  confirmGuestBookmark: (action: PendingBookmarkAction) => void;
};

const BookmarkAccountPromptContext = createContext<BookmarkAccountPromptContextValue | null>(
  null,
);

function isGuestPromptDismissed() {
  try {
    return localStorage.getItem(BOOKMARK_GUEST_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function BookmarkAccountPromptProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [promptOpen, setPromptOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const pendingActionRef = useRef<PendingBookmarkAction | null>(null);

  const clearPendingAction = useCallback(() => {
    pendingActionRef.current = null;
  }, []);

  const runPendingAction = useCallback(async () => {
    const action = pendingActionRef.current;
    clearPendingAction();
    if (action) await action();
  }, [clearPendingAction]);

  const confirmGuestBookmark = useCallback(
    (action: PendingBookmarkAction) => {
      if (user) {
        void action();
        return;
      }

      if (isGuestPromptDismissed()) {
        void action();
        return;
      }

      pendingActionRef.current = action;
      setPromptOpen(true);
    },
    [user],
  );

  const handleClosePrompt = useCallback(() => {
    setPromptOpen(false);
    clearPendingAction();
  }, [clearPendingAction]);

  const handleContinueWithoutAccount = useCallback(() => {
    try {
      localStorage.setItem(BOOKMARK_GUEST_PROMPT_DISMISSED_KEY, "1");
    } catch {
      // Ignore storage failures and still bookmark locally.
    }
    setPromptOpen(false);
    void runPendingAction();
  }, [runPendingAction]);

  const handleCreateAccount = useCallback(() => {
    setPromptOpen(false);
    setSignInOpen(true);
  }, []);

  const handleSignInClose = useCallback(() => {
    setSignInOpen(false);
    clearPendingAction();
  }, [clearPendingAction]);

  const handleSignInSuccess = useCallback(() => {
    setSignInOpen(false);
    void runPendingAction();
  }, [runPendingAction]);

  return (
    <BookmarkAccountPromptContext.Provider value={{ confirmGuestBookmark }}>
      {children}
      <BookmarkAccountPromptModal
        open={promptOpen}
        onClose={handleClosePrompt}
        onCreateAccount={handleCreateAccount}
        onContinueWithoutAccount={handleContinueWithoutAccount}
      />
      <SignInModal open={signInOpen} onClose={handleSignInClose} onSuccess={handleSignInSuccess} />
    </BookmarkAccountPromptContext.Provider>
  );
}

export function useBookmarkAccountPrompt() {
  const context = useContext(BookmarkAccountPromptContext);
  if (!context) {
    throw new Error("useBookmarkAccountPrompt must be used within BookmarkAccountPromptProvider");
  }
  return context;
}
