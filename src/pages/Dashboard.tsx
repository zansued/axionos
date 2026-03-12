import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { OperationalDashboard } from "@/components/dashboard/OperationalDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const IDEA_KEY = "axion_initial_idea";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [idea, setIdea] = React.useState("");

  React.useEffect(() => {
    if (user) {
      const saved = sessionStorage.getItem(IDEA_KEY);
      if (saved) {
        setIdea(saved);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    sessionStorage.setItem(IDEA_KEY, idea);
    navigate("/auth");
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="w-full max-w-lg space-y-6 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AxionOS</h1>
        <p className="text-muted-foreground">From idea to delivered software.</p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Describe your idea…"
            className="flex-1"
          />
          <Button type="submit">Start</Button>
        </form>
        <Button variant="link" onClick={() => navigate("/auth")}>Sign in</Button>
      </div>
    </div>
  );
}
