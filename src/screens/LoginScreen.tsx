import { useState } from 'react'
import { loginUser, registerUser } from '../auth/auth'
import { useLanguage } from '../context/LanguageContext'

export default function LoginScreen() {
  const { s, lang, toggleLang } = useLanguage()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await loginUser(email, password)
      } else {
        await registerUser(email, password, name)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gray-50">
      <button onClick={toggleLang} className="absolute top-4 end-4 text-sm text-gray-500 font-medium">
        {lang === 'en' ? 'עב' : 'EN'}
      </button>

      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === 'login' ? s.login : s.register}
        </h1>
        <p className="text-sm text-gray-400 mb-8">Work Tracker</p>

        <div className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="label">{s.name}</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={s.name} />
            </div>
          )}
          <div>
            <label className="label">{s.email}</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label">{s.password}</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? s.loading : (mode === 'login' ? s.login : s.register)}
          </button>
        </div>

        <button
          className="mt-4 text-sm text-blue-600 w-full text-center"
          onClick={() => setMode(m => m === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? s.noAccount : s.hasAccount}
        </button>
      </div>
    </div>
  )
}
