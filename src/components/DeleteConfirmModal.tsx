import { useState } from 'react'
import { useLanguage } from '../context/LanguageContext'

interface Props {
  title: string
  onConfirm: () => void
  onClose: () => void
}

export default function DeleteConfirmModal({ title, onConfirm, onClose }: Props) {
  const { s } = useLanguage()
  const [code, setCode] = useState('')
  const [wrong, setWrong] = useState(false)

  const attempt = () => {
    if (code === '123456') {
      onConfirm()
    } else {
      setWrong(true)
      setCode('')
      setTimeout(() => setWrong(false), 1500)
    }
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl mb-3">🗑️</div>
          <p className="sheet-title mb-1">{s.deleteConfirm}</p>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-xs text-gray-400 mt-1">{s.deleteWarning}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">{s.deleteCodeHint}</label>
            <input
              className={`input text-center text-lg tracking-[0.3em] font-bold transition-all ${wrong ? 'border-red-400 bg-red-50' : ''}`}
              type="tel"
              inputMode="numeric"
              maxLength={6}
              placeholder="• • • • • •"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              autoFocus
            />
            {wrong && (
              <p className="text-red-500 text-xs text-center mt-1 font-medium">{s.wrongCode}</p>
            )}
          </div>

          <button
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
            onClick={attempt}
          >
            {s.delete}
          </button>
          <button className="btn-ghost w-full" onClick={onClose}>{s.cancel}</button>
        </div>
      </div>
    </div>
  )
}
