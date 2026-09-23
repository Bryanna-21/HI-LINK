import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  BottomTabBar,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ThemeColors,
  useTheme,
} from '../../src/theme/ThemeProvider';

function CustomTabBar(props: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();

  const routes = state.routes.filter(
    (route) => route.name !== 'create',
  );

  const renderTab = (route: (typeof routes)[number]) => {
    const originalIndex = state.routes.findIndex(
      (item) => item.key === route.key,
    );

    const focused = state.index === originalIndex;
    const options = descriptors[route.key]?.options;

    const label =
      typeof options?.title === 'string'
        ? options.title
        : route.name;

    let iconName:
      | 'home-outline'
      | 'compass-outline'
      | 'chatbubbles-outline'
      | 'person-outline' = 'home-outline';

    if (route.name === 'discover') {
      iconName = 'compass-outline';
    } else if (route.name === 'chats') {
      iconName = 'chatbubbles-outline';
    } else if (route.name === 'me') {
      iconName = 'person-outline';
    }

    function onPress() {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
      >
        <Ionicons
          name={iconName}
          size={23}
          color={focused ? colors.accent : colors.muted}
        />

        <Text
          style={[
            styles.label,
            {
              color: focused ? colors.accent : colors.muted,
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const leftRoutes = routes.slice(0, 2);
  const rightRoutes = routes.slice(2, 4);

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.side}>
          {leftRoutes.map(renderTab)}
        </View>

        <Pressable
          onPress={() => router.push('/create')}
          style={styles.createButton}
          accessibilityRole="button"
          accessibilityLabel="Create"
        >
          <View style={styles.createCircle}>
            <Ionicons
              name="add"
              color={colors.background}
              size={30}
            />
          </View>
        </Pressable>

        <View style={styles.side}>
          {rightRoutes.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => (
        <CustomTabBar {...props} />
      )}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
        }}
      />

      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
        }}
      />

      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bar: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  inner: {
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  side: {
    flex: 1,
    flexDirection: 'row',
  },

  tab: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  label: {
    fontSize: 11,
    fontWeight: '600',
  },

  createButton: {
    width: 64,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },

  createCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
