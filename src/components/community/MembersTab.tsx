import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

import { getMembers, removeMember, setMemberRole } from '../../storage/communities';
import { getUsers } from '../../storage/users';
import { useLoad } from '../../hooks/useLoad';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Badge, Button, EmptyState, ErrorState, LoadingState } from '../ui';
import type { TabProps } from './types';
import { ReportSheet, ReportTarget } from '../ReportSheet';

export function MembersTab({ community, userId, isAdmin }: TabProps) {
  const { colors } = useTheme();
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const { data, loading, error, reload } = useLoad(async () => {
    const [members, users] = await Promise.all([getMembers(community.id), getUsers()]);

    return members
      .filter((member) => member.state === 'active')
      .map((member) => ({ member, user: users.find((user) => user.id === member.userId) }))
      .sort((a, b) => (a.member.role === 'member' ? 1 : 0) - (b.member.role === 'member' ? 1 : 0));
  }, [community.id]);

  async function act(task: () => Promise<void>) {
    try {
      await task();
      await reload();
    } catch (caught) {
      Alert.alert('Could not update', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if ((data ?? []).length === 0) return <EmptyState icon="people-outline" title="No members yet" />;

  return (
    <View>
      {(data ?? []).map(({ member, user }) => (
        <View
          key={member.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: member.userId } })}
            accessibilityRole="button"
            accessibilityLabel={`Open ${user?.name ?? 'member'} profile`}
          >
            <Avatar uri={user?.avatarUri} name={user?.name} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{user?.name ?? 'Hi-Link student'}</Text>
              {user?.username ? <Text style={{ color: colors.muted, fontSize: 12 }}>@{user.username}</Text> : null}
            </View>
          </Pressable>

          {member.role !== 'member' ? <Badge label={member.role} tone="blue" /> : null}

          {isAdmin && member.role !== 'owner' && member.userId !== userId ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Button
                label={member.role === 'admin' ? 'Demote' : 'Make admin'}
                variant="secondary"
                onPress={() =>
                  act(() => setMemberRole(userId, community.id, member.userId, member.role === 'admin' ? 'member' : 'admin'))
                }
              />
              <Button
                label="Remove"
                variant="danger"
                onPress={() =>
                  Alert.alert('Remove member', `Remove ${user?.name ?? 'this member'} from ${community.name}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', onPress: () => act(() => removeMember(userId, community.id, member.userId)) },
                    {
                      text: 'Remove and ban',
                      style: 'destructive',
                      onPress: () => act(() => removeMember(userId, community.id, member.userId, true)),
                    },
                  ])
                }
              />
            </View>
          ) : member.userId !== userId ? (
            <Pressable
              onPress={() =>
                setReporting({
                  targetType: 'account',
                  targetId: member.userId,
                  targetOwnerId: member.userId,
                  institutionId: community.institutionId,
                  communityId: community.id,
                  label: 'account',
                })
              }
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Report member"
            >
              <Text style={{ color: colors.muted, fontSize: 12 }}>Report</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <ReportSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}
