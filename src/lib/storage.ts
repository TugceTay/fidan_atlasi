import type { Entry } from "../types";

const STORAGE_KEY = "fidan.atlasi.entries";
const STORAGE_VERSION = 1;

type StoredPayload = {
  version: number;
  entries: Entry[];
};

const seedEntries: Entry[] = [
  {
    id: "seed-ankara",
    category: "seedling",
    title: "Çınar Filizi",
    description: "Gölgelik bir köşede yeni filizlendi.",
    lng: 32.8597,
    lat: 39.9334,
    createdAt: new Date("2024-03-10T08:30:00.000Z").toISOString(),
  },
  {
    id: "seed-izmir",
    category: "meaningful_tree",
    title: "Anlamlı Zeytin",
    description: "Denize bakan sessiz bir tepede.",
    lng: 27.1428,
    lat: 38.4237,
    createdAt: new Date("2024-02-21T14:12:00.000Z").toISOString(),
  },
  {
    id: "seed-antalya",
    category: "seedling",
    title: "Akdeniz Filizi",
    description: "Yeni can bulmuş küçük bir fidan.",
    lng: 30.7133,
    lat: 36.8969,
    createdAt: new Date("2024-01-02T10:05:00.000Z").toISOString(),
  },
];

const safeParse = (raw: string | null): StoredPayload | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredPayload;
  } catch {
    return null;
  }
};

const persist = (entries: Entry[]) => {
  const payload: StoredPayload = { version: STORAGE_VERSION, entries };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const loadEntries = (): Entry[] => {
  if (typeof localStorage === "undefined") return seedEntries;

  const stored = safeParse(localStorage.getItem(STORAGE_KEY));
  if (!stored || stored.version !== STORAGE_VERSION || !Array.isArray(stored.entries)) {
    persist(seedEntries);
    return seedEntries;
  }

  return stored.entries;
};

export const saveEntry = (entry: Entry) => {
  const entries = loadEntries();
  const nextEntries = [entry, ...entries];
  persist(nextEntries);
  return nextEntries;
};

export const deleteEntry = (id: string) => {
  const entries = loadEntries();
  const nextEntries = entries.filter((entry) => entry.id !== id);
  persist(nextEntries);
  return nextEntries;
};
