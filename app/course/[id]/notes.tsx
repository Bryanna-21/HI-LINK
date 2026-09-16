import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBanner } from '../../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../../src/constants/theme';
import { api } from '../../../src/api/client';
import { downloadFile, getExistingDownload, formatFileSize, DownloadedFileInfo } from '../../../src/utils/fileDownload';

// STATUS: REAL — GET /courses/:courseId/notes. This is new tonight and
// replaces course/[id].tsx's previous link, which pointed at a
// fabricated route (`/notes/${id}-note-1`) that was never a real ID —
// just a placeholder string. The backend for this was already fully
// real (Note model, real fileUrl via the same uploadDocument
// middleware used for resumes) — mobile simply had no working screen
// pointed at it. Upload is staff-only on the backend; this screen is
// read + download only, matching that.
//
// Download saves to this app's own private storage, not the device's
// shared Downloads folder — see src/utils/fileDownload.ts's header
// comment for why that scope was chosen. A new native dependency
// (expo-file-system) as of tonight — needs a fresh EAS build.

interface Note {
  _id: string;
  title: string;
  fileUrl: string;
  uploadedAt?: string;
}

export default function CourseNotesScreen() {
  const colors = useColors();
  const { id: courseId } = useLocalSearchParams<{ id: string }>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<Record<string, DownloadedFileInfo>>({});

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
        emptyText: { textAlign: 'center', color: colors.textMuted, marginTop: Spacing.xl, paddingHorizontal: Spacing.lg },
        retryButton: {
          marginTop: Spacing.sm,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          backgroundColor: colors.primary,
          borderRadius: Radius.md,
        },
        retryText: { color: colors.white, fontWeight: '600' },
        card: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: Radius.lg,
          padding: Spacing.md,
          gap: 4,
        },
        cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
        meta: { fontSize: 12, color: colors.textMuted },
        downloadButton: {
          marginTop: Spacing.xs,
          alignSelf: 'flex-start',
          paddingVertical: 8,
          paddingHorizontal: Spacing.md,
          borderRadius: Radius.md,
          backgroundColor: colors.primary,
        },
        downloadedButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.secondary },
        downloadButtonText: { color: colors.white, fontWeight: '700', fontSize: 13 },
        downloadedButtonText: { color: colors.secondary, fontWeight: '700', fontSize: 13 },
      }),
    [colors]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await api.get(`/courses/${courseId}/notes`);
      const list: Note[] = res.data?.data ?? [];
      setNotes(list);

      const existingMap: Record<string, DownloadedFileInfo> = {};
      for (const note of list) {
        const existing = getExistingDownload(note.title, note.fileUrl);
        if (existing) existingMap[note._id] = existing;
      }
      setDownloaded(existingMap);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Could not load notes for this course.');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (note: Note) => {
    if (downloaded[note._id]) return;
    setDownloadingId(note._id);
    try {
      const info = await downloadFile(note.title, note.fileUrl);
      setDownloaded((prev) => ({ ...prev, [note._id]: info }));
    } catch (err: any) {
      Alert.alert('Download failed', 'Could not save this file. Check your connection and try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerFill]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBanner status="real" note="Notes and downloads are both live for this course." />

      {loadError ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
          ListEmptyComponent={
            <Text style={styles.emptyText} accessibilityRole="text">
              No notes uploaded for this course yet.
            </Text>
          }
          renderItem={({ item }) => {
            const isDownloaded = !!downloaded[item._id];
            const isDownloading = downloadingId === item._id;
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {isDownloaded ? (
                  <Text style={styles.meta}>Saved · {formatFileSize(downloaded[item._id].size)}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.downloadButton, isDownloaded && styles.downloadedButton]}
                  onPress={() => handleDownload(item)}
                  disabled={isDownloading || isDownloaded}
                  accessibilityRole="button"
                  accessibilityLabel={isDownloaded ? `${item.title}, downloaded` : `Download ${item.title}`}
                  accessibilityState={{ disabled: isDownloading || isDownloaded, busy: isDownloading }}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={isDownloaded ? styles.downloadedButtonText : styles.downloadButtonText}>
                      {isDownloaded ? '✓ Downloaded' : 'Download'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
