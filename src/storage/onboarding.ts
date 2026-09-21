import { getLocal, setLocal } from './localStore';

const ONBOARDING_COMPLETE_KEY = 'onboarding_complete';

export async function isOnboardingComplete(): Promise<boolean> {
  return getLocal<boolean>(
    ONBOARDING_COMPLETE_KEY,
    false,
  );
}

export async function setOnboardingComplete(
  complete: boolean,
) {
  await setLocal(ONBOARDING_COMPLETE_KEY, complete);
}
