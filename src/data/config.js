export const BUSINESS_CONFIG = {
  name: "GastroComandas",
  subtitle: "OttoMatic Hub Demo",
  whatsappNumber: "5511999999999", // Format: CountryCode + AreaCode + Number (no spaces or dashes)
  currency: "R$",
  
  // Storage keys to avoid collisions when multiple demo apps run on the same browser
  storageKeys: {
    activeOrders: "otto_comandas_active_orders",
    salesHistory: "otto_comandas_sales_history"
  },
  
  // Catalog / Menu Items
  // price: Sale price to the customer
  // cost: Preparation/ingredients cost (used to calculate profit/CMV)
  menu: [
    // Category: Hambúrgueres
    { id: 1, name: "X-Burguer Clássico", price: 22.00, cost: 11.00, category: "Hambúrgueres" },
    { id: 2, name: "Cheddar Bacon", price: 28.50, cost: 14.00, category: "Hambúrgueres" },
    { id: 3, name: "Duplo Smash Burguer", price: 34.00, cost: 16.50, category: "Hambúrgueres" },
    
    // Category: Espetos
    { id: 10, name: "Espetinho de Carne", price: 10.00, cost: 4.50, category: "Espetos" },
    { id: 11, name: "Espetinho de Frango c/ Bacon", price: 10.00, cost: 4.20, category: "Espetos" },
    { id: 12, name: "Espetinho de Queijo Coalho", price: 9.00, cost: 3.50, category: "Espetos" },
    
    // Category: Bebidas
    { id: 50, name: "Refrigerante Lata", price: 6.00, cost: 2.50, category: "Bebidas" },
    { id: 51, name: "Água Mineral", price: 4.00, cost: 1.00, category: "Bebidas" },
    { id: 52, name: "Cerveja Long Neck", price: 10.00, cost: 5.00, category: "Bebidas" },
    { id: 53, name: "Suco Natural", price: 8.00, cost: 3.00, category: "Bebidas" },

    // Category: Sobremesas
    { id: 80, name: "Pudim de Leite", price: 12.00, cost: 4.00, category: "Sobremesas" },
    { id: 81, name: "Brownie com Sorvete", price: 18.00, cost: 7.00, category: "Sobremesas" }
  ]
};
