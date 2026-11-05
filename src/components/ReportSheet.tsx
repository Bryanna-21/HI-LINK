import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { ReportTargetType } from '../models/campus';
import type { ReportReason } from '../models/campus';
import { getActiveUserId } from '../storage/accountScope';
import { REPORT_REASONS, submitReport } from '../storage/moderation';
import { ThemeColors, useTheme } from '../theme/ThemeProvider';
import { Button, Chip, Field } from './ui';

export interface ReportTarget {
  targetType: ReportTargetType;
  targetId: string;
  targetOwnerId?: string;
  institutionId?: string;
  communityId?: string;
  label: string;
}

/** One report dialog for posts, comments, accounts, communities and media. */
export function ReportSheet({
  target,
  onClose,
}: {
  target: ReportTarget | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!target || !reason) {
      return;
    }

    const reporterId = await getActiveUserId();

    if (!reporterId) {
      Alert.alert('Sign in required', 'Sign in to send a report.');
      return;
    }

    setBusy(true);

    try {
      const { duplicate } = await submitReport(reporterId, {
        targetType: target.targetType,
        targetId: target.targetId,
        targetOwnerId: target.targetOwnerId,
        institutionId: target.institutionId,
        communityId: target.communityId,
        reason,
        description,
      });

      setReason(null);
      setDescription('');
      onClose();
      Alert.alert(
        duplicate ? 'Already reported' : 'Report sent',
        duplicate
          ? 'You have already reported this. A moderator will review it.'
          : 'Thank you. A moderator for this space will review your report.',
      );
    } catch (error) {
      Alert.alert('Could not send report', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={target !== null} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report {target?.label}</Text>
          <Text style={styles.sub}>Why are you reporting this?</Text>

          <ScrollView style={{ maxHeight: 360 }} keyboardShouldPersistTaps="handled">
            <View style={styles.chips}>
              {REPORT_REASONS.map((item) => (
                <Chip
                  key={item.value}
                  label={item.label}
                  selected={reason === item.value}
                  onPress={() => setReason(item.value)}
                />
              ))}
            </View>

            <Field
              label="Details (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholder="Tell the moderators what happened"
            />
          </ScrollView>

          <View style={styles.row}>
            <Button label="Cancel" variant="secondary" onPress={onClose} />
            <Button label="Send report" onPress={send} disabled={!reason} loading={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: { color: colors.text, fontSize: 19, fontWeight: '900' },
    sub: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 12 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
    row: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 10 },
  });
