import * as SecureStore from 'expo-secure-store';

import { sha256 } from '../utils/sha256';
import { getLocal, removeLocal, setLocal } from './localStore';

/**
 * Optional profile PIN so another person holding the phone cannot switch into
 * a student's account.
 *
 * Only a salted, iterated hash is stored (never the PIN), in the platform
 * secure store when available. Repeated wrong attempts trigger a growing
 * lockout. This protects against casual access on a shared device; it is not
 * a substitute for server-side authentication, which needs a backend.
 */

const ITERATIONS = 4000;
const MAX_FREE_ATTEMPTS = 4;
const secureKey = (userId: string) => `hilink.pin.${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;
const attemptsKey = (userId: string) => `pin_attempts@${userId}`;

interface StoredPin {
  salt: string;
  hash: string;
}

interface AttemptState {
  failures: number;
  lockedUntil?: number;
}

async function secureAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readPin(userId: string): Promise<StoredPin | null> {
  const raw = (await secureAvailable())
    ? await SecureStore.getItemAsync(secureKey(userId))
    : await getLocal<string | null>(secureKey(userId), null);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredPin;
  } catch {
    return null;
  }
}

async function writePin(userId: string, pin: StoredPin | null): Promise<void> {
  const key = secureKey(userId);

  if (await secureAvailable()) {
    if (pin) {
      await SecureStore.setItemAsync(key, JSON.stringify(pin));
    } else {
      await SecureStore.deleteItemAsync(key);
    }

    return;
  }

  if (pin) {
    await setLocal(key, JSON.stringify(pin));
  } else {
    await removeLocal(key);
  }
}

function derive(pin: string, salt: string): string {
  let digest = `${salt}:${pin}`;

  for (let round = 0; round < ITERATIONS; round += 1) {
    digest = sha256(`${salt}:${digest}`);
  }

  return digest;
}

function randomSalt(): string {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('');
}

export async function hasPin(userId: string): Promise<boolean> {
  return (await readPin(userId)) !== null;
}

export const isValidPin = (pin: string): boolean => /^\d{4,8}$/.test(pin);

export async function setPin(userId: string, pin: string): Promise<void> {
  if (!isValidPin(pin)) {
    throw new Error('A PIN must be 4 to 8 digits.');
  }

  const salt = randomSalt();

  await writePin(userId, { salt, hash: derive(pin, salt) });
  await removeLocal(attemptsKey(userId));
}

export async function removePin(userId: string): Promise<void> {
  await writePin(userId, null);
  await removeLocal(attemptsKey(userId));
}

export type PinCheck =
  | { ok: true }
  | { ok: false; reason: 'wrong'; attemptsLeft: number }
  | { ok: false; reason: 'locked'; retryInSeconds: number };

export async function verifyPin(userId: string, pin: string): Promise<PinCheck> {
  const stored = await readPin(userId);

  if (!stored) {
    return { ok: true };
  }

  const state = await getLocal<AttemptState>(attemptsKey(userId), { failures: 0 });

  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return {
      ok: false,
      reason: 'locked',
      retryInSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000),
    };
  }

  if (derive(pin, stored.salt) === stored.hash) {
    await removeLocal(attemptsKey(userId));

    return { ok: true };
  }

  const failures = state.failures + 1;
  const over = failures - MAX_FREE_ATTEMPTS;

  await setLocal<AttemptState>(attemptsKey(userId), {
    failures,
    lockedUntil: over > 0 ? Date.now() + Math.min(15 * 60, 15 * 2 ** (over - 1)) * 1000 : undefined,
  });

  return {
    ok: false,
    reason: 'wrong',
    attemptsLeft: Math.max(0, MAX_FREE_ATTEMPTS - failures),
  };
}
