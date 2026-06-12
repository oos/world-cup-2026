import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type SavedItemRecord } from "../api/client";
import { useAuth } from "../context/AuthContext";

const SAVED_ITEMS_KEY = "wc26_saved_items";
const SAVED_ITEMS_UPDATED_EVENT = "wc26-saved-items-updated";

export type SavedItemType = "team" | "player";

export type SavedItemSnapshot = {
  name: string;
  fifaCode?: string;
  teamName?: string | null;
  teamFifaCode?: string | null;
  position?: string | null;
};

export type SavedItem = {
  itemType: SavedItemType;
  itemId: number;
  savedAt?: string | null;
} & SavedItemSnapshot;

function savedItemKey(itemType: SavedItemType, itemId: number) {
  return `${itemType}:${itemId}`;
}

function recordToSavedItem(record: SavedItemRecord): SavedItem {
  return {
    itemType: record.item_type,
    itemId: record.item_id,
    savedAt: record.saved_at,
    name: record.name,
    fifaCode: record.fifa_code,
    teamName: record.team_name,
    teamFifaCode: record.team_fifa_code,
    position: record.position,
  };
}

function readGuestSavedItems(): SavedItem[] {
  try {
    const stored = localStorage.getItem(SAVED_ITEMS_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as SavedItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        (item.itemType === "team" || item.itemType === "player") &&
        typeof item.itemId === "number" &&
        item.itemId > 0 &&
        typeof item.name === "string" &&
        item.name.trim(),
    );
  } catch {
    return [];
  }
}

function notifySavedItemsUpdated() {
  window.dispatchEvent(new CustomEvent(SAVED_ITEMS_UPDATED_EVENT));
}

function writeGuestSavedItems(items: SavedItem[]) {
  localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
  notifySavedItemsUpdated();
}

export function readStoredGuestSavedItems() {
  return readGuestSavedItems();
}

export async function mergeGuestSavedItems() {
  const guestItems = readGuestSavedItems();
  if (guestItems.length === 0) return;

  try {
    const remote = await api.getSavedItems();
    const remoteKeys = new Set(
      remote.items.map((item) => savedItemKey(item.item_type, item.item_id)),
    );

    for (const item of guestItems) {
      const key = savedItemKey(item.itemType, item.itemId);
      if (remoteKeys.has(key)) continue;
      await api.addSavedItem({ item_type: item.itemType, item_id: item.itemId });
    }

    localStorage.removeItem(SAVED_ITEMS_KEY);
    notifySavedItemsUpdated();
  } catch {
    // Keep guest items locally if sync fails.
  }
}

export function useSavedItems() {
  const { user } = useAuth();
  const [guestItems, setGuestItems] = useState<SavedItem[]>(readGuestSavedItems);
  const [remoteItems, setRemoteItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshRemoteItems = useCallback(async () => {
    if (!user) {
      setRemoteItems([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.getSavedItems();
      setRemoteItems(response.items.map(recordToSavedItem));
    } catch {
      setRemoteItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const syncSavedItems = () => {
      setGuestItems(readGuestSavedItems());
      if (user) {
        void refreshRemoteItems();
      }
    };
    window.addEventListener(SAVED_ITEMS_UPDATED_EVENT, syncSavedItems);
    return () => window.removeEventListener(SAVED_ITEMS_UPDATED_EVENT, syncSavedItems);
  }, [user, refreshRemoteItems]);

  useEffect(() => {
    void refreshRemoteItems();
  }, [refreshRemoteItems]);

  const items = user ? remoteItems : guestItems;

  const savedKeys = useMemo(
    () => new Set(items.map((item) => savedItemKey(item.itemType, item.itemId))),
    [items],
  );

  const isSaved = useCallback(
    (itemType: SavedItemType, itemId: number) => savedKeys.has(savedItemKey(itemType, itemId)),
    [savedKeys],
  );

  const addSaved = useCallback(
    async (itemType: SavedItemType, itemId: number, snapshot: SavedItemSnapshot) => {
      if (user) {
        const record = await api.addSavedItem({ item_type: itemType, item_id: itemId });
        const nextItem = recordToSavedItem(record);
        setRemoteItems((current) => {
          const key = savedItemKey(itemType, itemId);
          const filtered = current.filter(
            (item) => savedItemKey(item.itemType, item.itemId) !== key,
          );
          return [nextItem, ...filtered];
        });
        notifySavedItemsUpdated();
        return;
      }

      const nextItem: SavedItem = {
        itemType,
        itemId,
        savedAt: new Date().toISOString(),
        ...snapshot,
      };
      setGuestItems((current) => {
        const key = savedItemKey(itemType, itemId);
        const filtered = current.filter(
          (item) => savedItemKey(item.itemType, item.itemId) !== key,
        );
        const next = [nextItem, ...filtered];
        writeGuestSavedItems(next);
        return next;
      });
    },
    [user],
  );

  const removeSaved = useCallback(
    async (itemType: SavedItemType, itemId: number) => {
      if (user) {
        await api.removeSavedItem(itemType, itemId);
        setRemoteItems((current) =>
          current.filter(
            (item) =>
              !(item.itemType === itemType && item.itemId === itemId),
          ),
        );
        notifySavedItemsUpdated();
        return;
      }

      setGuestItems((current) => {
        const next = current.filter(
          (item) => !(item.itemType === itemType && item.itemId === itemId),
        );
        writeGuestSavedItems(next);
        return next;
      });
    },
    [user],
  );

  const toggleSaved = useCallback(
    async (itemType: SavedItemType, itemId: number, snapshot: SavedItemSnapshot) => {
      if (isSaved(itemType, itemId)) {
        await removeSaved(itemType, itemId);
        return;
      }
      await addSaved(itemType, itemId, snapshot);
    },
    [addSaved, isSaved, removeSaved],
  );

  const teams = useMemo(
    () => items.filter((item) => item.itemType === "team"),
    [items],
  );
  const players = useMemo(
    () => items.filter((item) => item.itemType === "player"),
    [items],
  );

  return {
    items,
    teams,
    players,
    loading,
    isSaved,
    addSaved,
    removeSaved,
    toggleSaved,
    refreshRemoteItems,
  };
}
