import React from "react";
import { useNavigate } from "react-router-dom";
import { BoltStyleChat } from "@/components/ui/BoltInteraction";

export default function Dashboard() {
  const navigate = useNavigate();

  const handlePromptSubmit = (
    prompt: string,
    _modelId: string,
    _assets: File[]
  ) => {
    // Save the idea so it can be picked up after login
    sessionStorage.setItem("axion_initial_idea", prompt);
    navigate("/auth");
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <BoltStyleChat onSubmit={handlePromptSubmit} />
    </div>
  );
}
