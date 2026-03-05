import React, { createContext, useContext, useState, useCallback } from "react";

interface ContextPanelState {
  open: boolean;
  title: string;
  content: React.ReactNode | null;
}

interface WorkspaceContextValue {
  contextPanel: ContextPanelState;
  openContextPanel: (title: string, content: React.ReactNode) => void;
  closeContextPanel: () => void;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  contextPanel: { open: false, title: "", content: null },
  openContextPanel: () => {},
  closeContextPanel: () => {},
  commandOpen: false,
  setCommandOpen: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [contextPanel, setContextPanel] = useState<ContextPanelState>({
    open: false,
    title: "",
    content: null,
  });
  const [commandOpen, setCommandOpen] = useState(false);

  const openContextPanel = useCallback((title: string, content: React.ReactNode) => {
    setContextPanel({ open: true, title, content });
  }, []);

  const closeContextPanel = useCallback(() => {
    setContextPanel({ open: false, title: "", content: null });
  }, []);

  return (
    <WorkspaceContext.Provider value={{ contextPanel, openContextPanel, closeContextPanel, commandOpen, setCommandOpen }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
