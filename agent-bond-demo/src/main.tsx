/// <reference types="vite/client" />
// @ts-nocheck
import { Buffer } from 'buffer'
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  window.global = window
  window.process = window.process || { env: {} }
}

import { createRoot } from 'react-dom/client'
import { WalletProvider } from './WalletContext'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <WalletProvider>
    <App />
  </WalletProvider>,
)
