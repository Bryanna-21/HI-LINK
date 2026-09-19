import { useLocalSearchParams } from 'expo-router';
import ExamForm from '../../../../src/components/ExamForm';

export default function EditExamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExamForm examId={id} />;
}
