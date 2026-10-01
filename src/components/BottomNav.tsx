import { NavLink } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'

const tabs = [
  { to: '/', label: 'Work Days', labelHe: 'ימי עבודה', icon: '📅' },
  { to: '/sites', label: 'Sites', labelHe: 'אתרים', icon: '📍' },
  { to: '/workers', label: 'Workers', labelHe: 'עובדים', icon: '👷' },
  { to: '/expenses', label: 'Expenses', labelHe: 'הוצאות', icon: '💰' },
]

export default function BottomNav() {
  const { lang, toggleLang } = useLanguage()

  return (
    <nav
      style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 40,
      }}
    >
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          style={({ isActive }) => ({
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 0',
            fontSize: 10,
            fontWeight: 600,
            color: isActive ? '#2563EB' : '#9CA3AF',
            textDecoration: 'none',
            transition: 'color 0.15s',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{ fontSize: 22, marginBottom: 2, opacity: isActive ? 1 : 0.6 }}>{tab.icon}</span>
              {lang === 'he' ? tab.labelHe : tab.label}
            </>
          )}
        </NavLink>
      ))}
      <button
        onClick={toggleLang}
        style={{
          padding: '10px 12px',
          fontSize: 11,
          fontWeight: 700,
          color: '#9CA3AF',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          letterSpacing: '0.05em',
        }}
      >
        {lang === 'en' ? 'עב' : 'EN'}
      </button>
    </nav>
  )
}
