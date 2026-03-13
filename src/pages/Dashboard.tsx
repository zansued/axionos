import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { AppLayout } from "@/components/AppLayout";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";
import { ArrowRight, Settings, Zap, Bot, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import axionLogo from "@/assets/axion-logo.svg";
import { GlowingEffect } from "@/components/ui/GlowingEffect";
import NeuralBackground from "@/components/ui/NeuralBackground";

const IDEA_KEY = "axion_initial_idea";

const QUICK_IDEAS_PT: Record<string, string[]> = {
  "API REST": [
    "Construir uma API REST para gestão de usuários com auth JWT",
    "Criar uma API CRUD para rastreamento de inventário com rate limiting",
    "Projetar uma API REST com webhooks para processamento de pagamentos",
    "Construir uma API REST multi-tenant com controle de acesso baseado em roles",
  ],
  "Automação": [
    "Automatizar pipeline de deploy com rollback em falha",
    "Construir um workflow que sincroniza dados do CRM a cada hora",
    "Criar um pipeline orientado a eventos que processa pedidos recebidos",
    "Automatizar escalonamento de infraestrutura baseado em padrões de tráfego",
  ],
  "Agente IA": [
    "Construir um agente IA que faz triagem de tickets de suporte",
    "Criar um agente autônomo de code review com guardrails de segurança",
    "Projetar um agente de pesquisa multi-etapas que resume descobertas",
    "Construir um agente IA que monitora logs e sugere correções",
  ],
  "Dashboard": [
    "Criar um dashboard de analytics em tempo real para métricas SaaS",
    "Construir um dashboard de monitoramento DevOps com gestão de alertas",
    "Projetar um dashboard executivo com KPIs e análise de tendências",
    "Criar um dashboard de gestão de frota com rastreamento GPS ao vivo",
  ],
};

const QUICK_IDEAS_EN: Record<string, string[]> = {
  "REST API": [
    "Build a REST API for user management with JWT auth",
    "Create a CRUD API for inventory tracking with rate limiting",
    "Design a webhook-driven REST API for payment processing",
    "Build a multi-tenant REST API with role-based access control",
  ],
  "Automation": [
    "Automate deployment pipeline with rollback on failure",
    "Build a workflow that syncs CRM data every hour",
    "Create an event-driven pipeline that processes incoming orders",
    "Automate infrastructure scaling based on traffic patterns",
  ],
  "AI Agent": [
    "Build an AI agent that triages customer support tickets",
    "Create an autonomous code review agent with safety guardrails",
    "Design a multi-step research agent that summarizes findings",
    "Build an AI agent that monitors logs and suggests fixes",
  ],
  "Dashboard": [
    "Create a real-time analytics dashboard for SaaS metrics",
    "Build a DevOps monitoring dashboard with alert management",
    "Design an executive dashboard with KPIs and trend analysis",
    "Create a fleet management dashboard with live GPS tracking",
  ],
};

const QUICK_IDEA_ICONS_PT: Record<string, React.ReactNode> = {
  "API REST": <Settings className="size-4" />,
  "Automação": <Zap className="size-4" />,
  "Agente IA": <Bot className="size-4" />,
  "Dashboard": <BarChart3 className="size-4" />,
};

const QUICK_IDEA_ICONS_EN: Record<string, React.ReactNode> = {
  "REST API": <Settings className="size-4" />,
  "Automation": <Zap className="size-4" />,
  "AI Agent": <Bot className="size-4" />,
  "Dashboard": <BarChart3 className="size-4" />,
};

function LandingPage() {
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPt = locale === "pt-BR";
  const quickIdeas = isPt ? QUICK_IDEAS_PT : QUICK_IDEAS_EN;
  const quickIdeaIcons = isPt ? QUICK_IDEA_ICONS_PT : QUICK_IDEA_ICONS_EN;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (!message.trim()) return;
    sessionStorage.setItem(IDEA_KEY, message);
    navigate("/auth");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickIdea = (category: string) => {
    const ideas = quickIdeas[category];
    const randomIdea = ideas[Math.floor(Math.random() * ideas.length)];
    setMessage(randomIdea);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-background">
      {/* Neural particle background */}
      <div className="absolute inset-0 z-0">
        <NeuralBackground
          color="hsl(198, 100%, 50%)"
          trailOpacity={0.08}
          particleCount={500}
          speed={0.2}
        />
      </div>

      {/* Planet / Sun-rise effect */}
      <div
        className="absolute left-1/2 w-[1600px] h-[1600px] sm:w-[3043px] sm:h-[2865px] pointer-events-none z-[2]"
        style={{ bottom: "-2500px", transform: "translateX(-50%)" }}
      >
        <div className="absolute w-full h-full rounded-full" style={{ background: "radial-gradient(43.89% 25.74% at 50.02% 2.76%, hsl(var(--surface-deep)) 0%, hsl(var(--background)) 100%)", border: "2px solid rgba(255,255,255,0.9)", boxShadow: "0 0 40px 8px rgba(255,255,255,0.25), 0 0 80px 20px rgba(20, 136, 252, 0.3)", zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[2px]" style={{ border: "12px solid #b7d7f6", zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[4px]" style={{ border: "12px solid #8fc1f2", zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[6px]" style={{ border: "12px solid #64acf6", zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[8px]" style={{ border: "10px solid #1172e2", boxShadow: "0 0 30px 10px rgba(17, 114, 226, 0.5)", zIndex: 1 }} />
      </div>

      {/* Radial glow above planet */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] pointer-events-none z-[3]"
        style={{
          bottom: 0,
          background:
            "radial-gradient(circle at center 100%, rgba(20, 136, 252, 0.8) 0%, rgba(20, 136, 252, 0.35) 8%, rgba(20, 136, 252, 0.18) 12%, rgba(20, 136, 252, 0.08) 16%, transparent 22%)",
        }}
      />

      {/* Sign in — top right */}
      <div className="absolute top-6 right-8 z-20">
        <button
          onClick={() => navigate("/auth")}
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("landing.signIn")}
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 -mt-8">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <img
            src={axionLogo}
            alt="AxionOS Logo"
            className="h-14 w-14 drop-shadow-[0_0_32px_hsl(198_100%_50%_/_0.35)]"
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-6xl sm:text-7xl font-bold font-display tracking-tight mb-3"
        >
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #ffffff 0%, #4da5fc 100%)",
            }}
          >
            Axion
          </span>
          <span className="text-foreground font-bold">OS</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18 }}
          className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-muted-foreground font-medium mb-6 text-center"
        >
          {t("landing.tagline")}
        </motion.p>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-base sm:text-lg text-muted-foreground/80 mb-14 text-center max-w-lg"
        >
          {t("landing.subtitle")}
        </motion.p>

        {/* Chat input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="w-full max-w-[680px]"
        >
          <div className="relative rounded-2xl bg-card ring-1 ring-border shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
            <GlowingEffect
              spread={40}
              glow
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={2}
            />
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("landing.placeholder")}
              className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground/50 px-5 pt-5 pb-3 focus:outline-none min-h-[80px] max-h-[200px] rounded-2xl"
              style={{ height: "80px" }}
            />

            <div className="flex items-center justify-end px-4 pb-4 pt-1">
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary/90 hover:bg-primary text-primary-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 glow-primary"
              >
                <span>{t("landing.createProject")}</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Quick idea chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-2 mt-6"
        >
          {Object.keys(quickIdeas).map((category) => (
            <button
              key={category}
              onClick={() => handleQuickIdea(category)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border border-border bg-card/50 hover:bg-card text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-95"
            >
              {quickIdeaIcons[category]}
              <span>{category}</span>
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem(IDEA_KEY);
      if (saved) {
        sessionStorage.removeItem(IDEA_KEY);
      }
    }
  }, [user]);

  if (!loading && user) {
    return (
      <AppLayout>
        <OperationalDashboard />
      </AppLayout>
    );
  }

  return <LandingPage />;
}
