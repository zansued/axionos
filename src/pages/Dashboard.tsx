import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";
import { SendHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import axionLogo from "@/assets/axion-logo.svg";
import NeuralBackground from "@/components/ui/NeuralBackground";

const IDEA_KEY = "axion_initial_idea";

function LandingPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full overflow-hidden bg-background">
      {/* Neural particle background */}
      <div className="absolute inset-0">
        <NeuralBackground
          color="hsl(198, 100%, 50%)"
          trailOpacity={0.08}
          particleCount={500}
          speed={0.2}
        />
      </div>

      {/* Planet / Sun-rise effect — concentric rings at bottom */}
      <div
        className="absolute left-1/2 w-[1600px] h-[1600px] sm:w-[3043px] sm:h-[2865px] pointer-events-none"
        style={{ bottom: "-1400px", transform: "translateX(-50%)" }}
      >
        <div className="absolute w-full h-full rounded-full" style={{ background: "radial-gradient(43.89% 25.74% at 50.02% 2.76%, hsl(var(--surface-deep)) 0%, hsl(var(--background)) 100%)", border: "16px solid white", zIndex: 5 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[2px]" style={{ border: "23px solid #b7d7f6", zIndex: 4 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[5px]" style={{ border: "23px solid #8fc1f2", zIndex: 3 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[9px]" style={{ border: "23px solid #64acf6", zIndex: 2 }} />
        <div className="absolute w-full h-full rounded-full bg-background mt-[13px]" style={{ border: "20px solid #1172e2", boxShadow: "0 15px 24.8px rgba(17, 114, 226, 0.6)", zIndex: 1 }} />
      </div>

      {/* Radial glow above planet */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-[4000px] h-[1800px] pointer-events-none"
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
          Sign in
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 -mt-16">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5"
        >
          <img
            src={axionLogo}
            alt="AxionOS Logo"
            className="h-16 w-16 drop-shadow-[0_0_32px_hsl(198_100%_50%_/_0.35)]"
          />
        </motion.div>

        {/* Title — Axion with gradient light-to-dark + OS gradient */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-6xl font-bold font-display tracking-tight mb-3"
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
          <span className="text-gradient">OS</span>
        </motion.h1>

        {/* Impactful subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl font-semibold text-muted-foreground mb-2 text-center max-w-lg"
        >
          From idea to delivered software.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-sm sm:text-base text-muted-foreground/70 mb-10 text-center max-w-md"
        >
          Describe what you want to build — we orchestrate the rest.
        </motion.p>

        {/* Chat input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="w-full max-w-[680px]"
        >
          <div className="relative rounded-2xl bg-card ring-1 ring-border shadow-[0_2px_24px_rgba(0,0,0,0.4)]">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What do you want to build?"
              className="w-full resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground px-5 pt-5 pb-3 focus:outline-none min-h-[80px] max-h-[200px] rounded-2xl"
              style={{ height: "80px" }}
            />

            <div className="flex items-center justify-end px-4 pb-4 pt-1">
              <button
                onClick={handleSubmit}
                disabled={!message.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 glow-primary"
              >
                <span className="hidden sm:inline">Build now</span>
                <SendHorizontal className="size-4" />
              </button>
            </div>
          </div>
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
        // TODO: use saved idea in onboarding
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
