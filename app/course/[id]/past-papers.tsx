import { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { StatusBanner } from '../../../src/components/StatusBanner';
import { useColors, Radius, Spacing } from '../../../src/constants/theme';
import { api } from '../../../src/api/client';
import { downloadFile, getExistingDownload, formatFileSize, DownloadedFileInfo } from '../../../src/utils/fileDownload';

// STATUS: REAL — GET /courses/:courseId/past-papers. Same fix as
// notes.tsx: course/[id].tsx previously linked to a fabricated route
// (`/paper/${id}-paper-1}`), not a real ID. Backend (PastPaper model,
// real fileUrl) was already fully real.
//
// One real difference from Note that a naive copy of notes.tsx would
// have missed: PastPaper optionally has its own markingSchemeUrl,
// a SEPARATE file from the paper itself — checked directly against
// the model rather than assumed to match Notes' shape. Each paper can
// have zero, one, or two independently downloadable files.

interface PastPaper {
  _id: string;
  title: string;
  year?: number;
  fileUrl: string;
  markingSchemeUrl?: string;
}

// One row of UI logic, reused for both the paper itself and its
// optional marking scheme, since both are independent downloadable
// files with identical download/downloaded/downloading behavior.
function DownloadRow({
  label,
  title,
  url,
  colors,
  styles,
  downloadKey,
  downloadingKey,
  downloaded,
  onDownload,
}: {
  label: string;
  title: string;
  url: string;
  colors: ReturnType<typeof useColors>;
  styles: any;
  downloadKey: string;
  downloadingKey: string | null;
  downloaded: Record<string, DownloadedFileInfo>;
  onDownload: (key: string, title: string, url: string) => void;
}) {
  const isDownloaded = !!downloaded[downloadKey];
  const isDownloading = downloadingKey === downloadKey;
  return (
    <View>
      {isDownloaded ? (
        <Text style={styles.meta}>{label} saved · {formatFileSize(downloaded[downloadKey].size)}</Text>
      ) : null}
      <TouchableOpacity
        style={[styles.downloadButton, isDownloaded && styles.downloadedButton]}
        onPress={() => onDownload(downloadKey, title, url)}
        disabled={isDownloading || isDownloaded}
        accessibilityRole="button"
        accessibilityLabel={isDownloaded ? `${label}, downloaded` : `Download ${label}`}
        accessibilityState={{ disabled: isDownloading || isDownloaded, busy: isDownloading }}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={isDownloaded ? styles.downloadedButtonText : styles.downloadButtonText}>
            {isDownloaded ? `✓ ${label}` : `Download ${label}`}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CoursePastPapersScreen() {
  const colors = useColors();
  const { id: courseId } = useLocalSearchParams<{ id: string }>();
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
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
          gap: Spacing.xs,
        },
        cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
        meta: { fontSize: 12, color: colors.textMuted },
        buttonRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
        downloadButton: {
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
      const res = await api.get(`/courses/${courseId}/past-papers`);
      const list: PastPaper[] = res.data?.data ?? [];
      setPapers(list);

      const existingMap: Record<string, DownloadedFileInfo> = {};
      for (const paper of list) {
        const paperExisting = getExistingDownload(paper.title, paper.fileUrl);
        if (paperExisting) existingMap[`${paper._id}-paper`] = paperExisting;
        if (paper.markingSchemeUrl) {
          const schemeExisting = getExistingDownload(`${paper.title} Marking Scheme`, paper.markingSchemeUrl);
          if (schemeExisting) existingMap[`${paper._id}-scheme`] = schemeExisting;
        }
      }
      setDownloaded(existingMap);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message || 'Could not load past papers for this course.');
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = async (key: string, title: string, url: string) => {
    if (downloaded[key]) return;
    setDownloadingKey(key);
    try {
      const info = await downloadFile(title, url);
      setDownloaded((prev) => ({ ...prev, [key]: info }));
    } catch {
      Alert.alert('Download failed', 'Could not save this file. Check your connection and try again.');
    } finally {
      setDownloadingKey(null);
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
      <StatusBanner status="real" note="Past papers and downloads are both live for this course." />

      {loadError ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry">
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={papers}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
          ListEmptyComponent={
            <Text style={styles.emptyText} accessibilityRole="text">
              No past papers uploaded for this course yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.title}
                {item.year ? ` (${item.year})` : ''}
              </Text>
              <View style={styles.buttonRow}>
                <DownloadRow
                  label="Paper"
                  title={item.title}
                  url={item.fileUrl}
                  colors={colors}
                  styles={styles}
                  downloadKey={`${item._id}-paper`}
                  downloadingKey={downloadingKey}
                  downloaded={downloaded}
                  onDownload={handleDownload}
                />
                {item.markingSchemeUrl ? (
                  <DownloadRow
                    label="Marking Scheme"
                    title={`${item.title} Marking Scheme`}
                    url={item.markingSchemeUrl}
                    colors={colors}
                    styles={styles}
                    downloadKey={`${item._id}-scheme`}
                    downloadingKey={downloadingKey}
                    downloaded={downloaded}
                    onDownload={handleDownload}
                  />
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
