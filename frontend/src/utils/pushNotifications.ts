import {
  DEFAULT_MATCH_REMINDER_MINUTES,
  normalizeMatchReminderMinutes,
} from "./matchReminderTimes";

const API_BASE = "/api/v1";

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  timezone?: string;
  reminder_minutes?: number[];
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function fetchVapidPublicKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/push/vapid-public-key`);
  if (!res.ok) {
    throw new Error("Push notifications are not available on this server.");
  }
  const data = (await res.json()) as { publicKey: string };
  return data.publicKey;
}

async function saveSubscription(
  subscription: PushSubscription,
  reminderMinutes: number[] = DEFAULT_MATCH_REMINDER_MINUTES,
): Promise<void> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription.");
  }

  const res = await fetch(`${API_BASE}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
      timezone: getBrowserTimezone(),
      reminder_minutes: normalizeMatchReminderMinutes(reminderMinutes),
    } satisfies PushSubscriptionPayload),
  });

  if (!res.ok) {
    throw new Error("Could not save push subscription.");
  }
}

export async function updatePushReminderMinutes(
  reminderMinutes: number[],
): Promise<void> {
  const subscription = await getActivePushSubscription();
  if (!subscription) return;

  const res = await fetch(`${API_BASE}/push/subscribe`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      reminder_minutes: normalizeMatchReminderMinutes(reminderMinutes),
    }),
  });

  if (!res.ok) {
    throw new Error("Could not update reminder times.");
  }
}

async function removeSubscription(subscription: PushSubscription): Promise<void> {
  await fetch(`${API_BASE}/push/unsubscribe`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
}

export async function subscribeToMatchNotifications(
  reminderMinutes: number[] = DEFAULT_MATCH_REMINDER_MINUTES,
): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscription(existing, reminderMinutes);
    return existing;
  }

  const publicKey = await fetchVapidPublicKey();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });

  await saveSubscription(subscription, reminderMinutes);
  return subscription;
}

export async function unsubscribeFromMatchNotifications(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await removeSubscription(subscription);
  await subscription.unsubscribe();
}

export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}
