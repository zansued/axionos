import React, { useState, useRef, useEffect } from 'react'
import { 
  Plus, Paperclip, Image as ImageIcon, FileCode,
  SendHorizontal, Box, Zap, Bot, BarChart3
} from 'lucide-react'
import { motion } from 'framer-motion'
import axionLogo from '@/assets/axion-logo.svg'

// ── Typing placeholder animation ──────────────────────────────────────────
const PLACEHOLDERS = [
  "Crie uma API REST com autenticação JWT...",
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
    const speed = deleting ? 20 : 45
    const timer = setTimeout(() => {
      if (!deleting) {
        if (charIdx < phrase.length) {
          setText(phrase.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
        } else {
          setTimeout(() => setDeleting(true), 2000)
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
  { icon: Box, label: "API REST" },
  { icon: Zap, label: "Automação" },
  { icon: Bot, label: "Agente IA" },
  { icon: BarChart3, label: "Dashboard" },
]

// ── Chat Input ────────────────────────────────────────────────────────────
export function ChatInput({ onSend, onExampleClick }: {
  onSend?: (message: string) => void
  onExampleClick?: (example: string) => void
}) {
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingPlaceholder = useTypingPlaceholder()

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`
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
    <div className="relative w-full max-w-[740px] mx-auto z-10">
      {/* Outer glow */}
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.1] to-transparent pointer-events-none" />
      <div className="absolute -inset-1 rounded-2xl opacity-40 blur-xl pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(20,136,252,0.15) 0%, transparent 70%)' }}
      />

      <div className="relative rounded-2xl bg-[#1a1a1f]/90 ring-1 ring-white/[0.08] shadow-[0_4px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={typingPlaceholder}
            className="w-full resize-none bg-transparent text-[16px] text-white placeholder-[#4a4a50] px-6 pt-6 pb-4 focus:outline-none min-h-[120px] max-h-[240px] leading-relaxed"
            style={{ height: '120px' }}
          />
        </div>

        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="flex items-center justify-center size-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-[#6a6a6f] hover:text-white transition-all duration-200 active:scale-95"
              >
                <Plus className={`size-4.5 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </button>

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-2 z-50 bg-[#1a1a1e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-1.5 min-w-[180px]">
                      {[
                        { icon: <Paperclip className="size-4" />, label: 'Upload arquivo' },
                        { icon: <ImageIcon className="size-4" />, label: 'Adicionar imagem' },
                        { icon: <FileCode className="size-4" />, label: 'Importar código' }
                      ].map((item, i) => (
                        <button type="button" key={i} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[#a0a0a5] hover:bg-white/5 hover:text-white transition-all duration-150">
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
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#1488fc] hover:bg-[#1a94ff] text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_24px_rgba(20,136,252,0.35)]"
          >
            <span>Criar projeto</span>
            <SendHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* Example chips */}
      <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
        {EXAMPLES.map((ex, i) => (
          <motion.button
            key={ex.label}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.08, duration: 0.3 }}
            onClick={() => onExampleClick?.(ex.label)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-[#8a8a8f] hover:text-white transition-all duration-200 active:scale-95 backdrop-blur-sm"
          >
            <ex.icon className="size-3.5" />
            <span>{ex.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

// ── Ray Background (subtle) ───────────────────────────────────────────────
export function RayBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      <div className="absolute inset-0 bg-[#0a0a0c]" />
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: `radial-gradient(circle at center 800px, rgba(20, 136, 252, 0.5) 0%, rgba(20, 136, 252, 0.2) 14%, rgba(20, 136, 252, 0.1) 18%, rgba(20, 136, 252, 0.04) 22%, transparent 25%)`,
          filter: 'blur(2px)',
        }}
      />
      <div 
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        <div className="absolute w-full h-full rounded-full -mt-[13px]" style={{ background: 'radial-gradient(43.89% 25.74% at 50.02% 97.24%, #0c0c0e 0%, #0a0a0c 100%)', border: '12px solid rgba(255,255,255,0.7)', transform: 'rotate(180deg)', zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0a0a0c] -mt-[11px]" style={{ border: '18px solid rgba(183,215,246,0.5)', transform: 'rotate(180deg)', zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0a0a0c] -mt-[8px]" style={{ border: '18px solid rgba(143,193,242,0.4)', transform: 'rotate(180deg)', zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0a0a0c] -mt-[4px]" style={{ border: '18px solid rgba(100,172,246,0.35)', transform: 'rotate(180deg)', zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-[#0a0a0c]" style={{ border: '16px solid rgba(17,114,226,0.6)', boxShadow: '0 -12px 20px rgba(17, 114, 226, 0.35)', transform: 'rotate(180deg)', zIndex: 1 }} />
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

  const handleExampleClick = (label: string) => {
    const prompts: Record<string, string> = {
      "API REST": "Crie uma API REST com autenticação JWT e banco PostgreSQL",
      "Automação": "Crie um sistema de automação com webhooks e filas",
      "Agente IA": "Crie um agente de IA com memória e tool-calling",
      "Dashboard": "Crie um dashboard de analytics em tempo real",
    }
    onSubmit?.(prompts[label] || label, "auto", [])
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full overflow-hidden bg-[#0a0a0c]">
      <RayBackground />

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-4">
        {/* Logo with entrance animation */}
        <motion.div
          initial={{ opacity: 0, filter: 'blur(12px)', scale: 0.9 }}
          animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center mb-6"
        >
          <img 
            src={axionLogo} 
            alt="AxionOS" 
            className="h-14 w-14 mb-4 drop-shadow-[0_0_20px_rgba(20,136,252,0.4)]" 
          />
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-2"
        >
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.15] font-display">
            Construa sistemas inteligentes.
            <br />
            <span className="bg-gradient-to-r from-[#4da5fc] via-[#6db8ff] to-[#4da5fc] bg-clip-text text-transparent">
              Em minutos.
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[15px] sm:text-base text-[#6a6a70] font-medium mb-10 text-center max-w-md"
        >
          Descreva o que você quer criar e o AxionOS monta a infraestrutura.
        </motion.p>

        {/* Prompt box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex justify-center"
        >
          <ChatInput onSend={handleSend} onExampleClick={handleExampleClick} />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-6 z-10 flex items-center gap-4 text-[11px] text-[#3a3a40]"
      >
        <span>Powered by AI infrastructure</span>
        <span className="text-[#2a2a30]">·</span>
        <span>Built with AxionOS</span>
      </motion.div>
    </div>
  )
}
