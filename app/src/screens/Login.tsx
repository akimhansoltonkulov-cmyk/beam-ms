import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { IconBack } from '../components/Icons'
import { translations } from '../lib/i18n'

interface Country {
  name: string
  code: string
  iso: string
}

const COUNTRIES: Country[] = [
  { name: 'United States', code: '+1', iso: 'us' },
  { name: 'Russia', code: '+7', iso: 'ru' },
  { name: 'Kazakhstan', code: '+7', iso: 'kz' },
  { name: 'Kyrgyzstan', code: '+996', iso: 'kg' },
  { name: 'United Kingdom', code: '+44', iso: 'gb' },
  { name: 'Germany', code: '+49', iso: 'de' },
  { name: 'France', code: '+33', iso: 'fr' },
  { name: 'Ukraine', code: '+380', iso: 'ua' },
  { name: 'Belarus', code: '+375', iso: 'by' },
]

const getFlagUrl = (iso: string) => `https://flagcdn.com/w40/${iso.toLowerCase()}.png`

export default function Login() {
  const login = useStore((s) => s.login)
  const register = useStore((s) => s.register)
  const booting = useStore((s) => s.booting)
  const [step, setStep] = useState<'phone' | 'code' | 'register'>('phone')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(['', '', '', ''])
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0])
  const [showDropdown, setShowDropdown] = useState(false)
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  const phoneValid = phone.replace(/\D/g, '').length >= 6
  const codeValid = code.every((c) => c !== '')

  const currentLang = ['ru', 'kz', 'by', 'ua', 'kg'].includes(selectedCountry.iso.toLowerCase()) ? 'ru' : 'en'
  const t = (key: string) => translations[currentLang]?.[key] || translations['en'][key] || key

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = d
    setCode(next)
    if (d && i < 3) codeRefs.current[i + 1]?.focus()
  }

  const handleVerify = async () => {
    if (!codeValid) return
    const fullPhone = selectedCountry.code + phone.trim()
    const res = await login(fullPhone)
    if (mode === 'login') {
      if (!res.exists) {
        alert(t('user_not_found'))
      }
    } else {
      if (res.exists) {
        alert(t('user_already_exists'))
      } else {
        setStep('register')
      }
    }
  }

  const handleRegister = async () => {
    if (!name.trim() || !handle.trim()) return
    const fullPhone = selectedCountry.code + phone.trim()
    const autoLang = ['ru', 'kz', 'by', 'ua', 'kg'].includes(selectedCountry.iso.toLowerCase()) ? 'ru' : 'en'
    const success = await register(fullPhone, name, handle, autoLang)
    if (!success) {
      alert(
        currentLang === 'ru'
          ? 'Ошибка регистрации. Пожалуйста, убедитесь, что вы создали таблицу "profiles" в панели Supabase SQL Editor, или обновите вкладку браузера (чтобы загрузить Supabase SDK).'
          : 'Registration failed. Please make sure you have created the "profiles" table in the Supabase SQL Editor dashboard, or reload your browser tab (to load the Supabase SDK).'
      )
    }
  }

  return (
    <div className="app-wash relative flex h-full w-full items-center justify-center overflow-hidden px-6">
      <div className="relative w-full max-w-[420px]">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BeamMark />
          <h1 className="mt-6 text-display text-black">{t('welcome')}</h1>
          <p className="mt-2 max-w-[300px] text-body-s text-grey-mid">
            {t('brand_desc')}
          </p>
        </div>

        <div className="rounded-card bg-white p-6 shadow-card">
          {step !== 'register' && (
            <div className="mb-6 flex rounded-pill bg-grey-soft p-1 relative select-none">
              <div
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-pill shadow-card transition-all duration-200"
                style={{ left: mode === 'login' ? '4px' : 'calc(50% - 0px)' }}
              />
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setStep('phone')
                }}
                className={`relative z-10 flex-1 py-2 text-center text-body-s font-bold rounded-pill transition-colors outline-none ${
                  mode === 'login' ? 'text-black' : 'text-grey-mid hover:text-black'
                }`}
              >
                {t('login_tab')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setStep('phone')
                }}
                className={`relative z-10 flex-1 py-2 text-center text-body-s font-bold rounded-pill transition-colors outline-none ${
                  mode === 'register' ? 'text-black' : 'text-grey-mid hover:text-black'
                }`}
              >
                {t('register_tab')}
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <label className="mb-2 block text-body-s font-semibold text-grey-mid">{t('phone_number')}</label>
                <div className="relative flex items-center gap-2 rounded-ctrl bg-grey-soft px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 text-body-l font-bold text-ink border-r border-grey-line pr-2 outline-none select-none hover:opacity-85"
                  >
                    <img
                      src={getFlagUrl(selectedCountry.iso)}
                      alt={selectedCountry.name}
                      className="w-6 h-4 object-cover rounded-sm border border-grey-line shrink-0"
                    />
                    <span>{selectedCountry.code}</span>
                    <span className="text-[9px] text-grey-mid ml-0.5">▼</span>
                  </button>

                  <input
                    autoFocus
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && phoneValid && setStep('code')}
                    placeholder="555 000 1234"
                    className="w-full bg-transparent text-body-l font-medium text-ink outline-none placeholder:text-grey-mid"
                  />

                  {showDropdown && (
                    <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-48 overflow-y-auto rounded-ctrl bg-white p-1.5 shadow-card border border-grey-line beam-scroll">
                      {COUNTRIES.map((c) => (
                        <button
                          key={`${c.name}-${c.code}`}
                          type="button"
                          onClick={() => {
                            setSelectedCountry(c)
                            setShowDropdown(false)
                          }}
                          className="flex w-full items-center justify-between rounded-btn px-3 py-2.5 text-left hover:bg-grey-soft transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <img
                              src={getFlagUrl(c.iso)}
                              alt={c.name}
                              className="w-6 h-4 object-cover rounded-sm border border-grey-line shrink-0"
                            />
                            <span className="text-body-s font-bold text-ink">{c.name}</span>
                          </div>
                          <span className="text-body-s font-extrabold text-grey-mid">{c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  disabled={!phoneValid}
                  onClick={() => setStep('code')}
                  className="focus-lime mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-black py-4 text-btn text-lime transition disabled:opacity-40"
                >
                  {t('continue')}
                </button>
              </motion.div>
            ) : step === 'code' ? (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  onClick={() => setStep('phone')}
                  className="mb-3 inline-flex items-center gap-1 text-body-s font-semibold text-grey-mid hover:text-ink"
                >
                  <IconBack size={16} /> {t('edit_number')}
                </button>
                <label className="mb-2 block text-body-s font-semibold text-grey-mid">
                  {t('enter_code')} +{phone || '···'}
                </label>
                <div className="flex justify-between gap-3">
                  {code.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => (codeRefs.current[i] = el)}
                      autoFocus={i === 0}
                      inputMode="numeric"
                      value={c}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs.current[i - 1]?.focus()
                        if (e.key === 'Enter' && codeValid) handleVerify()
                      }}
                      className="focus-lime h-16 w-full rounded-ctrl bg-grey-soft text-center text-2xl font-bold text-ink outline-none focus:bg-lime-tint"
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-body-s text-grey-mid">{t('demo_code_hint')}</p>
                <button
                  disabled={!codeValid || booting}
                  onClick={handleVerify}
                  className="focus-lime mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-black py-4 text-btn text-lime transition disabled:opacity-40"
                >
                  {booting ? (
                    <>
                      <span className="beam-spin inline-block h-4 w-4 rounded-full border-2 border-lime border-t-transparent" />
                      {t('checking_reg')}
                    </>
                  ) : (
                    <>
                      {t('enter_beam')}
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="space-y-3.5"
              >
                <div>
                  <label className="mb-1 block text-body-s font-semibold text-grey-mid">{t('your_name')}</label>
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-ctrl bg-grey-soft px-4 py-3 text-body-l font-medium text-ink outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-body-s font-semibold text-grey-mid">{t('nickname')}</label>
                  <div className="flex items-center gap-1 rounded-ctrl bg-grey-soft px-4 py-3">
                    <span className="text-body-l font-semibold text-grey-mid">@</span>
                    <input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="johndoe"
                      className="w-full bg-transparent text-body-l font-medium text-ink outline-none"
                    />
                  </div>
                </div>
                <button
                  disabled={!name.trim() || !handle.trim() || booting}
                  onClick={handleRegister}
                  className="focus-lime mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-black py-4 text-btn text-lime transition disabled:opacity-40"
                >
                  {booting ? (
                    <>
                      <span className="beam-spin inline-block h-4 w-4 rounded-full border-2 border-lime border-t-transparent" />
                      {t('creating_acc')}
                    </>
                  ) : (
                    <>
                      {t('complete_reg')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setName('')
                    setHandle('')
                    setPhone('')
                    setCode(['', '', '', ''])
                  }}
                  className="mt-3 block w-full text-center text-body-s font-semibold text-grey-mid hover:text-black transition-colors"
                >
                  {t('already_account')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function BeamMark() {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center rounded-[26px] bg-black shadow-lift">
      <span className="text-4xl font-extrabold text-lime">B</span>
      <span className="absolute inset-0 animate-pulse-ring rounded-[26px] border border-lime/40" />
    </div>
  )
}
