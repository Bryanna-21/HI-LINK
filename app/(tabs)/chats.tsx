import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const C = {
  bg: '#070908',
  card: '#101512',
  border: '#242C27',
  white: '#F8FAF8',
  muted: '#8D9991',
  green: '#19E68C',
};

export default function ChatsScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>Chats</Text>
      <Text style={styles.subtitle}>
        Messages with your people and school communities.
      </Text>

      <View style={styles.empty}>
        <Text style={styles.icon}>◌</Text>
        <Text style={styles.emptyTitle}>No conversations yet</Text>
        <Text style={styles.emptyBody}>
          Your chats will appear here when you connect with people.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 110 },
  title: { color: C.white, fontSize: 28, fontWeight: '900' },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  empty: {
    marginTop: 30,
    padding: 30,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  icon: { color: C.green, fontSize: 42 },
  emptyTitle: {
    color: C.white,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyBody: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 7,
  },
});
