import { createCollection } from './collection';
import { getActiveUserId } from './accountScope';
import { generateId, nowIso } from '../utils/ids';

export type PortfolioKind = 'project' | 'achievement' | 'certificate' | 'activity';

export interface PortfolioItem {
  id: string;
  ownerId: string;
  kind: PortfolioKind;
  title: string;
  description?: string;
  /** Free-form date label such as "March 2026". */
  dateLabel?: string;
  url?: string;
  createdAt: string;
}

const items = createCollection<PortfolioItem>('portfolio');

export const PORTFOLIO_KINDS: { value: PortfolioKind; label: string; plural: string }[] = [
  { value: 'project', label: 'Project', plural: 'Projects' },
  { value: 'achievement', label: 'Achievement', plural: 'Achievements' },
  { value: 'certificate', label: 'Certificate', plural: 'Certificates' },
  { value: 'activity', label: 'Activity', plural: 'Activities' },
];

export async function getPortfolio(ownerId: string): Promise<PortfolioItem[]> {
  return (await items.list())
    .filter((item) => item.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addPortfolioItem(
  input: Omit<PortfolioItem, 'id' | 'ownerId' | 'createdAt'>,
): Promise<PortfolioItem> {
  const ownerId = await getActiveUserId();

  if (!ownerId) {
    throw new Error('Sign in to edit your portfolio.');
  }

  if (!input.title.trim()) {
    throw new Error('Give this item a title.');
  }

  if (input.url && !/^https?:\/\//i.test(input.url.trim())) {
    throw new Error('Links must start with http:// or https://');
  }

  return items.upsert({
    ...input,
    title: input.title.trim(),
    url: input.url?.trim() || undefined,
    id: generateId('portfolio'),
    ownerId,
    createdAt: nowIso(),
  });
}

export async function removePortfolioItem(itemId: string): Promise<void> {
  const ownerId = await getActiveUserId();
  const item = await items.get(itemId);

  if (item && item.ownerId === ownerId) {
    await items.remove(itemId);
  }
}
