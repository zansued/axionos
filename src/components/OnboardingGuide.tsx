import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrg } from "@/contexts/OrgContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, Lightbulb, Users, Hammer, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ONBOARDING_KEY = "axionos-onboarding-complete";

const steps = [
  {
    icon: Rocket,
    title: "Bem-vindo ao AxionOS",
    description: "Uma plataforma de governança de pipelines de IA. Agentes autônomos planejam, executam, validam e publicam projetos com supervisão humana.",
    color: "text-primary",
  },
  {
    icon: Lightbulb,
    title: "1. Crie uma Iniciativa",
    description: "Descreva sua ideia de projeto. O pipeline de Discovery analisa viabilidade, mercado e escopo MVP automaticamente.",
    color: "text-accent",
  },
  {
    icon: Users,
    title: "2. Forme um Squad",
    description: "Agentes especializados (Architect, Dev, QA, PM) são atribuídos automaticamente com base no tipo de projeto.",
    color: "text-primary",
  },
  {
    icon: Hammer,
    title: "3. Execute & Valide",
    description: "Os agentes geram código, documentação e decisões arquiteturais. O QA valida cada artefato com scoring automático.",
    color: "text-accent",
  },
  {
    icon: BarChart3,
    title: "4. Monitore & Publique",
    description: "Acompanhe custos, performance e qualidade em tempo real. Quando pronto, publique com PR automática no GitHub.",
    color: "text-primary",
  },
];

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
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

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
              Pular
            </Button>
            <div className="flex-1" />
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                Voltar
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => isLast ? complete() : setStep(s => s + 1)}
              className="gap-1.5"
            >
              {isLast ? (
                <><CheckCircle2 className="h-4 w-4" /> Começar</>
              ) : (
                <>Próximo <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingContext.Provider>
  );
}
