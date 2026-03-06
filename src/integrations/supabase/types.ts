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
      agent_memory: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          initiative_id: string | null
          key: string
          memory_type: string
          organization_id: string
          relevance_score: number | null
          scope: string
          times_used: number | null
          updated_at: string
          value: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          key: string
          memory_type?: string
          organization_id: string
          relevance_score?: number | null
          scope?: string
          times_used?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          key?: string
          memory_type?: string
          organization_id?: string
          relevance_score?: number | null
          scope?: string
          times_used?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      ai_prompt_cache: {
        Row: {
          created_at: string
          embedding: string | null
          expires_at: string
          hit_count: number | null
          id: string
          initiative_id: string | null
          model_used: string | null
          organization_id: string | null
          prompt_hash: string
          prompt_summary: string | null
          response: string
          stage: string
          tokens_saved: number | null
        }
        Insert: {
          created_at?: string
          embedding?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          initiative_id?: string | null
          model_used?: string | null
          organization_id?: string | null
          prompt_hash: string
          prompt_summary?: string | null
          response: string
          stage: string
          tokens_saved?: number | null
        }
        Update: {
          created_at?: string
          embedding?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          initiative_id?: string | null
          model_used?: string | null
          organization_id?: string | null
          prompt_hash?: string
          prompt_summary?: string | null
          response?: string
          stage?: string
          tokens_saved?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_cache_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_prompt_cache_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      initiative_observability: {
        Row: {
          automatic_repair_success_rate: number
          average_retries: number
          build_success_rate: number
          cost_per_initiative_usd: number
          created_at: string
          deploy_success_rate: number
          id: string
          initiative_id: string
          initiative_outcome_status: string
          models_used: string[] | null
          organization_id: string
          pipeline_success_rate: number
          stage_costs: Json | null
          stage_durations: Json | null
          stage_failure_distribution: Json | null
          time_idea_to_deploy_seconds: number | null
          time_idea_to_repo_seconds: number | null
          tokens_total: number
          updated_at: string
        }
        Insert: {
          automatic_repair_success_rate?: number
          average_retries?: number
          build_success_rate?: number
          cost_per_initiative_usd?: number
          created_at?: string
          deploy_success_rate?: number
          id?: string
          initiative_id: string
          initiative_outcome_status?: string
          models_used?: string[] | null
          organization_id: string
          pipeline_success_rate?: number
          stage_costs?: Json | null
          stage_durations?: Json | null
          stage_failure_distribution?: Json | null
          time_idea_to_deploy_seconds?: number | null
          time_idea_to_repo_seconds?: number | null
          tokens_total?: number
          updated_at?: string
        }
        Update: {
          automatic_repair_success_rate?: number
          average_retries?: number
          build_success_rate?: number
          cost_per_initiative_usd?: number
          created_at?: string
          deploy_success_rate?: number
          id?: string
          initiative_id?: string
          initiative_outcome_status?: string
          models_used?: string[] | null
          organization_id?: string
          pipeline_success_rate?: number
          stage_costs?: Json | null
          stage_durations?: Json | null
          stage_failure_distribution?: Json | null
          time_idea_to_deploy_seconds?: number | null
          time_idea_to_repo_seconds?: number | null
          tokens_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "initiative_observability_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: true
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiative_observability_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          blueprint: Json | null
          build_status: string | null
          business_model: string | null
          commit_hash: string | null
          complexity: string | null
          created_at: string
          deploy_error_code: string | null
          deploy_error_message: string | null
          deploy_status: string | null
          deploy_target: string | null
          deploy_url: string | null
          deployed_at: string | null
          description: string | null
          discovery_payload: Json | null
          estimated_cost_max: number | null
          estimated_cost_min: number | null
          estimated_time_max: number | null
          estimated_time_min: number | null
          execution_progress: Json | null
          feasibility_analysis: string | null
          generation_depth: string | null
          health_status: string | null
          id: string
          idea_analysis: Json | null
          idea_raw: string | null
          initial_estimate: Json | null
          initiative_brief: Json | null
          last_deploy_check_at: string | null
          market_analysis: string | null
          mvp_scope: string | null
          notes: string | null
          organization_id: string
          pipeline_recommendation: string | null
          prd_content: string | null
          recommended_generation_depth: string | null
          reference_url: string | null
          refined_idea: string | null
          repo_url: string | null
          risk_flags: Json | null
          risk_level: string | null
          simulation_report: Json | null
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
          blueprint?: Json | null
          build_status?: string | null
          business_model?: string | null
          commit_hash?: string | null
          complexity?: string | null
          created_at?: string
          deploy_error_code?: string | null
          deploy_error_message?: string | null
          deploy_status?: string | null
          deploy_target?: string | null
          deploy_url?: string | null
          deployed_at?: string | null
          description?: string | null
          discovery_payload?: Json | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_time_max?: number | null
          estimated_time_min?: number | null
          execution_progress?: Json | null
          feasibility_analysis?: string | null
          generation_depth?: string | null
          health_status?: string | null
          id?: string
          idea_analysis?: Json | null
          idea_raw?: string | null
          initial_estimate?: Json | null
          initiative_brief?: Json | null
          last_deploy_check_at?: string | null
          market_analysis?: string | null
          mvp_scope?: string | null
          notes?: string | null
          organization_id: string
          pipeline_recommendation?: string | null
          prd_content?: string | null
          recommended_generation_depth?: string | null
          reference_url?: string | null
          refined_idea?: string | null
          repo_url?: string | null
          risk_flags?: Json | null
          risk_level?: string | null
          simulation_report?: Json | null
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
          blueprint?: Json | null
          build_status?: string | null
          business_model?: string | null
          commit_hash?: string | null
          complexity?: string | null
          created_at?: string
          deploy_error_code?: string | null
          deploy_error_message?: string | null
          deploy_status?: string | null
          deploy_target?: string | null
          deploy_url?: string | null
          deployed_at?: string | null
          description?: string | null
          discovery_payload?: Json | null
          estimated_cost_max?: number | null
          estimated_cost_min?: number | null
          estimated_time_max?: number | null
          estimated_time_min?: number | null
          execution_progress?: Json | null
          feasibility_analysis?: string | null
          generation_depth?: string | null
          health_status?: string | null
          id?: string
          idea_analysis?: Json | null
          idea_raw?: string | null
          initial_estimate?: Json | null
          initiative_brief?: Json | null
          last_deploy_check_at?: string | null
          market_analysis?: string | null
          mvp_scope?: string | null
          notes?: string | null
          organization_id?: string
          pipeline_recommendation?: string | null
          prd_content?: string | null
          recommended_generation_depth?: string | null
          reference_url?: string | null
          refined_idea?: string | null
          repo_url?: string | null
          risk_flags?: Json | null
          risk_level?: string | null
          simulation_report?: Json | null
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
      org_knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          organization_id: string
          source_initiative_id: string | null
          source_output_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          organization_id: string
          source_initiative_id?: string | null
          source_output_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          organization_id?: string
          source_initiative_id?: string | null
          source_output_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_knowledge_base_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_knowledge_base_source_initiative_id_fkey"
            columns: ["source_initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_knowledge_base_source_output_id_fkey"
            columns: ["source_output_id"]
            isOneToOne: false
            referencedRelation: "agent_outputs"
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
      pipeline_gate_permissions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          min_role: Database["public"]["Enums"]["org_role"]
          organization_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          action_type?: string
          created_at?: string
          id?: string
          min_role?: Database["public"]["Enums"]["org_role"]
          organization_id: string
          stage: string
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          min_role?: Database["public"]["Enums"]["org_role"]
          organization_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_gate_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      project_brain_edges: {
        Row: {
          created_at: string
          id: string
          initiative_id: string
          metadata: Json | null
          organization_id: string
          relation_type: string
          source_node_id: string
          target_node_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiative_id: string
          metadata?: Json | null
          organization_id: string
          relation_type?: string
          source_node_id: string
          target_node_id: string
        }
        Update: {
          created_at?: string
          id?: string
          initiative_id?: string
          metadata?: Json | null
          organization_id?: string
          relation_type?: string
          source_node_id?: string
          target_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_brain_edges_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_brain_edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_brain_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "project_brain_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_brain_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "project_brain_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      project_brain_nodes: {
        Row: {
          content_hash: string | null
          created_at: string
          embedded_at: string | null
          embedding: string | null
          embedding_model: string | null
          file_path: string | null
          id: string
          initiative_id: string
          metadata: Json | null
          name: string
          node_type: string
          organization_id: string
          search_vector: unknown
          status: string
          updated_at: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          embedded_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          file_path?: string | null
          id?: string
          initiative_id: string
          metadata?: Json | null
          name: string
          node_type?: string
          organization_id: string
          search_vector?: unknown
          status?: string
          updated_at?: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          embedded_at?: string | null
          embedding?: string | null
          embedding_model?: string | null
          file_path?: string | null
          id?: string
          initiative_id?: string
          metadata?: Json | null
          name?: string
          node_type?: string
          organization_id?: string
          search_vector?: unknown
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_brain_nodes_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_brain_nodes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_decisions: {
        Row: {
          category: string
          created_at: string
          decided_by_agent_id: string | null
          decision: string
          id: string
          impact: string | null
          initiative_id: string
          organization_id: string
          reason: string
          status: string
          supersedes_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          decided_by_agent_id?: string | null
          decision: string
          id?: string
          impact?: string | null
          initiative_id: string
          organization_id: string
          reason: string
          status?: string
          supersedes_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          decided_by_agent_id?: string | null
          decision?: string
          id?: string
          impact?: string | null
          initiative_id?: string
          organization_id?: string
          reason?: string
          status?: string
          supersedes_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_decisions_decided_by_agent_id_fkey"
            columns: ["decided_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_decisions_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_decisions_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "project_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_errors: {
        Row: {
          detected_at: string
          error_message: string
          error_type: string
          file_path: string | null
          fixed: boolean
          fixed_at: string | null
          fixed_by_agent_id: string | null
          id: string
          initiative_id: string
          organization_id: string
          prevention_rule: string | null
          root_cause: string | null
        }
        Insert: {
          detected_at?: string
          error_message: string
          error_type?: string
          file_path?: string | null
          fixed?: boolean
          fixed_at?: string | null
          fixed_by_agent_id?: string | null
          id?: string
          initiative_id: string
          organization_id: string
          prevention_rule?: string | null
          root_cause?: string | null
        }
        Update: {
          detected_at?: string
          error_message?: string
          error_type?: string
          file_path?: string | null
          fixed?: boolean
          fixed_at?: string | null
          fixed_by_agent_id?: string | null
          id?: string
          initiative_id?: string
          organization_id?: string
          prevention_rule?: string | null
          root_cause?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_errors_fixed_by_agent_id_fkey"
            columns: ["fixed_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_errors_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_errors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_prevention_rules: {
        Row: {
          confidence_score: number
          created_at: string
          error_pattern: string
          id: string
          initiative_id: string
          last_triggered_at: string
          organization_id: string
          prevention_rule: string
          scope: string
          source_error_id: string | null
          times_triggered: number
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          error_pattern: string
          id?: string
          initiative_id: string
          last_triggered_at?: string
          organization_id: string
          prevention_rule: string
          scope?: string
          source_error_id?: string | null
          times_triggered?: number
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          error_pattern?: string
          id?: string
          initiative_id?: string
          last_triggered_at?: string
          organization_id?: string
          prevention_rule?: string
          scope?: string
          source_error_id?: string | null
          times_triggered?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_prevention_rules_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_prevention_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_prevention_rules_source_error_id_fkey"
            columns: ["source_error_id"]
            isOneToOne: false
            referencedRelation: "project_errors"
            referencedColumns: ["id"]
          },
        ]
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
      stage_sla_configs: {
        Row: {
          alert_enabled: boolean
          created_at: string
          id: string
          max_hours: number
          organization_id: string
          stage: string
          updated_at: string
        }
        Insert: {
          alert_enabled?: boolean
          created_at?: string
          id?: string
          max_hours?: number
          organization_id: string
          stage: string
          updated_at?: string
        }
        Update: {
          alert_enabled?: boolean
          created_at?: string
          id?: string
          max_hours?: number
          organization_id?: string
          stage?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_sla_configs_organization_id_fkey"
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
      supabase_connections: {
        Row: {
          connected_by: string
          created_at: string
          id: string
          label: string
          organization_id: string
          status: string
          supabase_anon_key: string
          supabase_url: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          connected_by: string
          created_at?: string
          id?: string
          label?: string
          organization_id: string
          status?: string
          supabase_anon_key: string
          supabase_url: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          connected_by?: string
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          status?: string
          supabase_anon_key?: string
          supabase_url?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supabase_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supabase_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      delete_initiative_cascade: {
        Args: { p_initiative_id: string }
        Returns: undefined
      }
      get_unembedded_nodes: {
        Args: { p_initiative_id: string; p_limit?: number }
        Returns: {
          file_path: string
          id: string
          metadata: Json
          name: string
          node_type: string
        }[]
      }
      get_user_org_role: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
      has_gate_permission: {
        Args: {
          _action_type: string
          _org_id: string
          _stage: string
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      match_brain_nodes: {
        Args: {
          match_count?: number
          match_initiative_id: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content_hash: string
          file_path: string
          id: string
          metadata: Json
          name: string
          node_type: string
          similarity: number
          status: string
        }[]
      }
      match_prompt_cache: {
        Args: {
          match_org_id?: string
          match_stage?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          model_used: string
          prompt_hash: string
          response: string
          similarity: number
          stage: string
        }[]
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
        | "vision_agent"
        | "market_analyst"
        | "requirements_agent"
        | "product_architect"
        | "system_architect"
        | "data_architect"
        | "api_architect"
        | "dependency_planner"
        | "task_planner"
        | "story_generator"
        | "file_planner"
        | "code_architect"
        | "developer"
        | "integration_agent"
        | "static_analysis"
        | "runtime_qa"
        | "fix_agent"
        | "release_agent"
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
        | "architecture_ready"
        | "architecting"
        | "architected"
        | "simulating_architecture"
        | "architecture_simulated"
        | "bootstrapping"
        | "bootstrapped"
        | "scaffolding"
        | "scaffolded"
        | "simulating_modules"
        | "modules_simulated"
        | "analyzing_dependencies"
        | "dependencies_analyzed"
        | "repairing_build"
        | "build_repaired"
        | "repair_failed"
        | "bootstrapping_schema"
        | "schema_bootstrapped"
        | "provisioning_db"
        | "db_provisioned"
        | "analyzing_domain"
        | "domain_analyzed"
        | "synthesizing_logic"
        | "logic_synthesized"
        | "generating_api"
        | "api_generated"
        | "generating_data_model"
        | "data_model_generated"
        | "generating_ui"
        | "ui_generated"
        | "learning_system"
        | "system_learned"
        | "opportunity_discovering"
        | "opportunity_discovered"
        | "analyzing_market_signals"
        | "market_signals_analyzed"
        | "validating_product"
        | "product_validated"
        | "strategizing_revenue"
        | "revenue_strategized"
        | "observing_product"
        | "product_observed"
        | "analyzing_product_metrics"
        | "product_metrics_analyzed"
        | "analyzing_user_behavior"
        | "user_behavior_analyzed"
        | "optimizing_growth"
        | "growth_optimized"
        | "evolving_product"
        | "product_evolved"
        | "evolving_architecture"
        | "architecture_evolved"
        | "managing_portfolio"
        | "portfolio_managed"
        | "evolving_system"
        | "system_evolved"
        | "deploying"
        | "deployed"
        | "deploy_failed"
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
        "vision_agent",
        "market_analyst",
        "requirements_agent",
        "product_architect",
        "system_architect",
        "data_architect",
        "api_architect",
        "dependency_planner",
        "task_planner",
        "story_generator",
        "file_planner",
        "code_architect",
        "developer",
        "integration_agent",
        "static_analysis",
        "runtime_qa",
        "fix_agent",
        "release_agent",
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
        "architecture_ready",
        "architecting",
        "architected",
        "simulating_architecture",
        "architecture_simulated",
        "bootstrapping",
        "bootstrapped",
        "scaffolding",
        "scaffolded",
        "simulating_modules",
        "modules_simulated",
        "analyzing_dependencies",
        "dependencies_analyzed",
        "repairing_build",
        "build_repaired",
        "repair_failed",
        "bootstrapping_schema",
        "schema_bootstrapped",
        "provisioning_db",
        "db_provisioned",
        "analyzing_domain",
        "domain_analyzed",
        "synthesizing_logic",
        "logic_synthesized",
        "generating_api",
        "api_generated",
        "generating_data_model",
        "data_model_generated",
        "generating_ui",
        "ui_generated",
        "learning_system",
        "system_learned",
        "opportunity_discovering",
        "opportunity_discovered",
        "analyzing_market_signals",
        "market_signals_analyzed",
        "validating_product",
        "product_validated",
        "strategizing_revenue",
        "revenue_strategized",
        "observing_product",
        "product_observed",
        "analyzing_product_metrics",
        "product_metrics_analyzed",
        "analyzing_user_behavior",
        "user_behavior_analyzed",
        "optimizing_growth",
        "growth_optimized",
        "evolving_product",
        "product_evolved",
        "evolving_architecture",
        "architecture_evolved",
        "managing_portfolio",
        "portfolio_managed",
        "evolving_system",
        "system_evolved",
        "deploying",
        "deployed",
        "deploy_failed",
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
