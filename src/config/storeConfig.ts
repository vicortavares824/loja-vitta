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
  description: 'Premium basic wear for the modern individual. A black and white aesthetic.',
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
