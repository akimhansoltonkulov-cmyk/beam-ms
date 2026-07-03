import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'
import { IconArrowUpRight, IconBolt, IconBack, IconLock, IconShield } from '../components/Icons'

export default function Login() {
  const login = useStore((s) => s.login)
  const booting = useStore((s) => s.booting)
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(['', '', '', ''])
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  const phoneValid = phone.replace(/\D/g, '').length >= 8
  const codeValid = code.every((c) => c !== '')

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = d
    setCode(next)
    if (d && i < 3) codeRefs.current[i + 1]?.focus()
  }

  return (
    <div className="app-wash relative flex h-full w-full items-center justify-center overflow-hidden px-6">
      {/* ambient dotted graphic (Design.pdf §5 dotted patterns) */}
      <div className="halftone pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-40" />
      <div className="halftone pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full opacity-30" />

      <div className="relative w-full max-w-[420px]">
        {/* Brand mark */}
        <div className="mb-8 flex flex-col items-center text-center">
          <BeamMark />
          <h1 className="mt-6 text-display text-black">Welcome to Beam</h1>
          <p className="mt-2 max-w-[300px] text-body-s text-grey-mid">
            An independent messenger. Instant delivery, minimal metadata, full transparency.
          </p>
        </div>

        <div className="rounded-card bg-white p-6 shadow-card">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <label className="mb-2 block text-body-s font-semibold text-grey-mid">Phone number</label>
                <div className="flex items-center gap-2 rounded-ctrl bg-grey-soft px-4 py-3.5">
                  <span className="text-body-l font-semibold text-ink">+</span>
                  <input
                    autoFocus
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && phoneValid && setStep('code')}
                    placeholder="1 555 000 1234"
                    className="w-full bg-transparent text-body-l font-medium text-ink outline-none placeholder:text-grey-mid"
                  />
                </div>
                <button
                  disabled={!phoneValid}
                  onClick={() => setStep('code')}
                  className="focus-lime mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-black py-4 text-btn text-lime transition disabled:opacity-40"
                >
                  Continue <IconArrowUpRight size={18} />
                </button>
              </motion.div>
            ) : (
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
                  <IconBack size={16} /> Edit number
                </button>
                <label className="mb-2 block text-body-s font-semibold text-grey-mid">
                  Enter the code sent to +{phone || '···'}
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
                        if (e.key === 'Enter' && codeValid) login()
                      }}
                      className="focus-lime h-16 w-full rounded-ctrl bg-grey-soft text-center text-2xl font-bold text-ink outline-none focus:bg-lime-tint"
                    />
                  ))}
                </div>
                <p className="mt-2 text-center text-body-s text-grey-mid">Demo — enter any 4 digits.</p>
                <button
                  disabled={!codeValid || booting}
                  onClick={login}
                  className="focus-lime mt-4 flex w-full items-center justify-center gap-2 rounded-btn bg-black py-4 text-btn text-lime transition disabled:opacity-40"
                >
                  {booting ? (
                    <>
                      <span className="beam-spin inline-block h-4 w-4 rounded-full border-2 border-lime border-t-transparent" />
                      Establishing binary link…
                    </>
                  ) : (
                    <>
                      Enter Beam <IconBolt size={18} />
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 flex items-center justify-center gap-5 text-grey-mid">
          <Feat icon={<IconBolt size={15} />} label="<200ms" />
          <Feat icon={<IconLock size={15} />} label="E2E ready" />
          <Feat icon={<IconShield size={15} />} label="Zero trackers" />
        </div>
      </div>

      <AnimatePresence>{booting && <ColdStart />}</AnimatePresence>
    </div>
  )
}

function Feat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-body-s font-semibold">
      {icon}
      {label}
    </span>
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

// Cold Start overlay (<1.5s) — mirrors the "warming WASM core" narrative
function ColdStart() {
  const steps = ['Loading WASM core', 'Opening binary WebSocket', 'Hydrating chats (delta)']
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-dark absolute inset-0 z-50 flex flex-col items-center justify-center gap-6 text-white"
    >
      <div className="relative flex h-24 w-24 items-center justify-center rounded-[30px] bg-lime">
        <span className="text-5xl font-extrabold text-black">B</span>
      </div>
      <div className="w-64 space-y-2">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0.2 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.4 }}
            className="flex items-center gap-2 text-body-s"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            {s}
          </motion.div>
        ))}
      </div>
      <div className="h-1 w-64 overflow-hidden rounded-pill bg-white/20">
        <motion.div
          className="h-full bg-lime"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.3, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  )
}
