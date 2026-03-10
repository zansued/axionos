import React from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BoltStyleChat } from "@/components/ui/BoltInteraction";
import { AppLayout } from "@/components/AppLayout";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";

const IDEA_KEY = "axion_initial_idea";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [initialMessage, setInitialMessage] = React.useState("");

  React.useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem(IDEA_KEY);
      if (saved) {
        setInitialMessage(saved);
        sessionStorage.removeItem(IDEA_KEY);
      }
    }
  }, [user]);

  // Authenticated → operational dashboard
  if (!loading && user) {
    return (
      <AppLayout>
        <OperationalDashboard />
      </AppLayout>
    );
  }

  // Unauthenticated → landing
  const handlePromptSubmit = (prompt: string, _modelId: string, _assets: File[]) => {
    if (loading) return;
    if (!user) {
      sessionStorage.setItem(IDEA_KEY, prompt);
      navigate("/auth");
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
