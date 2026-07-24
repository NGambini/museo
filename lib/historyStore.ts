import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  visitedAt: string;
}

const HISTORY_STORAGE_KEY = 'audioguide_history';
const MAX_HISTORY_ITEMS = 10;

function parseStoredHistory(value: string | null): HistoryItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export async function getHistory(): Promise<HistoryItem[]> {
  const stored = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);

  return parseStoredHistory(stored);
}

export async function addHistoryItem(item: HistoryItem): Promise<HistoryItem[]> {
  const history = await getHistory();
  const existingIndex = history.findIndex((existing) => existing.id === item.id);

  let nextItems: HistoryItem[];

  if (existingIndex >= 0) {
    // If the item already exists in history, move the existing entry to the top.
    // Do not add a duplicate. Keep the original entry and preserve the order of
    // the remaining items.
    const existingItem = history[existingIndex];
    nextItems = [
      existingItem,
      ...history.slice(0, existingIndex),
      ...history.slice(existingIndex + 1),
    ];
  } else {
    // If the item is new, prepend it to the history.
    nextItems = [item, ...history];
  }

  const slicedItems = nextItems.slice(0, MAX_HISTORY_ITEMS);
  await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(slicedItems));
  return slicedItems;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
}
