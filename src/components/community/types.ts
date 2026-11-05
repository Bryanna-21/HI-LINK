import type { Community } from '../../models/campus';

export interface TabProps {
  community: Community;
  userId: string;
  isMember: boolean;
  isAdmin: boolean;
  onChanged: () => Promise<void>;
}
