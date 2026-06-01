import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Entity = 'doctor' | 'hospital' | 'polyclinic' | 'pharmacy' | 'laboratory';

export function useRecordVisit(entityType: Entity, entityId?: string | null) {
  useEffect(() => {
    if (!entityId) return;
    supabase.rpc('record_profile_visit', { p_entity_type: entityType, p_entity_id: entityId } as any);
  }, [entityType, entityId]);
}
