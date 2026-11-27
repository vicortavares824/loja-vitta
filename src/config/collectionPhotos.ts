/**
 * Fotos reais da coleção (camisetas oversized preta e vinho), em
 * public/images/colecao. Usamos as versões .webp (20–75 KB); os .jpg
 * originais ficam na mesma pasta.
 */
const photo = (name: string): string => `/images/colecao/${name}.webp`;

export const COLLECTION_PHOTOS = {
  heroLeft: { src: photo('preta-feminina-frente-rua'), alt: 'Camiseta oversized preta usada na rua' },
  heroRight: { src: photo('vinho-feminina-frente-cafe'), alt: 'Camiseta oversized vinho em frente a um café' },
  lookPrimary: { src: photo('vinho-feminina-frente-costas-rua'), alt: 'Camiseta oversized vinho de frente e de costas' },
  lookSecondary: { src: photo('preta-feminina-frente-casa'), alt: 'Camiseta oversized preta com calça cargo' },
  login: { src: photo('preta-feminina-frente-estudio'), alt: '' },
  signUp: { src: photo('vinho-feminina-frente-selfie'), alt: '' },
} as const;
