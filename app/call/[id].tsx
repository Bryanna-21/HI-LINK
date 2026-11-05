import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  Ionicons,
} from '@expo/vector-icons';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  Call,
} from '../../src/models/call';
import {
  getCall,
  updateCall,
} from '../../src/storage/calls';
import {
  useTheme,
} from '../../src/theme/ThemeProvider';

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
  }>();

  const {
    colors,
  } = useTheme();

  const insets =
    useSafeAreaInsets();

  const [call, setCall] = useState<Call | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCall = useCallback(async () => {
    if (!params.id) {
      setLoading(false);
      return;
    }

    const storedCall = await getCall(params.id);

    setCall(storedCall);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadCall();
  }, [loadCall]);

  const endCall = useCallback(async () => {
    if (!call) {
      router.back();
      return;
    }

    const endedAt = new Date().toISOString();

    const startedAt = call.answeredAt
      ? new Date(call.answeredAt).getTime()
      : new Date(call.createdAt).getTime();

    const durationSeconds = Math.max(
      0,
      Math.floor(
        (new Date(endedAt).getTime() - startedAt) / 1000,
      ),
    );

    const updatedCall: Call = {
      ...call,
      status: 'ended',
      endedAt,
      durationSeconds,
    };

    await updateCall(updatedCall);

    setCall(updatedCall);

    router.back();
  }, [call, router]);

  if (loading) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  if (!call) {
    return (
      <View
        style={[
          styles.center,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.danger}
        />

        <Text
          style={[
            styles.title,
            {
              color: colors.text,
            },
          ]}
        >
          Call not found
        </Text>

        <Pressable
          onPress={() => router.back()}
          style={[
            styles.secondaryButton,
            {
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.secondaryButtonText,
              {
                color: colors.text,
              },
            ]}
          >
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const isVideo = call.type === 'video';

  const otherParticipant =
    call.direction === 'outgoing'
      ? call.recipient
      : call.caller;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={colors.text}
          />
        </Pressable>

        <Text
          style={[
            styles.topTitle,
            {
              color: colors.text,
            },
          ]}
        >
          {isVideo ? 'Video call' : 'Voice call'}
        </Text>

        <View style={styles.topSpacer} />
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: colors.accentSoft,
            },
          ]}
        >
          <Ionicons
            name={isVideo ? 'videocam' : 'call'}
            size={44}
            color={colors.accent}
          />
        </View>

        <Text
          style={[
            styles.name,
            {
              color: colors.text,
            },
          ]}
        >
          {otherParticipant.name}
        </Text>

        <Text
          style={[
            styles.username,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          @{otherParticipant.username}
        </Text>

        <Text
          style={[
            styles.status,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          {call.status === 'ringing'
            ? 'Not connected'
            : call.status === 'ended'
              ? 'Call ended'
              : call.status}
        </Text>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.accent}
          />

          <Text
            style={[
              styles.infoText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Live voice and video calls need a network service
            this version does not have yet. No one is being
            called; this only records the attempt.
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Pressable
          onPress={endCall}
          style={[
            styles.endButton,
            {
              backgroundColor: colors.danger,
            },
          ]}
        >
          <Ionicons
            name="call"
            size={28}
            color="#FFFFFF"
          />
        </Pressable>

        <Text
          style={[
            styles.endLabel,
            {
              color: colors.textSecondary,
            },
          ]}
        >
          End call
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  topBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  topSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  username: {
    fontSize: 15,
    marginTop: 6,
  },
  status: {
    fontSize: 16,
    marginTop: 18,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 32,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: 42,
  },
  endButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [
      {
        rotate: '135deg',
      },
    ],
  },
  endLabel: {
    fontSize: 13,
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 20,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
