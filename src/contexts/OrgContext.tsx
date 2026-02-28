import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface Workspace {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
}

interface OrgMember {
  id: string;
  user_id: string;
  role: "owner" | "admin" | "editor" | "reviewer" | "viewer";
  organization_id: string;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: OrgMember[];
  userRole: string | null;
  loading: boolean;
  setCurrentOrg: (org: Organization) => void;
  setCurrentWorkspace: (ws: Workspace) => void;
  createOrganization: (name: string, slug: string) => Promise<Organization>;
  createWorkspace: (name: string, slug: string, description?: string) => Promise<Workspace>;
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    const { data: orgs } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: true });

    if (orgs && orgs.length > 0) {
      setOrganizations(orgs);
      const savedOrgId = localStorage.getItem("aios_current_org");
      const found = orgs.find((o) => o.id === savedOrgId);
      setCurrentOrg(found || orgs[0]);
    } else {
      // Auto-create default org for new users
      const { data: newOrg } = await supabase
        .from("organizations")
        .insert({ name: "Minha Organização", slug: `org-${user.id.slice(0, 8)}` })
        .select()
        .single();

      if (newOrg) {
        // Add user as owner
        await supabase
          .from("organization_members")
          .insert({ organization_id: newOrg.id, user_id: user.id, role: "owner" });

        // Create default workspace
        await supabase
          .from("workspaces")
          .insert({ organization_id: newOrg.id, name: "Default", slug: "default" });

        setOrganizations([newOrg]);
        setCurrentOrg(newOrg);
      }
    }
    setLoading(false);
  }, [user]);

  // Fetch workspaces and members when org changes
  useEffect(() => {
    if (!currentOrg || !user) {
      setWorkspaces([]);
      setMembers([]);
      return;
    }

    localStorage.setItem("aios_current_org", currentOrg.id);

    const loadOrgData = async () => {
      const [wsRes, memRes] = await Promise.all([
        supabase
          .from("workspaces")
          .select("*")
          .eq("organization_id", currentOrg.id)
          .order("created_at"),
        supabase
          .from("organization_members")
          .select("*")
          .eq("organization_id", currentOrg.id),
      ]);

      if (wsRes.data) {
        setWorkspaces(wsRes.data);
        const savedWsId = localStorage.getItem("aios_current_ws");
        const found = wsRes.data.find((w) => w.id === savedWsId);
        setCurrentWorkspace(found || wsRes.data[0] || null);
      }

      if (memRes.data) {
        setMembers(memRes.data as OrgMember[]);
        const myMembership = memRes.data.find((m) => m.user_id === user.id);
        setUserRole(myMembership?.role || null);
      }
    };

    loadOrgData();
  }, [currentOrg, user]);

  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem("aios_current_ws", currentWorkspace.id);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const createOrganization = async (name: string, slug: string) => {
    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, slug })
      .select()
      .single();
    if (error) throw error;

    await supabase
      .from("organization_members")
      .insert({ organization_id: data.id, user_id: user!.id, role: "owner" });

    await fetchOrgs();
    return data;
  };

  const createWorkspace = async (name: string, slug: string, description?: string) => {
    if (!currentOrg) throw new Error("No organization selected");
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ organization_id: currentOrg.id, name, slug, description })
      .select()
      .single();
    if (error) throw error;

    setWorkspaces((prev) => [...prev, data]);
    return data;
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        currentWorkspace,
        workspaces,
        members,
        userRole,
        loading,
        setCurrentOrg,
        setCurrentWorkspace,
        createOrganization,
        createWorkspace,
        refreshOrgs: fetchOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) throw new Error("useOrg must be used within OrgProvider");
  return context;
}
