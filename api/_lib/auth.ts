import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from './errors.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

/** Extrai o token de `Authorization: Bearer <jwt>`. Retorna null se ausente ou malformado. */
export function extractBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value) return null;
  const match = BEARER_PATTERN.exec(value.trim());
  return match?.[1] ?? null;
}

/**
 * Valida o JWT com `auth.getUser` e devolve id, e-mail e nome do usuário.
 * Qualquer falha vira UNAUTHENTICATED (401), sem expor o motivo.
 */
export async function authenticate(
  adminClient: SupabaseClient,
  authorizationHeader: string | string[] | undefined,
): Promise<AuthenticatedUser> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) throw new AppError('UNAUTHENTICATED');

  let result: Awaited<ReturnType<SupabaseClient['auth']['getUser']>>;
  try {
    result = await adminClient.auth.getUser(token);
  } catch (err) {
    throw new AppError('UNAUTHENTICATED', { internal: err });
  }

  const user = result.data.user;
  if (result.error || !user || !user.email) {
    throw new AppError('UNAUTHENTICATED', { internal: result.error });
  }

  const metaName: unknown = user.user_metadata?.name;
  const name =
    typeof metaName === 'string' && metaName.trim() !== ''
      ? metaName.trim()
      : (user.email.split('@')[0] ?? user.email);

  return { id: user.id, email: user.email, name };
}

/**
 * Exige usuário admin: confere `profiles.role` com a service role.
 * Não usa `user_metadata`, que o próprio usuário pode editar.
 */
export async function requireAdmin(
  adminClient: SupabaseClient,
  authorizationHeader: string | string[] | undefined,
): Promise<AuthenticatedUser> {
  const user = await authenticate(adminClient, authorizationHeader);
  const { data, error } = await adminClient.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (error) throw new AppError('INTERNAL_ERROR', { internal: { operation: 'requireAdmin', error } });
  if ((data as { role?: string } | null)?.role !== 'admin') throw new AppError('FORBIDDEN');
  return user;
}
