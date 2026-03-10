import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BoltStyleChat } from "@/components/ui/BoltInteraction";
import { useToast } from "@/hooks/use-toast";

const IDEA_KEY = "axion_initial_idea";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [initialMessage, setInitialMessage] = useState("");

  // After login, recover any saved idea
  useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem(IDEA_KEY);
      if (saved) {
        setInitialMessage(saved);
        sessionStorage.removeItem(IDEA_KEY);
      }
    }
  }, [user]);

  // If user is logged in, redirect to initiatives (the real dashboard)
  if (!loading && user) {
    return <Navigate to="/initiatives" replace />;
  }

  const handlePromptSubmit = (
    prompt: string,
    _modelId: string,
    _assets: File[]
  ) => {
    if (loading) return;

    if (!user) {
      sessionStorage.setItem(IDEA_KEY, prompt);
      navigate("/auth");
      return;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <BoltStyleChat
        onSubmit={handlePromptSubmit}
        initialMessage={initialMessage}
        onSignIn={() => navigate("/auth")}
      />
    </div>
  );
}
