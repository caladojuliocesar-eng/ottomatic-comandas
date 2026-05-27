import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ChevronLeft,
  CreditCard,
  Wallet,
  Trash2,
  Share2,
  CheckCircle2,
  Package,
  TrendingUp,
  Receipt,
  ShoppingCart,
  X,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BUSINESS_CONFIG } from './data/config';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const MENU = BUSINESS_CONFIG.menu;

export default function AppOffline() {
  const [activeOrders, setActiveOrders] = useState(() => {
    const saved = localStorage.getItem(BUSINESS_CONFIG.storageKeys.activeOrders);
    return saved ? JSON.parse(saved) : [];
  });

  const [salesHistory, setSalesHistory] = useState(() => {
    const saved = localStorage.getItem(BUSINESS_CONFIG.storageKeys.salesHistory);
    return saved ? JSON.parse(saved) : [];
  });

  const [activeView, setActiveView] = useState('orders'); // 'orders', 'menu', 'report'
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem(BUSINESS_CONFIG.storageKeys.activeOrders, JSON.stringify(activeOrders));
  }, [activeOrders]);

  useEffect(() => {
    localStorage.setItem(BUSINESS_CONFIG.storageKeys.salesHistory, JSON.stringify(salesHistory));
  }, [salesHistory]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const createNewOrder = () => {
    if (!customerName.trim()) return;
    const newOrder = {
      id: Date.now(),
      customer: customerName.trim().toUpperCase(),
      items: {},
      createdAt: new Date().toISOString()
    };
    setActiveOrders([...activeOrders, newOrder]);
    setCustomerName('');
    setShowNewOrderModal(false);
    openOrderDetails(newOrder.id);
  };

  const openOrderDetails = (id) => {
    setSelectedOrderId(id);
    setActiveView('menu');
  };

  const updateQty = (itemId, change) => {
    setActiveOrders(prev => prev.map(order => {
      if (order.id === selectedOrderId) {
        const newItems = { ...order.items };
        newItems[itemId] = (newItems[itemId] || 0) + change;
        if (newItems[itemId] <= 0) delete newItems[itemId];
        return { ...order, items: newItems };
      }
      return order;
    }));
  };

  const calcOrderTotal = (order) => {
    if (!order) return 0;
    return Object.entries(order.items).reduce((acc, [id, qty]) => {
      const item = MENU.find(i => i.id == id);
      return acc + ((item?.price || 0) * (qty));
    }, 0);
  };

  const currentOrder = activeOrders.find(o => o.id === selectedOrderId);
  const currentTotal = calcOrderTotal(currentOrder);

  const finishOrder = (method) => {
    const orderToFinish = activeOrders.find(o => o.id === selectedOrderId);
    if (!orderToFinish) return;

    const sale = {
      id: Date.now(),
      customer: orderToFinish.customer,
      total: currentTotal,
      method,
      items: { ...orderToFinish.items },
      date: new Date().toISOString()
    };

    setSalesHistory([...salesHistory, sale]);
    setActiveOrders(activeOrders.filter(o => o.id !== selectedOrderId));
    setShowCheckoutModal(false);
    setActiveView('orders');
    showToast('Comanda Finalizada!');
  };

  const deleteOrder = (id) => {
    if (confirm('Deseja realmente excluir esta comanda?')) {
      setActiveOrders(activeOrders.filter(o => o.id !== id));
      setActiveView('orders');
    }
  };

  const reportSummary = useMemo(() => {
    return salesHistory.reduce((acc, sale) => {
      acc[sale.method] = (acc[sale.method] || 0) + sale.total;
      acc.total += sale.total;
      Object.entries(sale.items).forEach(([id, qty]) => {
        const item = MENU.find(i => i.id == id);
        acc.itemCounts[id] = (acc.itemCounts[id] || 0) + (qty);
        acc.totalCost += (item?.cost || 0) * (qty);
      });
      return acc;
    }, { PIX: 0, Cartão: 0, Dinheiro: 0, total: 0, totalCost: 0, itemCounts: {} });
  }, [salesHistory]);

  const exportReport = async () => {
    if (!salesHistory.length) return alert("Sem dados para exportar.");

    const itemText = Object.entries(reportSummary.itemCounts)
      .sort((a, b) => (b[1]) - (a[1]))
      .map(([id, qty]) => {
        const item = MENU.find(i => i.id == id);
        return `• ${qty}x ${item?.name || 'Item Removido'}`;
      })
      .join('\n');

    const texto = `🔥 *FECHAMENTO ${BUSINESS_CONFIG.name.toUpperCase()}*\n📅 ${new Date().toLocaleDateString()}\n\n💰 *Total: ${BUSINESS_CONFIG.currency} ${reportSummary.total.toFixed(2)}*\n------------------\n💎 PIX: ${BUSINESS_CONFIG.currency} ${reportSummary.PIX.toFixed(2)}\n💳 Cartão: ${BUSINESS_CONFIG.currency} ${reportSummary.Cartão.toFixed(2)}\n💵 Dinheiro: ${BUSINESS_CONFIG.currency} ${reportSummary.Dinheiro.toFixed(2)}\n\n📊 *ITENS VENDIDOS:*\n${itemText}\n------------------\n✅ Total de Vendas: ${salesHistory.length}`;

    try {
      if (navigator.share) {
        await navigator.share({ text: texto });
        finalReset();
      } else {
        copyToClipboard(texto);
      }
    } catch (err) {
      copyToClipboard(texto);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Relatório Copiado!');
    setTimeout(finalReset, 1500);
  };

  const finalReset = () => {
    setSalesHistory([]);
    setShowCloseConfirmModal(false);
    setActiveView('orders');
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-slate-50 overflow-hidden">
      {/* HEADER */}
      <header className="px-5 py-4 flex justify-between items-center border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase">
            {BUSINESS_CONFIG.name}
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{BUSINESS_CONFIG.subtitle}</span>
          </div>
        </div>
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="p-2.5 bg-brand-primary rounded-2xl shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform cursor-pointer"
        >
          <Plus size={22} className="text-white" />
        </button>
      </header>

      {/* NAV TABS */}
      {activeView !== 'menu' && (
        <nav className="flex px-5 border-b border-white/5 bg-slate-950">
          <button
            onClick={() => setActiveView('orders')}
            className={cn(
              "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer",
              activeView === 'orders' ? "active-tab" : "text-slate-500"
            )}
          >
            Comandas
          </button>
          <button
            onClick={() => setActiveView('report')}
            className={cn(
              "flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer",
              activeView === 'report' ? "active-tab" : "text-slate-500"
            )}
          >
            Relatório
          </button>
        </nav>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-5 pb-32">
        <AnimatePresence mode="wait">
          {activeView === 'orders' && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {activeOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-4">
                  <div className="p-6 rounded-full bg-slate-900/50">
                    <Receipt size={40} strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium italic">Nenhuma comanda aberta</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activeOrders.map(order => (
                    <div
                      key={order.id}
                      onClick={() => openOrderDetails(order.id)}
                      className="group p-5 rounded-3xl bg-slate-900/50 border border-white/5 flex justify-between items-center active:bg-slate-900 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                          {order.customer.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200">{order.customer}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            {Object.values(order.items).reduce((a, b) => (a) + (b), 0)} itens
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-lg text-white">
                          {BUSINESS_CONFIG.currency} {calcOrderTotal(order).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4 sticky top-0 bg-slate-950 py-2 z-10">
                <button
                  onClick={() => setActiveView('orders')}
                  className="p-3 rounded-2xl bg-slate-900 border border-white/5 active:scale-95 transition-transform cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold truncate text-brand-primary uppercase">{currentOrder?.customer}</h2>
                </div>
                <button
                  onClick={() => deleteOrder(selectedOrderId)}
                  className="p-3 rounded-2xl text-red-500/50 hover:text-red-500 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {[...new Set(MENU.map(i => i.category))].map(cat => (
                <section key={cat} className="space-y-3">
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{cat}</h3>
                  <div className="grid gap-2">
                    {MENU.filter(i => i.category === cat).map(item => (
                      <div key={item.id} className="p-4 rounded-3xl bg-slate-900/50 border border-white/5 flex justify-between items-center">
                        <div className="flex-1 cursor-pointer" onClick={() => updateQty(item.id, 1)}>
                          <p className="font-bold text-slate-200">{item.name}</p>
                          <p className="text-brand-primary font-bold text-xs">{BUSINESS_CONFIG.currency} {item.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {currentOrder?.items[item.id] > 0 && (
                            <div className="flex items-center gap-3 bg-slate-950 p-1 rounded-2xl">
                              <button
                                onClick={() => updateQty(item.id, -1)}
                                className="w-10 h-10 flex items-center justify-center text-slate-500 font-bold active:bg-white/5 rounded-xl cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-4 text-center font-bold text-sm">{currentOrder.items[item.id]}</span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                className="w-10 h-10 flex items-center justify-center text-brand-primary font-bold active:bg-white/5 rounded-xl cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          )}
                          {!currentOrder?.items[item.id] && (
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-brand-primary active:scale-95 transition-transform shadow-lg cursor-pointer"
                            >
                              <Plus size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          )}

          {activeView === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Total Bruto</p>
                  <p className="text-2xl font-black text-white text-center">{BUSINESS_CONFIG.currency} {reportSummary.total.toFixed(2)}</p>
                </div>
                <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 text-center">Vendas</p>
                  <p className="text-2xl font-black text-white text-center">{salesHistory.length}</p>
                </div>
              </div>

              <div className="p-3 rounded-3xl bg-brand-primary/5 border border-white/5 space-y-1">
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">💎 PIX</span>
                  <span className="font-bold text-cyan-400">{BUSINESS_CONFIG.currency} {reportSummary.PIX.toFixed(2)}</span>
                </div>
                <div className="p-4 flex justify-between items-center border-t border-white/5">
                  <span className="text-sm font-medium text-slate-400">💳 Cartão</span>
                  <span className="font-bold text-purple-400">{BUSINESS_CONFIG.currency} {reportSummary.Cartão.toFixed(2)}</span>
                </div>
                <div className="p-4 flex justify-between items-center border-t border-white/5">
                  <span className="text-sm font-medium text-slate-400">💵 Dinheiro</span>
                  <span className="font-bold text-emerald-400">{BUSINESS_CONFIG.currency} {reportSummary.Dinheiro.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Top Itens Vendidos</h3>
                <div className="rounded-3xl bg-slate-900/50 border border-white/5 divide-y divide-white/5 overflow-hidden">
                  {Object.entries(reportSummary.itemCounts).length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-600 italic">Nenhum item vendido ainda</p>
                  ) : (
                    Object.entries(reportSummary.itemCounts)
                      .sort((a, b) => (b[1]) - (a[1]))
                      .map(([id, qty]) => {
                        const item = MENU.find(i => i.id == id);
                        return (
                          <div key={id} className="p-4 flex justify-between items-center">
                            <span className="text-sm font-medium">{item?.name || 'Item Removido'}</span>
                            <span className="px-3 py-1 rounded-full bg-slate-950 text-xs font-bold text-brand-primary border border-white/5">{qty} un</span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-slate-900 border border-brand-primary/20 text-center">
                <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-2">Margem Est. Diária</p>
                <p className="text-2xl font-black text-emerald-400 mb-1">
                  {BUSINESS_CONFIG.currency} {(reportSummary.total - reportSummary.totalCost).toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                  Custo (CMV): {BUSINESS_CONFIG.currency} {reportSummary.totalCost.toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => setShowCloseConfirmModal(true)}
                className="w-full py-5 bg-brand-success hover:bg-brand-success/90 rounded-3xl font-bold text-white shadow-xl shadow-brand-success/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={20} />
                FECHAMENTO E EXPORTAÇÃO
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM BAR (MENU VIEW) */}
      <AnimatePresence>
        {activeView === 'menu' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-5 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 z-50 max-w-md mx-auto"
          >
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Subtotal</p>
                <p className="text-3xl font-black text-white">{BUSINESS_CONFIG.currency} {currentTotal.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(true)}
                disabled={currentTotal === 0}
                className="flex-1 py-5 bg-brand-success hover:bg-brand-success/90 rounded-2xl font-bold text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart size={20} />
                FINALIZAR
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW ORDER */}
      <AnimatePresence>
        {showNewOrderModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Nova Comanda</h3>
                <button onClick={() => setShowNewOrderModal(false)} className="p-2 text-slate-500 cursor-pointer">
                  <X size={20} />
                </button>
              </div>
              <div className="relative mb-8">
                <input
                  type="text"
                  autoFocus
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value.toUpperCase())}
                  placeholder="IDENTIFICAÇÃO (EX: CLIENTE / MESA)"
                  className="w-full bg-slate-950 border border-white/5 rounded-3xl p-6 text-lg font-bold text-white focus:border-brand-primary outline-none transition-colors placeholder:text-slate-700"
                />
                <Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-800" size={24} />
              </div>
              <button
                onClick={createNewOrder}
                className="w-full py-5 bg-brand-primary hover:bg-brand-primary-hover rounded-3xl font-bold text-lg active:scale-95 transition-transform cursor-pointer"
              >
                ABRIR COMANDA
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CHECKOUT */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-xs bg-slate-900 rounded-[3rem] border border-white/10 p-8 text-center"
            >
              <div className="mb-8">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Total a Pagar</p>
                <h3 className="text-4xl font-black text-white">{BUSINESS_CONFIG.currency} {currentTotal.toFixed(2)}</h3>
              </div>

              <div className="grid gap-3 mb-8">
                <button
                  onClick={() => finishOrder('PIX')}
                  className="group py-5 px-6 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-between hover:border-cyan-500/50 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      <TrendingUp size={18} />
                    </div>
                    <span className="font-bold text-cyan-400">PIX</span>
                  </div>
                  <ChevronLeft className="rotate-180 text-slate-700 group-hover:text-cyan-400 transition-colors" size={16} />
                </button>

                <button
                  onClick={() => finishOrder('Cartão')}
                  className="group py-5 px-6 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-between hover:border-purple-500/50 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <CreditCard size={18} />
                    </div>
                    <span className="font-bold text-purple-400">CARTÃO</span>
                  </div>
                  <ChevronLeft className="rotate-180 text-slate-700 group-hover:text-purple-400 transition-colors" size={16} />
                </button>

                <button
                  onClick={() => finishOrder('Dinheiro')}
                  className="group py-5 px-6 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-between hover:border-emerald-500/50 transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Wallet size={18} />
                    </div>
                    <span className="font-bold text-emerald-400">DINHEIRO</span>
                  </div>
                  <ChevronLeft className="rotate-180 text-slate-700 group-hover:text-emerald-400 transition-colors" size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-500 hover:text-slate-400 font-bold text-sm tracking-widest uppercase cursor-pointer"
              >
                Voltar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CLOSE CONFIRM */}
      <AnimatePresence>
        {showCloseConfirmModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary mx-auto mb-6">
                <Share2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Fechar Relatório?</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4">
                O resumo do dia será gerado e todos os dados atuais serão zerados.
              </p>
              <div className="grid gap-3">
                <button
                  onClick={exportReport}
                  className="py-5 bg-brand-success hover:bg-brand-success/90 rounded-[2rem] font-bold text-lg active:scale-95 transition-transform shadow-lg shadow-brand-success/20 cursor-pointer text-white"
                >
                  EXPORTAR E ZERAR
                </button>
                <button
                  onClick={() => setShowCloseConfirmModal(false)}
                  className="py-5 bg-slate-950 border border-white/5 rounded-[2rem] font-bold text-slate-400 active:bg-white/5 transition-colors cursor-pointer"
                >
                  CONTINUAR OPERAÇÃO
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-white text-slate-950 rounded-full font-bold shadow-2xl z-[100] flex items-center gap-2"
          >
            <CheckCircle2 size={16} className="text-brand-success" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
