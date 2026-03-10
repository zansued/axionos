import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

  const handlePromptSubmit = (
    prompt: string,
    _modelId: string,
    _assets: File[]
  ) => {
    // Wait for auth to resolve before deciding
    if (loading) return;

    if (!user) {
      // Not logged in — save idea and redirect to auth
      sessionStorage.setItem(IDEA_KEY, prompt);
      navigate("/auth");
      return;
    }

    // User is logged in — save idea and go to initiatives
    toast({
      title: "Project idea saved!",
      description: "Redirecting to create your initiative...",
    });
    sessionStorage.setItem(IDEA_KEY, prompt);
    navigate("/initiatives");
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <BoltStyleChat onSubmit={handlePromptSubmit} initialMessage={initialMessage} />
    </div>
  );
}
