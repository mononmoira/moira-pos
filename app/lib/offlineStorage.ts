export type OfflineSnapshot = Record<string, unknown> & {
  updatedAt?: string;
};

const DEFAULT_STORAGE_KEY = "moira-pos-offline-state-v1";

function safeStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadOfflineSnapshot<T = OfflineSnapshot>(
  storageKey = DEFAULT_STORAGE_KEY,
): T | null {
  const storage = safeStorage();

  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(storageKey);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export function saveOfflineSnapshot<T extends OfflineSnapshot>(
  value: T,
  storageKey = DEFAULT_STORAGE_KEY,
) {
  const storage = safeStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineSnapshot(storageKey = DEFAULT_STORAGE_KEY) {
  const storage = safeStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

export function getOnlineStatus() {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine;
}
