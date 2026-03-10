import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Code2, Database, Rocket, GitBranch, CheckCircle2 } from "lucide-react";

export interface ChatLoaderProps {
  statusText?: string;
  progress?: number;
  badges?: string[];
}

const STEPS = [
  { icon: <Database className="h-4 w-4" />, text: "Analyzing Schema..." },
  { icon: <Code2 className="h-4 w-4" />, text: "Drafting Architecture..." },
  { icon: <GitBranch className="h-4 w-4" />, text: "Generating Components..." },
  { icon: <CheckCircle2 className="h-4 w-4" />, text: "Validating Code..." },
  { icon: <Rocket className="h-4 w-4" />, text: "Preparing Deployment..." },
];

export default function ChatLoader({
  statusText,
  progress = 0,
  badges = ["GPT-4o", "React", "Supabase", "Tailwind"],
}: ChatLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Rotate steps visually based on progress
  useEffect(() => {
    if (progress < 20) setCurrentStep(0);
    else if (progress < 40) setCurrentStep(1);
    else if (progress < 60) setCurrentStep(2);
    else if (progress < 80) setCurrentStep(3);
    else setCurrentStep(4);
  }, [progress]);

  const activeStep = STEPS[currentStep];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[400px] w-full max-w-2xl mx-auto p-8 overflow-hidden rounded-2xl bg-[#0f0f0f] border border-white/5 shadow-2xl">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />

      {/* Main Avatar / Spinner */}
      <div className="relative mb-8">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin [animation-duration:1.5s]" />
        <div className="absolute inset-2 border-r-2 border-purple-500 rounded-full animate-spin [animation-duration:2s] [animation-direction:reverse]" />
        <div className="absolute inset-4 border-b-2 border-blue-400 rounded-full animate-spin [animation-duration:3s]" />
        
        <div className="relative flex items-center justify-center w-24 h-24 bg-[#1a1a1e] rounded-full border border-white/10 shadow-inner overflow-hidden shadow-black">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
        </div>
      </div>

      {/* Status Text Carousel */}
      <div className="h-8 mb-2 relative flex items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 text-white font-medium"
          >
            {activeStep.icon}
            <span>{statusText || activeStep.text}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full max-w-sm mt-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#8a8a8f] uppercase tracking-wider font-semibold">
            Generation Progress
          </span>
          <span className="text-xs text-blue-400 font-mono font-bold">
            {Math.round(progress)}%
          </span>
        </div>
        
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Technology Badges (Scanning effect) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {badges.map((badge, idx) => (
          <motion.div
            key={badge}
            initial={{ opacity: 0.3, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              repeatType: "reverse",
              delay: idx * 0.2
            }}
            className="px-3 py-1 rounded-md text-[10px] font-mono text-[#a0a0a5] bg-white/5 border border-white/5"
          >
            {badge}
          </motion.div>
        ))}
      </div>

      {/* AxionOS Watermark */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-20 pointer-events-none select-none flex items-center gap-1.5 grayscale">
         <div className="h-4 w-4 bg-white rounded-sm" />
         <span className="text-[10px] tracking-widest font-bold text-white uppercase">AxionOS</span>
      </div>
    </div>
  );
}
