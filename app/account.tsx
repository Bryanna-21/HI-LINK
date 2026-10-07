import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { hasPin, isValidPin, removePin, setPin, verifyPin } from '../src/storage/accountSecurity';
import { getIdentity, saveIdentity } from '../src/storage/identity';
import { getGrantsFor } from '../src/storage/roles';
import { upsertUser } from '../src/storage/users';
import { getVerificationStatus, requestVerification } from '../src/storage/verification';
import { useLoad } from '../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  ErrorState,
  Field,
  LoadingState,
  ScreenHeader,
  SectionTitle,
} from '../src/components/ui';

export default function AccountScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const user = await getIdentity();

    if (!user) {
      return null;
    }

    const [pin, grants, verification] = await Promise.all([
      hasPin(user.id),
      getGrantsFor(user.id),
      getVerificationStatus(user.id),
    ]);

    return { user, pin, grants, verification };
  });

  async function togglePrivate() {
    if (!data) return;

    const next = { ...data.user, isPrivate: !data.user.isPrivate, updatedAt: new Date().toISOString() };

    await saveIdentity(next);
    await upsertUser(next);
    await reload();
  }

  async function savePin() {
    if (!data) return;

    if (!isValidPin(newPin)) {
      Alert.alert('Choose a PIN', 'A PIN must be 4 to 8 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('PINs do not match', 'Enter the same PIN twice.');
      return;
    }

    setBusy(true);

    try {
      if (data.pin) {
        const check = await verifyPin(data.user.id, currentPin);

        if (!check.ok) {
          Alert.alert(
            check.reason === 'locked' ? 'Too many attempts' : 'Wrong PIN',
            check.reason === 'locked'
              ? `Try again in ${check.retryInSeconds} seconds.`
              : `${check.attemptsLeft} attempts left before a temporary lock.`,
          );
          return;
        }
      }

      await setPin(data.user.id, newPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      await reload();
      Alert.alert('PIN saved', 'You will need it to switch back into this profile.');
    } finally {
      setBusy(false);
    }
  }

  async function clearPin() {
    if (!data) return;

    const check = await verifyPin(data.user.id, currentPin);

    if (!check.ok) {
      Alert.alert(
        check.reason === 'locked' ? 'Too many attempts' : 'Wrong PIN',
        check.reason === 'locked' ? `Try again in ${check.retryInSeconds} seconds.` : 'Enter your current PIN to remove it.',
      );
      return;
    }

    await removePin(data.user.id);
    setCurrentPin('');
    await reload();
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Account" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error ?? 'No signed-in profile.'} onRetry={reload} />
        ) : (
          <>
            <Card>
              <Text style={styles.name}>{data.user.name}</Text>
              <Text style={styles.muted}>@{data.user.username}</Text>
              <Text style={styles.muted}>Hi-Link ID {data.user.hilinkId}</Text>
              {data.user.schoolName ? <Text style={styles.muted}>{data.user.schoolName}</Text> : null}
              <View style={styles.badges}>
                <Badge label={data.verification} tone={data.verification === 'verified' ? 'accent' : 'orange'} />
                {data.grants.map((grant) => (
                  <Badge key={grant.id} label={grant.role.replace('_', ' ')} tone="blue" />
                ))}
              </View>
              {data.verification === 'unverified' || data.verification === 'rejected' ? (
                <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <Button
                    label="Request verification"
                    onPress={async () => {
                      await requestVerification(data.user.id, data.user.schoolId);
                      await reload();
                      Alert.alert('Request sent', 'Your school administrator will review it.');
                    }}
                  />
                </View>
              ) : null}
            </Card>

            <SectionTitle>Privacy</SectionTitle>
            <View style={styles.wrap}>
              <Chip
                label={data.user.isPrivate ? 'Private account: followers need approval' : 'Public account: anyone can follow'}
                selected={Boolean(data.user.isPrivate)}
                onPress={togglePrivate}
              />
            </View>

            <SectionTitle>Profile PIN</SectionTitle>
            <Text style={styles.muted}>
              {data.pin
                ? 'A PIN is required to switch into this profile on this device.'
                : 'Add a PIN so nobody else can switch into your profile if they pick up your phone.'}
            </Text>

            {data.pin ? (
              <Field label="Current PIN" value={currentPin} onChangeText={setCurrentPin} secureTextEntry keyboardType="number-pad" maxLength={8} />
            ) : null}
            <Field label={data.pin ? 'New PIN' : 'PIN (4-8 digits)'} value={newPin} onChangeText={setNewPin} secureTextEntry keyboardType="number-pad" maxLength={8} />
            <Field label="Confirm PIN" value={confirmPin} onChangeText={setConfirmPin} secureTextEntry keyboardType="number-pad" maxLength={8} />

            <View style={styles.actions}>
              <Button label={data.pin ? 'Change PIN' : 'Set PIN'} onPress={savePin} loading={busy} />
              {data.pin ? <Button label="Remove PIN" variant="secondary" onPress={clearPin} /> : null}
            </View>

            <Text style={[styles.muted, { marginTop: 14 }]}>
              The PIN protects switching profiles on this device. It is not an online password; sign-in with a
              server arrives with sync.
            </Text>

            {data.grants.some((grant) => grant.role !== 'teacher') ? (
              <View style={{ marginTop: 20 }}>
                <Button label="Administration" variant="secondary" icon="shield-checkmark-outline" onPress={() => router.push('/admin')} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    pad: { padding: 16, paddingBottom: 90 },
    name: { color: colors.text, fontSize: 20, fontWeight: '900' },
    muted: { color: colors.muted, fontSize: 13, marginTop: 4, lineHeight: 19 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap' },
    actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  });
