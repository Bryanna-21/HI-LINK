import type { Community, CampusEvent, Institution, Opportunity } from '../models/campus';
import type { HiLinkUser } from '../models/user';
import type { Post } from '../models/post';
import { getKnownUsers } from './users';
import { getCommunities } from './communities';
import { getMyEvents } from './events';
import { getInstitutions } from './institutions';
import { getMyOpportunities } from './opportunities';
import { getVisiblePosts } from './visibility';
import { getIdentity } from './identity';
import { getBlockedUserIds } from './blockedUsers';

/**
 * Discover search across real entities. Everything returned is already
 * filtered by what the signed-in student may see (post visibility, blocked
 * accounts, private communities hide their posts, etc.).
 */

export interface SearchResults {
  people: HiLinkUser[];
  schools: Institution[];
  communities: Community[];
  events: CampusEvent[];
  opportunities: Opportunity[];
  videos: Post[];
  resources: Post[];
  discussions: Post[];
}

export const EMPTY_RESULTS: SearchResults = {
  people: [],
  schools: [],
  communities: [],
  events: [],
  opportunities: [],
  videos: [],
  resources: [],
  discussions: [],
};

const norm = (value: string | undefined): string => (value ?? '').toLowerCase();

const matches = (query: string, ...fields: (string | undefined)[]): boolean =>
  !query || fields.some((field) => norm(field).includes(query));

export async function searchEverything(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim().toLowerCase().replace(/^[#@]/, '');
  const [me, blocked] = await Promise.all([getIdentity(), getBlockedUserIds()]);

  const [users, institutions, communities, events, opportunities, posts] = await Promise.all([
    getKnownUsers(),
    getInstitutions(),
    getCommunities(),
    getMyEvents(),
    getMyOpportunities(),
    getVisiblePosts(),
  ]);

  const postMatches = (post: Post) =>
    matches(query, post.text, post.subject, post.authorName, post.attachment?.name, ...(post.tags ?? []));

  const upcoming = (event: CampusEvent) =>
    !event.cancelled && new Date(event.endsAt ?? event.startsAt).getTime() >= Date.now();

  // Community posts of private communities are already excluded by visibility
  // (`my_group` needs membership).
  return {
    people: users
      .filter((user) => user.id !== me?.id && !blocked.includes(user.id))
      .filter((user) => matches(query, user.name, user.username, user.schoolName, user.form, user.stream, ...(user.interests ?? []), ...(user.subjects ?? []))),
    schools: institutions.filter((item) => matches(query, item.name)),
    communities: communities.filter((item) => matches(query, item.name, item.description, item.kind)),
    events: events.filter(upcoming).filter((item) => matches(query, item.title, item.description, item.location, item.category)),
    opportunities: opportunities.filter((item) => matches(query, item.title, item.organization, item.description, item.category)),
    videos: posts.filter((post) => post.type === 'video' && postMatches(post)),
    resources: posts.filter((post) => (post.type === 'document' || post.type === 'study_resource') && postMatches(post)),
    discussions: posts.filter((post) => post.type === 'question' && postMatches(post)),
  };
}
