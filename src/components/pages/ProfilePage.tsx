import { useEffect, useState } from 'react';
import { ArrowUpRight, Check, Loader2, LogOut, Pencil, X } from 'lucide-react';
import type { Order } from '../../types/ecommerce';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { tomatoApi } from '../../services/tomatoApi';
import { authService } from '../../services/authService';
import { PersonalDetailsSection } from '../profile/PersonalDetailsSection';
import { AddressesSection } from '../profile/AddressesSection';
import { OrderJourney } from '../profile/OrderJourney';
import { CancelOrderButton } from '../profile/CancelOrderButton';
import { fieldInput, fieldLabel, sectionTitle } from '../profile/profileStyles';
import { LineReveal } from '../home/HomeMotion';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

/** Rótulo de cada status; `done` marca pedidos encerrados (bolinha vazada). */
const STATUS_LABELS: Record<Order['status'], { label: string; done: boolean }> = {
  pending_payment: { label: 'Aguardando pagamento', done: false },
  pending: { label: 'Pendente', done: false },
  processing: { label: 'Pago, em preparação', done: false },
  shipped: { label: 'Enviado', done: false },
  delivered: { label: 'Entregue', done: true },
  cancelled: { label: 'Cancelado', done: true },
};

const SECTIONS = [
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'enderecos', label: 'Endereços' },
  { id: 'dados', label: 'Dados' },
];

interface OrderItemView {
  id?: string | number;
  quantity: number;
  productName: string;
  selectedColor?: string;
  selectedSize?: string;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { formatPrice, showToast } = useCart();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setOrdersLoading(true);
    setOrdersError(false);
    tomatoApi
      .getMyOrders()
      .then((data) => {
        if (active) setOrders(data);
      })
      .catch(() => {
        if (active) setOrdersError(true);
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  // Atualiza só o pedido cancelado (imutável), sem recarregar a lista.
  const handleOrderCancelled = (orderId: string, refunded: boolean) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
    showToast(refunded ? 'Pedido cancelado. O estorno foi solicitado ao Mercado Pago.' : 'Pedido cancelado.', 'success');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink pt-28 text-paper">
        <Loader2 className="h-5 w-5 text-mute motion-safe:animate-spin" aria-label="Carregando" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center bg-ink px-[var(--gutter)] pb-24 pt-28 text-paper">
        <div className="mx-auto w-full max-w-md">
          <p className="eyebrow mb-5">Minha conta</p>
          <h1 className="font-display text-5xl font-semibold uppercase leading-[0.9] tracking-[-0.045em]">
            Entre para ver seu <span className="font-serif-accent">perfil</span>
          </h1>
          <p className="mt-5 text-[15px] text-paper-2">Faça login para acompanhar seus pedidos e dados da conta.</p>
          <button type="button" onClick={() => onNavigate('login-client')} className="btn-primary mt-10 w-full">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const firstName = user.name.split(' ')[0] || user.name;

  const startEdit = () => {
    setNameDraft(user.name);
    setEditingName(true);
  };

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      showToast('O nome deve ter entre 2 e 80 caracteres.', 'error');
      return;
    }
    setSavingName(true);
    try {
      await authService.updateName(trimmed);
      showToast('Nome atualizado.', 'success');
      setEditingName(false);
    } catch (e: unknown) {
      showToast(e instanceof Error && e.message ? e.message : 'Não foi possível atualizar o nome.', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate('home');
  };

  const activeOrders = orders.filter((o) => !STATUS_LABELS[o.status]?.done).length;

  return (
    <div className="min-h-screen bg-ink pb-24 pt-28 text-paper md:pt-36">
      <div className="mx-auto max-w-[1600px] px-[var(--gutter)]">
        {/* Cabeçalho */}
        <header className="mb-14 grid grid-cols-1 items-end gap-6 border-b border-line pb-10 md:grid-cols-12">
          <div className="min-w-0 md:col-span-9">
            <p className="eyebrow mb-5">Minha conta</p>
            <h1 className="font-display text-[clamp(2.75rem,8vw,7.5rem)] font-semibold uppercase leading-[0.88] tracking-[-0.05em]">
              <LineReveal
                onMount
                label={`Olá, ${firstName}`}
                lines={[
                  'Olá,',
                  <span key="name" className="font-serif-accent break-words">
                    {firstName}
                  </span>,
                ]}
              />
            </h1>
          </div>
          <div className="flex items-center justify-between gap-4 md:col-span-3 md:flex-col md:items-end">
            <p className="eyebrow md:text-right">
              {ordersLoading ? '··' : orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
              {activeOrders > 0 && ` · ${activeOrders} em andamento`}
            </p>
            <button type="button" onClick={handleLogout} className="btn-secondary">
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Sair
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Navegação lateral */}
          <nav aria-label="Seções da conta" className="hidden md:col-span-3 md:block">
            <ul className="sticky top-24 border-t border-line">
              {SECTIONS.map((s, i) => (
                <li key={s.id} className="border-b border-line">
                  <a href={`#${s.id}`} className="group flex items-baseline gap-4 py-3">
                    <span className="eyebrow tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-display text-sm font-medium uppercase tracking-[0.06em] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1">
                      {s.label}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-20 md:col-span-9">
            {/* Pedidos */}
            <section id="pedidos" aria-labelledby="pedidos-title" className="scroll-mt-24">
              <h2 id="pedidos-title" className={sectionTitle}>
                Meus pedidos
              </h2>

              {ordersLoading ? (
                <div className="space-y-3" aria-hidden>
                  {[0, 1].map((n) => (
                    <div key={n} className="h-40 bg-ink-2 motion-safe:animate-pulse" />
                  ))}
                </div>
              ) : ordersError ? (
                <p className="border-y border-line py-10 text-center text-sm text-paper-2">
                  Não foi possível carregar seus pedidos. Tente novamente mais tarde.
                </p>
              ) : orders.length === 0 ? (
                <div className="border-y border-line py-16 text-center">
                  <p className="eyebrow mb-3">Nenhum pedido ainda</p>
                  <p className="mb-8 text-paper-2">Quando você comprar, o acompanhamento aparece aqui.</p>
                  <button type="button" onClick={() => onNavigate('products')} className="btn-secondary">
                    Ver catálogo
                  </button>
                </div>
              ) : (
                <ul className="border-t border-line">
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      formatPrice={formatPrice}
                      onCancelled={handleOrderCancelled}
                      onError={(message) => showToast(message, 'error')}
                    />
                  ))}
                </ul>
              )}
            </section>

            {/* Endereços */}
            <section id="enderecos" className="scroll-mt-24">
              <AddressesSection userName={user.name} />
            </section>

            {/* Dados */}
            <section id="dados" aria-labelledby="dados-title" className="scroll-mt-24">
              <h2 id="dados-title" className={sectionTitle}>
                Dados da conta
              </h2>
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                <dl className="space-y-6">
                  <div>
                    <dt className={fieldLabel}>Nome</dt>
                    <dd>
                      {editingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            maxLength={80}
                            autoFocus
                            className={fieldInput}
                            aria-label="Novo nome"
                          />
                          <button type="button" onClick={saveName} disabled={savingName} className="btn-icon" aria-label="Salvar nome">
                            {savingName ? (
                              <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" strokeWidth={1.75} />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingName(false)}
                            disabled={savingName}
                            className="btn-icon"
                            aria-label="Cancelar edição"
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-h-12 items-center justify-between gap-2 border-b border-line">
                          <span className="min-w-0 break-words">{user.name}</span>
                          <button type="button" onClick={startEdit} className="btn-icon -mr-2" aria-label="Editar nome">
                            <Pencil className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className={fieldLabel}>E-mail</dt>
                    <dd className="flex min-h-12 items-center break-all border-b border-line">{user.email}</dd>
                  </div>
                  <div>
                    <dt className={fieldLabel}>Tipo de conta</dt>
                    <dd className="flex min-h-12 items-center border-b border-line">
                      {user.role === 'admin' ? 'Administrador' : 'Cliente'}
                    </dd>
                  </div>
                </dl>
                <PersonalDetailsSection />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OrderRowProps {
  order: Order;
  formatPrice: (value: number) => string;
  onCancelled: (orderId: string, refunded: boolean) => void;
  onError: (message: string) => void;
}

function OrderRow({ order, formatPrice, onCancelled, onError }: OrderRowProps) {
  const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
  const items = order.items as unknown as OrderItemView[];

  return (
    <li className="grid grid-cols-1 gap-6 border-b border-line py-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow break-all">
            #{String(order.id).slice(0, 8)} — {new Date(order.createdAt).toLocaleDateString('pt-BR')}
          </p>
          <span className="flex items-center gap-2 font-display text-[12px] font-medium uppercase tracking-[0.06em]">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                order.status === 'cancelled' ? 'border border-mute' : status.done ? 'border border-paper' : 'bg-paper'
              }`}
            />
            <span className={order.status === 'cancelled' ? 'text-mute' : ''}>{status.label}</span>
          </span>
        </div>

        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={item.id ?? i} className="break-words text-sm">
              <span className="font-mono text-mute">{item.quantity}×</span> {item.productName}
              {(item.selectedColor || item.selectedSize) && (
                <span className="text-mute"> · {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <span className="eyebrow">Total</span>
          <span className="font-mono text-base tabular-nums">{formatPrice(Number(order.totalAmount))}</span>
        </div>
      </div>

      <div className="space-y-3 lg:col-span-7">
        <OrderJourney order={order} />

        {(order.shippingServiceName || order.trackingCode) && (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
            {order.shippingServiceName && <span className="text-paper-2">Entrega: {order.shippingServiceName}</span>}
            {order.trackingCode && (
              <a
                href={`https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(order.trackingCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link-line flex items-center gap-1.5 break-all font-mono text-[13px]"
              >
                Rastrear {order.trackingCode}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              </a>
            )}
          </div>
        )}

        <CancelOrderButton order={order} onCancelled={onCancelled} onError={onError} />
      </div>
    </li>
  );
}
