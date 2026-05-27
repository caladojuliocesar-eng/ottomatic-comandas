export const BUSINESS_CONFIG = {
  // ==========================================
  // 1. IDENTIFICAÇÃO & CONFIGURAÇÕES GERAIS
  // ==========================================
  name: "GastroComandas",
  subtitle: "OttoMatic Hub Demo",
  whatsappNumber: "5511999999999", // Formato: CódigoPaís + DDD + Número (sem espaços ou traços)
  currency: "R$",

  // ==========================================
  // 2. DESIGN & UX (TEMAS)
  // ==========================================
  // Altere as cores abaixo usando OKLCH, HEX, RGB ou cores do CSS standard.
  // Modelos de Temas prontos para copiar e colar:
  // 
  // 🍔 Tema Hamburgueria (Vermelho/Laranja e Escuro):
  //    primaryColor: "#f97316", // Laranja laranja-500
  //    primaryHoverColor: "#ea580c",
  //    successColor: "#22c55e",
  //    bgColor: "#0f172a", // Slate-900
  //
  // ☕ Tema Cafeteria (Margarida/Marrom e Bege):
  //    primaryColor: "#b45309", // Âmbar amber-700
  //    primaryHoverColor: "#92400e",
  //    successColor: "#16a34a",
  //    bgColor: "#1c1917", // Stone-900
  //
  // 🥗 Tema Saudável/Restaurante (Verde e Escuro Premium):
  //    primaryColor: "#10b981", // Esmeralda emerald-500
  //    primaryHoverColor: "#059669",
  //    successColor: "#34d399",
  //    bgColor: "#064e3b", // Deep forest green
  //
  theme: {
    primaryColor: "oklch(0.62 0.23 273.4)", // Violeta (Padrão)
    primaryHoverColor: "oklch(0.56 0.24 271.8)",
    successColor: "oklch(0.72 0.18 149.3)", // Verde Sucesso
    bgColor: "oklch(0.12 0.02 254)", // Slate/Grafite Escuro
    borderRadius: "1.5rem" // Arredondamento dos botões e painéis
  },
  
  // Chaves de armazenamento local para evitar colisões
  storageKeys: {
    activeOrders: "otto_comandas_active_orders",
    salesHistory: "otto_comandas_sales_history"
  },
  
  // ==========================================
  // 3. CARDÁPIO (ITENS, PREÇOS E CUSTOS)
  // ==========================================
  // name: Nome exibido ao atendente
  // price: Preço de venda ao cliente final
  // cost: Custo de insumos/ingredientes (usado para calcular o lucro estimado)
  // category: Categoria do item (organiza a tela de vendas)
  menu: [
    // Categoria: Hambúrgueres
    { id: 1, name: "X-Burguer Clássico", price: 22.00, cost: 11.00, category: "Hambúrgueres" },
    { id: 2, name: "Cheddar Bacon", price: 28.50, cost: 14.00, category: "Hambúrgueres" },
    { id: 3, name: "Duplo Smash Burguer", price: 34.00, cost: 16.50, category: "Hambúrgueres" },
    
    // Categoria: Espetos
    { id: 10, name: "Espetinho de Carne", price: 10.00, cost: 4.50, category: "Espetos" },
    { id: 11, name: "Espetinho de Frango c/ Bacon", price: 10.00, cost: 4.20, category: "Espetos" },
    { id: 12, name: "Espetinho de Queijo Coalho", price: 9.00, cost: 3.50, category: "Espetos" },
    
    // Categoria: Bebidas
    { id: 50, name: "Refrigerante Lata", price: 6.00, cost: 2.50, category: "Bebidas" },
    { id: 51, name: "Água Mineral", price: 4.00, cost: 1.00, category: "Bebidas" },
    { id: 52, name: "Cerveja Long Neck", price: 10.00, cost: 5.00, category: "Bebidas" },
    { id: 53, name: "Suco Natural", price: 8.00, cost: 3.00, category: "Bebidas" },

    // Categoria: Sobremesas
    { id: 80, name: "Pudim de Leite", price: 12.00, cost: 4.00, category: "Sobremesas" },
    { id: 81, name: "Brownie com Sorvete", price: 18.00, cost: 7.00, category: "Sobremesas" }
  ]
};

