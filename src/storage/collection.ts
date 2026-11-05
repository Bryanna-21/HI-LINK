import { getLocal, setLocal } from './localStore';
import { getScopedLocal, setScopedLocal } from './accountScope';

/**
 * Small typed collection helper over AsyncStorage.
 *
 * Writes are serialised per key. AsyncStorage read-modify-write sequences are
 * not atomic, so two quick taps (e.g. react + comment) could otherwise lose
 * one update. `global` collections model data shared by every account on the
 * device (communities, events...); `scoped` collections hold one account's
 * private data and are unreadable when nobody is signed in.
 */

export interface Entity {
  id: string;
}

const locks = new Map<string, Promise<unknown>>();

export function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous.then(task, task);

  locks.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );

  return run;
}

export interface Collection<T extends Entity> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  upsert(item: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  remove(id: string): Promise<void>;
  removeWhere(predicate: (item: T) => boolean): Promise<void>;
  mutate(change: (items: T[]) => T[]): Promise<void>;
}

function build<T extends Entity>(
  key: string,
  read: () => Promise<T[]>,
  write: (items: T[]) => Promise<unknown>,
): Collection<T> {
  const lockKey = key;

  return {
    list: read,

    async get(id) {
      return (await read()).find((item) => item.id === id) ?? null;
    },

    upsert(item) {
      return withLock(lockKey, async () => {
        const items = await read();
        const exists = items.some((entry) => entry.id === item.id);

        await write(
          exists
            ? items.map((entry) => (entry.id === item.id ? item : entry))
            : [item, ...items],
        );

        return item;
      });
    },

    update(id, patch) {
      return withLock(lockKey, async () => {
        const items = await read();
        let updated: T | null = null;

        const next = items.map((entry) => {
          if (entry.id !== id) {
            return entry;
          }

          updated = { ...entry, ...patch };

          return updated;
        });

        if (updated) {
          await write(next);
        }

        return updated;
      });
    },

    remove(id) {
      return withLock(lockKey, async () => {
        await write((await read()).filter((item) => item.id !== id));
      });
    },

    removeWhere(predicate) {
      return withLock(lockKey, async () => {
        await write((await read()).filter((item) => !predicate(item)));
      });
    },

    mutate(change) {
      return withLock(lockKey, async () => {
        await write(change(await read()));
      });
    },
  };
}

export function createCollection<T extends Entity>(key: string): Collection<T> {
  return build<T>(
    key,
    () => getLocal<T[]>(key, []),
    (items) => setLocal(key, items),
  );
}

export function createScopedCollection<T extends Entity>(key: string): Collection<T> {
  return build<T>(
    `scoped:${key}`,
    () => getScopedLocal<T[]>(key, []),
    (items) => setScopedLocal(key, items),
  );
}
