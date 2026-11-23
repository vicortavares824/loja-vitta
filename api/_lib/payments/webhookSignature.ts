import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verificação da assinatura `x-signature` das notificações do Mercado Pago.
 *
 * Conferido em fontes públicas que reproduzem a documentação oficial de webhooks do
 * Mercado Pago Brasil (a página oficial é renderizada por JS e não pôde ser lida pelo
 * fetch automatizado; a confirmação veio de busca na web, não da página em si):
 * - Cabeçalho `x-signature`: `ts=<unix>,v1=<hex>`.
 * - Manifesto: `id:[data.id];request-id:[x-request-id];ts:[ts];` (com `;` final).
 * - `data.id` vem da query string da notificação e, se for alfanumérico, deve ser
 *   usado em minúsculas.
 * - `v1` = HMAC-SHA256 do manifesto com a chave secreta da aplicação, em hexadecimal.
 * Reconferir contra a documentação oficial antes de produção, por ser contrato externo.
 */

const HEX_SHA256 = /^[0-9a-f]{64}$/i;

export interface VerifySignatureInput {
  secret: string;
  signatureHeader: string | undefined;
  requestId: string | undefined;
  dataId: string | undefined;
}

function parseSignatureHeader(header: string): { ts: string; v1: string } | null {
  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of header.split(',')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key === 'ts') ts = value;
    else if (key === 'v1') v1 = value;
  }
  if (!ts || !v1 || !/^\d+$/.test(ts) || !HEX_SHA256.test(v1)) return null;
  return { ts, v1 };
}

/** Retorna `false` para qualquer entrada ausente, malformada ou divergente. Nunca lança. */
export function verifyMercadoPagoSignature(input: VerifySignatureInput): boolean {
  try {
    const { secret, signatureHeader, requestId, dataId } = input;
    if (!secret || !signatureHeader || !requestId || !dataId) return false;

    const parsed = parseSignatureHeader(signatureHeader);
    if (!parsed) return false;

    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parsed.ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest();
    const received = Buffer.from(parsed.v1, 'hex');
    if (received.length !== expected.length) return false;
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}
