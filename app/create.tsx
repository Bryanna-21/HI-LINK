import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  ThemeColors,
  useTheme,
} from '../src/theme/ThemeProvider';

const actions = [
  {
    title: 'Photo',
    description: 'Share a photo',
    icon: '📷',
    tone: 'accent' as const,
  },
  {
    title: 'Video',
    description: 'Share a video',
    icon: '🎥',
    tone: 'blue' as const,
  },
  {
    title: 'Document',
    description: 'Post a PDF, notes or exam',
    icon: '📄',
    tone: 'accent' as const,
  },
  {
    title: 'Text',
    description: 'Write a post',
    icon: '✍️',
    tone: 'blue' as const,
  },
  {
    title: 'Question',
    description: 'Ask your community',
    icon: '❓',
    tone: 'accent' as const,
  },
  {
    title: 'Study Resource',
    description: 'Share something useful',
    icon: '📚',
    tone: 'blue' as const,
  },
  {
    title: 'Event',
    description: 'Create a school event',
    icon: '📅',
    tone: 'accent' as const,
  },
];

export default function CreateScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  function close() {
    if (router.canGoBack()) {
      router.back();
    }
  }

  async function selectAction(title: string) {
    if (title === 'Photo') {
      router.replace('/create-photo');
      return;
    }

    if (title === 'Video') {
      router.replace('/create-video');
      return;
    }

    if (title === 'Text') {
      router.replace('/create-text');
      return;
    }

    console.log(`Hi-Link create action: ${title}`);
  }

  return (
    <View style={styles.overlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={close}
      />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Create</Text>

            <Text style={styles.subtitle}>
              What would you like to share?
            </Text>
          </View>

          <Pressable
            onPress={close}
            style={styles.closeButton}
            hitSlop={10}
          >
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.grid}>
          {actions.map((action) => (
            <Pressable
              key={action.title}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
              ]}
              onPress={() => selectAction(action.title)}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor:
                      action.tone === 'accent'
                        ? colors.accentSoft
                        : colors.blueSoft,
                  },
                ]}
              >
                <Text style={styles.iconText}>
                  {action.icon}
                </Text>
              </View>

              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>
                  {action.title}
                </Text>

                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={close}
          style={({ pressed }) => [
            styles.cancel,
            pressed && styles.cancelPressed,
          ]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.68)',
  },

  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },

  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.muted,
    marginBottom: 18,
    opacity: 0.7,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },

  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  closeText: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '300',
  },

  grid: {
    gap: 10,
  },

  action: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },

  actionPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconText: {
    fontSize: 21,
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  actionDescription: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3,
  },

  cancel: {
    height: 50,
    borderRadius: 15,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  cancelPressed: {
    opacity: 0.7,
  },

  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
