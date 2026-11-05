import { getLocal, setLocal } from './localStore';

export interface ReshareRecord {
  id: string;
  postId: string;
  userId: string;
  resharedPostId: string;
  createdAt: string;
}

const RESHARES_KEY = 'reshares';

export async function getReshares(): Promise<ReshareRecord[]> {
  return getLocal<ReshareRecord[]>(
    RESHARES_KEY,
    [],
  );
}

export async function isPostReshared(
  postId: string,
  userId: string,
): Promise<boolean> {
  const records = await getReshares();

  return records.some(
    (record) =>
      record.postId === postId &&
      record.userId === userId,
  );
}

export async function addReshare(
  record: ReshareRecord,
): Promise<void> {
  const records = await getReshares();

  const alreadyExists = records.some(
    (existing) =>
      existing.postId === record.postId &&
      existing.userId === record.userId,
  );

  if (alreadyExists) {
    return;
  }

  await setLocal(RESHARES_KEY, [
    record,
    ...records,
  ]);
}

export async function getReshareCount(
  postId: string,
): Promise<number> {
  const records = await getReshares();

  return records.filter(
    (record) => record.postId === postId,
  ).length;
}
