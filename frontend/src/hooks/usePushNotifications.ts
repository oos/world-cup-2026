import { useCallback, useEffect, useState } from "react";
import {
  getActivePushSubscription,
  getNotificationPermission,
  isPushSupported,
  subscribeToMatchNotifications,
  unsubscribeFromMatchNotifications,
} from "../utils/pushNotifications";
import { useProfilePreferences } from "./useProfilePreferences";

type PushState = {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
  error: string | null;
};

export function usePushNotifications() {
  const { preferences, updatePreferences } = useProfilePreferences();
  const [state, setState] = useState<PushState>({
    supported: isPushSupported(),
    permission: getNotificationPermission(),
    subscribed: false,
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    const subscription = await getActivePushSubscription();
    setState((current) => ({
      ...current,
      permission: getNotificationPermission(),
      subscribed: Boolean(subscription),
    }));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!state.supported || state.loading) return;
    if (!preferences.matchReminders || state.subscribed) return;
    if (state.permission !== "granted") return;

    void (async () => {
      try {
        await subscribeToMatchNotifications();
        await refresh();
      } catch {
        updatePreferences({ matchReminders: false });
      }
    })();
  }, [
    preferences.matchReminders,
    refresh,
    state.loading,
    state.permission,
    state.subscribed,
    state.supported,
    updatePreferences,
  ]);

  const enable = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      await subscribeToMatchNotifications();
      updatePreferences({ matchReminders: true });
      await refresh();
      setState((current) => ({ ...current, loading: false, error: null }));
    } catch (error) {
      updatePreferences({ matchReminders: false });
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not enable match notifications.",
      }));
      throw error;
    }
  }, [refresh, updatePreferences]);

  const disable = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      await unsubscribeFromMatchNotifications();
      updatePreferences({ matchReminders: false });
      await refresh();
      setState((current) => ({ ...current, loading: false, error: null }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not disable match notifications.",
      }));
      throw error;
    }
  }, [refresh, updatePreferences]);

  const toggle = useCallback(async () => {
    if (state.subscribed || preferences.matchReminders) {
      await disable();
    } else {
      await enable();
    }
  }, [disable, enable, preferences.matchReminders, state.subscribed]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        await enable();
      } else {
        await disable();
      }
    },
    [disable, enable],
  );

  return {
    ...state,
    enabled: state.subscribed || preferences.matchReminders,
    enable,
    disable,
    toggle,
    setEnabled,
    refresh,
  };
}
