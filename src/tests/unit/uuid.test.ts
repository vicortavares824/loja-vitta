import { describe, expect, it } from 'vitest';
import { newUuid } from '../../services/uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newUuid', () => {
  it('returns a v4 UUID', () => {
    expect(newUuid()).toMatch(UUID_V4);
  });

  it('works when crypto.randomUUID is missing (http on a LAN IP is not a secure context)', () => {
    // Sombreia o método do protótipo só nesta instância, como num contexto inseguro.
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(newUuid()).toMatch(UUID_V4);
    } finally {
      delete (crypto as { randomUUID?: unknown }).randomUUID;
    }
  });

  it('returns a different value on each call', () => {
    expect(newUuid()).not.toBe(newUuid());
  });
});
