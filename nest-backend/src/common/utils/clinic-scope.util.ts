import { ForbiddenException } from '@nestjs/common';

/**
 * clinicId debe provenir solo del contexto de petición (ClinicResolverInterceptor + @ClinicId).
 */
export function requireClinicId(
  clinicId: string | undefined | null,
): string {
  if (!clinicId || typeof clinicId !== 'string' || !clinicId.trim()) {
    throw new ForbiddenException('Clinic context is required');
  }
  return clinicId.trim();
}

/**
 * Comprueba que el recurso pertenezca a la clínica del usuario.
 * mismatch o clinicId nulo en recurso → ForbiddenException (según requisito de hardening).
 */
export function assertClinicMatch(
  resourceClinicId: string | null | undefined,
  requestClinicId: string,
): void {
  if (!resourceClinicId || resourceClinicId !== requestClinicId) {
    throw new ForbiddenException('Access denied for this clinic');
  }
}
