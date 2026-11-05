import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import type { CommunityKind, CommunityPrivacy } from '../../src/models/campus';
import { getIdentity } from '../../src/storage/identity';
import { COMMUNITY_KINDS, createCommunity } from '../../src/storage/communities';
import { ThemeColors, useTheme } from '../../src/theme/ThemeProvider';
import { Button, Chip, Field, ScreenHeader, SectionTitle } from '../../src/components/ui';

const PRIVACY: { value: CommunityPrivacy; label: string; hint: string }[] = [
  { value: 'open', label: 'Open', hint: 'Anyone can join immediately.' },
  { value: 'request', label: 'Approval', hint: 'Admins approve each join request.' },
  { value: 'invite_only', label: 'Invite only', hint: 'Admins invite members.' },
];

export default function CreateCommunityScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [kind, setKind] = useState<CommunityKind>('club');
  const [privacy, setPrivacy] = useState<CommunityPrivacy>('open');
  const [linkSchool, setLinkSchool] = useState(true);
  const [busy, setBusy] = useState(false);

  async function save() {
    const user = await getIdentity();

    if (!user) {
      Alert.alert('Sign in required', 'Complete your profile first.');
      return;
    }

    setBusy(true);

    try {
      const community = await createCommunity(user.id, {
        name,
        description,
        guidelines,
        kind,
        privacy,
        institutionId: linkSchool ? user.schoolId : undefined,
      });

      router.replace({ pathname: '/communities/[id]', params: { id: community.id } });
    } catch (error) {
      Alert.alert('Could not create community', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="New community" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Form 3 Physics" maxLength={60} />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What is this community for?"
        />

        <SectionTitle>Type</SectionTitle>
        <View style={styles.wrap}>
          {COMMUNITY_KINDS.map((item) => (
            <Chip key={item.value} label={item.label} selected={kind === item.value} onPress={() => setKind(item.value)} />
          ))}
        </View>

        <SectionTitle>Who can join</SectionTitle>
        <View style={styles.wrap}>
          {PRIVACY.map((item) => (
            <Chip key={item.value} label={item.label} selected={privacy === item.value} onPress={() => setPrivacy(item.value)} />
          ))}
        </View>

        <Field
          label="Community guidelines (optional)"
          value={guidelines}
          onChangeText={setGuidelines}
          multiline
          placeholder="Rules every member should follow"
          hint="Members see these before they join."
        />

        <View style={styles.wrap}>
          <Chip
            label={linkSchool ? 'Linked to my school' : 'Not linked to a school'}
            selected={linkSchool}
            onPress={() => setLinkSchool((value) => !value)}
          />
        </View>

        <Button label="Create community" onPress={save} loading={busy} disabled={name.trim().length < 3} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 80 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  });
