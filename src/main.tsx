import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminCalculator from './pages/AdminCalculator.tsx'
import { LanguageProvider } from './i18n/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import PasswordGate from './components/PasswordGate.tsx'

const ADMIN_HASH = '#/admin-prada-calc'

function Root() {
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash === ADMIN_HASH)

  useEffect(() => {
    const onHashChange = () => setIsAdmin(window.location.hash === ADMIN_HASH)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (isAdmin) return <AdminCalculator />

  return (
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PasswordGate>
      <Root />
    </PasswordGate>
  </StrictMode>,
)
