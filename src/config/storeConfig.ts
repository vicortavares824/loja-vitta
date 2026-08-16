/**
 * Configurações Globais da Loja
 * Altere os valores neste arquivo (ou via variáveis de ambiente) para personalizar
 * o nome da loja, marca, slogans, moedas e contatos em todo o site instantaneamente!
 */

export interface StoreConfig {
  name: string;
  shortName: string;
  subtitle: string;
  tagline: string;
  description: string;
  heroBadge: string;
  heroTitle: string;
  currencyDefault: string;
  author: string;
  social: {
    instagram: string;
    twitter: string;
    atelier: string;
  };
  contactEmail: string;
}

export const STORE_CONFIG: StoreConfig = {
  name: 'Vitta Basics',
  shortName: 'VB',
  subtitle: 'Minimalist Luxury Fashion',
  tagline: 'ESSENTIALS FOR EVERYDAY',
  description: 'Vitta Basics é uma marca de moda minimalista e essencial, oferecendo peças atemporais e de alta qualidade para o dia a dia. Com integração à TomatoPHP REST API e animações WebGL, proporcionamos uma experiência de compra moderna e envolvente.',
  heroBadge: 'New Collection 2026',
  heroTitle: 'SIMPLICITY IS THE ULTIMATE SOPHISTICATION.',
  currencyDefault: 'BRL',
  author: 'Vitta Basics Studio',
  social: {
    instagram: '@vittabasics',
    twitter: '@vittabasics',
    atelier: 'São Paulo'
  },
  contactEmail: 'contact@vittabasics.com'
};
