import React, { useState, useRef, useEffect } from 'react'
import { 
  Plus, Paperclip, Image as ImageIcon, FileCode,
  SendHorizontal, Bolt
} from 'lucide-react'
import axionLogo from '@/assets/axion-logo.svg'

// CHAT INPUT
export function ChatInput({ onSend, placeholder = "O que você quer construir?" }: {
  onSend?: (message: string) => void
  placeholder?: string
}) {
  const [message, setMessage] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
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
    <div className="relative w-full max-w-[680px] mx-auto z-10">
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
      <div className="relative rounded-2xl bg-[hsl(var(--card))] ring-1 ring-white/[0.08] shadow-[0_2px_20px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder-muted-foreground/50 px-5 pt-5 pb-3 focus:outline-none min-h-[80px] max-h-[200px]"
            style={{ height: '80px' }}
          />
        </div>

        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="flex items-center justify-center size-8 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
              >
                <Plus className={`size-4 transition-transform duration-200 ${showAttachMenu ? 'rotate-45' : ''}`} />
              </button>

              {showAttachMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                  <div className="absolute bottom-full left-0 mb-2 z-50 bg-popover/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="p-1.5 min-w-[180px]">
                      {[
                        { icon: <Paperclip className="size-4" />, label: 'Upload arquivo' },
                        { icon: <ImageIcon className="size-4" />, label: 'Adicionar imagem' },
                        { icon: <FileCode className="size-4" />, label: 'Importar código' }
                      ].map((item, i) => (
                        <button type="button" key={i} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-150">
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
            >
              <span className="hidden sm:inline">Criar</span>
              <SendHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Ray Background
export function RayBackground() {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      <div className="absolute inset-0 bg-background" />
      <div 
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] sm:w-[6000px]"
        style={{
          background: `radial-gradient(circle at center 800px, hsl(var(--primary) / 0.8) 0%, hsl(var(--primary) / 0.35) 14%, hsl(var(--primary) / 0.18) 18%, hsl(var(--primary) / 0.08) 22%, hsl(var(--background) / 0.2) 25%)`
        }}
      />
      <div 
        className="absolute top-[175px] left-1/2 w-[1600px] h-[1600px] sm:top-1/2 sm:w-[3043px] sm:h-[2865px]"
        style={{ transform: 'translate(-50%) rotate(180deg)' }}
      >
        <div className="absolute w-full h-full rounded-full -mt-[13px]" style={{ background: `radial-gradient(43.89% 25.74% at 50.02% 97.24%, hsl(var(--background)) 0%, hsl(var(--background)) 100%)`, border: '16px solid white', transform: 'rotate(180deg)', zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-background -mt-[11px]" style={{ border: '23px solid #b7d7f6', transform: 'rotate(180deg)', zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-background -mt-[8px]" style={{ border: '23px solid #8fc1f2', transform: 'rotate(180deg)', zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-background -mt-[4px]" style={{ border: '23px solid #64acf6', transform: 'rotate(180deg)', zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-background" style={{ border: '20px solid hsl(var(--primary))', boxShadow: '0 -15px 24.8px hsl(var(--primary) / 0.6)', transform: 'rotate(180deg)', zIndex: 1 }} />
      </div>
    </div>
  )
}

// ANNOUNCEMENT BADGE COMPONENT
export function AnnouncementBadge({ text }: { text: string }) {
  return (
    <div className="relative inline-flex items-center gap-2 px-5 py-2 min-h-[40px] rounded-full text-sm overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        backdropFilter: 'blur(20px) saturate(140%)',
        boxShadow: 'inset 0 1px rgba(255,255,255,0.2), inset 0 -1px rgba(0,0,0,0.1), 0 8px 32px -8px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.08)'
      }}
    >
      <span className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none opacity-70 mix-blend-overlay" style={{ background: 'radial-gradient(ellipse at center top, rgba(255, 255, 255, 0.15) 0%, transparent 70%)' }} />
      <span className="absolute -top-px left-1/2 -translate-x-1/2 h-[2px] w-[100px] opacity-60" style={{ background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.8) 20%, hsl(var(--accent) / 0.8) 50%, hsl(var(--primary) / 0.8) 80%, transparent 100%)', filter: 'blur(0.5px)' }} />
      <Bolt className="size-4 relative z-10 text-foreground" />
      <span className="relative z-10 text-foreground font-medium">{text}</span>
    </div>
  )
}

// MAIN BOLT CHAT COMPONENT
interface BoltChatProps {
  announcementText?: string
  placeholder?: string
  onSubmit?: (message: string, modelId: string, assets: File[]) => void
}

export function BoltStyleChat({
  announcementText = "AxionOS v11.0",
  placeholder = "O que você quer construir?",
  onSubmit,
}: BoltChatProps) {
  const handleSend = (message: string) => {
    onSubmit?.(message, "auto", [])
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-48px)] w-full overflow-hidden bg-background rounded-lg">
      <RayBackground />

      {/* Announcement badge */}
      <div className="absolute top-10 sm:top-16 z-10">
        <AnnouncementBadge text={announcementText} />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl px-4 mt-12">
        {/* AxionOS Branding */}
        <div className="flex flex-col items-center mb-8">
          <img src={axionLogo} alt="AxionOS" className="h-16 w-16 mb-4 drop-shadow-[0_0_24px_hsl(var(--primary)/0.4)]" />
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-2 font-display">
            <span className="text-gradient">Axion</span>OS
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">
            Autonomous Intelligent Infrastructure
          </p>
        </div>

        {/* Prompt headline */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            O que você vai{' '}
            <span className="bg-gradient-to-b from-primary via-primary to-foreground bg-clip-text text-transparent italic">
              construir
            </span>
            {' '}hoje?
          </h2>
        </div>

        <ChatInput placeholder={placeholder} onSend={handleSend} />
      </div>
    </div>
  )
}
