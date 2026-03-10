import React, { useState, useRef, useEffect } from 'react'
import { 
  SendHorizontal, Box, Zap, Bot, BarChart3, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axionLogo from '@/assets/axion-logo.svg'
import NeuralBackground from './NeuralBackground'

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


// ── Chat Input ────────────────────────────────────────────────────────────
function ChatInput({ onSend, onExampleClick }: {
  onSend?: (message: string) => void
  onExampleClick?: (prompt: string) => void
}) {
  const [message, setMessage] = useState('')
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

        <div className="flex items-center justify-end px-5 pb-5 pt-1">

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


// ── Main Component ────────────────────────────────────────────────────────
interface BoltChatProps {
  onSubmit?: (message: string, modelId: string, assets: File[]) => void
}

export function BoltStyleChat({ onSubmit }: BoltChatProps) {
  const handleSend = (message: string) => {
    onSubmit?.(message, "auto", [])
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-[#08080a]">
      <NeuralBackground className="z-[1]" />
      <RayBackground />


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
            className="h-12 w-12 drop-shadow-[0_0_24px_rgba(20,136,252,0.35)]" 
          />
        </motion.div>

        {/* Headline — AxionOS with gradient */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2"
        >
          <h1 className="text-4xl sm:text-5xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.08] font-display">
            <span className="bg-gradient-to-r from-[#b4d8ff] via-[#6db8ff] to-[#1a6fcc] bg-clip-text text-transparent">
              Axion
            </span>
            <span className="text-white">OS</span>
          </h1>
        </motion.div>

        {/* Descriptor */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="text-[13px] sm:text-[14px] text-white/80 font-semibold tracking-[0.2em] uppercase mb-6"
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
          <p className="text-[15px] sm:text-[17px] lg:text-[19px] text-[#7a7a84] font-medium leading-relaxed max-w-lg mx-auto">
            Describe the intelligent system you want to orchestrate.
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
