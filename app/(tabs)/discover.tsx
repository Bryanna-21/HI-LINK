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
  blue: '#2F80FF',
};

export default function DiscoverScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Discover</Text>
      <Text style={styles.subtitle}>
        Find people, schools, clubs and things happening around you.
      </Text>

      <View style={styles.search}>
        <Text style={styles.searchText}>Search Hi-Link</Text>
      </View>

      <Text style={styles.section}>Explore</Text>

      {[
        ['Schools', 'Discover school communities', 'school-outline'],
        ['Clubs', 'Find clubs and activities', 'people-outline'],
        ['Sports', 'Follow teams and sports', 'football-outline'],
        ['Study', 'Find notes and resources', 'book-outline'],
      ].map(([title, description], index) => (
        <View style={styles.card} key={title}>
          <View
            style={[
              styles.icon,
              index % 2 === 0
                ? styles.greenIcon
                : styles.blueIcon,
            ]}
          >
            <Text style={styles.iconText}>
              {index === 0 ? 'S' : index === 1 ? 'C' : index === 2 ? '⚽' : '📚'}
            </Text>
          </View>

          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardBody}>{description}</Text>
          </View>

          <Text style={styles.arrow}>›</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  title: {
    color: C.white,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  search: {
    height: 50,
    borderRadius: 15,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 22,
  },
  searchText: {
    color: C.muted,
    fontSize: 14,
  },
  section: {
    color: C.white,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 28,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 10,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greenIcon: {
    backgroundColor: '#123B2A',
  },
  blueIcon: {
    backgroundColor: '#122747',
  },
  iconText: {
    color: C.white,
    fontSize: 18,
    fontWeight: '900',
  },
  cardText: {
    flex: 1,
    marginLeft: 13,
  },
  cardTitle: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
  },
  cardBody: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },
  arrow: {
    color: C.muted,
    fontSize: 28,
    marginLeft: 8,
  },
});
