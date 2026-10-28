import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import type { EmergencyCategory, EmergencyRequest } from '../src/models/campus';
import { getActiveUserId } from '../src/storage/accountScope';
import {
  addEmergencyContact,
  cancelEmergency,
  canRespond,
  EMERGENCY_CATEGORIES,
  EMERGENCY_STATUS_LABELS,
  getEmergenciesForResponder,
  getEmergencyContacts,
  getMyEmergencies,
  isOpen,
  nextResponderStatuses,
  raiseEmergency,
  removeEmergencyContact,
  respondToEmergency,
} from '../src/storage/emergency';
import { getIdentity } from '../src/storage/identity';
import { can } from '../src/storage/roles';
import { getUsers } from '../src/storage/users';
import { useLoad } from '../src/hooks/useLoad';
import { ThemeColors, useTheme } from '../src/theme/ThemeProvider';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ScreenHeader,
  SectionTitle,
} from '../src/components/ui';

const CONTACT_KINDS = ['school', 'infirmary', 'hospital', 'police', 'fire', 'other'] as const;

export default function EmergencyScreen() {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [category, setCategory] = useState<EmergencyCategory>('medical');
  const [description, setDescription] = useState('');
  const [locationText, setLocationText] = useState('');
  const [busy, setBusy] = useState(false);
  const [eta, setEta] = useState<Record<string, string>>({});
  const [contactLabel, setContactLabel] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactKind, setContactKind] = useState<(typeof CONTACT_KINDS)[number]>('school');

  const { data, loading, error, reload } = useLoad(async () => {
    const [userId, me, mine, users] = await Promise.all([
      getActiveUserId(),
      getIdentity(),
      getMyEmergencies(),
      getUsers(),
    ]);

    const [responder, contacts, manageContacts] = await Promise.all([
      canRespond(me?.schoolId),
      getEmergencyContacts(me?.schoolId),
      can(userId, 'emergency.contacts', { institutionId: me?.schoolId }),
    ]);

    const queue = responder ? await getEmergenciesForResponder() : [];

    return { userId, me, mine, users, responder, contacts, manageContacts, queue };
  });

  const openRequest = data?.mine.find(isOpen);

  async function send() {
    const confirmed = await new Promise<boolean>((resolve) =>
      Alert.alert(
        'Send emergency request?',
        'This alerts the Hi-Link responders registered for your school. It does NOT call an ambulance, police or any outside service. If anyone is in danger, call your local emergency number as well.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Send request', style: 'destructive', onPress: () => resolve(true) },
        ],
      ),
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const result = await raiseEmergency({ category, description, locationText });

      setDescription('');
      setLocationText('');
      await reload();

      Alert.alert(
        'Request recorded',
        result.notifiedCount > 0
          ? `${result.notifiedCount} responder${result.notifiedCount === 1 ? '' : 's'} on this device ${result.notifiedCount === 1 ? 'was' : 'were'} alerted in Hi-Link. Nobody outside the app has been contacted. Call your emergency contacts now if you can.`
          : 'No responders are registered for your school in Hi-Link, so nobody has been alerted. Call your emergency contacts or local emergency number now.',
      );
    } catch (caught) {
      Alert.alert('Could not send request', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function act(task: () => Promise<unknown>) {
    try {
      await task();
      await reload();
    } catch (caught) {
      Alert.alert('Could not update', caught instanceof Error ? caught.message : 'Try again.');
    }
  }

  function call(phone: string) {
    void Linking.openURL(`tel:${phone}`);
  }

  function history(request: EmergencyRequest) {
    return request.history.map((entry, index) => (
      <Text key={`${entry.at}-${index}`} style={styles.meta}>
        {new Date(entry.at).toLocaleTimeString()} · {EMERGENCY_STATUS_LABELS[entry.status]}
        {entry.note ? ` — ${entry.note}` : ''}
      </Text>
    ));
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Emergency" />

      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        {loading ? (
          <LoadingState />
        ) : error || !data ? (
          <ErrorState message={error ?? 'Could not load.'} onRetry={reload} />
        ) : (
          <>
            <Card style={{ borderColor: colors.danger }}>
              <Text style={styles.warning}>
                If someone is in immediate danger, call your local emergency number first. Hi-Link does not contact
                emergency services for you.
              </Text>
            </Card>

            {openRequest ? (
              <Card>
                <View style={styles.top}>
                  <Text style={styles.title}>Your open request</Text>
                  <Badge label={EMERGENCY_STATUS_LABELS[openRequest.status]} tone="danger" />
                </View>
                <Text style={styles.meta}>
                  {EMERGENCY_CATEGORIES.find((item) => item.value === openRequest.category)?.label}
                  {openRequest.locationText ? ` · ${openRequest.locationText}` : ''}
                </Text>
                {openRequest.etaMinutes !== undefined ? (
                  <Text style={styles.eta}>Responder reports ETA: {openRequest.etaMinutes} min</Text>
                ) : null}
                {history(openRequest)}
                <View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
                  <Button
                    label="Cancel request"
                    variant="secondary"
                    onPress={() => act(() => cancelEmergency(openRequest.id, 'Cancelled by requester'))}
                  />
                </View>
              </Card>
            ) : (
              <>
                <SectionTitle>What is happening?</SectionTitle>
                <View style={styles.wrap}>
                  {EMERGENCY_CATEGORIES.map((item) => (
                    <Chip key={item.value} label={item.label} selected={category === item.value} onPress={() => setCategory(item.value)} />
                  ))}
                </View>
                <Field label="Where are you? (optional)" value={locationText} onChangeText={setLocationText} placeholder="e.g. Science block, ground floor" hint="Typed by you. Hi-Link does not track your GPS location." />
                <Field label="Details (optional)" value={description} onChangeText={setDescription} multiline />
                <Button label="Send emergency request" variant="danger" icon="warning-outline" onPress={send} loading={busy} />
              </>
            )}

            <SectionTitle>Emergency contacts</SectionTitle>
            {data.contacts.length === 0 ? (
              <EmptyState
                icon="call-outline"
                title="No contacts set up"
                body="Your school administrator can add the infirmary, security and hospital numbers here."
              />
            ) : (
              data.contacts.map((contact) => (
                <Card key={contact.id}>
                  <View style={styles.top}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{contact.label}</Text>
                      <Text style={styles.meta}>
                        {contact.kind} · {contact.phone}
                      </Text>
                    </View>
                    <Button label="Call" icon="call-outline" onPress={() => call(contact.phone)} />
                    {data.manageContacts ? (
                      <Button
                        label="Remove"
                        variant="secondary"
                        onPress={() => act(() => removeEmergencyContact(data.userId as string, contact.id))}
                      />
                    ) : null}
                  </View>
                </Card>
              ))
            )}

            {data.manageContacts && data.me?.schoolId ? (
              <Card>
                <Text style={styles.title}>Add a contact</Text>
                <Field label="Label" value={contactLabel} onChangeText={setContactLabel} placeholder="School infirmary" />
                <Field label="Phone number" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" />
                <View style={styles.wrap}>
                  {CONTACT_KINDS.map((kind) => (
                    <Chip key={kind} label={kind} selected={contactKind === kind} onPress={() => setContactKind(kind)} />
                  ))}
                </View>
                <Button
                  label="Save contact"
                  onPress={() =>
                    act(async () => {
                      await addEmergencyContact(data.userId as string, {
                        institutionId: data.me?.schoolId as string,
                        label: contactLabel,
                        phone: contactPhone,
                        kind: contactKind,
                      });
                      setContactLabel('');
                      setContactPhone('');
                    })
                  }
                  disabled={!contactLabel.trim() || !contactPhone.trim()}
                />
              </Card>
            ) : null}

            {data.responder ? (
              <>
                <SectionTitle>Responder queue</SectionTitle>
                {data.queue.length === 0 ? (
                  <EmptyState icon="shield-checkmark-outline" title="No emergency requests" />
                ) : (
                  data.queue.map((request) => {
                    const requester = data.users.find((user) => user.id === request.requesterId);
                    const next = nextResponderStatuses(request.status);

                    return (
                      <Card key={request.id} style={focus === request.id ? { borderColor: colors.danger } : undefined}>
                        <View style={styles.top}>
                          <Text style={styles.title}>{requester?.name ?? 'Student'}</Text>
                          <Badge
                            label={EMERGENCY_STATUS_LABELS[request.status]}
                            tone={isOpen(request) ? 'danger' : 'accent'}
                          />
                        </View>
                        <Text style={styles.meta}>
                          {EMERGENCY_CATEGORIES.find((item) => item.value === request.category)?.label} ·{' '}
                          {new Date(request.createdAt).toLocaleString()}
                        </Text>
                        {request.locationText ? <Text style={styles.body}>Location (self-reported): {request.locationText}</Text> : null}
                        {request.description ? <Text style={styles.body}>{request.description}</Text> : null}
                        {history(request)}

                        {next.length > 0 ? (
                          <>
                            <Field
                              label="ETA in minutes (optional, you enter it)"
                              value={eta[request.id] ?? ''}
                              onChangeText={(value) => setEta((current) => ({ ...current, [request.id]: value }))}
                              keyboardType="numeric"
                            />
                            <View style={styles.wrap}>
                              {next.map((status) => (
                                <Chip
                                  key={status}
                                  label={EMERGENCY_STATUS_LABELS[status]}
                                  onPress={() =>
                                    act(() =>
                                      respondToEmergency(request.id, status, {
                                        etaMinutes: eta[request.id]?.trim() ? Number(eta[request.id]) : undefined,
                                      }),
                                    )
                                  }
                                />
                              ))}
                            </View>
                          </>
                        ) : null}
                      </Card>
                    );
                  })
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
    warning: { color: colors.text, lineHeight: 20, fontWeight: '600' },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '800' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    body: { color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
    eta: { color: colors.accent, fontWeight: '700', marginTop: 8 },
  });
