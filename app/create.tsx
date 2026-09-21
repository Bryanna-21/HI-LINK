import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

const C = {
  overlay: 'rgba(0,0,0,0.68)',
  sheet: '#101512',
  sheetRaised: '#151B17',
  border: '#29312C',
  white: '#F8FAF8',
  muted: '#8D9991',
  green: '#19E68C',
  blue: '#2F80FF',
};

const actions = [
  {
    title: 'Photo',
    description: 'Share a photo',
    icon: '📷',
    color: '#123B2A',
  },
  {
    title: 'Video',
    description: 'Share a video',
    icon: '🎥',
    color: '#122747',
  },
  {
    title: 'Document',
    description: 'Post a PDF, notes or exam',
    icon: '📄',
    color: '#123B2A',
  },
  {
    title: 'Text',
    description: 'Write a post',
    icon: '✍️',
    color: '#122747',
  },
  {
    title: 'Question',
    description: 'Ask your community',
    icon: '❓',
    color: '#123B2A',
  },
  {
    title: 'Study Resource',
    description: 'Share something useful',
    icon: '📚',
    color: '#122747',
  },
  {
    title: 'Event',
    description: 'Create a school event',
    icon: '📅',
    color: '#123B2A',
  },
];

export default function CreateScreen() {
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
                  { backgroundColor: action.color },
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: C.overlay,
  },

  sheet: {
    backgroundColor: C.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },

  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: C.muted,
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
    color: C.white,
    fontSize: 24,
    fontWeight: '800',
  },

  subtitle: {
    color: C.muted,
    fontSize: 14,
    marginTop: 4,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.sheetRaised,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  closeText: {
    color: C.white,
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
    backgroundColor: C.sheetRaised,
    borderWidth: 1,
    borderColor: C.border,
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
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },

  actionDescription: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
  },

  cancel: {
    height: 50,
    borderRadius: 15,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },

  cancelPressed: {
    opacity: 0.7,
  },

  cancelText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
