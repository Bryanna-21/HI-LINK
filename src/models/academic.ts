export type AcademicStage =
  | 'junior_secondary'
  | 'senior_secondary'
  | 'secondary'
  | 'other';

export type AcademicResourceType =
  | 'note'
  | 'assignment'
  | 'project'
  | 'cat'
  | 'exam'
  | 'past_paper'
  | 'marking_scheme'
  | 'study_resource'
  | 'learning_outcome'
  | 'discussion';

export type AcademicRecordStatus =
  | 'draft'
  | 'active'
  | 'completed'
  | 'archived';

export interface AcademicSubject {
  id: string;
  name: string;
  code?: string;
  category?: string;
  learningArea?: string;
  stage?: AcademicStage;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicCompetency {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicValue {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningOutcome {
  id: string;
  subjectId?: string;
  subjectName?: string;
  title: string;
  description?: string;
  competencyIds?: string[];
  valueIds?: string[];
  tags?: string[];
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicResource {
  id: string;
  title: string;
  description?: string;
  type: AcademicResourceType;
  subjectId?: string;
  subjectName?: string;
  form?: string;
  stream?: string;
  schoolId?: string;
  schoolName?: string;
  authorId?: string;
  authorName?: string;
  fileUri?: string;
  externalUri?: string;
  tags?: string[];
  competencyIds?: string[];
  valueIds?: string[];
  learningOutcomeIds?: string[];
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicAssessment {
  id: string;
  title: string;
  type: 'cat' | 'exam' | 'assignment' | 'project' | 'other';
  subjectId?: string;
  subjectName?: string;
  form?: string;
  stream?: string;
  dueAt?: string;
  completedAt?: string;
  score?: number;
  maxScore?: number;
  notes?: string;
  status: AcademicRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicSettings {
  currentStage?: AcademicStage;
  currentForm?: string;
  currentStream?: string;
  schoolId?: string;
  schoolName?: string;
  selectedSubjectIds: string[];
  selectedCompetencyIds: string[];
  selectedValueIds: string[];
  updatedAt: string;
}

export interface AcademicStore {
  subjects: AcademicSubject[];
  competencies: AcademicCompetency[];
  values: AcademicValue[];
  learningOutcomes: LearningOutcome[];
  resources: AcademicResource[];
  assessments: AcademicAssessment[];
  settings: AcademicSettings;
}
