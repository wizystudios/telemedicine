import { supabase } from '@/integrations/supabase/client';

export type AuditEvent =
  | 'login'
  | 'login_biometric'
  | 'logout'
  | 'biometric_enrolled'
  | 'biometric_removed'
  | 'chat_message_sent'
  | 'attachment_uploaded'
  | 'attachment_accessed'
  | 'appointment_booked'
  | 'appointment_approved'
  | 'prescription_created'
  | 'pharmacy_order_created'
  | 'pharmacy_order_picked_up'
  | 'license_approved'
  | 'license_rejected'
  | 'directory_backfill'
  | 'diagnostics_run'
  | 'audit_purged'
  | 'biometric_reset';

interface AuditOptions {
  entityType?: string;
  entityId?: string | null;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Fire-and-forget audit trail write. Never throws — auditing must not break flows.
 */
export async function logAudit(event: AuditEvent | string, opts: AuditOptions = {}) {
  try {
    await supabase.rpc('log_audit_event' as any, {
      _event_type: event,
      _entity_type: opts.entityType ?? null,
      _entity_id: opts.entityId ?? null,
      _description: opts.description ?? null,
      _metadata: opts.metadata ?? {},
      _user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    } as any);
  } catch (e) {
    console.warn('audit log failed', e);
  }
}

export const AUDIT_LABELS: Record<string, string> = {
  login: 'Kuingia (nenosiri)',
  login_biometric: 'Kuingia (alama ya kidole)',
  logout: 'Kutoka',
  biometric_enrolled: 'Alama ya kidole imesajiliwa',
  biometric_removed: 'Alama ya kidole imeondolewa',
  chat_message_sent: 'Ujumbe umetumwa',
  attachment_uploaded: 'Faili limepakiwa',
  attachment_accessed: 'Faili limefunguliwa',
  appointment_booked: 'Miadi imewekwa',
  appointment_approved: 'Miadi imekubaliwa',
  prescription_created: 'Dawa imeandikwa',
  pharmacy_order_created: 'Oda ya dawa',
  pharmacy_order_picked_up: 'Oda imechukuliwa',
  license_approved: 'Leseni imekubaliwa',
  license_rejected: 'Leseni imekataliwa',
  directory_backfill: 'Orodha imesasishwa',
  diagnostics_run: 'Uchunguzi wa mfumo',
  audit_purged: 'Kumbukumbu zimefutwa (retention)',
  biometric_reset: 'Alama ya kidole imerejeshwa',
};
