import type {
  AcademicAssessment,
  AcademicCompetency,
  AcademicResource,
  AcademicSettings,
  AcademicStore,
  AcademicSubject,
  AcademicValue,
  LearningOutcome,
} from '../models/academic';
import { getLocal, setLocal } from './localStore';

const STORAGE_KEY = 'hilink.academic.v1';
const now = () => new Date().toISOString();

export const createDefaultStore = (): AcademicStore => ({
  subjects: [],
  competencies: [],
  values: [],
  learningOutcomes: [],
  resources: [],
  assessments: [],
  settings: {
    selectedSubjectIds: [],
    selectedCompetencyIds: [],
    selectedValueIds: [],
    updatedAt: now(),
  },
});

export async function getAcademicStore(): Promise<AcademicStore> {
  const stored = await getLocal<AcademicStore>(STORAGE_KEY, createDefaultStore());
  if (!stored) return createDefaultStore();
  const defaults = createDefaultStore();
  return {
    ...defaults,
    ...stored,
    settings: { ...defaults.settings, ...(stored.settings ?? {}) },
  };
}

export async function saveAcademicStore(store: AcademicStore): Promise<void> {
  await setLocal(STORAGE_KEY, store);
}

async function updateStore(
  updater: (store: AcademicStore) => AcademicStore,
): Promise<AcademicStore> {
  const next = updater(await getAcademicStore());
  next.settings = { ...next.settings, updatedAt: now() };
  await saveAcademicStore(next);
  return next;
}

export async function upsertAcademicSubject(subject: AcademicSubject) {
  await updateStore((store) => ({
    ...store,
    subjects: [...store.subjects.filter((item) => item.id !== subject.id), subject],
  }));
  return subject;
}

export async function deleteAcademicSubject(id: string) {
  return updateStore((store) => ({
    ...store,
    subjects: store.subjects.filter((item) => item.id !== id),
    settings: {
      ...store.settings,
      selectedSubjectIds: store.settings.selectedSubjectIds.filter((item) => item !== id),
    },
  }));
}

export async function upsertAcademicCompetency(competency: AcademicCompetency) {
  await updateStore((store) => ({
    ...store,
    competencies: [...store.competencies.filter((item) => item.id !== competency.id), competency],
  }));
  return competency;
}

export async function deleteAcademicCompetency(id: string) {
  return updateStore((store) => ({
    ...store,
    competencies: store.competencies.filter((item) => item.id !== id),
    learningOutcomes: store.learningOutcomes.map((item) => ({
      ...item,
      competencyIds: item.competencyIds?.filter((value) => value !== id),
    })),
  }));
}

export async function upsertAcademicValue(value: AcademicValue) {
  await updateStore((store) => ({
    ...store,
    values: [...store.values.filter((item) => item.id !== value.id), value],
  }));
  return value;
}

export async function deleteAcademicValue(id: string) {
  return updateStore((store) => ({
    ...store,
    values: store.values.filter((item) => item.id !== id),
    learningOutcomes: store.learningOutcomes.map((item) => ({
      ...item,
      valueIds: item.valueIds?.filter((value) => value !== id),
    })),
  }));
}

export async function upsertLearningOutcome(outcome: LearningOutcome) {
  await updateStore((store) => ({
    ...store,
    learningOutcomes: [...store.learningOutcomes.filter((item) => item.id !== outcome.id), outcome],
  }));
  return outcome;
}

export async function deleteLearningOutcome(id: string) {
  return updateStore((store) => ({
    ...store,
    learningOutcomes: store.learningOutcomes.filter((item) => item.id !== id),
  }));
}

export async function upsertAcademicResource(resource: AcademicResource) {
  await updateStore((store) => ({
    ...store,
    resources: [...store.resources.filter((item) => item.id !== resource.id), resource],
  }));
  return resource;
}

export async function deleteAcademicResource(id: string) {
  return updateStore((store) => ({
    ...store,
    resources: store.resources.filter((item) => item.id !== id),
  }));
}

export async function upsertAcademicAssessment(assessment: AcademicAssessment) {
  await updateStore((store) => ({
    ...store,
    assessments: [...store.assessments.filter((item) => item.id !== assessment.id), assessment],
  }));
  return assessment;
}

export async function deleteAcademicAssessment(id: string) {
  return updateStore((store) => ({
    ...store,
    assessments: store.assessments.filter((item) => item.id !== id),
  }));
}

export async function updateAcademicSettings(patch: Partial<AcademicSettings>) {
  const store = await updateStore((current) => ({
    ...current,
    settings: { ...current.settings, ...patch, updatedAt: now() },
  }));
  return store.settings;
}

export async function clearAcademicStore(): Promise<void> {
  await saveAcademicStore(createDefaultStore());
}
