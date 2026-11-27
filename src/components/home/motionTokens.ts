/**
 * Curvas de movimento do design "Editorial Monocromo" — uma família só:
 *  - EASE_OUT para tudo que entra (resposta imediata, assentamento suave)
 *  - EASE_IN_OUT para o que se move na tela (cortinas de imagem)
 * Espelham `--ease-out` e `--ease-in-out` em `src/styles/global.css`.
 */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
