import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, ChevronLeft, CreditCard, Wallet, Trash2, Share2, CheckCircle2,
  Package, TrendingUp, Receipt, ShoppingCart, X, Smartphone, LogOut, TrendingDown, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { auth, db } from './config/firebase';
import { BUSINESS_CONFIG } from './data/config';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  deleteDoc,
  setDoc,
  writeBatch,
  getDoc
} from 'firebase/firestore';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Consider shifts ending/starting at 6:00 AM (night sales count for previous day)
function getShiftDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export default function AppFirebase() {
  const [activeOrders, setActiveOrders] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [menu, setMenu] = useState(BUSINESS_CONFIG.menu);
  const [fixedCosts, setFixedCosts] = useState([]);
  const [closings, setClosings] = useState([]);
  
  const [activeView, setActiveView] = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [showMonthClosingModal, setShowMonthClosingModal] = useState(false);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showFixedCostsModal, setShowFixedCostsModal] = useState(false);
  const [newFixedCost, setNewFixedCost] = useState({ name: '', value: '' });

  const [customerName, setCustomerName] = useState('');
  const [toast, setToast] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorLog, setErrorLog] = useState(null);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('admin@comandas.com');
  const [loginPassword, setLoginPassword] = useState('admin123');

  // AUTH OBSERVER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // FIRESTORE SYNC: Active Orders
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/active_orders`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveOrders(orders);
    }, (err) => {
      setErrorLog(`Erro Firestore (Orders): ${err.message}`);
    });
    return () => unsubscribe();
  }, [user]);

  // FIRESTORE SYNC: Sales History
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/sales`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSalesHistory(sales);
    }, (err) => {
      setErrorLog(`Erro Firestore (Sales): ${err.message}`);
    });
    return () => unsubscribe();
  }, [user]);

  // FIRESTORE SYNC: Menu Catalog
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, `users/${user.uid}/config`, 'menu'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setMenu(docSnapshot.data().items || []);
      } else {
        setDoc(docSnapshot.ref, { items: BUSINESS_CONFIG.menu });
      }
    });
    return () => unsubscribe();
  }, [user]);

  // FIRESTORE SYNC: Fixed Costs
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/fixed_costs`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const costs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFixedCosts(costs);
    });
    return () => unsubscribe();
  }, [user]);

  // FIRESTORE SYNC: Monthly Closings
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/monthly_closings`), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClosings(docs);
    });
    return () => unsubscribe();
  }, [user]);

  // MIGRATION: Local to Firestore
  useEffect(() => {
    if (!user) return;
    const migrate = async () => {
      const saved = localStorage.getItem(BUSINESS_CONFIG.storageKeys.activeOrders);
      const localOrders = saved ? JSON.parse(saved) : [];
      if (localOrders.length === 0) return;

      for (const order of localOrders) {
        if (typeof order.id === 'number') {
          try {
            await addDoc(collection(db, `users/${user.uid}/active_orders`), {
              customer: order.customer,
              items: order.items,
              createdAt: order.createdAt || new Date().toISOString()
            });
          } catch (err) { console.error(err); }
        }
      }
      localStorage.removeItem(BUSINESS_CONFIG.storageKeys.activeOrders);
    };
    migrate();
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      showToast('Bem-vindo!');
    } catch (err) {
      setErrorLog(`Erro Login: ${err.message}`);
      showToast('Erro ao entrar. Verifique os dados.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const createNewOrder = async () => {
    if (!customerName.trim() || isProcessing) return;
    
    if (!user) {
      setErrorLog("Sessão expirada. Faça login novamente.");
      return;
    }

    setIsProcessing(true);
    try {
      const orderData = {
        customer: customerName.trim().toUpperCase(),
        items: {},
        createdAt: new Date().toISOString()
      };
      
      const createPromise = addDoc(collection(db, `users/${user.uid}/active_orders`), orderData);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Tempo esgotado: Sem resposta do Firebase.")), 8000)
      );

      const docRef = await Promise.race([createPromise, timeoutPromise]);
      
      setCustomerName('');
      setShowNewOrderModal(false);
      
      setTimeout(() => {
        openOrderDetails(docRef.id);
        showToast('Comanda Aberta!');
      }, 300);

    } catch (err) {
      setErrorLog(`Erro ao abrir comanda: ${err.message}`);
      showToast('Erro ao criar comanda.');
    } finally {
      setIsProcessing(false);
    }
  };

  const openOrderDetails = (id) => {
    setSelectedOrderId(id);
    setActiveView('menu');
  };

  const updateQty = async (itemId, change) => {
    if (!user || !selectedOrderId) return;
    const order = activeOrders.find(o => o.id === selectedOrderId);
    if (!order) return;

    const newItems = { ...order.items };
    newItems[itemId] = (newItems[itemId] || 0) + change;
    if (newItems[itemId] <= 0) delete newItems[itemId];

    try {
      await setDoc(doc(db, `users/${user.uid}/active_orders`, selectedOrderId), { ...order, items: newItems });
    } catch (err) { console.error(err); }
  };

  const cancelOrder = async () => {
    if (!selectedOrderId || !user || isProcessing) return;
    if (!window.confirm("Deseja realmente EXCLUIR esta comanda?")) return;

    setIsProcessing(true);
    try {
      await deleteDoc(doc(db, `users/${user.uid}/active_orders`, selectedOrderId));
      setActiveView('orders');
      setSelectedOrderId(null);
      showToast('Comanda Excluída.');
    } catch (err) {
      setErrorLog(`Erro ao excluir: ${err.message}`);
      showToast('Erro ao excluir.');
    } finally {
      setIsProcessing(false);
    }
  };

  const finishOrder = async (method) => {
    const orderToFinish = activeOrders.find(o => o.id === selectedOrderId);
    if (!orderToFinish || !user || isProcessing) return;

    const totalAtClick = currentTotal;
    setIsProcessing(true);
    
    const isInternal = method === 'Consumo/Cortesia';
    const sale = {
      customer: orderToFinish.customer,
      total: isInternal ? 0 : totalAtClick,
      method,
      items: Object.entries(orderToFinish.items).map(([id, qty]) => {
        const item = menu.find(i => i.id == id);
        return {
          id, qty, name: item?.name || 'Item Removido',
          price: item?.price || 0, cost: item?.cost || 0
        };
      }),
      date: new Date().toISOString()
    };

    const batch = writeBatch(db);
    const saleRef = doc(collection(db, `users/${user.uid}/sales`));
    const orderRef = doc(db, `users/${user.uid}/active_orders`, selectedOrderId);

    try {
      batch.set(saleRef, sale);
      batch.delete(orderRef);
      await batch.commit();
      
      setShowCheckoutModal(false);
      setActiveView('orders');
      setSelectedOrderId(null);
      showToast('Comanda Finalizada!');
    } catch (err) {
      setErrorLog(`Erro de Gravação: ${err.message}`);
      showToast('Erro ao finalizar.');
    } finally {
      setIsProcessing(false);
    }
  };

  const saveMenu = async (newMenu) => {
    if (!user) return;
    try {
      await setDoc(doc(db, `users/${user.uid}/config`, 'menu'), { items: newMenu });
      showToast('Menu atualizado!');
    } catch (err) { showToast('Erro ao salvar menu.'); }
  };

  const addFixedCost = async () => {
    const val = parseFloat(String(newFixedCost.value).replace(',', '.'));
    if (!user || !newFixedCost.name || isNaN(val)) return;
    try {
      await addDoc(collection(db, `users/${user.uid}/fixed_costs`), {
        name: newFixedCost.name, value: val, date: new Date().toISOString()
      });
      setNewFixedCost({ name: '', value: '' });
      setShowFixedCostsModal(false);
      showToast('Custo adicionado!');
    } catch (err) { showToast('Erro ao salvar.'); }
  };

  const deleteFixedCost = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/fixed_costs`, id));
      showToast('Removido.');
    } catch (err) { showToast('Erro.'); }
  };

  const handleCloseMonth = async () => {
    if (!user || isProcessing) return;
    
    const openSales = salesHistory.filter(sale => !sale.closed);
    if (openSales.length === 0) return alert("Não há vendas abertas para fechar.");

    setIsProcessing(true);
    try {
      const totalBruto = openSales.reduce((acc, sale) => acc + sale.total, 0);
      const totalCMV = openSales.reduce((acc, sale) => {
        const items = Array.isArray(sale.items) ? sale.items : [];
        return acc + items.reduce((c, i) => {
          const currentItemMenu = menu.find(m => m.id == i.id);
          const itemCost = currentItemMenu ? (currentItemMenu.cost ?? 0) : (i.cost ?? 0);
          return c + (itemCost * i.qty);
        }, 0);
      }, 0);
      const totalFixos = fixedCosts.reduce((acc, c) => acc + c.value, 0);

      const closingData = {
        date: new Date().toISOString(),
        totalBruto,
        totalCMV,
        totalFixos,
        lucroLiquido: (totalBruto - totalCMV) - totalFixos,
        salesCount: openSales.length
      };

      const batch = writeBatch(db);
      
      const closingRef = doc(collection(db, `users/${user.uid}/monthly_closings`));
      batch.set(closingRef, closingData);

      openSales.forEach(sale => {
        const saleRef = doc(db, `users/${user.uid}/sales`, sale.id);
        batch.update(saleRef, { closed: true, closingId: closingRef.id });
      });

      await batch.commit();
      
      setShowMonthClosingModal(false);
      showToast('Período Encerrado!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao fechar mês.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calcOrderTotal = (order) => {
    if (!order || !order.items) return 0;
    return Object.entries(order.items).reduce((acc, [id, qty]) => {
      const item = menu.find(i => i.id == id);
      return acc + ((item?.price || 0) * (qty));
    }, 0);
  };

  const currentOrder = useMemo(() => activeOrders.find(o => o.id === selectedOrderId), [activeOrders, selectedOrderId]);
  const currentTotal = useMemo(() => {
    if (!currentOrder) return 0;
    return Object.entries(currentOrder.items).reduce((acc, [id, qty]) => {
      const item = menu.find(i => i.id == id);
      return acc + ((item?.price || 0) * (qty));
    }, 0);
  }, [currentOrder, menu]);

  const reportSummary = useMemo(() => {
    const todayShiftStr = getShiftDate().toLocaleDateString();
    const todaySales = salesHistory.filter(sale => {
      const isTodayShift = getShiftDate(sale.date).toLocaleDateString() === todayShiftStr;
      return isTodayShift && !sale.closed;
    });
    return todaySales.reduce((acc, sale) => {
      acc[sale.method] = (acc[sale.method] || 0) + sale.total;
      acc.total += sale.total;
      const itemsArray = Array.isArray(sale.items) ? sale.items : Object.entries(sale.items).map(([id, qty]) => ({ id, qty, cost: menu.find(i => i.id == id)?.cost || 0 }));
      itemsArray.forEach((item) => {
        acc.itemCounts[item.id] = (acc.itemCounts[item.id] || 0) + (item.qty);
        const currentItemMenu = menu.find(m => m.id == item.id);
        acc.totalCost += (currentItemMenu?.cost || item.cost || 0) * (item.qty);
      });
      return acc;
    }, { PIX: 0, Cartão: 0, Dinheiro: 0, total: 0, totalCost: 0, itemCounts: {}, salesCount: todaySales.length });
  }, [salesHistory, menu]);

  const exportReport = async () => {
    if (!reportSummary.salesCount) return alert("Sem dados.");
    const itemText = Object.entries(reportSummary.itemCounts).sort((a, b) => (b[1]) - (a[1])).map(([id, qty]) => {
      const item = menu.find(i => i.id == id);
      return `• ${qty}x ${item?.name || 'Item Removido'}`;
    }).join('\n');

    const message = encodeURIComponent(
      `📊 *RELATÓRIO ${BUSINESS_CONFIG.name.toUpperCase()}*\n` +
      `📅 Data: ${getShiftDate().toLocaleDateString()}\n\n` +
      `💰 *VENDAS:* ${BUSINESS_CONFIG.currency} ${reportSummary.total.toFixed(2)}\n` +
      `💳 PIX: ${BUSINESS_CONFIG.currency} ${reportSummary.PIX.toFixed(2)}\n` +
      `💵 Dinheiro: ${BUSINESS_CONFIG.currency} ${reportSummary.Dinheiro.toFixed(2)}\n` +
      `💳 Cartão: ${BUSINESS_CONFIG.currency} ${reportSummary.Cartão.toFixed(2)}\n\n` +
      `📦 *ITENS VENDIDOS:*\n${itemText}`
    );
    window.open(`https://wa.me/?text=${message}`);
    setShowCloseConfirmModal(false);
  };

  const downloadCSV = () => {
    const nowShift = getShiftDate();
    const today = nowShift.toLocaleDateString('pt-BR').replace(/\//g, '-');
    const fileName = `gestao_${BUSINESS_CONFIG.name.toLowerCase()}_${today}.csv`;
    const openSales = salesHistory.filter(sale => !sale.closed);

    const totalBruto = openSales.reduce((acc, sale) => acc + sale.total, 0);
    const totalFixos = fixedCosts.reduce((acc, c) => acc + c.value, 0);
    
    const productStats = {};
    openSales.forEach(sale => {
      const items = Array.isArray(sale.items) ? sale.items : [];
      items.forEach(item => {
        if (!productStats[item.name]) {
          productStats[item.name] = { qty: 0, revenue: 0, cost: 0 };
        }
        productStats[item.name].qty += item.qty;
        productStats[item.name].revenue += (item.price || 0) * item.qty;
        const currentItemMenu = menu.find(m => m.id == item.id);
        const itemCost = currentItemMenu ? (currentItemMenu.cost ?? 0) : (item.cost ?? 0);
        productStats[item.name].cost += itemCost * item.qty;
      });
    });

    const totalCMV = Object.values(productStats).reduce((acc, p) => acc + p.cost, 0);
    const lucroLiquido = (totalBruto - totalCMV) - totalFixos;

    let csvContent = "\ufeff"; // BOM for Excel encoding support
    
    csvContent += `### RESUMO GERENCIAL - ${nowShift.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()} ###\n`;
    csvContent += `Faturamento Bruto;${BUSINESS_CONFIG.currency} ${totalBruto.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Custo de Mercadoria (CMV);${BUSINESS_CONFIG.currency} ${totalCMV.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Despesas Fixas;${BUSINESS_CONFIG.currency} ${totalFixos.toFixed(2).replace('.', ',')}\n`;
    csvContent += `LUCRO LÍQUIDO ESTIMADO;${BUSINESS_CONFIG.currency} ${lucroLiquido.toFixed(2).replace('.', ',')}\n\n`;

    csvContent += `### PERFORMANCE POR PRODUTO ###\n`;
    csvContent += `Produto;Qtd Vendida;Faturamento;Custo Total;Margem de Lucro\n`;
    Object.entries(productStats)
      .sort((a, b) => b[1].qty - a[1].qty)
      .forEach(([name, stats]) => {
        const margem = stats.revenue - stats.cost;
        csvContent += `${name};${stats.qty};${BUSINESS_CONFIG.currency} ${stats.revenue.toFixed(2).replace('.', ',')};${BUSINESS_CONFIG.currency} ${stats.cost.toFixed(2).replace('.', ',')};${BUSINESS_CONFIG.currency} ${margem.toFixed(2).replace('.', ',')}\n`;
      });
    csvContent += `\n`;

    csvContent += `### LOG DETALHADO DE VENDAS ###\n`;
    csvContent += `Data;Cliente;Metodo;Total;Itens\n`;
    openSales.forEach(sale => {
      const itemsText = (Array.isArray(sale.items) ? sale.items : []).map(i => `${i.qty}x ${i.name}`).join(' | ');
      csvContent += `${new Date(sale.date).toLocaleString()};${sale.customer};${sale.method};${BUSINESS_CONFIG.currency} ${sale.total.toFixed(2).replace('.', ',')};${itemsText}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    showToast('Relatório Gerencial Gerado!');
  };

  if (showOnboarding) {
    return (
      <div className="bg-slate-950 min-h-screen text-[#f8fafc] font-sans selection:bg-brand-primary/30">
        <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-8 pb-20 relative">
          <button 
            onClick={() => setShowOnboarding(false)} 
            className="absolute top-4 right-4 p-3 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
          <header className="text-center pt-8 pb-4 border-b border-slate-900">
            <p className="text-brand-primary text-xs font-bold uppercase tracking-[0.3em] mb-4">Manual do Sistema</p>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
              {BUSINESS_CONFIG.name}
            </h1>
            <p className="text-slate-400 text-sm">{BUSINESS_CONFIG.subtitle}</p>
          </header>

          <section className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Seu negócio, agora digital.</h2>
            <p className="text-slate-400 leading-relaxed text-sm">
              Parabéns por escolher a tecnologia **{BUSINESS_CONFIG.name}**. O aplicativo foi desenhado para agilizar o lançamento de comandas/pedidos e dar controle financeiro absoluto para a gerência de forma descomplicada.
            </p>
          </section>

          <section className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-6 text-center">
            <p className="text-brand-primary font-black uppercase text-xs tracking-widest mb-2">🚀 SISTEMA PRONTO PARA OPERAÇÃO</p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Todos os lançamentos realizados no balcão são consolidados no banco de dados e ficam imediatamente disponíveis para a gerência acompanhar.
            </p>
          </section>

          <section className="bg-slate-900 rounded-2xl p-6 border-l-4 border-brand-primary border-t border-r border-b border-slate-800 text-left">
            <h3 className="text-base font-black uppercase text-slate-200 mb-2">1. Como usar no Balcão</h3>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex gap-2">🔥 **Abrir:** Toque no (+), informe o nome/número da comanda e clique em abrir.</li>
              <li className="flex gap-2">🔥 **Lançar:** Selecione o cliente na lista e toque nos produtos do catálogo para adicionar unidades.</li>
              <li className="flex gap-2">🔥 **Fechar:** Clique em Finalizar, selecione o método (PIX, Dinheiro, Cartão) e finalize a comanda.</li>
              <li className="flex gap-2">☕ **Consumos:** Utilize a opção "Consumo/Cortesia" para registrar itens que saíram do estoque mas não geraram receita.</li>
            </ul>
          </section>

          <section className="bg-slate-900 rounded-2xl p-6 border-l-4 border-brand-success border-t border-r border-b border-slate-800 text-left">
            <h3 className="text-base font-black uppercase text-slate-200 mb-2">2. Gerenciamento do Caixa</h3>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex gap-2">📉 **Custos e Lucro:** Acesse a aba **Gestão** para definir preços e custos de cada item, e monitorar o lucro líquido estimado em tempo real.</li>
              <li className="flex gap-2">💵 **Despesas Fixas:** Lance custos mensais na aba Gestão para deduzir do faturamento bruto e calcular as margens com precisão.</li>
              <li className="flex gap-2">📅 **Fechamentos:** Exporte relatórios para Excel (CSV) e encerre períodos no final do dia ou do mês para manter o caixa zerado e organizado.</li>
            </ul>
          </section>

          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
            <p className="text-brand-primary text-xs font-black uppercase tracking-widest mb-3">📱 INSTALAÇÃO COMO APLICATIVO (PWA)</p>
            <p className="text-slate-300 text-xs leading-relaxed">
              Para maior agilidade, acesse o link do sistema no navegador do celular, clique nas opções (três pontos) e selecione **"Adicionar à tela inicial"** ou **"Instalar aplicativo"**. Ele funcionará em tela cheia igual a um app nativo.
            </p>
          </div>

          <button 
            onClick={() => setShowOnboarding(false)} 
            className="w-full text-center py-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 active:scale-95 transition-all uppercase tracking-tighter cursor-pointer"
          >
            ACESSAR O SISTEMA
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-950 text-slate-50 overflow-hidden">

      {!user ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-primary rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-brand-primary/20 mb-6">
                <Package size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase">Acesso Restrito</h2>
              <p className="text-slate-500 font-medium">{BUSINESS_CONFIG.name} - Gestão Cloud</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">E-mail de Acesso</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-brand-primary transition-colors text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Senha</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl p-4 text-white outline-none focus:border-brand-primary transition-colors text-sm" />
              </div>
              <button type="submit" disabled={isProcessing} className="w-full py-5 bg-brand-primary hover:bg-brand-primary-hover rounded-2xl font-black text-white shadow-xl shadow-brand-primary/10 active:scale-95 transition-transform cursor-pointer">
                ENTRAR NO SISTEMA
              </button>
              <button 
                type="button"
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full py-3 text-slate-600 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
              >
                Limpar Cache e Reiniciar
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          <header className="px-5 py-4 flex justify-between items-center border-b border-white/5 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase bg-gradient-to-r from-white via-slate-200 to-brand-primary bg-clip-text text-transparent">
                {BUSINESS_CONFIG.name}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-primary"></span>
                </span>
                <p className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] animate-pulse">
                  {BUSINESS_CONFIG.subtitle}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-3 bg-white/5 rounded-2xl text-slate-400 hover:bg-white/10 transition-colors cursor-pointer"><LogOut size={18} /></button>
          </header>

          <main className="flex-1 overflow-y-auto p-5 pb-32">
            <AnimatePresence mode="wait">
              {activeView === 'orders' && (
                <motion.div key="orders" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h2 className="text-2xl font-black text-white">Comandas</h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{activeOrders.length} ativas</p>
                    </div>
                    <button onClick={() => setShowNewOrderModal(true)} className="p-4 bg-brand-primary hover:bg-brand-primary-hover rounded-[1.5rem] shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform cursor-pointer"><Plus className="text-white" size={24} /></button>
                  </div>
                  <div className="grid gap-3">
                    {activeOrders.map((order) => (
                      <button key={order.id} onClick={() => openOrderDetails(order.id)} className="p-6 rounded-[2rem] bg-slate-900/40 border border-white/5 flex justify-between items-center group active:bg-slate-900 transition-colors cursor-pointer">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-lg font-bold text-slate-200 group-active:text-white">{order.customer}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-white">{BUSINESS_CONFIG.currency} {calcOrderTotal(order).toFixed(2)}</p>
                          <p className="text-[10px] font-bold text-brand-primary uppercase">Ver Itens</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeView === 'menu' && (
                <motion.div key="menu" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 pb-60">
                  {!currentOrder ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-500 font-bold animate-pulse">SINCRONIZANDO COMANDA...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <button onClick={() => setActiveView('orders')} className="p-3 bg-white/5 rounded-2xl text-slate-400 cursor-pointer"><ChevronLeft /></button>
                          <div>
                            <h2 className="text-xl font-black text-white leading-none uppercase">{currentOrder.customer}</h2>
                            <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mt-1">Lançamento</p>
                          </div>
                        </div>
                        <button 
                          onClick={cancelOrder}
                          className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 active:bg-red-500 active:text-white transition-all cursor-pointer"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                      {[...new Set(menu.map(i => i.category))].map(cat => (
                        <section key={cat} className="space-y-3">
                          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">{cat}</h3>
                          <div className="grid gap-2">
                            {menu.filter(i => i.category === cat).map(item => (
                              <div key={item.id} className="p-4 rounded-3xl bg-slate-900/50 border border-white/5 flex justify-between items-center">
                                <div className="flex-1 cursor-pointer" onClick={() => updateQty(item.id, 1)}>
                                  <p className="font-bold text-slate-200">{item.name}</p>
                                  <p className="text-sm font-black text-brand-primary">{BUSINESS_CONFIG.currency} {item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-2xl border border-white/5">
                                  <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl text-slate-400 cursor-pointer">-</button>
                                  <span className="font-bold text-white min-w-[20px] text-center">{currentOrder?.items[item.id] || 0}</span>
                                  <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center bg-brand-primary rounded-xl text-white cursor-pointer">+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                    </>
                  )}
                </motion.div>
              )}

              {activeView === 'admin' && (
                <motion.div key="admin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <h2 className="text-2xl font-black text-white">Painel Gestão</h2>
                  <div className="p-6 rounded-[2rem] bg-gradient-to-br from-slate-900 to-slate-950 border border-white/5">
                    <h3 className="text-lg font-bold mb-4 capitalize">
                      Fechamento {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </h3>
                    {(() => {
                      const openSales = salesHistory.filter(sale => !sale.closed);
                      const totalBruto = openSales.reduce((acc, sale) => acc + sale.total, 0);
                      const margemBruta = openSales.reduce((acc, sale) => {
                        const items = Array.isArray(sale.items) ? sale.items : [];
                        const cost = items.reduce((c, i) => {
                          const currentItemMenu = menu.find(m => m.id == i.id);
                          return c + ((currentItemMenu?.cost || i.cost || 0) * i.qty);
                        }, 0);
                        return acc + (sale.total - cost);
                      }, 0);
                      
                      const totalFixos = fixedCosts.reduce((acc, c) => acc + c.value, 0);

                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 rounded-2xl bg-white/5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Bruto</p>
                              <p className="text-xl font-black text-white">{BUSINESS_CONFIG.currency} {totalBruto.toFixed(2)}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Margem Bruta</p>
                              <p className="text-xl font-black text-emerald-400">{BUSINESS_CONFIG.currency} {margemBruta.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 mb-6 text-center">
                            <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Lucro Líquido Estimado</p>
                            <p className="text-3xl font-black text-white">{BUSINESS_CONFIG.currency} {(margemBruta - totalFixos).toFixed(2)}</p>
                          </div>
                        </>
                      );
                    })()}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <button onClick={() => setShowMenuEditor(true)} className="py-4 bg-slate-900 border border-white/10 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 cursor-pointer"><Package size={18} className="text-brand-primary" />PREÇOS/CUSTOS</button>
                      <button onClick={() => setShowFixedCostsModal(true)} className="py-4 bg-slate-900 border border-white/10 rounded-2xl font-bold text-xs flex flex-col items-center gap-2 cursor-pointer"><Wallet size={18} className="text-cyan-500" />DESPESAS FIXAS</button>
                    </div>
                    <button onClick={downloadCSV} className="w-full py-4 bg-brand-success hover:bg-brand-success/90 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-success/20 active:scale-95 transition-transform mb-3 cursor-pointer"><Receipt size={18} />BAIXAR EXCEL (CSV)</button>
                    <button onClick={() => setShowMonthClosingModal(true)} className="w-full py-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform mb-6 cursor-pointer"><CheckCircle2 size={18} />FECHAR PERÍODO / MÊS</button>
                    
                    <button onClick={() => setShowOnboarding(true)} className="w-full py-3 bg-slate-900 border border-white/5 rounded-xl text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-slate-300 transition-colors cursor-pointer">Ver Guia e Manual do Sistema</button>
                  </div>

                  {closings.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Histórico de Fechamentos</h3>
                      <div className="grid gap-3">
                        {closings.map(closing => (
                          <div key={closing.id} className="p-5 rounded-3xl bg-slate-900/30 border border-white/5 flex justify-between items-center">
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(closing.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                              <p className="text-sm font-bold text-slate-300">{new Date(closing.date).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-emerald-400">Lucro: {BUSINESS_CONFIG.currency} {closing.lucroLiquido.toFixed(2)}</p>
                              <p className="text-[8px] font-bold text-slate-600 uppercase">{closing.salesCount} vendas</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeView === 'report' && (
                <motion.div key="report" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                  <h2 className="text-2xl font-black text-white">Relatório Hoje</h2>
                  <div className="p-8 rounded-[2.5rem] bg-slate-900/50 border border-white/5 text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Total do Dia</p>
                    <h3 className="text-5xl font-black text-white mb-8">{BUSINESS_CONFIG.currency} {reportSummary.total.toFixed(2)}</h3>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      <div className="space-y-1"><p className="text-[8px] font-bold text-slate-500 uppercase">PIX</p><p className="font-bold text-cyan-400">{BUSINESS_CONFIG.currency} {reportSummary.PIX}</p></div>
                      <div className="space-y-1"><p className="text-[8px] font-bold text-slate-500 uppercase">Dinh.</p><p className="font-bold text-emerald-400">{BUSINESS_CONFIG.currency} {reportSummary.Dinheiro}</p></div>
                      <div className="space-y-1"><p className="text-[8px] font-bold text-slate-500 uppercase">Cart.</p><p className="font-bold text-purple-400">{BUSINESS_CONFIG.currency} {reportSummary.Cartão}</p></div>
                    </div>
                    <button onClick={() => setShowCloseConfirmModal(true)} className="w-full py-5 bg-white text-slate-950 rounded-3xl font-black text-lg active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xl shadow-white/5 cursor-pointer"><Share2 size={20} />FECHAR DIA (ZAP)</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <nav className="fixed bottom-0 left-0 right-0 p-5 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 z-40 max-w-md mx-auto">
            <div className="flex justify-around items-center bg-slate-900/80 rounded-full p-2 border border-white/10 shadow-2xl">
              {[
                { id: 'orders', icon: ShoppingCart, label: 'Comandas' },
                { id: 'admin', icon: TrendingUp, label: 'Gestão' },
                { id: 'report', icon: Receipt, label: 'Resumo' }
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveView(tab.id)} className={cn("flex flex-col items-center gap-1 px-6 py-3 rounded-full transition-all cursor-pointer", activeView === tab.id ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500 hover:text-slate-300")}>
                  <tab.icon size={20} />
                  <span className="text-[8px] font-bold uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </div>
          </nav>

          {activeView === 'menu' && (
            <div className="fixed bottom-28 left-0 right-0 px-5 max-w-md mx-auto pointer-events-none">
              <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl flex justify-between items-center pointer-events-auto">
                <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Parcial</p><p className="text-2xl font-black text-white">{BUSINESS_CONFIG.currency} {currentTotal.toFixed(2)}</p></div>
                <button onClick={() => setShowCheckoutModal(true)} disabled={currentTotal === 0} className="px-8 py-4 bg-brand-success text-white rounded-2xl font-black text-sm active:scale-95 transition-transform disabled:opacity-50 cursor-pointer">FINALIZAR</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODALS */}
      <AnimatePresence>
        {showNewOrderModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8">
              <div className="flex justify-between items-center mb-8"><h3 className="text-xl font-bold">Nova Comanda</h3><button onClick={() => setShowNewOrderModal(false)} className="cursor-pointer"><X /></button></div>
              <div className="relative mb-8"><input type="text" autoFocus value={customerName} onChange={(e) => setCustomerName(e.target.value.toUpperCase())} placeholder="EX: MESA 05 / JULIO" className="w-full bg-slate-950 border border-white/5 rounded-3xl p-6 text-lg font-bold focus:border-brand-primary outline-none text-white placeholder:text-slate-800" /><Smartphone className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-800" /></div>
              <button onClick={createNewOrder} disabled={isProcessing} className={cn("w-full py-5 rounded-3xl font-black text-lg transition-all cursor-pointer", isProcessing ? "bg-slate-800 text-slate-500" : "bg-brand-primary text-white shadow-xl shadow-brand-primary/10")}>{isProcessing ? 'ABRINDO...' : 'ABRIR COMANDA'}</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-xs bg-slate-900 rounded-[3rem] border border-white/10 p-8 text-center">
              <div className="mb-8"><p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Total a Pagar</p><h3 className="text-4xl font-black text-white">{BUSINESS_CONFIG.currency} {currentTotal.toFixed(2)}</h3></div>
              <div className="grid gap-3 mb-8">
                {['PIX', 'Cartão', 'Dinheiro', 'Consumo/Cortesia'].map(m => (
                  <button 
                    key={m} 
                    onClick={() => finishOrder(m)} 
                    disabled={isProcessing}
                    className={cn(
                      "py-4 px-6 bg-slate-950 border border-white/5 rounded-[2rem] flex items-center justify-between hover:border-brand-primary/50 transition-all active:scale-95 cursor-pointer",
                      isProcessing && "opacity-50",
                      m === 'Consumo/Cortesia' && "border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center", 
                        m==='PIX'?'bg-cyan-500/10 text-cyan-400':
                        m==='Cartão'?'bg-purple-500/10 text-purple-400':
                        m==='Dinheiro'?'bg-emerald-500/10 text-emerald-400':
                        'bg-slate-500/10 text-slate-400'
                      )}>
                        {m==='PIX'?<TrendingUp size={18}/>:
                         m==='Cartão'?<CreditCard size={18}/>:
                         m==='Dinheiro'?<Wallet size={18}/>:
                         <Coffee size={18}/>}
                      </div>
                      <span className={cn("font-bold uppercase text-[10px]", m === 'Consumo/Cortesia' ? "text-slate-500" : "text-white")}>
                        {isProcessing ? '...' : m}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-slate-500 font-bold text-xs uppercase cursor-pointer">Cancelar</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMenuEditor && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[60] flex flex-col">
            <header className="p-6 flex justify-between items-center border-b border-white/5"><h3 className="text-xl font-bold text-white">Gerenciar Produtos</h3><button onClick={() => setShowMenuEditor(false)} className="cursor-pointer"><X /></button></header>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {menu.map(item => (
                <div key={item.id} className="p-4 rounded-3xl bg-slate-900 border border-white/5 flex justify-between items-center">
                  <div><p className="font-bold text-white">{item.name}</p><div className="flex gap-4 mt-1"><p className="text-[10px] text-emerald-400 uppercase font-bold">Venda: {BUSINESS_CONFIG.currency}{item.price.toFixed(2)}</p><p className="text-[10px] text-red-400 uppercase font-bold">Custo: {BUSINESS_CONFIG.currency}{item.cost.toFixed(2)}</p></div></div>
                  <button onClick={() => setEditingItem(item)} className="p-3 bg-white/5 rounded-2xl text-brand-primary font-bold text-xs uppercase cursor-pointer">Editar</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[70] flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8">
              <h3 className="text-xl font-bold mb-6 text-center text-white">{editingItem.name}</h3>
              <div className="space-y-4 mb-8">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Preço ({BUSINESS_CONFIG.currency})</label><input type="text" inputMode="decimal" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-brand-primary transition-colors text-sm" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Custo ({BUSINESS_CONFIG.currency})</label><input type="text" inputMode="decimal" value={editingItem.cost} onChange={e => setEditingItem({...editingItem, cost: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-4 font-bold text-white outline-none focus:border-brand-primary transition-colors text-sm" /></div>
                
                {parseFloat(String(editingItem.price).replace(',', '.')) > 0 && (() => {
                  const p = parseFloat(String(editingItem.price).replace(',', '.')) || 0;
                  const c = parseFloat(String(editingItem.cost).replace(',', '.')) || 0;
                  return (
                    <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Lucro Unitário</p>
                        <p className="text-xl font-black text-white">{BUSINESS_CONFIG.currency} {(p - c).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-1">Margem</p>
                        <p className="text-xl font-black text-white">
                          {p > 0 ? (((p - c) / p) * 100).toFixed(0) : 0}%
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="grid gap-3">
                <button 
                  onClick={async () => { 
                    if (isProcessing) return;
                    setIsProcessing(true);
                    try {
                      const p = parseFloat(String(editingItem.price).replace(',', '.')) || 0;
                      const c = parseFloat(String(editingItem.cost).replace(',', '.')) || 0;
                      const itemToSave = { ...editingItem, price: p, cost: c };
                      const nm = menu.map(i => i.id === editingItem.id ? itemToSave : i); 
                      setMenu(nm);
                      await saveMenu(nm); 
                      setEditingItem(null); 
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsProcessing(false);
                    }
                  }} 
                  disabled={isProcessing}
                  className="py-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl font-black disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? 'SALVANDO...' : 'SALVAR'}
                </button>
                <button onClick={() => setEditingItem(null)} className="py-4 text-slate-500 font-bold uppercase text-xs cursor-pointer">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCloseConfirmModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-xs bg-slate-900 rounded-[2.5rem] border border-white/10 p-8 text-center">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary"><Share2 size={32} /></div>
              <h3 className="text-xl font-bold mb-2 text-white">Enviar p/ WhatsApp?</h3>
              <p className="text-slate-500 text-sm mb-8">O relatório de hoje será formatado e enviado para o seu WhatsApp.</p>
              <div className="grid gap-3">
                <button onClick={exportReport} className="py-4 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-2xl font-black shadow-lg shadow-brand-primary/20 cursor-pointer">CONFIRMAR E ENVIAR</button>
                <button onClick={() => setShowCloseConfirmModal(false)} className="py-4 text-slate-500 font-bold uppercase text-xs cursor-pointer">Agora não</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMonthClosingModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-sm bg-slate-900 rounded-[2.5rem] border border-white/10 p-8">
              <h3 className="text-xl font-bold mb-6 text-center text-white">Confirmar Fechamento?</h3>
              
              {(() => {
                const openSales = salesHistory.filter(sale => !sale.closed);
                const totalBruto = openSales.reduce((acc, sale) => acc + sale.total, 0);
                const totalFixos = fixedCosts.reduce((acc, c) => acc + c.value, 0);
                const margemBruta = openSales.reduce((acc, sale) => {
                  const items = Array.isArray(sale.items) ? sale.items : [];
                  const cost = items.reduce((c, i) => {
                    const currentItemMenu = menu.find(m => m.id == i.id);
                    const itemCost = currentItemMenu ? (currentItemMenu.cost ?? 0) : (i.cost ?? 0);
                    return c + (itemCost * i.qty);
                  }, 0);
                  return acc + (sale.total - cost);
                }, 0);
                const lucro = margemBruta - totalFixos;

                return (
                  <div className="space-y-4 mb-8">
                    <div className="p-4 rounded-2xl bg-white/5 space-y-2">
                      <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">FATURAMENTO:</span><span className="text-white">{BUSINESS_CONFIG.currency} {totalBruto.toFixed(2)}</span></div>
                      <div className="flex justify-between text-xs font-bold"><span className="text-slate-500">DESPESAS FIXAS:</span><span className="text-red-400">- {BUSINESS_CONFIG.currency} {totalFixos.toFixed(2)}</span></div>
                      <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-black"><span className="text-brand-primary uppercase">LUCRO LÍQUIDO:</span><span className="text-emerald-400">{BUSINESS_CONFIG.currency} {lucro.toFixed(2)}</span></div>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center leading-relaxed italic">
                      Ao confirmar, todas as {openSales.length} vendas do período aberto serão marcadas como consolidadas e limpas do painel.
                    </p>
                  </div>
                );
              })()}

              <div className="grid gap-3">
                <button 
                  onClick={handleCloseMonth} 
                  disabled={isProcessing}
                  className="py-5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-3xl font-black shadow-xl shadow-brand-primary/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isProcessing ? 'FECHANDO...' : 'FECHAR MÊS AGORA'}
                </button>
                <button onClick={() => setShowMonthClosingModal(false)} className="py-4 text-slate-500 font-bold uppercase text-xs cursor-pointer">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFixedCostsModal && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[60] flex flex-col">
            <header className="p-6 flex justify-between items-center border-b border-white/5"><h3 className="text-xl font-bold text-white">Despesas Fixas</h3><button onClick={() => setShowFixedCostsModal(false)} className="cursor-pointer"><X /></button></header>
            <div className="p-6">
              <div className="bg-slate-900 rounded-3xl p-4 border border-white/5 space-y-3 mb-6">
                <input placeholder="Nome (Ex: Aluguel)" value={newFixedCost.name} onChange={e => setNewFixedCost({...newFixedCost, name: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-3 text-sm text-white outline-none focus:border-brand-primary" />
                <input type="text" inputMode="decimal" placeholder="Valor (R$)" value={newFixedCost.value} onChange={e => setNewFixedCost({...newFixedCost, value: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-2xl p-3 text-sm text-white outline-none focus:border-brand-primary" />
                <button onClick={addFixedCost} className="w-full py-3 bg-cyan-600 rounded-2xl font-black text-xs uppercase text-white cursor-pointer">Adicionar</button>
              </div>
              <div className="space-y-2">
                {fixedCosts.map(cost => (
                  <div key={cost.id} className="p-4 rounded-2xl bg-white/5 flex justify-between items-center">
                    <div><p className="font-bold text-sm text-white">{cost.name}</p><p className="text-xs text-slate-500 font-bold">{BUSINESS_CONFIG.currency} {cost.value.toFixed(2)}</p></div>
                    <button onClick={() => deleteFixedCost(cost.id)} className="text-red-500 p-2 cursor-pointer"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -50, opacity: 0 }} className="fixed top-8 left-1/2 -translate-x-1/2 px-6 py-3 bg-white text-slate-950 rounded-full font-black shadow-2xl z-[300] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-brand-success" />
            <span className="text-xs uppercase tracking-widest">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
