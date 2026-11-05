import { getLocal, setLocal } from './localStore';

const SESSION_ACTIVE_KEY = 'session_active';

export async function isSessionActive(): Promise<boolean> {
  return getLocal<boolean>(SESSION_ACTIVE_KEY, false);
}

export async function setSessionActive(
  active: boolean,
): Promise<void> {
  await setLocal(SESSION_ACTIVE_KEY, active);
}
