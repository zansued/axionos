import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Lightbulb, Layers, Globe, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/contexts/I18nContext";

const ONBOARDING_KEY = "axionos-onboarding-complete";

interface OnboardingContextType {
  showOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({ showOnboarding: () => {} });

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { currentOrg } = useOrg();
  const { locale } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = locale === "en-US" ? [
    {
      icon: Rocket,
      title: "Welcome to AxionOS",
      description: "Transform your product idea into a validated, deployed application — automatically. AxionOS handles architecture, code generation, testing, and deployment.",
      color: "text-primary",
    },
    {
      icon: Lightbulb,
      title: "1. Describe your idea",
      description: "Tell us what you want to build. Our AI analyzes your idea, evaluates feasibility, and creates a structured project plan — in seconds.",
      color: "text-accent",
    },
    {
      icon: Layers,
      title: "2. Watch it get built",
      description: "The pipeline automatically generates architecture, code, tests, and documentation. You approve each major step before moving forward.",
      color: "text-primary",
    },
    {
      icon: Globe,
      title: "3. Get a live product",
      description: "Your validated code is published to GitHub and deployed. You get a working URL, a real repository, and full traceability of every decision.",
      color: "text-accent",
    },
    {
      icon: BarChart3,
      title: "4. Track everything",
      description: "See exactly how long it took, how much it cost, and where things succeeded or failed. Full transparency, always.",
      color: "text-primary",
    },
  ] : [
    {
      icon: Rocket,
      title: "Bem-vindo ao AxionOS",
      description: "Transforme sua ideia de produto em uma aplicação validada e publicada — automaticamente. O AxionOS cuida da arquitetura, geração de código, testes e deploy.",
      color: "text-primary",
    },
    {
      icon: Lightbulb,
      title: "1. Descreva sua ideia",
      description: "Diga o que você quer construir. Nossa IA analisa sua ideia, avalia viabilidade e cria um plano estruturado — em segundos.",
      color: "text-accent",
    },
    {
      icon: Layers,
      title: "2. Acompanhe a construção",
      description: "O pipeline gera automaticamente arquitetura, código, testes e documentação. Você aprova cada etapa importante antes de avançar.",
      color: "text-primary",
    },
    {
      icon: Globe,
      title: "3. Receba um produto real",
      description: "Seu código validado é publicado no GitHub e deployado. Você recebe uma URL funcional, um repositório real e rastreabilidade completa.",
      color: "text-accent",
    },
    {
      icon: BarChart3,
      title: "4. Acompanhe tudo",
      description: "Veja exatamente quanto tempo levou, quanto custou e onde teve sucesso ou falha. Transparência total, sempre.",
      color: "text-primary",
    },
  ];

  useEffect(() => {
    if (user && currentOrg) {
      const key = `${ONBOARDING_KEY}-${user.id}`;
      const done = localStorage.getItem(key);
      if (!done) {
        const timer = setTimeout(() => setOpen(true), 800);
        return () => clearTimeout(timer);
      }
    }
  }, [user, currentOrg]);

  const complete = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}-${user.id}`, "true");
    }
    setOpen(false);
    setStep(0);
  };

  const showOnboarding = () => {
    setStep(0);
    setOpen(true);
  };

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <OnboardingContext.Provider value={{ showOnboarding }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => { if (!v) complete(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px]">
                {step + 1} / {steps.length}
              </Badge>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2.5 rounded-xl bg-muted ${currentStep.color}`}>
                    <currentStep.icon className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-lg font-display">{currentStep.title}</DialogTitle>
                </div>
                <DialogDescription className="text-sm leading-relaxed">
                  {currentStep.description}
                </DialogDescription>
              </motion.div>
            </AnimatePresence>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex items-center justify-center gap-1.5 py-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/20"
                }`}
              />
            ))}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={complete} className="text-muted-foreground">
              {locale === "en-US" ? "Skip" : "Pular"}
            </Button>
            <div className="flex-1" />
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                {locale === "en-US" ? "Back" : "Voltar"}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => isLast ? complete() : setStep(s => s + 1)}
              className="gap-1.5"
            >
              {isLast ? (
                <><CheckCircle2 className="h-4 w-4" /> {locale === "en-US" ? "Get Started" : "Começar"}</>
              ) : (
                <>{locale === "en-US" ? "Next" : "Próximo"} <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}
