import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useColors, Radius, Spacing } from '../../src/constants/theme';
import { api } from '../../src/api/client';

// STATUS: UNVERIFIED ENDPOINT — this is a direct, honest port of web's
// src/pages/EditProfile.js, which calls PUT /users/profile with
// { name, bio }. That endpoint does NOT appear in userService.js,
// which is the audited, backend-confirmed service file (its own header
// comment explains it was rewritten after a prior speculative-API
// mismatch — see that file for the full story). /users/profile may or
// may not actually exist on the backend right now.
//
// This screen is built to match web's UX exactly rather than invent a
// different, unverifiable contract of its own — if /users/profile is
// dead, it's dead on both platforms identically, which is genuine
// parity even in failure. Confirm against the real backend routes
// before relying on this in production, and delete this comment once
// verified either way.

export default function EditProfileScreen() {
  const colors = useColors();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { padding: Spacing.lg },
        title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: Spacing.xs },
        subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: Spacing.lg },
        label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: Spacing.xs },
        input: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: 14,
          fontSize: 15,
          color: colors.text,
          marginBottom: Spacing.md,
        },
        bioInput: { minHeight: 100, textAlignVertical: 'top' },
        error: { color: colors.danger, fontSize: 13, marginBottom: Spacing.md },
        success: { color: colors.secondary, fontSize: 13, marginBottom: Spacing.md },
        button: {
          backgroundColor: colors.primary,
          borderRadius: Radius.md,
          paddingVertical: 16,
          alignItems: 'center',
        },
        buttonDisabled: { opacity: 0.6 },
        buttonText: { color: colors.white, fontSize: 16, fontWeight: '700' },
        cancelButton: { alignItems: 'center', marginTop: Spacing.md },
        cancelText: { color: colors.textMuted, fontSize: 14 },
      }),
    [colors]
  );

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');
    setLoading(true);
    try {
      await api.put('/users/profile', { name, bio });
      setSuccessMessage('Profile updated.');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Could not update profile. This endpoint may not exist on the backend yet — see the note at the top of this file.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Profile</Text>
        <Text style={styles.subtitle}>Update your display name and bio.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          editable={!loading}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Bio"
          placeholderTextColor={colors.textMuted}
          value={bio}
          onChangeText={setBio}
          multiline
          editable={!loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Save Profile</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
