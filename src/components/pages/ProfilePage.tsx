import React, { useEffect, useState } from 'react';
import { User, Mail, Package, LogOut, Pencil, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import type { Order } from '../../types/ecommerce';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { tomatoApi } from '../../services/tomatoApi';
import { authService } from '../../services/authService';
import { PersonalDetailsSection } from '../profile/PersonalDetailsSection';
import { AddressesSection } from '../profile/AddressesSection';
import { OrderJourney } from '../profile/OrderJourney';
import { CancelOrderButton } from '../profile/CancelOrderButton';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

const STATUS_LABELS: Record<Order['status'], { label: string; className: string }> = {
  pending_payment: { label: 'Aguardando pagamento', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  pending: { label: 'Pendente', className: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  processing: { label: 'Pago, em preparação', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  shipped: { label: 'Enviado', className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  delivered: { label: 'Entregue', className: 'bg-green-500/15 text-green-300 border-green-500/30' },
  cancelled: { label: 'Cancelado', className: 'bg-gray-500/15 text-gray-300 border-gray-500/30' },
};
export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
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
      .then(data => { if (active) setOrders(data); })
      .catch(() => { if (active) setOrdersError(true); })
      .finally(() => { if (active) setOrdersLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated]);

  // Atualiza só o pedido cancelado (imutável), sem recarregar a lista.
  const handleOrderCancelled = (orderId: string, refunded: boolean) => {
    setOrders(prev => prev.map(o => (o.id === orderId ? { ...o, status: 'cancelled' } : o)));
    showToast(
      refunded ? 'Pedido cancelado. O estorno foi solicitado ao Mercado Pago.' : 'Pedido cancelado.',
      'success'
    );
  };
  if (isLoading) {
    return (
      <div className="pt-28 pb-24 min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="pt-28 pb-24 min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4">
          <User className="w-10 h-10 mx-auto text-gray-400" />
          <h1 className="text-xl font-extrabold uppercase tracking-wider">Entre para ver seu perfil</h1>
          <p className="text-sm text-gray-400">Faça login para acompanhar seus pedidos e dados da conta.</p>
          <button
            onClick={() => onNavigate('login-client')}
            className="w-full min-h-[44px] bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-gray-200 transition-colors"
          >
            Entrar
          </button>
        </div>
      </div>
    );
  }
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
    } catch (e: any) {
      showToast(e?.message || 'Não foi possível atualizar o nome.', 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = () => {
    logout();
    onNavigate('home');
  };
  return (
    <div className="pt-28 pb-24 min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5 p-6 rounded-3xl border border-white/10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 shrink-0 rounded-full bg-white text-black flex items-center justify-center text-xl font-extrabold uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight break-words">Meu Perfil</h1>
              <p className="text-sm text-gray-400 break-words">Gerencie sua conta e acompanhe seus pedidos.</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="min-h-[44px] flex items-center justify-center gap-2 px-5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-wider border border-white/15 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">          <section className="lg:col-span-1 bg-white/5 rounded-3xl border border-white/10 p-6 space-y-5 h-fit">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-300">Dados da conta</h2>

            <div className="space-y-1.5">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nome
              </span>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameDraft}
                    onChange={e => setNameDraft(e.target.value)}
                    maxLength={80}
                    autoFocus
                    className="flex-1 min-w-0 min-h-[44px] bg-black/60 border border-white/20 rounded-xl px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                    aria-label="Novo nome"
                  />                  <button onClick={saveName} disabled={savingName} className="tap-target flex items-center justify-center rounded-xl bg-white text-black disabled:opacity-50" aria-label="Salvar nome">
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setEditingName(false)} disabled={savingName} className="tap-target flex items-center justify-center rounded-xl bg-white/10 text-white" aria-label="Cancelar edição">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold break-words min-w-0">{user.name}</span>
                  <button onClick={startEdit} className="tap-target flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white" aria-label="Editar nome">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mail
              </span>
              <span className="text-sm text-gray-200 break-all">{user.email}</span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Tipo de conta
              </span>
              <span className="text-sm text-gray-200">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</span>
            </div>
          </section>
          <div className="lg:col-span-2 space-y-8 min-w-0">
          <PersonalDetailsSection />
          <AddressesSection userName={user.name} />
          <section className="bg-white/5 rounded-3xl border border-white/10 p-6 space-y-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4" /> Meus pedidos
            </h2>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : ordersError ? (
              <p className="text-sm text-red-300 py-8 text-center">Não foi possível carregar seus pedidos. Tente novamente mais tarde.</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-sm text-gray-400">Você ainda não fez nenhum pedido.</p>
                <button onClick={() => onNavigate('products')} className="min-h-[44px] px-6 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-full hover:bg-gray-200 transition-colors">
                  Ver catálogo
                </button>
              </div>
            ) : (              <ul className="space-y-4">
                {orders.map(order => {
                  const status = STATUS_LABELS[order.status] ?? STATUS_LABELS.pending;
                  return (
                    <li key={order.id} className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-mono text-gray-400 break-all">Pedido #{String(order.id).slice(0, 8)}</p>
                          <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className={`self-start sm:self-auto inline-flex px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {order.items.map((item: any, i: number) => (
                          <li key={item.id ?? i} className="text-sm text-gray-200 break-words">
                            {item.quantity}× {item.productName}
                            {(item.selectedColor || item.selectedSize) && (
                              <span className="text-gray-500"> · {[item.selectedColor, item.selectedSize].filter(Boolean).join(' / ')}</span>
                            )}
                          </li>
                        ))}
                      </ul>

                      <OrderJourney order={order} />

                      <CancelOrderButton
                        order={order}
                        onCancelled={handleOrderCancelled}
                        onError={message => showToast(message, 'error')}
                      />

                      {(order.shippingServiceName || order.trackingCode) && (
                        <div className="text-xs text-gray-400 space-y-1">
                          {order.shippingServiceName && <p>Entrega: {order.shippingServiceName}</p>}
                          {order.trackingCode && (
                            <p className="break-all">
                              Rastreio:{' '}
                              <a
                                href={`https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(order.trackingCode)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-white underline underline-offset-4"
                              >
                                {order.trackingCode}
                              </a>
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
                        <span className="text-base font-extrabold">{formatPrice(Number(order.totalAmount))}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          </div>
        </div>
      </div>
    </div>
  );
};