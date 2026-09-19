import { useLocalSearchParams } from 'expo-router';
import EmergencyReportDetail from '../../../../src/components/EmergencyReportDetail';

export default function AdminReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmergencyReportDetail reportId={id} />;
}
