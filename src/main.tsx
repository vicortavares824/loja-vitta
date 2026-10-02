import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { observability } from './services/observability';
import { inventoryService } from './services/inventoryService';

// Inicializar camada de telemetria unificada (Sentry, OTel, Datadog, NewRelic)
observability.init();

// Expor utilitários de inventário no console DevTools (window)
if (typeof window !== 'undefined') {
  (window as any).importInventory = (items: any) => inventoryService.importInventoryItems(items);
  (window as any).vittaInventory = {
    import: (items: any) => inventoryService.importInventoryItems(items),
    help: () => {
      console.log(
        '%c📦 [Vitta Inventory] Comando de Importação em Lote',
        'font-size: 14px; font-weight: bold; color: #6366f1;'
      );
      console.log(
        'Modo de uso no Console:\n' +
        '  await importInventory([\n' +
        '    {\n' +
        '      name: "Camiseta Pima Classic",\n' +
        '      sku: "CAM-PIMA-001",\n' +
        '      category: "Camisetas",\n' +
        '      price: 139.90,\n' +
        '      stock: 25,\n' +
        '      sizes: ["PP", "P", "M", "G", "GG"],\n' +
        '      colors: [{ name: "Off-White", hex: "#F5F5F0" }],\n' +
        '      imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518"\n' +
        '    }\n' +
        '  ])'
      );
    }
  };

  console.log(
    '%c📦 [Vitta Store] Ferramenta de importação em lote carregada! Digite %cimportInventory(json)%c ou %cvittaInventory.help()%c para começar.',
    'color: #3b82f6;',
    'color: #10b981; font-weight: bold;',
    'color: #3b82f6;',
    'color: #f59e0b; font-weight: bold;',
    'color: #3b82f6;'
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
