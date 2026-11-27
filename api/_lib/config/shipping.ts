/** Frete grátis a partir deste subtotal (antes do cupom). A loja paga a etiqueta. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 150_000; // R$ 1.500,00

/**
 * Frete fixo usado só enquanto o Melhor Envio não está configurado
 * (MELHORENVIO_TOKEN ausente), para a loja continuar vendendo durante a migração.
 */
export const FALLBACK_SHIPPING_FEE_CENTS = 5_000; // R$ 50,00
export const FALLBACK_SHIPPING_SERVICE_ID = 0;
export const FALLBACK_SHIPPING_SERVICE_NAME = 'Entrega padrão';

/**
 * Serviços cotados no Melhor Envio (ids da API): 1 = Correios PAC, 2 = Correios SEDEX.
 * Para incluir outras transportadoras, acrescente os ids (ex.: 3 = Jadlog .Package, 4 = Jadlog .Com).
 */
export const SHIPPING_SERVICE_IDS: readonly number[] = [1, 2];

/**
 * Embalagem por unidade (roupas). A API do Melhor Envio agrupa as unidades em volumes.
 * Ajuste se trabalhar com peças mais pesadas (casacos, calças jeans).
 */
export const DEFAULT_ITEM_PACKAGE = {
  widthCm: 20,
  heightCm: 5,
  lengthCm: 25,
  weightKg: 0.3,
} as const;
