import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import styles from './App.css?inline'
import App from './App.tsx'

const ROOT_ID = 'flatmap-extension-root'

if (!document.getElementById(ROOT_ID)) {
  const host = document.createElement('div')
  host.id = ROOT_ID

  const shadowRoot = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  const reactRoot = document.createElement('div')

  style.textContent = styles
  shadowRoot.append(style, reactRoot)
  document.body.append(host)

  createRoot(reactRoot).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
