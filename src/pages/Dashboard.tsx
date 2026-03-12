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

      {/* Radial glow behind center */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(198 100% 50% / 0.06) 0%, transparent 60%)",
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
      <div className="relative z-10 flex flex-col items-center w-full px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <img
            src={axionLogo}
            alt="AxionOS Logo"
            className="h-16 w-16 drop-shadow-[0_0_32px_hsl(198_100%_50%_/_0.35)]"
          />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl font-bold font-display tracking-tight text-foreground mb-2"
        >
          Axion
          <span className="text-gradient">OS</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-muted-foreground mb-10 text-center max-w-md"
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
