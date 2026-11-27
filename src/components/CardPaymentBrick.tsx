import React, { useEffect, useRef, useState } from 'react';
import type { CardPaymentInput } from '../types/checkout';

const SDK_URL = 'https://sdk.mercadopago.com/js/v2';
const CONTAINER_ID = 'vitta-card-payment-brick';

interface BrickFormData {
  token: string;
  issuer_id?: string;
  payment_method_id: string;
  installments: number;
}

interface BrickController {
  unmount: () => void;
}

interface MercadoPagoInstance {
  bricks: () => {
    create: (
      type: 'cardPayment',
      containerId: string,
      settings: {
        initialization: { amount: number };
        callbacks: {
          onReady?: () => void;
          onSubmit: (data: BrickFormData) => Promise<void>;
          onError?: (error: unknown) => void;
        };
      }
    ) => Promise<BrickController>;
  };
}

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale: string }) => MercadoPagoInstance;
  }
}

let sdkPromise: Promise<void> | null = null;

/** Carrega o SDK do Mercado Pago uma única vez, somente quando solicitado. */
const loadMercadoPagoSdk = (): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.MercadoPago) return Promise.resolve();
  if (!sdkPromise) {
    sdkPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        sdkPromise = null;
        script.remove();
        reject(new Error('Falha ao carregar SDK'));
      };
      document.head.appendChild(script);
    });
  }
  return sdkPromise;
};

export interface CardPaymentBrickProps {
  publicKey: string;
  /** Valor em reais exibido pelo Brick. */
  amount: number;
  /** Recebe apenas o token e metadados. Deve rejeitar em caso de erro. */
  onSubmit: (card: CardPaymentInput) => Promise<void>;
  onLoadError?: () => void;
}

export const CardPaymentBrick: React.FC<CardPaymentBrickProps> = ({
  publicKey,
  amount,
  onSubmit,
  onLoadError
}) => {
  const [ready, setReady] = useState(false);
  const submitRef = useRef(onSubmit);
  const errorRef = useRef(onLoadError);
  submitRef.current = onSubmit;
  errorRef.current = onLoadError;

  useEffect(() => {
    let cancelled = false;
    let controller: BrickController | null = null;
    setReady(false);

    loadMercadoPagoSdk()
      .then(async () => {
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const created = await mp.bricks().create('cardPayment', CONTAINER_ID, {
          initialization: { amount },
          callbacks: {
            onReady: () => {
              if (!cancelled) setReady(true);
            },
            onSubmit: (data) =>
              submitRef.current({
                token: data.token,
                paymentMethodId: data.payment_method_id,
                installments: data.installments,
                issuerId: data.issuer_id
              }),
            onError: () => errorRef.current?.()
          }
        });
        if (cancelled) created.unmount();
        else controller = created;
      })
      .catch(() => {
        if (!cancelled) errorRef.current?.();
      });

    return () => {
      cancelled = true;
      try {
        controller?.unmount();
      } catch {
        /* já desmontado */
      }
    };
  }, [publicKey, amount]);

  return (
    <div className="min-h-[80px] rounded-[2px] bg-paper p-2">
      {!ready && <p className="p-3 font-mono text-[11px] uppercase tracking-[0.08em] text-ink/60">Carregando pagamento seguro…</p>}
      <div id={CONTAINER_ID} />
    </div>
  );
};
