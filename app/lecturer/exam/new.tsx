import { useLocalSearchParams } from 'expo-router';
import ExamForm from '../../../src/components/ExamForm';

export default function NewExamScreen() {
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();
  return <ExamForm defaultCourseId={courseId} />;
}
