import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/theme/ThemeProvider';
import {
  deleteAcademicAssessment,
  deleteAcademicCompetency,
  deleteAcademicResource,
  deleteAcademicSubject,
  deleteAcademicValue,
  deleteLearningOutcome,
  getAcademicStore,
  upsertAcademicAssessment,
  upsertAcademicCompetency,
  upsertAcademicResource,
  upsertAcademicSubject,
  upsertAcademicValue,
  upsertLearningOutcome,
} from '../src/storage/academic';
import type {
  AcademicAssessment,
  AcademicCompetency,
  AcademicRecordStatus,
  AcademicResource,
  AcademicResourceType,
  AcademicStore,
  AcademicSubject,
  AcademicStage,
  AcademicValue,
  LearningOutcome,
} from '../src/models/academic';

type Tab = 'overview' | 'subjects' | 'cbc' | 'resources' | 'assessments';
type ModalKind = 'subject' | 'competency' | 'value' | 'outcome' | 'resource' | 'assessment' | null;

const resourceTypes: AcademicResourceType[] = [
  'note',
  'assignment',
  'project',
  'cat',
  'exam',
  'past_paper',
  'marking_scheme',
  'study_resource',
];

const assessmentTypes: AcademicAssessment['type'][] = ['cat', 'exam', 'assignment', 'project', 'other'];

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const stamp = () => new Date().toISOString();
const label = (value: string) => value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AcademicsScreen() {
  const { colors } = useTheme();
  const [store, setStore] = useState<AcademicStore | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>('overview');
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [editing, setEditing] = useState<any>(null);

  const load = useCallback(async () => setStore(await getAcademicStore()), []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openCreate = (kind: Exclude<ModalKind, null>) => {
    setEditing(null);
    setModalKind(kind);
  };

  const openEdit = (kind: Exclude<ModalKind, null>, item: any) => {
    setEditing(item);
    setModalKind(kind);
  };

  const closeModal = () => {
    setModalKind(null);
    setEditing(null);
  };

  const confirmDelete = (kind: Exclude<ModalKind, null>, id: string, name: string) => {
    Alert.alert('Delete item?', `Delete “${name}” from your local academic data?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (kind === 'subject') await deleteAcademicSubject(id);
          if (kind === 'competency') await deleteAcademicCompetency(id);
          if (kind === 'value') await deleteAcademicValue(id);
          if (kind === 'outcome') await deleteLearningOutcome(id);
          if (kind === 'resource') await deleteAcademicResource(id);
          if (kind === 'assessment') await deleteAcademicAssessment(id);
          await load();
        },
      },
    ]);
  };

  const settings = store?.settings;
  const totalItems = useMemo(() => {
    if (!store) return 0;
    return store.subjects.length + store.competencies.length + store.values.length + store.learningOutcomes.length + store.resources.length + store.assessments.length;
  }, [store]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>HI-LINK ACADEMICS</Text>
            <Text style={[styles.title, { color: colors.text }]}>Learn. Build. Grow.</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Your local CBC/CBE-ready study space.</Text>
          </View>
          <Ionicons name="school-outline" size={34} color={colors.accent} />
        </View>

        <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contextCopy}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Current learning context</Text>
            <Text style={[styles.contextText, { color: colors.muted }]}>
              {settings?.schoolName || 'School not set'}
              {settings?.currentForm ? ` • ${settings.currentForm}` : ''}
              {settings?.currentStream ? ` • ${settings.currentStream}` : ''}
            </Text>
          </View>
          <View style={[styles.countPill, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.countPillText, { color: colors.accentDark }]}>{totalItems}</Text>
            <Text style={[styles.countPillLabel, { color: colors.accentDark }]}>items</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          <TabButton title="Overview" active={tab === 'overview'} onPress={() => setTab('overview')} colors={colors} />
          <TabButton title="Subjects" active={tab === 'subjects'} onPress={() => setTab('subjects')} colors={colors} />
          <TabButton title="CBC / CBE" active={tab === 'cbc'} onPress={() => setTab('cbc')} colors={colors} />
          <TabButton title="Resources" active={tab === 'resources'} onPress={() => setTab('resources')} colors={colors} />
          <TabButton title="Assessments" active={tab === 'assessments'} onPress={() => setTab('assessments')} colors={colors} />
        </ScrollView>

        {tab === 'overview' ? (
          <Overview store={store} colors={colors} onTab={setTab} />
        ) : null}

        {tab === 'subjects' ? (
          <SubjectsPanel store={store} colors={colors} onAdd={() => openCreate('subject')} onEdit={(item) => openEdit('subject', item)} onDelete={(item) => confirmDelete('subject', item.id, item.name)} />
        ) : null}

        {tab === 'cbc' ? (
          <CbcPanel
            store={store}
            colors={colors}
            onAdd={(kind) => openCreate(kind)}
            onEdit={(kind, item) => openEdit(kind, item)}
            onDelete={(kind, item) =>
              confirmDelete(
                kind,
                item.id,
                'name' in item ? item.name : item.title,
              )
            }
          />
        ) : null}

        {tab === 'resources' ? (
          <ResourcesPanel store={store} colors={colors} onAdd={() => openCreate('resource')} onEdit={(item) => openEdit('resource', item)} onDelete={(item) => confirmDelete('resource', item.id, item.title)} />
        ) : null}

        {tab === 'assessments' ? (
          <AssessmentsPanel store={store} colors={colors} onAdd={() => openCreate('assessment')} onEdit={(item) => openEdit('assessment', item)} onDelete={(item) => confirmDelete('assessment', item.id, item.title)} />
        ) : null}

        <Text style={[styles.localNote, { color: colors.muted }]}>Academic data is stored locally on this device.</Text>
      </ScrollView>

      <AcademicModal
        key={`${modalKind ?? 'closed'}-${editing?.id ?? 'new'}`}
        kind={modalKind}
        editing={editing}
        store={store}
        colors={colors}
        onClose={closeModal}
        onSaved={async () => { closeModal(); await load(); }}
      />
    </View>
  );
}

function Overview({ store, colors, onTab }: { store: AcademicStore | null; colors: any; onTab: (tab: Tab) => void }) {
  const counts = [
    ['book-outline', 'Subjects', store?.subjects.length ?? 0, 'subjects'],
    ['bulb-outline', 'Competencies', store?.competencies.length ?? 0, 'cbc'],
    ['library-outline', 'Resources', store?.resources.length ?? 0, 'resources'],
    ['clipboard-outline', 'Assessments', store?.assessments.length ?? 0, 'assessments'],
  ] as const;

  return (
    <>
      <View style={styles.grid}>
        {counts.map(([icon, title, value, target]) => (
          <Pressable key={title} onPress={() => onTab(target)} style={({ pressed }) => [styles.tile, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name={icon as any} size={22} color={colors.accent} />
            <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
            <Text style={[styles.tileTitle, { color: colors.muted }]}>{title}</Text>
          </Pressable>
        ))}
      </View>

      <Section title="CBC / CBE" subtitle="Learning outcomes, competencies, values and projects." icon="sparkles-outline" colors={colors} onPress={() => onTab('cbc')} />
      <Section title="Study resources" subtitle="Notes, assignments, CATs, exams, past papers and revision material." icon="library-outline" colors={colors} onPress={() => onTab('resources')} />
      <Section title="Assessments" subtitle="Track CATs, exams, assignments, projects, scores and progress." icon="clipboard-outline" colors={colors} onPress={() => onTab('assessments')} />

      {!store || (store.subjects.length === 0 && store.resources.length === 0 && store.assessments.length === 0) ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="school-outline" size={30} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your academic space is ready</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Start by adding your subjects, then build your CBC/CBE learning outcomes, study resources and assessments.</Text>
        </View>
      ) : null}
    </>
  );
}

function SubjectsPanel({
  store,
  colors,
  onAdd,
  onEdit,
  onDelete,
}: {
  store: AcademicStore | null;
  colors: any;
  onAdd: () => void;
  onEdit: (item: AcademicSubject) => void;
  onDelete: (item: AcademicSubject) => void;
}) {
  return (
    <Panel title="Subjects" subtitle="Manage the learning areas and subjects used by your academic space." icon="book-outline" colors={colors} actionLabel="Add subject" onAction={onAdd}>
      {(store?.subjects ?? []).length === 0 ? <EmptyLine text="No subjects yet. Add your first subject." colors={colors} /> : null}
      {(store?.subjects ?? []).map((item: AcademicSubject) => (
        <ListCard key={item.id} colors={colors} icon="book-outline" title={item.name} subtitle={[item.learningArea, item.category, item.stage && label(item.stage)].filter(Boolean).join(' • ') || 'Learning area not specified'} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
      ))}
    </Panel>
  );
}

function CbcPanel({
  store,
  colors,
  onAdd,
  onEdit,
  onDelete,
}: {
  store: AcademicStore | null;
  colors: any;
  onAdd: (kind: 'competency' | 'value' | 'outcome') => void;
  onEdit: (
    kind: 'competency' | 'value' | 'outcome',
    item: AcademicCompetency | AcademicValue | LearningOutcome,
  ) => void;
  onDelete: (
    kind: 'competency' | 'value' | 'outcome',
    item: AcademicCompetency | AcademicValue | LearningOutcome,
  ) => void;
}) {
  return (
    <>
      <Panel title="Competencies" subtitle="Core competencies can be linked to learning outcomes." icon="bulb-outline" colors={colors} actionLabel="Add competency" onAction={() => onAdd('competency')}>
        {(store?.competencies ?? []).length === 0 ? <EmptyLine text="No competencies yet." colors={colors} /> : null}
        {(store?.competencies ?? []).map((item: AcademicCompetency) => <ListCard key={item.id} colors={colors} icon="bulb-outline" title={item.name} subtitle={item.description || 'CBC/CBE competency'} onEdit={() => onEdit('competency', item)} onDelete={() => onDelete('competency', item)} />)}
      </Panel>

      <Panel title="Values" subtitle="Track values connected to learning and school life." icon="heart-outline" colors={colors} actionLabel="Add value" onAction={() => onAdd('value')}>
        {(store?.values ?? []).length === 0 ? <EmptyLine text="No values yet." colors={colors} /> : null}
        {(store?.values ?? []).map((item: AcademicValue) => <ListCard key={item.id} colors={colors} icon="heart-outline" title={item.name} subtitle={item.description || 'Core value'} onEdit={() => onEdit('value', item)} onDelete={() => onDelete('value', item)} />)}
      </Panel>

      <Panel title="Learning outcomes" subtitle="Connect subjects, competencies, values and measurable learning outcomes." icon="sparkles-outline" colors={colors} actionLabel="Add outcome" onAction={() => onAdd('outcome')}>
        {(store?.learningOutcomes ?? []).length === 0 ? <EmptyLine text="No learning outcomes yet." colors={colors} /> : null}
        {(store?.learningOutcomes ?? []).map((item: LearningOutcome) => (
          <ListCard key={item.id} colors={colors} icon="sparkles-outline" title={item.title} subtitle={[item.subjectName, item.status].filter(Boolean).join(' • ') || 'Learning outcome'} onEdit={() => onEdit('outcome', item)} onDelete={() => onDelete('outcome', item)} />
        ))}
      </Panel>
    </>
  );
}

function ResourcesPanel({
  store,
  colors,
  onAdd,
  onEdit,
  onDelete,
}: {
  store: AcademicStore | null;
  colors: any;
  onAdd: () => void;
  onEdit: (item: AcademicResource) => void;
  onDelete: (item: AcademicResource) => void;
}) {
  return (
    <Panel title="Study resources" subtitle="Keep notes, assignments, projects, CATs, exams, past papers and revision material on-device." icon="library-outline" colors={colors} actionLabel="Add resource" onAction={onAdd}>
      {(store?.resources ?? []).length === 0 ? <EmptyLine text="No study resources yet." colors={colors} /> : null}
      {(store?.resources ?? []).map((item: AcademicResource) => (
        <ListCard key={item.id} colors={colors} icon="document-text-outline" title={item.title} subtitle={[label(item.type), item.subjectName, item.form].filter(Boolean).join(' • ')} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
      ))}
    </Panel>
  );
}

function AssessmentsPanel({
  store,
  colors,
  onAdd,
  onEdit,
  onDelete,
}: {
  store: AcademicStore | null;
  colors: any;
  onAdd: () => void;
  onEdit: (item: AcademicAssessment) => void;
  onDelete: (item: AcademicAssessment) => void;
}) {
  return (
    <Panel title="Assessments" subtitle="Track CATs, exams, assignments and projects, including scores when available." icon="clipboard-outline" colors={colors} actionLabel="Add assessment" onAction={onAdd}>
      {(store?.assessments ?? []).length === 0 ? <EmptyLine text="No assessments yet." colors={colors} /> : null}
      {(store?.assessments ?? []).map((item: AcademicAssessment) => (
        <ListCard key={item.id} colors={colors} icon="clipboard-outline" title={item.title} subtitle={[label(item.type), item.subjectName, item.score !== undefined && item.maxScore !== undefined ? `${item.score}/${item.maxScore}` : item.status].filter(Boolean).join(' • ')} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
      ))}
    </Panel>
  );
}

function Panel({ title, subtitle, icon, colors, actionLabel, onAction, children }: any) {
  return (
    <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.panelHeader}>
        <View style={[styles.panelIcon, { backgroundColor: colors.accentSoft }]}><Ionicons name={icon} size={21} color={colors.accent} /></View>
        <View style={styles.panelCopy}><Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.panelSubtitle, { color: colors.muted }]}>{subtitle}</Text></View>
      </View>
      {children}
      <Pressable onPress={onAction} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
        <Ionicons name="add" size={18} color="#fff" /><Text style={styles.primaryButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function ListCard({ colors, icon, title, subtitle, onEdit, onDelete }: any) {
  return (
    <View style={[styles.listCard, { borderColor: colors.border }]}>
      <View style={[styles.listIcon, { backgroundColor: colors.background }]}><Ionicons name={icon} size={18} color={colors.accent} /></View>
      <View style={styles.listCopy}><Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={2}>{title}</Text><Text style={[styles.listSubtitle, { color: colors.muted }]} numberOfLines={2}>{subtitle}</Text></View>
      <View style={styles.rowActions}>
        <Pressable onPress={onEdit} hitSlop={8}><Ionicons name="create-outline" size={20} color={colors.textSecondary} /></Pressable>
        <Pressable onPress={onDelete} hitSlop={8}><Ionicons name="trash-outline" size={20} color={colors.danger} /></Pressable>
      </View>
    </View>
  );
}

function EmptyLine({ text, colors }: { text: string; colors: any }) {
  return <Text style={[styles.emptyLine, { color: colors.muted }]}>{text}</Text>;
}

function Section({ title, subtitle, icon, colors, onPress }: any) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.section, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}><Ionicons name={icon} size={24} color={colors.accent} /><View style={styles.sectionCopy}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.muted }]}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></Pressable>;
}

function TabButton({ title, active, onPress, colors }: any) {
  return <Pressable onPress={onPress} style={[styles.tab, { backgroundColor: active ? colors.accent : colors.card, borderColor: active ? colors.accent : colors.border }]}><Text style={[styles.tabText, { color: active ? '#fff' : colors.text }]}>{title}</Text></Pressable>;
}

function AcademicModal({ kind, editing, store, colors, onClose, onSaved }: { kind: ModalKind; editing: any; store: AcademicStore | null; colors: any; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [learningArea, setLearningArea] = useState(editing?.learningArea ?? '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [stage, setStage] = useState<AcademicStage>(editing?.stage ?? 'senior_secondary');
  const [subjectName, setSubjectName] = useState(editing?.subjectName ?? '');
  const [title, setTitle] = useState(editing?.title ?? '');
  const [type, setType] = useState<AcademicResourceType | AcademicAssessment['type']>(editing?.type ?? (kind === 'assessment' ? 'cat' : 'note'));
  const [form, setForm] = useState(editing?.form ?? '');
  const [stream, setStream] = useState(editing?.stream ?? '');
  const [status, setStatus] = useState<AcademicRecordStatus>(editing?.status ?? 'active');
  const [score, setScore] = useState(editing?.score !== undefined ? String(editing.score) : '');
  const [maxScore, setMaxScore] = useState(editing?.maxScore !== undefined ? String(editing.maxScore) : '');
  const [dueAt, setDueAt] = useState(editing?.dueAt ?? '');
  const [competencyIds, setCompetencyIds] = useState<string[]>(editing?.competencyIds ?? []);
  const [valueIds, setValueIds] = useState<string[]>(editing?.valueIds ?? []);
  const [subjectId, setSubjectId] = useState(editing?.subjectId ?? '');
  const [saving, setSaving] = useState(false);

  if (!kind) return null;

  const subjectOptions = store?.subjects ?? [];
  const competencyOptions = store?.competencies ?? [];
  const valueOptions = store?.values ?? [];

  const resetAndClose = () => {
    onClose();
  };

  const save = async () => {
    setSaving(true);
    try {
      const createdAt = editing?.createdAt ?? stamp();
      const updatedAt = stamp();
      if (kind === 'subject') {
        if (!name.trim()) return Alert.alert('Subject name required', 'Enter a subject name first.');
        await upsertAcademicSubject({ id: editing?.id ?? makeId('subject'), name: name.trim(), description: description.trim() || undefined, learningArea: learningArea.trim() || undefined, category: category.trim() || undefined, stage, createdAt, updatedAt });
      }
      if (kind === 'competency') {
        if (!name.trim()) return Alert.alert('Competency name required', 'Enter a competency name first.');
        await upsertAcademicCompetency({ id: editing?.id ?? makeId('competency'), name: name.trim(), description: description.trim() || undefined, createdAt, updatedAt });
      }
      if (kind === 'value') {
        if (!name.trim()) return Alert.alert('Value name required', 'Enter a value first.');
        await upsertAcademicValue({ id: editing?.id ?? makeId('value'), name: name.trim(), description: description.trim() || undefined, createdAt, updatedAt });
      }
      if (kind === 'outcome') {
        if (!title.trim()) return Alert.alert('Outcome title required', 'Enter a learning outcome title first.');
        const subject = subjectOptions.find((item) => item.id === subjectId);
        await upsertLearningOutcome({ id: editing?.id ?? makeId('outcome'), title: title.trim(), description: description.trim() || undefined, subjectId: subject?.id, subjectName: subject?.name || subjectName.trim() || undefined, competencyIds, valueIds, status, createdAt, updatedAt });
      }
      if (kind === 'resource') {
        if (!title.trim()) return Alert.alert('Resource title required', 'Enter a resource title first.');
        const subject = subjectOptions.find((item) => item.id === subjectId);
        await upsertAcademicResource({ id: editing?.id ?? makeId('resource'), title: title.trim(), description: description.trim() || undefined, type: type as AcademicResourceType, subjectId: subject?.id, subjectName: subject?.name || subjectName.trim() || undefined, form: form.trim() || undefined, stream: stream.trim() || undefined, tags: [], status, createdAt, updatedAt });
      }
      if (kind === 'assessment') {
        if (!title.trim()) return Alert.alert('Assessment title required', 'Enter an assessment title first.');
        const subject = subjectOptions.find((item) => item.id === subjectId);
        const numericScore = score.trim() ? Number(score) : undefined;
        const numericMax = maxScore.trim() ? Number(maxScore) : undefined;
        await upsertAcademicAssessment({ id: editing?.id ?? makeId('assessment'), title: title.trim(), type: type as AcademicAssessment['type'], subjectId: subject?.id, subjectName: subject?.name || subjectName.trim() || undefined, form: form.trim() || undefined, stream: stream.trim() || undefined, dueAt: dueAt.trim() || undefined, score: Number.isFinite(numericScore) ? numericScore : undefined, maxScore: Number.isFinite(numericMax) ? numericMax : undefined, status, createdAt, updatedAt });
      }
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  const isNameKind = kind === 'subject' || kind === 'competency' || kind === 'value';
  const heading = editing ? `Edit ${label(kind)}` : `Add ${label(kind)}`;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.text }]}>{heading}</Text><Pressable onPress={resetAndClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            {isNameKind ? <Field label="Name" value={name} onChangeText={setName} colors={colors} placeholder={kind === 'subject' ? 'e.g. Biology' : kind === 'competency' ? 'e.g. Critical thinking' : 'e.g. Respect'} /> : null}
            {kind === 'subject' ? <>
              <Field label="Learning area" value={learningArea} onChangeText={setLearningArea} colors={colors} placeholder="e.g. Sciences" />
              <Field label="Category" value={category} onChangeText={setCategory} colors={colors} placeholder="e.g. STEM" />
              <ChoiceRow label="Stage" value={stage} options={['junior_secondary', 'senior_secondary', 'secondary', 'other']} onChange={setStage} colors={colors} />
            </> : null}
            {kind === 'competency' || kind === 'value' ? <Field label="Description" value={description} onChangeText={setDescription} colors={colors} placeholder="Optional description" multiline /> : null}
            {kind === 'outcome' ? <>
              <Field label="Title" value={title} onChangeText={setTitle} colors={colors} placeholder="e.g. Explain photosynthesis" />
              <Field label="Description" value={description} onChangeText={setDescription} colors={colors} placeholder="What should the learner demonstrate?" multiline />
              <SelectFromList label="Subject" value={subjectId} options={subjectOptions.map((item) => ({ id: item.id, name: item.name }))} onChange={setSubjectId} colors={colors} />
              <MultiSelect label="Competencies" selected={competencyIds} options={competencyOptions} onToggle={(id: string) => setCompetencyIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} colors={colors} />
              <MultiSelect label="Values" selected={valueIds} options={valueOptions} onToggle={(id: string) => setValueIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} colors={colors} />
              <ChoiceRow label="Status" value={status} options={['draft', 'active', 'completed', 'archived']} onChange={setStatus} colors={colors} />
            </> : null}
            {kind === 'resource' ? <>
              <Field label="Title" value={title} onChangeText={setTitle} colors={colors} placeholder="e.g. Form 3 Biology notes" />
              <Field label="Description" value={description} onChangeText={setDescription} colors={colors} placeholder="Optional description" multiline />
              <ChoiceRow label="Type" value={type} options={resourceTypes} onChange={setType} colors={colors} />
              <SelectFromList label="Subject" value={subjectId} options={subjectOptions.map((item) => ({ id: item.id, name: item.name }))} onChange={setSubjectId} colors={colors} />
              <Field label="Form / Grade" value={form} onChangeText={setForm} colors={colors} placeholder="e.g. Form 3" />
              <Field label="Stream" value={stream} onChangeText={setStream} colors={colors} placeholder="e.g. North" />
              <ChoiceRow label="Status" value={status} options={['draft', 'active', 'completed', 'archived']} onChange={setStatus} colors={colors} />
            </> : null}
            {kind === 'assessment' ? <>
              <Field label="Title" value={title} onChangeText={setTitle} colors={colors} placeholder="e.g. Biology CAT 1" />
              <ChoiceRow label="Type" value={type} options={assessmentTypes} onChange={setType} colors={colors} />
              <SelectFromList label="Subject" value={subjectId} options={subjectOptions.map((item) => ({ id: item.id, name: item.name }))} onChange={setSubjectId} colors={colors} />
              <Field label="Form / Grade" value={form} onChangeText={setForm} colors={colors} placeholder="e.g. Form 3" />
              <Field label="Stream" value={stream} onChangeText={setStream} colors={colors} placeholder="e.g. North" />
              <Field label="Due date" value={dueAt} onChangeText={setDueAt} colors={colors} placeholder="e.g. 2026-10-02" />
              <View style={styles.twoFields}><Field label="Score" value={score} onChangeText={setScore} colors={colors} placeholder="e.g. 32" keyboardType="numeric" /><Field label="Max score" value={maxScore} onChangeText={setMaxScore} colors={colors} placeholder="e.g. 40" keyboardType="numeric" /></View>
              <ChoiceRow label="Status" value={status} options={['draft', 'active', 'completed', 'archived']} onChange={setStatus} colors={colors} />
            </> : null}
            <Pressable disabled={saving} onPress={save} style={({ pressed }) => [styles.saveButton, { backgroundColor: colors.accent, opacity: pressed || saving ? 0.75 : 1 }]}>
              <Ionicons name="checkmark" size={19} color="#fff" /><Text style={styles.saveButtonText}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Save locally'}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label: fieldLabel, value, onChangeText, colors, placeholder, multiline, keyboardType }: any) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>{fieldLabel}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, minHeight: multiline ? 88 : 48 }]} /></View>;
}

function ChoiceRow({ label: choiceLabel, value, options, onChange, colors }: any) {
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>{choiceLabel}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>{options.map((option: string) => <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, { backgroundColor: option === value ? colors.accent : colors.background, borderColor: option === value ? colors.accent : colors.border }]}><Text style={[styles.choiceText, { color: option === value ? '#fff' : colors.text }]}>{label(option)}</Text></Pressable>)}</ScrollView></View>;
}

function SelectFromList({ label: selectLabel, value, options, onChange, colors }: any) {
  if (options.length === 0) return <Text style={[styles.helper, { color: colors.muted }]}>Add a subject first to link it here.</Text>;
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>{selectLabel}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>{options.map((option: any) => <Pressable key={option.id} onPress={() => onChange(option.id)} style={[styles.choice, { backgroundColor: option.id === value ? colors.accent : colors.background, borderColor: option.id === value ? colors.accent : colors.border }]}><Text style={[styles.choiceText, { color: option.id === value ? '#fff' : colors.text }]}>{option.name}</Text></Pressable>)}</ScrollView></View>;
}

function MultiSelect({ label: selectLabel, selected, options, onToggle, colors }: any) {
  if (options.length === 0) return <Text style={[styles.helper, { color: colors.muted }]}>Add {selectLabel.toLowerCase()} first to link them here.</Text>;
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.text }]}>{selectLabel}</Text><View style={styles.multiWrap}>{options.map((option: any) => <Pressable key={option.id} onPress={() => onToggle(option.id)} style={[styles.choice, { backgroundColor: selected.includes(option.id) ? colors.accent : colors.background, borderColor: selected.includes(option.id) ? colors.accent : colors.border }]}><Text style={[styles.choiceText, { color: selected.includes(option.id) ? '#fff' : colors.text }]}>{option.name}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 5 },
  contextCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  contextCopy: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  contextText: { fontSize: 14, lineHeight: 20 },
  countPill: { minWidth: 58, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center' },
  countPillText: { fontSize: 18, fontWeight: '800' },
  countPillLabel: { fontSize: 10, fontWeight: '700', marginTop: 1 },
  tabs: { gap: 8, paddingBottom: 14 },
  tab: { borderWidth: 1, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14 },
  tabText: { fontSize: 13, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tile: { width: '48%', minHeight: 105, borderWidth: 1, borderRadius: 16, padding: 14 },
  tileValue: { fontSize: 25, fontWeight: '800', marginTop: 9 },
  tileTitle: { fontSize: 13, marginTop: 2 },
  section: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 10, gap: 13 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, lineHeight: 19 },
  empty: { borderWidth: 1, borderRadius: 16, padding: 22, alignItems: 'center', marginTop: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  panel: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  panelIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  panelCopy: { flex: 1 },
  panelTitle: { fontSize: 18, fontWeight: '800' },
  panelSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  listCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 11, marginBottom: 8, gap: 10 },
  listIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1 },
  listTitle: { fontSize: 14, fontWeight: '800' },
  listSubtitle: { fontSize: 12, marginTop: 3 },
  rowActions: { flexDirection: 'row', gap: 13, alignItems: 'center' },
  emptyLine: { fontSize: 13, paddingVertical: 8, marginBottom: 4 },
  primaryButton: { minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, marginTop: 4 },
  primaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  localNote: { textAlign: 'center', fontSize: 12, marginTop: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 21, fontWeight: '800' },
  modalContent: { padding: 20, paddingBottom: 34 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14, textAlignVertical: 'top' },
  choiceRow: { gap: 8, paddingBottom: 2 },
  choice: { borderWidth: 1, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 11 },
  choiceText: { fontSize: 12, fontWeight: '700' },
  multiWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  helper: { fontSize: 12, marginBottom: 14 },
  twoFields: { flexDirection: 'row', gap: 10 },
  saveButton: { minHeight: 48, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 4 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
