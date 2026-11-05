import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';

import type { CommunityPrivacy } from '../../models/campus';
import {
  archiveCommunity,
  getMembers,
  inviteToCommunity,
  resolveJoinRequest,
  updateCommunity,
} from '../../storage/communities';
import { getUsers } from '../../storage/users';
import { useLoad } from '../../hooks/useLoad';
import { useTheme } from '../../theme/ThemeProvider';
import { Avatar, Button, Card, Chip, EmptyState, Field, LoadingState, SectionTitle } from '../ui';
import type { TabProps } from './types';

export function ManageTab({ community, userId, onChanged }: TabProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [guidelines, setGuidelines] = useState(community.guidelines ?? '');
  const [privacy, setPrivacy] = useState<CommunityPrivacy>(community.privacy);
  const [busy, setBusy] = useState(false);
  const [inviteQuery, setInviteQuery] = useState('');

  const requests = useLoad(async () => {
    const [members, users] = await Promise.all([getMembers(community.id), getUsers()]);

    return {
      pending: members
        .filter((member) => member.state === 'pending')
        .map((member) => ({ member, user: users.find((user) => user.id === member.userId) })),
      invitable: users.filter((user) => !members.some((member) => member.userId === user.id)),
    };
  }, [community.id]);

  async function save() {
    setBusy(true);

    try {
      await updateCommunity(userId, community.id, { name, description, guidelines, privacy });
      await onChanged();
      Alert.alert('Saved', 'Community details updated.');
    } catch (caught) {
      Alert.alert('Could not save', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function answer(memberUserId: string, approve: boolean) {
    await resolveJoinRequest(userId, community.id, memberUserId, approve);
    await requests.reload();
    await onChanged();
  }

  const candidates =
    inviteQuery.trim().length < 2
      ? []
      : (requests.data?.invitable ?? [])
          .filter((user) =>
            `${user.name} ${user.username}`.toLowerCase().includes(inviteQuery.trim().toLowerCase()),
          )
          .slice(0, 5);

  return (
    <View>
      <SectionTitle>Join requests</SectionTitle>
      {requests.loading ? (
        <LoadingState />
      ) : (requests.data?.pending ?? []).length === 0 ? (
        <EmptyState icon="person-add-outline" title="No pending requests" />
      ) : (
        (requests.data?.pending ?? []).map(({ member, user }) => (
          <Card key={member.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar uri={user?.avatarUri} name={user?.name} size={38} />
              <Text style={{ flex: 1, color: colors.text, fontWeight: '800' }}>{user?.name ?? 'Hi-Link student'}</Text>
              <Button label="Approve" onPress={() => answer(member.userId, true)} />
              <Button label="Decline" variant="secondary" onPress={() => answer(member.userId, false)} />
            </View>
          </Card>
        ))
      )}

      <SectionTitle>Invite students</SectionTitle>
      <Field
        label="Search by name or username"
        value={inviteQuery}
        onChangeText={setInviteQuery}
        autoCapitalize="none"
      />
      {candidates.map((user) => (
        <Card key={user.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar uri={user.avatarUri} name={user.name} size={36} />
            <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{user.name}</Text>
            <Button
              label="Invite"
              onPress={async () => {
                await inviteToCommunity(userId, community.id, user.id);
                setInviteQuery('');
                await requests.reload();
              }}
            />
          </View>
        </Card>
      ))}

      <SectionTitle>Community details</SectionTitle>
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Description" value={description} onChangeText={setDescription} multiline />
      <Field label="Guidelines" value={guidelines} onChangeText={setGuidelines} multiline hint="Shown to everyone who views the community." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {(['open', 'request', 'invite_only'] as CommunityPrivacy[]).map((item) => (
          <Chip key={item} label={item === 'open' ? 'Open' : item === 'request' ? 'Approval' : 'Invite only'} selected={privacy === item} onPress={() => setPrivacy(item)} />
        ))}
      </View>
      <Button label="Save changes" onPress={save} loading={busy} />

      <SectionTitle>Danger zone</SectionTitle>
      <Button
        label="Archive community"
        variant="danger"
        onPress={() =>
          Alert.alert('Archive community', 'It will disappear from Discover. Members keep their posts.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Archive',
              style: 'destructive',
              onPress: async () => {
                try {
                  await archiveCommunity(userId, community.id);
                  router.replace('/communities');
                } catch (caught) {
                  Alert.alert('Could not archive', caught instanceof Error ? caught.message : 'Try again.');
                }
              },
            },
          ])
        }
      />
    </View>
  );
}
