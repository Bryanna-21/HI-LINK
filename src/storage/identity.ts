import { HiLinkUser } from '../models/user';
import { getLocal, setLocal } from './localStore';

const IDENTITY_KEY = 'identity';

export async function getIdentity(): Promise<HiLinkUser | null> {
  return getLocal<HiLinkUser | null>(IDENTITY_KEY, null);
}

export async function saveIdentity(user: HiLinkUser) {
  await setLocal(IDENTITY_KEY, user);
}

export async function clearIdentity() {
  await setLocal(IDENTITY_KEY, null);
}
