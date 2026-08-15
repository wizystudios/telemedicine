import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuditLogView from '@/components/super-admin/AuditLogView';
import DiagnosticsHistory from '@/components/super-admin/DiagnosticsHistory';

interface Props {
  orgType: 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory';
  orgId: string;
}

export default function OrgReportsTab({ orgType, orgId }: Props) {
  if (!orgId) return null;
  return (
    <Tabs defaultValue="audit" className="space-y-4">
      <TabsList className="rounded-2xl">
        <TabsTrigger value="audit" className="rounded-xl text-xs">Kumbukumbu</TabsTrigger>
        <TabsTrigger value="diagnostics" className="rounded-xl text-xs">Uchunguzi</TabsTrigger>
      </TabsList>
      <TabsContent value="audit">
        <AuditLogView orgType={orgType} orgId={orgId} />
      </TabsContent>
      <TabsContent value="diagnostics">
        <DiagnosticsHistory orgType={orgType} orgId={orgId} />
      </TabsContent>
    </Tabs>
  );
}
