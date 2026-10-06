import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { getActiveUserId } from '../src/storage/accountScope';
import { getIdentity } from '../src/storage/identity';
import { getInstitutions, markInstitutionVerified } from '../src/storage/institutions';
import {
  can,
  getGrants,
  grantRole,
  isSystemStaff,
  revokeRole,
} from '../src/storage/roles';
import { getUsers } from '../src/storage/users';
import {
  getPendingVerifications,
  getVerificationStatus,
  requestVerification,
  reviewVerification,
} from '../src/storage/verification';
import { useLoad } from '../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ScreenHeader,
  SectionTitle,
} from '../src/components/ui';

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');

  const { data, loading, error, reload } = useLoad(async () => {
    const userId = await getActiveUserId();
    const me = await getIdentity();
    const [grants, users, institutions, pending, status, staff] = await Promise.all([
      getGrants(),
      getUsers(),
      getInstitutions(),
      userId ? getPendingVerifications(userId) : Promise.resolve([]),
      userId ? getVerificationStatus(userId) : Promise.resolve('unverified' as const),
      isSystemStaff(userId),
    ]);

    const myGrants = grants.filter((grant) => grant.userId === userId);
    const canGrantTeacher = me?.schoolId ? await can(userId, 'role.grant.teacher', { institutionId: me.schoolId }) : false;
    const canModerate = staff || myGrants.some((grant) => grant.role === 'school_admin');

    return { userId, me, grants, users, institutions, pending, status, staff, myGrants, canGrantTeacher, canModerate };
  });

  async function act(task: () => Promise<unknown>, success?: string) {
    try {
      await task();
      await reload();

      if (success) {
        Alert.alert(success);
      }
    } catch (caught) {
      Alert.alert('Could not complete', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  const matches =
    query.trim().length < 2 || !data
      ? []
      : data.users
          .filter(
            (user) =>
              user.id !== data.userId &&
              `${user.name} ${user.username}`.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .slice(0, 5);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Administration" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error ?? 'Could not load.'} onRetry={reload} />
        ) : (
          <>
            <SectionTitle>Your access</SectionTitle>
            <Card>
              {data.myGrants.length === 0 ? (
                <Text style={styles.muted}>You are a student. Administrators can grant you more access.</Text>
              ) : (
                data.myGrants.map((grant) => (
                  <View key={grant.id} style={styles.line}>
                    <Badge label={grant.role.replace('_', ' ')} tone="blue" />
                    <Text style={styles.muted}>
                      {grant.institutionId
                        ? data.institutions.find((item) => item.id === grant.institutionId)?.name ?? grant.institutionId
                        : 'whole system'}
                    </Text>
                  </View>
                ))
              )}
            </Card>

            <SectionTitle>Identity verification</SectionTitle>
            <Card>
              <View style={styles.line}>
                <Text style={styles.text}>Your status</Text>
                <Badge label={data.status} tone={data.status === 'verified' ? 'accent' : 'orange'} />
              </View>
              {data.status === 'unverified' || data.status === 'rejected' ? (
                <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                  <Button
                    label="Request verification"
                    onPress={() =>
                      act(() => requestVerification(data.userId as string, data.me?.schoolId), 'Request sent to your school administrator.')
                    }
                  />
                </View>
              ) : null}
            </Card>

            {data.pending.length > 0 ? (
              <>
                <SectionTitle>Verification requests</SectionTitle>
                {data.pending.map((record) => {
                  const user = data.users.find((item) => item.id === record.userId);

                  return (
                    <Card key={record.id}>
                      <Text style={styles.text}>{user?.name ?? 'Student'}</Text>
                      <Text style={styles.muted}>
                        {user?.schoolName ?? 'Unknown school'}
                        {user?.admissionNumber ? ` · Adm ${user.admissionNumber}` : ''}
                      </Text>
                      <View style={styles.actions}>
                        <Button label="Approve" onPress={() => act(() => reviewVerification(data.userId as string, record.id, true))} />
                        <Button label="Reject" variant="secondary" onPress={() => act(() => reviewVerification(data.userId as string, record.id, false))} />
                      </View>
                    </Card>
                  );
                })}
              </>
            ) : null}

            {data.canGrantTeacher ? (
              <>
                <SectionTitle>Grant teacher access</SectionTitle>
                <Field label="Find a student or teacher" value={query} onChangeText={setQuery} autoCapitalize="none" />
                {matches.map((user) => (
                  <Card key={user.id}>
                    <View style={styles.line}>
                      <Text style={[styles.text, { flex: 1 }]}>{user.name}</Text>
                      <Button
                        label="Make teacher"
                        onPress={() =>
                          act(
                            () => grantRole(data.userId as string, { userId: user.id, role: 'teacher', institutionId: data.me?.schoolId }),
                            `${user.name} is now a teacher.`,
                          )
                        }
                      />
                    </View>
                  </Card>
                ))}
              </>
            ) : null}

            {data.canModerate ? (
              <>
                <SectionTitle>Granted roles</SectionTitle>
                {data.grants.filter((grant) => grant.role !== 'super_admin' || data.staff).length === 0 ? (
                  <EmptyState icon="shield-outline" title="No roles granted" />
                ) : (
                  data.grants
                    .filter((grant) => data.staff || grant.institutionId === data.me?.schoolId)
                    .map((grant) => (
                      <Card key={grant.id}>
                        <View style={styles.line}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.text}>{data.users.find((user) => user.id === grant.userId)?.name ?? grant.userId}</Text>
                            <Text style={styles.muted}>
                              {grant.role.replace('_', ' ')} · by {grant.grantedBy === 'device_owner' || grant.grantedBy === 'institution_founder' ? grant.grantedBy.replace('_', ' ') : 'an administrator'}
                            </Text>
                          </View>
                          <Button
                            label="Revoke"
                            variant="secondary"
                            onPress={() => act(() => revokeRole(data.userId as string, grant.id))}
                          />
                        </View>
                      </Card>
                    ))
                )}

                <View style={{ marginTop: 12 }}>
                  <Button label="Review reports" icon="flag-outline" onPress={() => router.push('/moderation')} />
                </View>
              </>
            ) : null}

            {data.staff ? (
              <>
                <SectionTitle>Institutions</SectionTitle>
                {data.institutions.length === 0 ? (
                  <EmptyState icon="school-outline" title="No institutions registered" />
                ) : (
                  data.institutions.map((institution) => (
                    <Card key={institution.id}>
                      <View style={styles.line}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.text}>{institution.name}</Text>
                          <Text style={styles.muted}>{institution.type}</Text>
                        </View>
                        {institution.verifiedAt ? (
                          <Badge label="Verified" />
                        ) : (
                          <Button
                            label="Verify"
                            onPress={() => act(() => markInstitutionVerified(institution.id, data.userId as string))}
                          />
                        )}
                      </View>
                    </Card>
                  ))
                )}
              </>
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
    line: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    text: { color: colors.text, fontWeight: '800' },
    muted: { color: colors.muted, fontSize: 12 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  });
