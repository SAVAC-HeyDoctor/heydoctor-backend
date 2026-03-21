/**
 * Actor autenticado: userId viene del JWT; clinicId del interceptor (@ClinicId).
 */
export interface AuthActor {
  userId: string;
  clinicId: string;
}
