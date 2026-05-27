import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BUSINESS_CONFIG } from './data/config'

// Injetar variáveis de tema dinamicamente a partir do BUSINESS_CONFIG
if (BUSINESS_CONFIG.theme) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', BUSINESS_CONFIG.theme.primaryColor);
  root.style.setProperty('--brand-primary-hover', BUSINESS_CONFIG.theme.primaryHoverColor);
  root.style.setProperty('--brand-success', BUSINESS_CONFIG.theme.successColor);
  root.style.setProperty('--brand-bg', BUSINESS_CONFIG.theme.bgColor);
  root.style.setProperty('--radius', BUSINESS_CONFIG.theme.borderRadius);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

