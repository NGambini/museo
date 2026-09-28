import AsyncStorage from '@react-native-async-storage/async-storage';
import { addHistoryItem, getHistory, type HistoryItem } from '../historyStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('historyStore', () => {
  const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const historyStorageKey = 'audioguide_history';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves an existing history item to the top instead of adding a duplicate', async () => {
    const existingItem: HistoryItem = {
      id: 'place-1',
      title: 'Musée A',
      subtitle: 'Visité: Musée A',
      image: 'https://example.com/musee-a.jpg',
      visitedAt: '2026-07-20T10:00:00.000Z',
    };

    const olderItem: HistoryItem = {
      id: 'place-2',
      title: 'Musée B',
      subtitle: 'Visité: Musée B',
      image: 'https://example.com/musee-b.jpg',
      visitedAt: '2026-07-19T09:00:00.000Z',
    };

    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([olderItem, existingItem]));

    const result = await addHistoryItem({
      id: 'place-1',
      title: 'Musée A mise à jour',
      subtitle: 'Visité: Musée A mise à jour',
      image: 'https://example.com/musee-a-updated.jpg',
      visitedAt: '2026-07-21T11:00:00.000Z',
    });

    expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith(historyStorageKey);
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      historyStorageKey,
      JSON.stringify([existingItem, olderItem])
    );
    expect(result).toEqual([existingItem, olderItem]);
    expect(result).toHaveLength(2);
  });

  it('adds a new history item when it is not already present', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify([]));

    const newItem: HistoryItem = {
      id: 'place-3',
      title: 'Musée C',
      subtitle: 'Visité: Musée C',
      image: 'https://example.com/musee-c.jpg',
      visitedAt: '2026-07-22T12:00:00.000Z',
    };

    const result = await addHistoryItem(newItem);

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      historyStorageKey,
      JSON.stringify([newItem])
    );
    expect(result).toEqual([newItem]);
  });

  it('returns an empty array when stored history is invalid JSON', async () => {
    mockedAsyncStorage.getItem.mockResolvedValue('not-json');
    const history = await getHistory();
    expect(history).toEqual([]);
  });
});
