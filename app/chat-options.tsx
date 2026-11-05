import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

export default function ChatOptionsScreen() {
  const { conversationId } = useLocalSearchParams<{
    conversationId?: string;
  }>();

  const options = [
    {
      icon: 'search-outline' as const,
      label: 'Search in conversation',
    },
    {
      icon: 'images-outline' as const,
      label: 'Media, links and files',
    },
    {
      icon: 'notifications-outline' as const,
      label: 'Notifications',
    },
    {
      icon: 'lock-closed-outline' as const,
      label: 'Privacy and security',
    },
    {
      icon: 'trash-outline' as const,
      label: 'Delete conversation',
      danger: true,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#111" />
        </Pressable>

        <Text style={styles.title}>Chat options</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => (
          <Pressable
            key={option.label}
            onPress={() => {
              // Individual actions will be connected here.
              console.log(
                `[HI-LINK] Chat option selected: ${option.label}`,
                conversationId,
              );
            }}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.optionPressed,
            ]}
          >
            <View style={styles.iconBox}>
              <Ionicons
                name={option.icon}
                size={22}
                color={option.danger ? '#D92D20' : '#111'}
              />
            </View>

            <Text
              style={[
                styles.optionText,
                option.danger && styles.dangerText,
              ]}
            >
              {option.label}
            </Text>

            <Ionicons
              name="chevron-forward"
              size={20}
              color={option.danger ? '#D92D20' : '#888'}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    paddingHorizontal: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginLeft: 4,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingVertical: 8,
  },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  optionPressed: {
    backgroundColor: '#f2f2f2',
  },
  iconBox: {
    width: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  dangerText: {
    color: '#D92D20',
  },
});
