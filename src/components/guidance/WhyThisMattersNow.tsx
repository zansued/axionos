/**
 * WhyThisMattersNow — Contextual relevance hint
 *
 * Shows a compact contextual block explaining why this area
 * matters right now based on system state or user context.
 */

import { Info, AlertTriangle } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { motion } from "framer-motion";

interface WhyThisMattersNowProps {
  /** Bilingual message */
  message: { pt: string; en: string };
  /** Urgency level */
  urgency?: "low" | "medium" | "high";
}

const URGENCY_STYLES = {
  low: "bg-muted/50 border-border text-muted-foreground",
  medium: "bg-warning/5 border-warning/20 text-warning",
  high: "bg-destructive/5 border-destructive/20 text-destructive",
};

export function WhyThisMattersNow({ message, urgency = "low" }: WhyThisMattersNowProps) {
  const { locale } = useI18n();
  const lang = locale === "pt-BR" ? "pt" : "en";
  const Icon = urgency === "high" ? AlertTriangle : Info;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs ${URGENCY_STYLES[urgency]}`}
    >
      <Icon className="h-3 w-3 mt-0.5 shrink-0" />
      <span className="leading-relaxed">{message[lang]}</span>
    </motion.div>
  );
}
