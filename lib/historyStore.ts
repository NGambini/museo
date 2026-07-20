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
  const nextItems = [item, ...history.filter((existing) => existing.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
  await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextItems));
  return nextItems;
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
}
