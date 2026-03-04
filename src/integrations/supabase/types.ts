export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      adrs: {
        Row: {
          approved_by: string | null
          consequences: string | null
          context: string | null
          created_at: string
          decision: string | null
          id: string
          output_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          consequences?: string | null
          context?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          output_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          consequences?: string | null
          context?: string | null
          created_at?: string
          decision?: string | null
          id?: string
          output_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "adrs_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "agent_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          content: string
          created_at: string
          from_agent_id: string | null
          id: string
          initiative_id: string
          iteration: number
          message_type: string
          model_used: string | null
          role_from: string
          role_to: string
          stage: string
          story_id: string | null
          subtask_id: string | null
          to_agent_id: string | null
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          initiative_id: string
          iteration?: number
          message_type?: string
          model_used?: string | null
          role_from: string
          role_to: string
          stage?: string
          story_id?: string | null
          subtask_id?: string | null
          to_agent_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          from_agent_id?: string | null
          id?: string
          initiative_id?: string
          iteration?: number
          message_type?: string
          model_used?: string | null
          role_from?: string
          role_to?: string
          stage?: string
          story_id?: string | null
          subtask_id?: string | null
          to_agent_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "story_subtasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_outputs: {
        Row: {
          agent_id: string | null
          cost_estimate: number | null
          created_at: string
          id: string
          initiative_id: string | null
          model_used: string | null
          organization_id: string
          prompt_used: string | null
          raw_output: Json
          status: Database["public"]["Enums"]["output_status"]
          subtask_id: string | null
          summary: string | null
          tokens_used: number | null
          type: Database["public"]["Enums"]["output_type"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          agent_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          id?: string
          initiative_id?: string | null
          model_used?: string | null
          organization_id: string
          prompt_used?: string | null
          raw_output?: Json
          status?: Database["public"]["Enums"]["output_status"]
          subtask_id?: string | null
          summary?: string | null
          tokens_used?: number | null
          type?: Database["public"]["Enums"]["output_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          agent_id?: string | null
          cost_estimate?: number | null
          created_at?: string
          id?: string
          initiative_id?: string | null
          model_used?: string | null
          organization_id?: string
          prompt_used?: string | null
          raw_output?: Json
          status?: Database["public"]["Enums"]["output_status"]
          subtask_id?: string | null
          summary?: string | null
          tokens_used?: number | null
          type?: Database["public"]["Enums"]["output_type"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_outputs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_outputs_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_outputs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_outputs_subtask_id_fkey"
            columns: ["subtask_id"]
            isOneToOne: false
            referencedRelation: "story_subtasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_outputs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          description: string | null
          exclusive_authorities: string[] | null
          id: string
          name: string
          organization_id: string | null
          role: Database["public"]["Enums"]["agent_role"]
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          exclusive_authorities?: string[] | null
          id?: string
          name: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["agent_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          exclusive_authorities?: string[] | null
          id?: string
          name?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["agent_role"]
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_rate_limits: {
        Row: {
          function_name: string
          id: string
          requested_at: string
          user_id: string
        }
        Insert: {
          function_name: string
          id?: string
          requested_at?: string
          user_id: string
        }
        Update: {
          function_name?: string
          id?: string
          requested_at?: string
          user_id?: string
        }
        Relationships: []
      }
      artifact_reviews: {
        Row: {
          action: string
          comment: string | null
          created_at: string
          id: string
          new_status: string | null
          output_id: string
          previous_status: string | null
          reviewer_id: string
        }
        Insert: {
          action: string
          comment?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          output_id: string
          previous_status?: string | null
          reviewer_id: string
        }
        Update: {
          action?: string
          comment?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          output_id?: string
          previous_status?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_reviews_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "agent_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          message: string
          metadata: Json | null
          organization_id: string | null
          severity: string
          user_id: string
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          message: string
          metadata?: Json | null
          organization_id?: string | null
          severity?: string
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          message?: string
          metadata?: Json | null
          organization_id?: string | null
          severity?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      code_artifacts: {
        Row: {
          branch_name: string | null
          build_status: string | null
          created_at: string
          diff_patch: string | null
          files_affected: Json | null
          id: string
          output_id: string
          pr_url: string | null
          preview_url: string | null
          repository: string | null
          test_status: string | null
        }
        Insert: {
          branch_name?: string | null
          build_status?: string | null
          created_at?: string
          diff_patch?: string | null
          files_affected?: Json | null
          id?: string
          output_id: string
          pr_url?: string | null
          preview_url?: string | null
          repository?: string | null
          test_status?: string | null
        }
        Update: {
          branch_name?: string | null
          build_status?: string | null
          created_at?: string
          diff_patch?: string | null
          files_affected?: Json | null
          id?: string
          output_id?: string
          pr_url?: string | null
          preview_url?: string | null
          repository?: string | null
          test_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "code_artifacts_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "agent_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      content_documents: {
        Row: {
          created_at: string
          html: string | null
          id: string
          markdown: string | null
          output_id: string
          parent_version: string | null
          performance_metrics: Json | null
          slug: string | null
          status: string | null
          version: number
        }
        Insert: {
          created_at?: string
          html?: string | null
          id?: string
          markdown?: string | null
          output_id: string
          parent_version?: string | null
          performance_metrics?: Json | null
          slug?: string | null
          status?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          html?: string | null
          id?: string
          markdown?: string | null
          output_id?: string
          parent_version?: string | null
          performance_metrics?: Json | null
          slug?: string | null
          status?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_documents_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "agent_outputs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_documents_parent_version_fkey"
            columns: ["parent_version"]
            isOneToOne: false
            referencedRelation: "content_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      git_connections: {
        Row: {
          connected_by: string
          created_at: string
          default_branch: string
          github_token: string | null
          id: string
          organization_id: string
          provider: string
          repo_name: string
          repo_owner: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connected_by: string
          created_at?: string
          default_branch?: string
          github_token?: string | null
          id?: string
          organization_id: string
          provider?: string
          repo_name: string
          repo_owner: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connected_by?: string
          created_at?: string
          default_branch?: string
          github_token?: string | null
          id?: string
          organization_id?: string
          provider?: string
          repo_name?: string
          repo_owner?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "git_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "git_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      initiative_jobs: {
        Row: {
          completed_at: string | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error: string | null
          id: string
          initiative_id: string
          inputs: Json | null
          model: string | null
          outputs: Json | null
          prompt_hash: string | null
          stage: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          initiative_id: string
          inputs?: Json | null
          model?: string | null
          outputs?: Json | null
          prompt_hash?: string | null
          stage: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          id?: string
          initiative_id?: string
          inputs?: Json | null
          model?: string | null
          outputs?: Json | null
          prompt_hash?: string | null
          stage?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiative_jobs_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
        ]
      }
      initiatives: {
        Row: {
          approved_at_discovery: string | null
          approved_at_planning: string | null
          approved_at_squad: string | null
          architecture_content: string | null
          business_model: string | null
          complexity: string | null
          created_at: string
          description: string | null
          discovery_payload: Json | null
          execution_progress: Json | null
          feasibility_analysis: string | null
          id: string
          idea_raw: string | null
          initial_estimate: Json | null
          market_analysis: string | null
          mvp_scope: string | null
          notes: string | null
          organization_id: string
          prd_content: string | null
          reference_url: string | null
          refined_idea: string | null
          risk_level: string | null
          stage_status: Database["public"]["Enums"]["initiative_stage_status"]
          status: Database["public"]["Enums"]["initiative_status"]
          strategic_vision: string | null
          suggested_stack: string | null
          target_user: string | null
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          approved_at_discovery?: string | null
          approved_at_planning?: string | null
          approved_at_squad?: string | null
          architecture_content?: string | null
          business_model?: string | null
          complexity?: string | null
          created_at?: string
          description?: string | null
          discovery_payload?: Json | null
          execution_progress?: Json | null
          feasibility_analysis?: string | null
          id?: string
          idea_raw?: string | null
          initial_estimate?: Json | null
          market_analysis?: string | null
          mvp_scope?: string | null
          notes?: string | null
          organization_id: string
          prd_content?: string | null
          reference_url?: string | null
          refined_idea?: string | null
          risk_level?: string | null
          stage_status?: Database["public"]["Enums"]["initiative_stage_status"]
          status?: Database["public"]["Enums"]["initiative_status"]
          strategic_vision?: string | null
          suggested_stack?: string | null
          target_user?: string | null
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          approved_at_discovery?: string | null
          approved_at_planning?: string | null
          approved_at_squad?: string | null
          architecture_content?: string | null
          business_model?: string | null
          complexity?: string | null
          created_at?: string
          description?: string | null
          discovery_payload?: Json | null
          execution_progress?: Json | null
          feasibility_analysis?: string | null
          id?: string
          idea_raw?: string | null
          initial_estimate?: Json | null
          market_analysis?: string | null
          mvp_scope?: string | null
          notes?: string | null
          organization_id?: string
          prd_content?: string | null
          reference_url?: string | null
          refined_idea?: string | null
          risk_level?: string | null
          stage_status?: Database["public"]["Enums"]["initiative_stage_status"]
          status?: Database["public"]["Enums"]["initiative_status"]
          strategic_vision?: string | null
          suggested_stack?: string | null
          target_user?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiatives_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiatives_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      org_usage_limits: {
        Row: {
          alert_threshold_pct: number
          created_at: string
          hard_limit: boolean
          id: string
          monthly_budget_usd: number
          organization_id: string
          updated_at: string
        }
        Insert: {
          alert_threshold_pct?: number
          created_at?: string
          hard_limit?: boolean
          id?: string
          monthly_budget_usd?: number
          organization_id: string
          updated_at?: string
        }
        Update: {
          alert_threshold_pct?: number
          created_at?: string
          hard_limit?: boolean
          id?: string
          monthly_budget_usd?: number
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_usage_limits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      planning_sessions: {
        Row: {
          architecture_content: string | null
          assigned_analyst_id: string | null
          assigned_architect_id: string | null
          assigned_pm_id: string | null
          assigned_sm_id: string | null
          created_at: string
          description: string | null
          id: string
          notes: string | null
          organization_id: string | null
          prd_content: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          architecture_content?: string | null
          assigned_analyst_id?: string | null
          assigned_architect_id?: string | null
          assigned_pm_id?: string | null
          assigned_sm_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          prd_content?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          architecture_content?: string | null
          assigned_analyst_id?: string | null
          assigned_architect_id?: string | null
          assigned_pm_id?: string | null
          assigned_sm_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          prd_content?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_sessions_assigned_analyst_id_fkey"
            columns: ["assigned_analyst_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_sessions_assigned_architect_id_fkey"
            columns: ["assigned_architect_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_sessions_assigned_pm_id_fkey"
            columns: ["assigned_pm_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_sessions_assigned_sm_id_fkey"
            columns: ["assigned_sm_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planning_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      squad_members: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          role_in_squad: string | null
          squad_id: string
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          role_in_squad?: string | null
          squad_id: string
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          role_in_squad?: string | null
          squad_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          auto_generated: boolean
          created_at: string
          id: string
          initiative_id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          auto_generated?: boolean
          created_at?: string
          id?: string
          initiative_id: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          auto_generated?: boolean
          created_at?: string
          id?: string
          initiative_id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squads_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          assigned_agent_id: string | null
          created_at: string
          description: string | null
          id: string
          initiative_id: string | null
          organization_id: string | null
          priority: Database["public"]["Enums"]["story_priority"]
          status: Database["public"]["Enums"]["story_status"]
          title: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          assigned_agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          initiative_id?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["story_priority"]
          status?: Database["public"]["Enums"]["story_status"]
          title: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          assigned_agent_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          initiative_id?: string | null
          organization_id?: string | null
          priority?: Database["public"]["Enums"]["story_priority"]
          status?: Database["public"]["Enums"]["story_status"]
          title?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      story_phases: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          status: Database["public"]["Enums"]["phase_status"]
          story_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          status?: Database["public"]["Enums"]["phase_status"]
          story_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["phase_status"]
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_phases_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      story_subtasks: {
        Row: {
          created_at: string
          description: string
          executed_at: string | null
          executed_by_agent_id: string | null
          file_path: string | null
          file_type: string | null
          id: string
          output: string | null
          phase_id: string
          sort_order: number
          status: Database["public"]["Enums"]["subtask_status"]
        }
        Insert: {
          created_at?: string
          description: string
          executed_at?: string | null
          executed_by_agent_id?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          output?: string | null
          phase_id: string
          sort_order?: number
          status?: Database["public"]["Enums"]["subtask_status"]
        }
        Update: {
          created_at?: string
          description?: string
          executed_at?: string | null
          executed_by_agent_id?: string | null
          file_path?: string | null
          file_type?: string | null
          id?: string
          output?: string | null
          phase_id?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["subtask_status"]
        }
        Relationships: [
          {
            foreignKeyName: "story_subtasks_executed_by_agent_id_fkey"
            columns: ["executed_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_subtasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "story_phases"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_monthly_snapshots: {
        Row: {
          created_at: string
          id: string
          month_start: string
          organization_id: string
          total_artifacts: number
          total_cost_usd: number
          total_jobs: number
          total_tokens: number
        }
        Insert: {
          created_at?: string
          id?: string
          month_start: string
          organization_id: string
          total_artifacts?: number
          total_cost_usd?: number
          total_jobs?: number
          total_tokens?: number
        }
        Update: {
          created_at?: string
          id?: string
          month_start?: string
          organization_id?: string
          total_artifacts?: number
          total_cost_usd?: number
          total_jobs?: number
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "usage_monthly_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_runs: {
        Row: {
          artifact_id: string
          duration: number | null
          executed_at: string
          id: string
          logs: string | null
          result: string
          type: string
        }
        Insert: {
          artifact_id: string
          duration?: number | null
          executed_at?: string
          id?: string
          logs?: string | null
          result?: string
          type: string
        }
        Update: {
          artifact_id?: string
          duration?: number | null
          executed_at?: string
          id?: string
          logs?: string | null
          result?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_runs_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "agent_outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization_with_owner: {
        Args: { _name: string; _slug: string }
        Returns: Json
      }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      agent_role:
        | "devops"
        | "qa"
        | "architect"
        | "sm"
        | "po"
        | "dev"
        | "analyst"
        | "pm"
        | "ux_expert"
        | "aios_master"
        | "aios_orchestrator"
      agent_status: "active" | "inactive"
      initiative_stage_status:
        | "draft"
        | "discovery_ready"
        | "discovering"
        | "discovered"
        | "squad_ready"
        | "forming_squad"
        | "squad_formed"
        | "planning_ready"
        | "planning"
        | "planned"
        | "in_progress"
        | "validating"
        | "ready_to_publish"
        | "published"
        | "completed"
        | "rejected"
        | "archived"
      initiative_status:
        | "idea"
        | "discovery"
        | "squad_formation"
        | "planning"
        | "architecting"
        | "ready"
        | "in_progress"
        | "validating"
        | "publishing"
        | "completed"
      org_role: "owner" | "admin" | "editor" | "reviewer" | "viewer"
      output_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "deployed"
      output_type: "code" | "content" | "decision" | "analysis"
      phase_status: "pending" | "in_progress" | "completed"
      story_priority: "low" | "medium" | "high" | "critical"
      story_status: "todo" | "in_progress" | "done" | "blocked"
      subtask_status: "pending" | "in_progress" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_role: [
        "devops",
        "qa",
        "architect",
        "sm",
        "po",
        "dev",
        "analyst",
        "pm",
        "ux_expert",
        "aios_master",
        "aios_orchestrator",
      ],
      agent_status: ["active", "inactive"],
      initiative_stage_status: [
        "draft",
        "discovery_ready",
        "discovering",
        "discovered",
        "squad_ready",
        "forming_squad",
        "squad_formed",
        "planning_ready",
        "planning",
        "planned",
        "in_progress",
        "validating",
        "ready_to_publish",
        "published",
        "completed",
        "rejected",
        "archived",
      ],
      initiative_status: [
        "idea",
        "discovery",
        "squad_formation",
        "planning",
        "architecting",
        "ready",
        "in_progress",
        "validating",
        "publishing",
        "completed",
      ],
      org_role: ["owner", "admin", "editor", "reviewer", "viewer"],
      output_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "deployed",
      ],
      output_type: ["code", "content", "decision", "analysis"],
      phase_status: ["pending", "in_progress", "completed"],
      story_priority: ["low", "medium", "high", "critical"],
      story_status: ["todo", "in_progress", "done", "blocked"],
      subtask_status: ["pending", "in_progress", "completed", "failed"],
    },
  },
} as const
