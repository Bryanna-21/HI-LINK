import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { getMyCommunityList } from '../storage/communities';
import { useLoad } from '../hooks/useLoad';
import { ThemeColors, useTheme } from '../theme/ThemeProvider';
import { Button, EmptyState, LoadingState } from './ui';

/**
 * Chooses the community a `my_group` post belongs to. Visibility `my_group`
 * is meaningless without one, so the create screens require a pick.
 */
export function CommunityPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (communityId: string) => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { data, loading } = useLoad(getMyCommunityList, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Post to which group?</Text>

          <ScrollView style={{ maxHeight: 360 }}>
            {loading ? (
              <LoadingState />
            ) : (data ?? []).length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="You are not in any community"
                body="Join or create a community to share with a group."
                action={
                  <Button
                    label="Browse communities"
                    onPress={() => {
                      onClose();
                      router.push('/communities');
                    }}
                  />
                }
              />
            ) : (
              (data ?? []).map((community) => (
                <Pressable
                  key={community.id}
                  style={styles.row}
                  onPress={() => onPick(community.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Post to ${community.name}`}
                >
                  <Text style={styles.name}>{community.name}</Text>
                  <Text style={styles.meta}>{community.kind.replace('_', ' ')}</Text>
                </Pressable>
              ))
            )}
          </ScrollView>

          <View style={{ marginTop: 12, alignSelf: 'flex-end' }}>
            <Button label="Cancel" variant="secondary" onPress={onClose} />
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
    title: { color: colors.text, fontSize: 19, fontWeight: '900', marginBottom: 12 },
    row: {
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 8,
    },
    name: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  });
