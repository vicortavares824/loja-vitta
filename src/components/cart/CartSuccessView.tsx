import { Check, Copy } from 'lucide-react';
import type { CheckoutResponse } from '../../types/checkout';

interface CartSuccessViewProps {
  result: CheckoutResponse | null;
  orderStatus: string;
  isPaid: boolean;
  onCopyPix: (code: string) => void;
  onContinue: () => void;
}

/** Pedido criado: status, Pix (QR + copia e cola) enquanto aguarda pagamento. */
export function CartSuccessView({ result, orderStatus, isPaid, onCopyPix, onContinue }: CartSuccessViewProps) {
  const cancelled = orderStatus === 'cancelled';
  const pix = result?.payment.kind === 'pix' && orderStatus === 'pending_payment' ? result.payment : null;

  const title = cancelled ? 'Pedido cancelado' : isPaid ? 'Pagamento confirmado' : 'Aguardando pagamento';
  const message = cancelled
    ? 'O pedido expirou ou foi cancelado. Você pode refazer a compra.'
    : isPaid
      ? 'Pagamento confirmado. Seu pedido segue para separação.'
      : 'Pedido criado. Ele é confirmado assim que o pagamento for aprovado.';

  return (
    <div className="space-y-8 px-5 pb-6 pt-4 md:px-6" aria-live="polite">
      <div>
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full border ${
            isPaid ? 'border-paper bg-paper text-ink' : 'border-line-strong'
          }`}
        >
          <Check className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <p className="eyebrow mt-8">Pedido #{result?.orderId}</p>
        <h3 className="mt-3 font-display text-4xl font-semibold uppercase leading-[0.95] tracking-[-0.04em]">{title}</h3>
        <p className="mt-4 text-[15px] leading-relaxed text-paper-2">{message}</p>
      </div>

      {pix && (
        <div className="space-y-4 border-t border-line pt-6">
          <p className="eyebrow">Pague com Pix</p>
          <img
            src={`data:image/png;base64,${pix.qrCodeBase64}`}
            alt="QR Code Pix"
            className="mx-auto h-52 w-52 bg-paper p-3"
          />
          <textarea
            readOnly
            value={pix.qrCode}
            rows={3}
            aria-label="Pix copia e cola"
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none break-all border border-line bg-ink p-3 font-mono text-[11px] text-paper-2 focus:border-paper focus:outline-none"
          />
          <button type="button" onClick={() => onCopyPix(pix.qrCode)} className="btn-secondary w-full">
            <Copy className="h-4 w-4" strokeWidth={1.5} />
            Copiar código Pix
          </button>
          <p className="eyebrow text-center">Válido até {new Date(pix.expiresAt).toLocaleString('pt-BR')}</p>
          <p className="text-center text-xs text-mute">Esta tela atualiza sozinha quando o pagamento for aprovado.</p>
        </div>
      )}

      <button type="button" onClick={onContinue} className="btn-primary w-full">
        Continuar comprando
      </button>
    </div>
  );
}
