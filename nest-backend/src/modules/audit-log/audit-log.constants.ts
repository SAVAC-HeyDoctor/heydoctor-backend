/** Valores estables para consultas y reporting */
export const AuditActions = {
  PATIENT_READ: 'patient.read',
  DIAGNOSIS_CREATE: 'diagnosis.create',
  DIAGNOSIS_UPDATE: 'diagnosis.update',
  PRESCRIPTION_CREATE: 'prescription.create',
  LAB_ORDER_CREATE: 'lab_order.create',
  LAB_ORDER_UPDATE: 'lab_order.update',
  LAB_ORDER_DELETE: 'lab_order.delete',
  AI_INSIGHT_GENERATE: 'ai_insight.generate',
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_WEBHOOK: 'payment.webhook',
  PAYMENT_STATUS_CHECK: 'payment.status_check',
  PAYMENT_STATUS_UPDATED: 'payment.status_updated',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];
