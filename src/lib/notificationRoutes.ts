// Single source of truth for notification → in-app deep links.
// Used by usePushNotifications (SW), NotificationsDrawer, and Notifications page.
export const NOTIFICATION_TYPE_TO_URL: Record<string, string> = {
  pending_action: '/pending-actions',
  appointment: '/appointments',
  appointment_request: '/appointments',
  message: '/messages',
  pharmacy_order: '/my-orders',
  prescription: '/prescriptions',
  patient_problem: '/patient-problems',
  lab_booking: '/appointments',
};

export function urlForNotificationType(type: string | null | undefined): string {
  if (!type) return '/notifications';
  return NOTIFICATION_TYPE_TO_URL[type] || '/notifications';
}
