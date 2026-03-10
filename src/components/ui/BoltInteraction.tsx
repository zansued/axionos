import React, { useState, useRef, useEffect } from 'react'
import { 
  Plus, Paperclip, Image as ImageIcon, FileCode,
  SendHorizontal, Box, Zap, Bot, BarChart3, ArrowRight,
  Cog, Database, Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axionLogo from '@/assets/axion-logo.svg'

// ── Typing placeholder ───────────────────────────────────────────────────
const PLACEHOLDERS = [
  "Crie uma API REST com autenticação JWT e banco PostgreSQL...",
  "Monte um dashboard de analytics em tempo real...",
  "Construa um sistema de automação para WhatsApp...",
  "Crie uma infraestrutura de IA com deploy automático...",
  "Desenvolva um sistema de pagamentos com Stripe...",
]

function useTypingPlaceholder() {
  const [text, setText] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const phrase = PLACEHOLDERS[phraseIdx]
    const speed = deleting ? 18 : 40
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < phrase.length) {
          setText(phrase.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
        } else {
          setTimeout(() => setDeleting(true), 2200)
        }
      } else {
        if (charIdx > 0) {
          setText(phrase.slice(0, charIdx - 1))
          setCharIdx(c => c - 1)
        } else {
          setDeleting(false)
          setPhraseIdx(i => (i + 1) % PLACEHOLDERS.length)
        }
      }
    }, speed)
    return () => clearTimeout(timer)
  }, [charIdx, deleting, phraseIdx])

  return text
}

// ── Example chips ─────────────────────────────────────────────────────────
const EXAMPLES = [
  { icon: Box, label: "API REST", prompt: "Crie uma API REST com autenticação JWT e banco PostgreSQL" },
  { icon: Zap, label: "Automação", prompt: "Crie um sistema de automação com webhooks e filas" },
  { icon: Bot, label: "Agente IA", prompt: "Crie um agente de IA com memória e tool-calling" },
  { icon: BarChart3, label: "Dashboard", prompt: "Crie um dashboard de analytics em tempo real" },
]

// ── Generation steps ──────────────────────────────────────────────────────
const GEN_STEPS = [
  { icon: Cog, label: "Criando API", delay: 0 },
  { icon: Database, label: "Configurando banco", delay: 1.2 },
  { icon: Shield, label: "Criando autenticação", delay: 2.4 },
]

// ── Chat Input ────────────────────────────────────────────────────────────
function ChatInput({ onSend, onExampleClick }: {
  onSend?: (message: string) => void
  onExampleClick?: (prompt: string) => void
}) {
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingPlaceholder = useTypingPlaceholder()

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 280)}px`
    }
  }, [message])

  const handleSubmit = () => {
    if (message.trim()) {
      onSend?.(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative w-full max-w-[780px] mx-auto z-10">
      {/* Ambient glow behind box */}
      <div className="absolute -inset-3 rounded-3xl opacity-30 blur-2xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(20,136,252,0.2) 0%, transparent 70%)' }}
      />

      {/* Main input card — glassmorphism */}
      <div className="relative rounded-2xl ring-1 ring-white/[0.12] shadow-[0_8px_60px_rgba(0,0,0,0.6)]"
        style={{
          background: 'rgba(22, 22, 28, 0.85)',
          backdropFilter: 'blur(24px) saturate(150%)',
        }}
      >
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={typingPlaceholder}
            className="w-full resize-none bg-transparent text-[18px] sm:text-[20px] text-white placeholder-[#505058] px-7 pt-7 pb-4 focus:outline-none min-h-[130px] max-h-[280px] leading-relaxed tracking-[-0.01em]"
            style={{ height: '130px' }}
          />
        </div>

        <div className="flex items-center justify-between px-5 pb-5 pt-1">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="flex items-center justify-center size-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-[#5a5a60] hover:text-white transition-all duration-200 active:scale-95 border border-white/[0.06]"
              >
                <Plus className={`size-5 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </button>

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#16161a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-1.5 min-w-[190px]">
                      {[
                        { icon: <Paperclip className="size-4" />, label: 'Upload arquivo' },
                        { icon: <ImageIcon className="size-4" />, label: 'Adicionar imagem' },
                        { icon: <FileCode className="size-4" />, label: 'Importar código' }
                      ].map((item, i) => (
                        <button type="button" key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#a0a0a5] hover:bg-white/5 hover:text-white transition-all duration-150">
                          {item.icon}
                          <span className="text-sm">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!message.trim()}
            className="flex items-center gap-2.5 px-7 py-3 rounded-xl text-[15px] font-semibold text-white transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed active:scale-[0.97]"
            style={{
              background: message.trim() 
                ? 'linear-gradient(135deg, #1488fc 0%, #0d6edb 100%)' 
                : '#1488fc',
              boxShadow: message.trim() 
                ? '0 0 28px rgba(20,136,252,0.4), inset 0 1px rgba(255,255,255,0.15)' 
                : 'none',
            }}
          >
            <span>Criar projeto</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Example chips */}
      <div className="flex items-center justify-center gap-2.5 mt-6 flex-wrap">
        {EXAMPLES.map((ex, i) => (
          <motion.button
            key={ex.label}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.1, duration: 0.35 }}
            onClick={() => onExampleClick?.(ex.prompt)}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.15] text-[#7a7a82] hover:text-white transition-all duration-200 active:scale-95"
          >
            <ex.icon className="size-3.5 opacity-70" />
            <span>{ex.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Ray Background (subtler) ──────────────────────────────────────────────
function RayBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      <div className="absolute inset-0 bg-[#08080a]" />
      
      {/* Radial blue glow — reduced intensity */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: `radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.35) 0%, rgba(20, 136, 252, 0.14) 14%, rgba(20, 136, 252, 0.06) 18%, rgba(20, 136, 252, 0.02) 22%, transparent 25%)`,
          filter: 'blur(4px)',
        }}
      />

      {/* Subtle particle/grid texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Arc — reduced opacity */}
      <div 
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        <div className="absolute w-full h-full rounded-full -mt-[13px]" style={{ background: 'radial-gradient(43.89% 25.74% at 50.02% 97.24%, #0a0a0c 0%, #08080a 100%)', border: '10px solid rgba(255,255,255,0.5)', transform: 'rotate(180deg)', zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-[#08080a] -mt-[11px]" style={{ border: '14px solid rgba(183,215,246,0.3)', transform: 'rotate(180deg)', zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-[#08080a] -mt-[8px]" style={{ border: '14px solid rgba(143,193,242,0.25)', transform: 'rotate(180deg)', zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-[#08080a] -mt-[4px]" style={{ border: '14px solid rgba(100,172,246,0.2)', transform: 'rotate(180deg)', zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-[#08080a]" style={{ border: '12px solid rgba(17,114,226,0.4)', boxShadow: '0 -10px 16px rgba(17, 114, 226, 0.2)', transform: 'rotate(180deg)', zIndex: 1 }} />
      </div>
    </div>
  )
}

// ── Generation Feedback ───────────────────────────────────────────────────
function GenerationFeedback({ progress }: { progress: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-[#08080a]">
      <RayBackground />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <motion.img
          src={axionLogo}
          alt="AxionOS"
          className="h-16 w-16 drop-shadow-[0_0_30px_rgba(20,136,252,0.5)]"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2 font-display">Gerando infraestrutura...</h2>
          <p className="text-sm text-[#5a5a60]">{progress}% concluído</p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #1488fc, #4da5fc)' }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex flex-col gap-3 mt-2">
          {GEN_STEPS.map((step, i) => {
            const active = progress > (i + 1) * 25
            const current = progress > i * 25 && progress <= (i + 1) * 25
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: step.delay, duration: 0.4 }}
                className={`flex items-center gap-3 text-sm ${
                  active ? 'text-[#4da5fc]' : current ? 'text-white' : 'text-[#3a3a40]'
                }`}
              >
                <step.icon className={`size-4 ${current ? 'animate-spin' : ''}`} style={current ? { animationDuration: '2s' } : {}} />
                <span>{step.label}</span>
                {active && <span className="text-[10px] text-[#4da5fc]/60">✓</span>}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
interface BoltChatProps {
  onSubmit?: (message: string, modelId: string, assets: File[]) => void
  isGenerating?: boolean
  progress?: number
}

export function BoltStyleChat({ onSubmit, isGenerating, progress = 0 }: BoltChatProps) {
  const handleSend = (message: string) => {
    onSubmit?.(message, "auto", [])
  }

  if (isGenerating) {
    return <GenerationFeedback progress={progress} />
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-[#08080a]">
      <RayBackground />

      {/* Top nav — minimal anchor */}
      <motion.nav
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center gap-6 py-4 text-[12px] font-medium text-[#3a3a42] tracking-wide"
      >
        <span className="hover:text-[#6a6a70] cursor-pointer transition-colors">Docs</span>
        <span className="hover:text-[#6a6a70] cursor-pointer transition-colors">Templates</span>
        <span className="hover:text-[#6a6a70] cursor-pointer transition-colors">Community</span>
      </motion.nav>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(16px)', scale: 0.92 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-5"
        >
          <img 
            src={axionLogo} 
            alt="AxionOS" 
            className="h-12 w-12 mb-3 drop-shadow-[0_0_24px_rgba(20,136,252,0.35)]" 
          />
          <span className="text-[13px] font-semibold text-[#4a4a50] tracking-widest uppercase">AxionOS</span>
        </motion.div>

        {/* Headline — AxionOS as primary */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-bold text-white tracking-tight leading-[1.08] font-display">
            AxionOS
          </h1>
        </motion.div>

        {/* Descriptor */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-[13px] sm:text-[14px] text-[#4a4a52] font-semibold tracking-[0.2em] uppercase mb-6"
        >
          Autonomous Intelligent Infrastructure
        </motion.p>

        {/* Subheadline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-white/90 leading-snug font-display">
            Construa sistemas autogovernados.
          </p>
          <p className="text-lg sm:text-xl lg:text-2xl font-semibold leading-snug font-display">
            <span className="bg-gradient-to-r from-[#4da5fc] via-[#6db8ff] to-[#4da5fc] bg-clip-text text-transparent">
              Em minutos.
            </span>
          </p>
        </motion.div>

        {/* Prompt box */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex justify-center"
        >
          <ChatInput onSend={handleSend} onExampleClick={handleSend} />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-5 z-10 flex items-center gap-3 text-[11px] text-[#2a2a32]"
      >
        <span>Powered by AI infrastructure</span>
        <span>·</span>
        <span>Built with AxionOS</span>
      </motion.div>
    </div>
  )
}
