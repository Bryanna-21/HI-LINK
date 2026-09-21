import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@hilink/';

export async function setLocal<T>(key: string, value: T) {
  await AsyncStorage.setItem(
    `${PREFIX}${key}`,
    JSON.stringify(value),
  );
}

export async function getLocal<T>(
  key: string,
  fallback: T,
): Promise<T> {
  const value = await AsyncStorage.getItem(`${PREFIX}${key}`);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function removeLocal(key: string) {
  await AsyncStorage.removeItem(`${PREFIX}${key}`);
}

export async function clearLocalData() {
  const keys = await AsyncStorage.getAllKeys();

  const hiLinkKeys = keys.filter((key) =>
    key.startsWith(PREFIX),
  );

  if (hiLinkKeys.length > 0) {
    await AsyncStorage.multiRemove(hiLinkKeys);
  }
}
