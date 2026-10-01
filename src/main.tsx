import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabaseConfigured } from './lib/supabase'

function ConfigError() {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 600 }}>Missing configuration</h1>
      <p>
        VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. Add them to your
        hosting provider's environment variables and redeploy.
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfigured ? <App /> : <ConfigError />}
  </StrictMode>,
)
