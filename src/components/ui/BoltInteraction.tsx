import React, { useState, useRef, useEffect } from 'react'
import { 
  SendHorizontal, Box, Zap, Bot, BarChart3, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axionLogo from '@/assets/axion-logo.svg'
import NeuralBackground from './NeuralBackground'
import { GlowingEffect } from './glowing-effect'

// ── Typing placeholder ───────────────────────────────────────────────────
const PLACEHOLDERS = [
  "Build a REST API with JWT auth and PostgreSQL...",
  "Create a real-time analytics dashboard...",
  "Design an automation system with webhooks and queues...",
  "Deploy an AI infrastructure with auto-scaling...",
  "Build a payment system with Stripe integration...",
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
  { icon: Box, label: "REST API", prompt: "Build a REST API with JWT authentication and PostgreSQL" },
  { icon: Zap, label: "Automation", prompt: "Create an automation system with webhooks and queues" },
  { icon: Bot, label: "AI Agent", prompt: "Build an AI agent with memory and tool-calling" },
  { icon: BarChart3, label: "Dashboard", prompt: "Create a real-time analytics dashboard" },
]


// ── Chat Input ────────────────────────────────────────────────────────────
function ChatInput({ onSend, initialMessage }: {
  onSend?: (message: string) => void
  initialMessage?: string
}) {
  const [message, setMessage] = useState(initialMessage || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingPlaceholder = useTypingPlaceholder()

  // Pick up initialMessage when it changes (e.g. after login)
  useEffect(() => {
    if (initialMessage && !message) {
      setMessage(initialMessage)
      textareaRef.current?.focus()
    }
  }, [initialMessage])

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

      {/* Main input card — glassmorphism with glow */}
      <div className="relative rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6)]"
        style={{
          background: 'rgba(22, 22, 28, 0.85)',
          backdropFilter: 'blur(24px) saturate(150%)',
        }}
      >
        <GlowingEffect
          spread={40}
          glow
          disabled={false}
          proximity={200}
          inactiveZone={0.4}
          borderWidth={2}
          blur={4}
          movementDuration={1.5}
        />
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
            <span>Create project</span>
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
            onClick={() => {
              setMessage(ex.prompt)
              textareaRef.current?.focus()
            }}
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

// ── Ray Background (subtler — transparent fill so shaders show through) ──
function RayBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-[1]">
      {/* Radial blue glow */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: `radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.30) 0%, rgba(20, 136, 252, 0.12) 14%, rgba(20, 136, 252, 0.05) 18%, rgba(20, 136, 252, 0.015) 22%, transparent 25%)`,
          filter: 'blur(6px)',
        }}
      />

      {/* Subtle grid texture */}
      <div className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Planet horizon — solid fill + glowing rim */}
      <div 
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        {/* Solid planet body */}
        <div className="absolute w-full h-full rounded-full" style={{ background: 'radial-gradient(ellipse at 50% 97%, #0c0c10 0%, #08080a 40%, #06060a 100%)', transform: 'rotate(180deg)', zIndex: 0 }} />
        {/* Atmospheric glow at the rim */}
        <div className="absolute w-full h-full rounded-full -mt-[2px]" style={{ background: 'transparent', border: '2px solid rgba(255,255,255,0.3)', boxShadow: '0 0 60px 8px rgba(20,136,252,0.12), 0 0 20px 2px rgba(100,180,255,0.08)', transform: 'rotate(180deg)', zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full mt-[2px]" style={{ background: 'transparent', border: '1px solid rgba(183,215,246,0.12)', boxShadow: '0 0 40px 4px rgba(20,136,252,0.06)', transform: 'rotate(180deg)', zIndex: 4 }} />
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
      <NeuralBackground className="z-0" />
      <RayBackground />


      <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-4" style={{ marginTop: '-6vh' }}>
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(16px)', scale: 0.92 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-4"
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
          <h1 className="text-4xl sm:text-5xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.08]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
          className="text-[12px] sm:text-[13px] text-white/75 font-medium tracking-[0.25em] uppercase mb-12"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Autonomous Intelligent Infrastructure for the AI Era
        </motion.p>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="text-[15px] sm:text-[17px] lg:text-[19px] text-white/70 font-normal mb-10 whitespace-nowrap"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          Describe what you want to build — we orchestrate the rest.
        </motion.p>

        {/* Prompt box */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex justify-center"
        >
          <ChatInput onSend={handleSend} />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-5 z-10 flex items-center gap-3 text-[11px] text-white/20"
      >
        <span>Powered by AI infrastructure</span>
        <span>·</span>
        <span>Built with AxionOS</span>
      </motion.div>
    </div>
  )
}
