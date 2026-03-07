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
      active_prevention_rules: {
        Row: {
          action_config: Json
          action_type: string
          confidence_score: number
          created_at: string
          description: string
          enabled: boolean
          id: string
          organization_id: string
          pattern_id: string | null
          pipeline_stage: string
          rule_type: string
          source_candidate_id: string | null
          times_prevented: number
          times_triggered: number
          trigger_conditions: Json
          updated_at: string
        }
        Insert: {
          action_config?: Json
          action_type?: string
          confidence_score?: number
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          organization_id: string
          pattern_id?: string | null
          pipeline_stage?: string
          rule_type?: string
          source_candidate_id?: string | null
          times_prevented?: number
          times_triggered?: number
          trigger_conditions?: Json
          updated_at?: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          confidence_score?: number
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          pattern_id?: string | null
          pipeline_stage?: string
          rule_type?: string
          source_candidate_id?: string | null
          times_prevented?: number
          times_triggered?: number
          trigger_conditions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_prevention_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_prevention_rules_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_prevention_rules_source_candidate_id_fkey"
            columns: ["source_candidate_id"]
            isOneToOne: false
            referencedRelation: "prevention_rule_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
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
      advisory_calibration_signals: {
        Row: {
          calibration_domain: string
          confidence_score: number
          created_at: string
          description: string
          evidence_refs: Json
          id: string
          organization_id: string
          recommended_action: string
          risk_of_overcorrection: number | null
          signal_strength: number
          signal_type: string
          target_component: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          calibration_domain?: string
          confidence_score?: number
          created_at?: string
          description?: string
          evidence_refs?: Json
          id?: string
          organization_id: string
          recommended_action?: string
          risk_of_overcorrection?: number | null
          signal_strength?: number
          signal_type?: string
          target_component?: string
          title?: string
          workspace_id?: string | null
        }
        Update: {
          calibration_domain?: string
          confidence_score?: number
          created_at?: string
          description?: string
          evidence_refs?: Json
          id?: string
          organization_id?: string
          recommended_action?: string
          risk_of_overcorrection?: number | null
          signal_strength?: number
          signal_type?: string
          target_component?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisory_calibration_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_calibration_signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      advisory_calibration_summaries: {
        Row: {
          content: Json
          created_at: string
          id: string
          organization_id: string
          period_end: string
          period_start: string
          signal_count: number
          strongest_signals: Json
          summary_type: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          signal_count?: number
          strongest_signals?: Json
          summary_type?: string
          title?: string
          workspace_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          signal_count?: number
          strongest_signals?: Json
          summary_type?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisory_calibration_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_calibration_summaries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      agent_memory_profiles: {
        Row: {
          agent_type: string
          confidence: number | null
          created_at: string
          id: string
          memory_scope: string
          memory_summary: string
          model_name: string | null
          model_provider: string | null
          organization_id: string
          stage_key: string | null
          status: string
          support_count: number
          updated_at: string
        }
        Insert: {
          agent_type: string
          confidence?: number | null
          created_at?: string
          id?: string
          memory_scope?: string
          memory_summary?: string
          model_name?: string | null
          model_provider?: string | null
          organization_id: string
          stage_key?: string | null
          status?: string
          support_count?: number
          updated_at?: string
        }
        Update: {
          agent_type?: string
          confidence?: number | null
          created_at?: string
          id?: string
          memory_scope?: string
          memory_summary?: string
          model_name?: string | null
          model_provider?: string | null
          organization_id?: string
          stage_key?: string | null
          status?: string
          support_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory_records: {
        Row: {
          agent_type: string
          context_signature: string
          created_at: string
          created_from_event_id: string | null
          id: string
          memory_payload: Json
          memory_type: string
          organization_id: string
          relevance_score: number | null
          source_refs: Json | null
          stage_key: string | null
        }
        Insert: {
          agent_type: string
          context_signature?: string
          created_at?: string
          created_from_event_id?: string | null
          id?: string
          memory_payload?: Json
          memory_type?: string
          organization_id: string
          relevance_score?: number | null
          source_refs?: Json | null
          stage_key?: string | null
        }
        Update: {
          agent_type?: string
          context_signature?: string
          created_at?: string
          created_from_event_id?: string | null
          id?: string
          memory_payload?: Json
          memory_type?: string
          organization_id?: string
          relevance_score?: number | null
          source_refs?: Json | null
          stage_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_records_organization_id_fkey"
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
      billing_accounts: {
        Row: {
          billing_email: string | null
          billing_status: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          organization_id: string
          plan_id: string
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          billing_status?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id: string
          plan_id: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          billing_status?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          organization_id?: string
          plan_id?: string
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_accounts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "product_plans"
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
      cross_stage_learning_edges: {
        Row: {
          confidence_score: number
          created_at: string
          evidence_refs: Json
          from_stage_key: string
          id: string
          impact_score: number
          organization_id: string
          relationship_type: string
          status: string
          support_count: number
          to_stage_key: string
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          evidence_refs?: Json
          from_stage_key: string
          id?: string
          impact_score?: number
          organization_id: string
          relationship_type: string
          status?: string
          support_count?: number
          to_stage_key: string
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          evidence_refs?: Json
          from_stage_key?: string
          id?: string
          impact_score?: number
          organization_id?: string
          relationship_type?: string
          status?: string
          support_count?: number
          to_stage_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_stage_learning_edges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_stage_policy_outcomes: {
        Row: {
          baseline_metrics: Json
          created_at: string
          downstream_impact: Json
          id: string
          notes: string | null
          observed_outcome: string
          organization_id: string
          pipeline_job_id: string | null
          policy_id: string
          policy_metrics: Json
          spillover_detected: boolean
        }
        Insert: {
          baseline_metrics?: Json
          created_at?: string
          downstream_impact?: Json
          id?: string
          notes?: string | null
          observed_outcome?: string
          organization_id: string
          pipeline_job_id?: string | null
          policy_id: string
          policy_metrics?: Json
          spillover_detected?: boolean
        }
        Update: {
          baseline_metrics?: Json
          created_at?: string
          downstream_impact?: Json
          id?: string
          notes?: string | null
          observed_outcome?: string
          organization_id?: string
          pipeline_job_id?: string | null
          policy_id?: string
          policy_metrics?: Json
          spillover_detected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cross_stage_policy_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cross_stage_policy_outcomes_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "cross_stage_policy_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_stage_policy_profiles: {
        Row: {
          action_mode: string
          affected_stages: string[]
          confidence_score: number
          created_at: string
          evidence_refs: Json
          id: string
          organization_id: string
          policy_payload: Json
          policy_scope: string
          policy_type: string
          status: string
          support_count: number
          trigger_signature: string
          updated_at: string
        }
        Insert: {
          action_mode?: string
          affected_stages?: string[]
          confidence_score?: number
          created_at?: string
          evidence_refs?: Json
          id?: string
          organization_id: string
          policy_payload?: Json
          policy_scope?: string
          policy_type: string
          status?: string
          support_count?: number
          trigger_signature?: string
          updated_at?: string
        }
        Update: {
          action_mode?: string
          affected_stages?: string[]
          confidence_score?: number
          created_at?: string
          evidence_refs?: Json
          id?: string
          organization_id?: string
          policy_payload?: Json
          policy_scope?: string
          policy_type?: string
          status?: string
          support_count?: number
          trigger_signature?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_stage_policy_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_memory_entries: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          last_accessed_at: string | null
          memory_subtype: string
          memory_type: string
          organization_id: string
          related_component: string | null
          related_stage: string | null
          relevance_score: number
          source_id: string | null
          source_type: string
          summary: string
          tags: Json
          times_retrieved: number
          title: string
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          memory_subtype?: string
          memory_type?: string
          organization_id: string
          related_component?: string | null
          related_stage?: string | null
          relevance_score?: number
          source_id?: string | null
          source_type?: string
          summary?: string
          tags?: Json
          times_retrieved?: number
          title?: string
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_accessed_at?: string | null
          memory_subtype?: string
          memory_type?: string
          organization_id?: string
          related_component?: string | null
          related_stage?: string | null
          relevance_score?: number
          source_id?: string | null
          source_type?: string
          summary?: string
          tags?: Json
          times_retrieved?: number
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_memory_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_memory_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      error_patterns: {
        Row: {
          affected_file_types: string[] | null
          affected_stages: string[] | null
          common_causes: string[] | null
          confidence_score: number
          created_at: string
          description: string
          error_category: string
          error_signature: string
          failed_strategies: string[] | null
          first_seen_at: string
          frequency: number
          id: string
          last_seen_at: string
          normalized_signature: string
          organization_id: string
          recommended_prevention: string | null
          repairability: string
          severity: string
          success_rate: number
          successful_strategies: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          affected_file_types?: string[] | null
          affected_stages?: string[] | null
          common_causes?: string[] | null
          confidence_score?: number
          created_at?: string
          description?: string
          error_category?: string
          error_signature?: string
          failed_strategies?: string[] | null
          first_seen_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          normalized_signature?: string
          organization_id: string
          recommended_prevention?: string | null
          repairability?: string
          severity?: string
          success_rate?: number
          successful_strategies?: string[] | null
          title?: string
          updated_at?: string
        }
        Update: {
          affected_file_types?: string[] | null
          affected_stages?: string[] | null
          common_causes?: string[] | null
          confidence_score?: number
          created_at?: string
          description?: string
          error_category?: string
          error_signature?: string
          failed_strategies?: string[] | null
          first_seen_at?: string
          frequency?: number
          id?: string
          last_seen_at?: string
          normalized_signature?: string
          organization_id?: string
          recommended_prevention?: string | null
          repairability?: string
          severity?: string
          success_rate?: number
          successful_strategies?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      learning_recommendations: {
        Row: {
          confidence_score: number
          created_at: string
          description: string
          expected_improvement: string | null
          id: string
          metrics_summary: Json
          organization_id: string
          recommendation_type: string
          status: string
          supporting_evidence: Json
          target_component: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          description?: string
          expected_improvement?: string | null
          id?: string
          metrics_summary?: Json
          organization_id: string
          recommendation_type?: string
          status?: string
          supporting_evidence?: Json
          target_component?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          description?: string
          expected_improvement?: string | null
          id?: string
          metrics_summary?: Json
          organization_id?: string
          recommendation_type?: string
          status?: string
          supporting_evidence?: Json
          target_component?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_records: {
        Row: {
          confidence_score: number
          cost_signal: number | null
          created_at: string
          decision_taken: string
          failure_signal: number
          id: string
          initiative_id: string | null
          input_signature: string | null
          learning_type: string
          organization_id: string
          outcome_summary: string
          recommended_adjustment: string | null
          source_id: string | null
          source_type: string
          stage_name: string
          success_signal: number
          time_signal: number | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          cost_signal?: number | null
          created_at?: string
          decision_taken?: string
          failure_signal?: number
          id?: string
          initiative_id?: string | null
          input_signature?: string | null
          learning_type?: string
          organization_id: string
          outcome_summary?: string
          recommended_adjustment?: string | null
          source_id?: string | null
          source_type?: string
          stage_name?: string
          success_signal?: number
          time_signal?: number | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          cost_signal?: number | null
          created_at?: string
          decision_taken?: string
          failure_signal?: number
          id?: string
          initiative_id?: string | null
          input_signature?: string | null
          learning_type?: string
          organization_id?: string
          outcome_summary?: string
          recommended_adjustment?: string | null
          source_id?: string | null
          source_type?: string
          stage_name?: string
          success_signal?: number
          time_signal?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_records_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_links: {
        Row: {
          created_at: string
          from_memory_id: string
          id: string
          link_type: string
          organization_id: string
          to_memory_id: string
        }
        Insert: {
          created_at?: string
          from_memory_id: string
          id?: string
          link_type?: string
          organization_id: string
          to_memory_id: string
        }
        Update: {
          created_at?: string
          from_memory_id?: string
          id?: string
          link_type?: string
          organization_id?: string
          to_memory_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_links_from_memory_id_fkey"
            columns: ["from_memory_id"]
            isOneToOne: false
            referencedRelation: "engineering_memory_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_links_to_memory_id_fkey"
            columns: ["to_memory_id"]
            isOneToOne: false
            referencedRelation: "engineering_memory_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_retrieval_log: {
        Row: {
          created_at: string
          id: string
          memory_id: string
          organization_id: string
          retrieval_context: string | null
          retrieved_by_component: string
          used_in_decision: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          memory_id: string
          organization_id: string
          retrieval_context?: string | null
          retrieved_by_component?: string
          used_in_decision?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          memory_id?: string
          organization_id?: string
          retrieval_context?: string | null
          retrieved_by_component?: string
          used_in_decision?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "memory_retrieval_log_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "engineering_memory_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_retrieval_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_summaries: {
        Row: {
          content: Json
          created_at: string
          entry_count: number
          id: string
          organization_id: string
          period_end: string
          period_start: string
          signal_strength: number
          source_memory_ids: Json
          summary_type: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          content?: Json
          created_at?: string
          entry_count?: number
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          signal_strength?: number
          source_memory_ids?: Json
          summary_type?: string
          title?: string
          workspace_id?: string | null
        }
        Update: {
          content?: Json
          created_at?: string
          entry_count?: number
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          signal_strength?: number
          source_memory_ids?: Json
          summary_type?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_summaries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_agent_artifacts: {
        Row: {
          artifact_type: string
          content: Json
          created_at: string
          created_by_meta_agent: string
          id: string
          linked_resources: Json
          organization_id: string
          recommendation_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          artifact_type?: string
          content?: Json
          created_at?: string
          created_by_meta_agent?: string
          id?: string
          linked_resources?: Json
          organization_id: string
          recommendation_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          title?: string
          workspace_id?: string | null
        }
        Update: {
          artifact_type?: string
          content?: Json
          created_at?: string
          created_by_meta_agent?: string
          id?: string
          linked_resources?: Json
          organization_id?: string
          recommendation_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_agent_artifacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_agent_artifacts_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "meta_agent_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_agent_artifacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_agent_recommendations: {
        Row: {
          confidence_score: number
          created_at: string
          description: string
          id: string
          impact_score: number
          meta_agent_type: string
          organization_id: string
          priority_score: number
          recommendation_signature: string | null
          recommendation_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_metrics: Json
          source_record_ids: string[]
          status: string
          supporting_evidence: Json
          target_component: string
          title: string
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          description?: string
          id?: string
          impact_score?: number
          meta_agent_type?: string
          organization_id: string
          priority_score?: number
          recommendation_signature?: string | null
          recommendation_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_metrics?: Json
          source_record_ids?: string[]
          status?: string
          supporting_evidence?: Json
          target_component?: string
          title?: string
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number
          created_at?: string
          description?: string
          id?: string
          impact_score?: number
          meta_agent_type?: string
          organization_id?: string
          priority_score?: number
          recommendation_signature?: string | null
          recommendation_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_metrics?: Json
          source_record_ids?: string[]
          status?: string
          supporting_evidence?: Json
          target_component?: string
          title?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_agent_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_agent_recommendations_workspace_id_fkey"
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
      predictive_error_patterns: {
        Row: {
          contributing_factors: Json
          created_at: string
          error_signature: string
          id: string
          last_updated: string
          observations_count: number
          organization_id: string
          probability_score: number
          recommended_prevention_rule: string | null
          stage_name: string
        }
        Insert: {
          contributing_factors?: Json
          created_at?: string
          error_signature?: string
          id?: string
          last_updated?: string
          observations_count?: number
          organization_id: string
          probability_score?: number
          recommended_prevention_rule?: string | null
          stage_name?: string
        }
        Update: {
          contributing_factors?: Json
          created_at?: string
          error_signature?: string
          id?: string
          last_updated?: string
          observations_count?: number
          organization_id?: string
          probability_score?: number
          recommended_prevention_rule?: string | null
          stage_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_error_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_preventive_actions: {
        Row: {
          action_mode: string
          action_payload: Json | null
          action_type: string
          applied: boolean
          created_at: string
          id: string
          organization_id: string
          outcome_status: string | null
          risk_assessment_id: string
          stage_key: string
        }
        Insert: {
          action_mode?: string
          action_payload?: Json | null
          action_type?: string
          applied?: boolean
          created_at?: string
          id?: string
          organization_id: string
          outcome_status?: string | null
          risk_assessment_id: string
          stage_key: string
        }
        Update: {
          action_mode?: string
          action_payload?: Json | null
          action_type?: string
          applied?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          outcome_status?: string | null
          risk_assessment_id?: string
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_preventive_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_preventive_actions_risk_assessment_id_fkey"
            columns: ["risk_assessment_id"]
            isOneToOne: false
            referencedRelation: "predictive_risk_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_risk_assessments: {
        Row: {
          agent_type: string | null
          applied_action_mode: string | null
          confidence_score: number | null
          context_signature: string
          created_at: string
          evidence_refs: Json | null
          explanation_codes: Json
          id: string
          initiative_id: string | null
          model_name: string | null
          model_provider: string | null
          organization_id: string
          pipeline_job_id: string | null
          predicted_failure_types: Json
          prompt_variant_id: string | null
          recommended_actions: Json | null
          risk_band: string
          risk_score: number
          stage_key: string
        }
        Insert: {
          agent_type?: string | null
          applied_action_mode?: string | null
          confidence_score?: number | null
          context_signature?: string
          created_at?: string
          evidence_refs?: Json | null
          explanation_codes?: Json
          id?: string
          initiative_id?: string | null
          model_name?: string | null
          model_provider?: string | null
          organization_id: string
          pipeline_job_id?: string | null
          predicted_failure_types?: Json
          prompt_variant_id?: string | null
          recommended_actions?: Json | null
          risk_band?: string
          risk_score?: number
          stage_key: string
        }
        Update: {
          agent_type?: string | null
          applied_action_mode?: string | null
          confidence_score?: number | null
          context_signature?: string
          created_at?: string
          evidence_refs?: Json | null
          explanation_codes?: Json
          id?: string
          initiative_id?: string | null
          model_name?: string | null
          model_provider?: string | null
          organization_id?: string
          pipeline_job_id?: string | null
          predicted_failure_types?: Json
          prompt_variant_id?: string | null
          recommended_actions?: Json | null
          risk_band?: string
          risk_score?: number
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_risk_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      predictive_runtime_checkpoints: {
        Row: {
          checkpoint_decision: string
          checkpoint_type: string
          created_at: string
          id: string
          organization_id: string
          pipeline_job_id: string
          risk_assessment_id: string
          stage_key: string
        }
        Insert: {
          checkpoint_decision?: string
          checkpoint_type?: string
          created_at?: string
          id?: string
          organization_id: string
          pipeline_job_id: string
          risk_assessment_id: string
          stage_key: string
        }
        Update: {
          checkpoint_decision?: string
          checkpoint_type?: string
          created_at?: string
          id?: string
          organization_id?: string
          pipeline_job_id?: string
          risk_assessment_id?: string
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "predictive_runtime_checkpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictive_runtime_checkpoints_risk_assessment_id_fkey"
            columns: ["risk_assessment_id"]
            isOneToOne: false
            referencedRelation: "predictive_risk_assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_events: {
        Row: {
          action_taken: string
          context: Json | null
          created_at: string
          id: string
          initiative_id: string | null
          organization_id: string
          pipeline_stage: string
          prevented: boolean
          rule_id: string
        }
        Insert: {
          action_taken: string
          context?: Json | null
          created_at?: string
          id?: string
          initiative_id?: string | null
          organization_id: string
          pipeline_stage: string
          prevented?: boolean
          rule_id: string
        }
        Update: {
          action_taken?: string
          context?: Json | null
          created_at?: string
          id?: string
          initiative_id?: string | null
          organization_id?: string
          pipeline_stage?: string
          prevented?: boolean
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prevention_events_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "active_prevention_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      prevention_rule_candidates: {
        Row: {
          confidence_score: number
          created_at: string
          description: string
          expected_impact: string
          id: string
          organization_id: string
          pattern_id: string | null
          proposed_action: string
          rule_type: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          description?: string
          expected_impact?: string
          id?: string
          organization_id: string
          pattern_id?: string | null
          proposed_action?: string
          rule_type?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          description?: string
          expected_impact?: string
          id?: string
          organization_id?: string
          pattern_id?: string | null
          proposed_action?: string
          rule_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "prevention_rule_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prevention_rule_candidates_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      product_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_deployments_per_month: number
          max_initiatives_per_month: number
          max_parallel_runs: number
          max_tokens_per_month: number
          monthly_price_usd: number
          plan_name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_deployments_per_month?: number
          max_initiatives_per_month?: number
          max_parallel_runs?: number
          max_tokens_per_month?: number
          monthly_price_usd?: number
          plan_name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_deployments_per_month?: number
          max_initiatives_per_month?: number
          max_parallel_runs?: number
          max_tokens_per_month?: number
          monthly_price_usd?: number
          plan_name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
      prompt_promotion_health_checks: {
        Row: {
          avg_cost_usd: number | null
          avg_duration_ms: number | null
          avg_quality_score: number | null
          check_window_end: string
          check_window_start: string
          created_at: string
          executions: number
          health_status: string
          id: string
          organization_id: string
          prompt_variant_id: string
          regression_flags: Json | null
          repair_rate: number | null
          rollout_window_id: string
          success_rate: number | null
        }
        Insert: {
          avg_cost_usd?: number | null
          avg_duration_ms?: number | null
          avg_quality_score?: number | null
          check_window_end: string
          check_window_start: string
          created_at?: string
          executions?: number
          health_status?: string
          id?: string
          organization_id: string
          prompt_variant_id: string
          regression_flags?: Json | null
          repair_rate?: number | null
          rollout_window_id: string
          success_rate?: number | null
        }
        Update: {
          avg_cost_usd?: number | null
          avg_duration_ms?: number | null
          avg_quality_score?: number | null
          check_window_end?: string
          check_window_start?: string
          created_at?: string
          executions?: number
          health_status?: string
          id?: string
          organization_id?: string
          prompt_variant_id?: string
          regression_flags?: Json | null
          repair_rate?: number | null
          rollout_window_id?: string
          success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_promotion_health_checks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_promotion_health_checks_prompt_variant_id_fkey"
            columns: ["prompt_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_promotion_health_checks_rollout_window_id_fkey"
            columns: ["rollout_window_id"]
            isOneToOne: false
            referencedRelation: "prompt_rollout_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_rollback_events: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          restored_control_variant_id: string
          rollback_mode: string
          rollback_reason: Json
          rolled_back_variant_id: string
          rollout_window_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          restored_control_variant_id: string
          rollback_mode?: string
          rollback_reason?: Json
          rolled_back_variant_id: string
          rollout_window_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          restored_control_variant_id?: string
          rollback_mode?: string
          rollback_reason?: Json
          rolled_back_variant_id?: string
          rollout_window_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_rollback_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_rollback_events_restored_control_variant_id_fkey"
            columns: ["restored_control_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_rollback_events_rolled_back_variant_id_fkey"
            columns: ["rolled_back_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_rollback_events_rollout_window_id_fkey"
            columns: ["rollout_window_id"]
            isOneToOne: false
            referencedRelation: "prompt_rollout_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_rollout_windows: {
        Row: {
          completed_at: string | null
          current_exposure_percent: number
          id: string
          organization_id: string
          previous_control_variant_id: string | null
          promoted_variant_id: string
          rollout_mode: string
          rollout_status: string
          rollout_strategy: string
          stage_key: string
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          current_exposure_percent?: number
          id?: string
          organization_id: string
          previous_control_variant_id?: string | null
          promoted_variant_id: string
          rollout_mode?: string
          rollout_status?: string
          rollout_strategy?: string
          stage_key: string
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          current_exposure_percent?: number
          id?: string
          organization_id?: string
          previous_control_variant_id?: string | null
          promoted_variant_id?: string
          rollout_mode?: string
          rollout_status?: string
          rollout_strategy?: string
          stage_key?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_rollout_windows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_rollout_windows_previous_control_variant_id_fkey"
            columns: ["previous_control_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_rollout_windows_promoted_variant_id_fkey"
            columns: ["promoted_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_strategy_metrics: {
        Row: {
          average_cost: number
          average_quality_score: number
          created_at: string
          id: string
          last_updated: string
          organization_id: string
          prompt_signature: string
          retry_rate: number
          runs_count: number
          stage_name: string
          success_rate: number
          token_efficiency: number
        }
        Insert: {
          average_cost?: number
          average_quality_score?: number
          created_at?: string
          id?: string
          last_updated?: string
          organization_id: string
          prompt_signature?: string
          retry_rate?: number
          runs_count?: number
          stage_name?: string
          success_rate?: number
          token_efficiency?: number
        }
        Update: {
          average_cost?: number
          average_quality_score?: number
          created_at?: string
          id?: string
          last_updated?: string
          organization_id?: string
          prompt_signature?: string
          retry_rate?: number
          runs_count?: number
          stage_name?: string
          success_rate?: number
          token_efficiency?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_strategy_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_variant_executions: {
        Row: {
          cost_usd: number
          created_at: string
          duration_ms: number
          execution_signature: string
          id: string
          initiative_id: string | null
          model_name: string | null
          model_provider: string | null
          organization_id: string
          pipeline_job_id: string | null
          prompt_variant_id: string
          quality_score: number | null
          repair_triggered: boolean
          retry_count: number
          stage_key: string
          success: boolean | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          duration_ms?: number
          execution_signature: string
          id?: string
          initiative_id?: string | null
          model_name?: string | null
          model_provider?: string | null
          organization_id: string
          pipeline_job_id?: string | null
          prompt_variant_id: string
          quality_score?: number | null
          repair_triggered?: boolean
          retry_count?: number
          stage_key: string
          success?: boolean | null
        }
        Update: {
          cost_usd?: number
          created_at?: string
          duration_ms?: number
          execution_signature?: string
          id?: string
          initiative_id?: string | null
          model_name?: string | null
          model_provider?: string | null
          organization_id?: string
          pipeline_job_id?: string | null
          prompt_variant_id?: string
          quality_score?: number | null
          repair_triggered?: boolean
          retry_count?: number
          stage_key?: string
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_variant_executions_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variant_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variant_executions_pipeline_job_id_fkey"
            columns: ["pipeline_job_id"]
            isOneToOne: false
            referencedRelation: "initiative_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variant_executions_prompt_variant_id_fkey"
            columns: ["prompt_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_variant_metrics: {
        Row: {
          avg_cost_usd: number | null
          avg_duration_ms: number | null
          avg_quality_score: number | null
          confidence_level: number | null
          created_at: string
          executions: number
          id: string
          organization_id: string
          period_end: string
          period_start: string
          promotion_score: number | null
          prompt_variant_id: string
          repair_rate: number | null
          success_rate: number | null
        }
        Insert: {
          avg_cost_usd?: number | null
          avg_duration_ms?: number | null
          avg_quality_score?: number | null
          confidence_level?: number | null
          created_at?: string
          executions?: number
          id?: string
          organization_id: string
          period_end: string
          period_start: string
          promotion_score?: number | null
          prompt_variant_id: string
          repair_rate?: number | null
          success_rate?: number | null
        }
        Update: {
          avg_cost_usd?: number | null
          avg_duration_ms?: number | null
          avg_quality_score?: number | null
          confidence_level?: number | null
          created_at?: string
          executions?: number
          id?: string
          organization_id?: string
          period_end?: string
          period_start?: string
          promotion_score?: number | null
          prompt_variant_id?: string
          repair_rate?: number | null
          success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_variant_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variant_metrics_prompt_variant_id_fkey"
            columns: ["prompt_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_variant_promotions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          previous_control_variant_id: string | null
          promoted_variant_id: string
          promotion_mode: string
          promotion_reason: Json
          rollback_guard: Json | null
          stage_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          previous_control_variant_id?: string | null
          promoted_variant_id: string
          promotion_mode?: string
          promotion_reason?: Json
          rollback_guard?: Json | null
          stage_key: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          previous_control_variant_id?: string | null
          promoted_variant_id?: string
          promotion_mode?: string
          promotion_reason?: Json
          rollback_guard?: Json | null
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_variant_promotions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variant_promotions_previous_control_variant_id_fkey"
            columns: ["previous_control_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variant_promotions_promoted_variant_id_fkey"
            columns: ["promoted_variant_id"]
            isOneToOne: false
            referencedRelation: "prompt_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_variants: {
        Row: {
          agent_type: string | null
          base_prompt_signature: string
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean
          model_name: string | null
          model_provider: string | null
          organization_id: string
          prompt_template: string
          stage_key: string
          status: string
          updated_at: string
          variables_schema: Json | null
          variant_name: string
          variant_version: number
          workspace_id: string | null
        }
        Insert: {
          agent_type?: string | null
          base_prompt_signature: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          model_name?: string | null
          model_provider?: string | null
          organization_id: string
          prompt_template: string
          stage_key: string
          status?: string
          updated_at?: string
          variables_schema?: Json | null
          variant_name: string
          variant_version?: number
          workspace_id?: string | null
        }
        Update: {
          agent_type?: string | null
          base_prompt_signature?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          model_name?: string | null
          model_provider?: string | null
          organization_id?: string
          prompt_template?: string
          stage_key?: string
          status?: string
          updated_at?: string
          variables_schema?: Json | null
          variant_name?: string
          variant_version?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_variants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_quality_aggregates: {
        Row: {
          avg_acceptance_rate: number
          avg_confidence_accepted: number
          avg_confidence_rejected: number
          avg_implementation_rate: number
          avg_overall_quality: number
          avg_review_latency_hours: number
          created_at: string
          id: string
          last_computed_at: string
          memory_enriched_acceptance_rate: number
          meta_agent_type: string
          non_memory_acceptance_rate: number
          organization_id: string
          quality_trend: string
          total_accepted: number
          total_artifacts_approved: number
          total_artifacts_generated: number
          total_artifacts_implemented: number
          total_deferred: number
          total_recommendations: number
          total_rejected: number
          updated_at: string
        }
        Insert: {
          avg_acceptance_rate?: number
          avg_confidence_accepted?: number
          avg_confidence_rejected?: number
          avg_implementation_rate?: number
          avg_overall_quality?: number
          avg_review_latency_hours?: number
          created_at?: string
          id?: string
          last_computed_at?: string
          memory_enriched_acceptance_rate?: number
          meta_agent_type?: string
          non_memory_acceptance_rate?: number
          organization_id: string
          quality_trend?: string
          total_accepted?: number
          total_artifacts_approved?: number
          total_artifacts_generated?: number
          total_artifacts_implemented?: number
          total_deferred?: number
          total_recommendations?: number
          total_rejected?: number
          updated_at?: string
        }
        Update: {
          avg_acceptance_rate?: number
          avg_confidence_accepted?: number
          avg_confidence_rejected?: number
          avg_implementation_rate?: number
          avg_overall_quality?: number
          avg_review_latency_hours?: number
          created_at?: string
          id?: string
          last_computed_at?: string
          memory_enriched_acceptance_rate?: number
          meta_agent_type?: string
          non_memory_acceptance_rate?: number
          organization_id?: string
          quality_trend?: string
          total_accepted?: number
          total_artifacts_approved?: number
          total_artifacts_generated?: number
          total_artifacts_implemented?: number
          total_deferred?: number
          total_recommendations?: number
          total_rejected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_quality_aggregates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_quality_feedback: {
        Row: {
          artifact_type: string | null
          created_at: string
          decision_signal: string
          entity_id: string
          entity_type: string
          evidence_refs: Json
          feedback_tags: Json
          follow_through_signal: string
          historical_conflict_score: number | null
          historical_support_score: number | null
          id: string
          notes: string | null
          organization_id: string
          outcome_signal: string
          quality_score: number
          reviewer_feedback_score: number | null
          source_meta_agent_type: string | null
          updated_at: string
          usefulness_score: number
          workspace_id: string | null
        }
        Insert: {
          artifact_type?: string | null
          created_at?: string
          decision_signal?: string
          entity_id: string
          entity_type?: string
          evidence_refs?: Json
          feedback_tags?: Json
          follow_through_signal?: string
          historical_conflict_score?: number | null
          historical_support_score?: number | null
          id?: string
          notes?: string | null
          organization_id: string
          outcome_signal?: string
          quality_score?: number
          reviewer_feedback_score?: number | null
          source_meta_agent_type?: string | null
          updated_at?: string
          usefulness_score?: number
          workspace_id?: string | null
        }
        Update: {
          artifact_type?: string | null
          created_at?: string
          decision_signal?: string
          entity_id?: string
          entity_type?: string
          evidence_refs?: Json
          feedback_tags?: Json
          follow_through_signal?: string
          historical_conflict_score?: number | null
          historical_support_score?: number | null
          id?: string
          notes?: string | null
          organization_id?: string
          outcome_signal?: string
          quality_score?: number
          reviewer_feedback_score?: number | null
          source_meta_agent_type?: string | null
          updated_at?: string
          usefulness_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_quality_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_quality_feedback_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_quality_records: {
        Row: {
          acceptance_quality_score: number
          artifact_type: string | null
          confidence_at_creation: number | null
          created_at: string
          entity_id: string
          entity_type: string
          feedback_signals: Json
          historical_alignment: string | null
          historical_alignment_accuracy: number
          id: string
          impact_at_creation: number | null
          implementation_quality_score: number
          meta_agent_type: string
          organization_id: string
          overall_quality_score: number
          priority_at_creation: number | null
          recommendation_type: string
          review_latency_hours: number | null
          review_outcome: string
          reviewer_notes_length: number | null
          updated_at: string
          was_memory_enriched: boolean | null
        }
        Insert: {
          acceptance_quality_score?: number
          artifact_type?: string | null
          confidence_at_creation?: number | null
          created_at?: string
          entity_id: string
          entity_type?: string
          feedback_signals?: Json
          historical_alignment?: string | null
          historical_alignment_accuracy?: number
          id?: string
          impact_at_creation?: number | null
          implementation_quality_score?: number
          meta_agent_type?: string
          organization_id: string
          overall_quality_score?: number
          priority_at_creation?: number | null
          recommendation_type?: string
          review_latency_hours?: number | null
          review_outcome?: string
          reviewer_notes_length?: number | null
          updated_at?: string
          was_memory_enriched?: boolean | null
        }
        Update: {
          acceptance_quality_score?: number
          artifact_type?: string | null
          confidence_at_creation?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          feedback_signals?: Json
          historical_alignment?: string | null
          historical_alignment_accuracy?: number
          id?: string
          impact_at_creation?: number | null
          implementation_quality_score?: number
          meta_agent_type?: string
          organization_id?: string
          overall_quality_score?: number
          priority_at_creation?: number | null
          recommendation_type?: string
          review_latency_hours?: number | null
          review_outcome?: string
          reviewer_notes_length?: number | null
          updated_at?: string
          was_memory_enriched?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_quality_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_quality_summaries: {
        Row: {
          acceptance_rate: number
          advisory_signals: Json
          artifact_type: string | null
          avg_quality_score: number
          avg_usefulness_score: number
          content: Json
          created_at: string
          historically_novel_performance: number | null
          historically_supported_performance: number | null
          id: string
          implementation_rate: number
          meta_agent_type: string | null
          organization_id: string
          period_end: string
          period_start: string
          positive_outcome_rate: number
          rejection_patterns: Json
          summary_type: string
          top_feedback_tags: Json
          total_feedback_count: number
          workspace_id: string | null
        }
        Insert: {
          acceptance_rate?: number
          advisory_signals?: Json
          artifact_type?: string | null
          avg_quality_score?: number
          avg_usefulness_score?: number
          content?: Json
          created_at?: string
          historically_novel_performance?: number | null
          historically_supported_performance?: number | null
          id?: string
          implementation_rate?: number
          meta_agent_type?: string | null
          organization_id: string
          period_end: string
          period_start: string
          positive_outcome_rate?: number
          rejection_patterns?: Json
          summary_type?: string
          top_feedback_tags?: Json
          total_feedback_count?: number
          workspace_id?: string | null
        }
        Update: {
          acceptance_rate?: number
          advisory_signals?: Json
          artifact_type?: string | null
          avg_quality_score?: number
          avg_usefulness_score?: number
          content?: Json
          created_at?: string
          historically_novel_performance?: number | null
          historically_supported_performance?: number | null
          id?: string
          implementation_rate?: number
          meta_agent_type?: string | null
          organization_id?: string
          period_end?: string
          period_start?: string
          positive_outcome_rate?: number
          rejection_patterns?: Json
          summary_type?: string
          top_feedback_tags?: Json
          total_feedback_count?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_quality_summaries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_quality_summaries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_evidence: {
        Row: {
          attempt_number: number
          created_at: string
          duration_ms: number | null
          error_category: string
          error_code: string
          error_message: string
          error_signature: string
          failure_context: Json | null
          files_touched: string[] | null
          id: string
          initiative_id: string
          job_id: string | null
          organization_id: string
          patch_summary: string
          repair_prompt_version: string | null
          repair_result: string
          repair_strategy: string
          revalidation_status: string
          stage_name: string
          validation_after: Json | null
          validation_before: Json | null
        }
        Insert: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_category?: string
          error_code?: string
          error_message?: string
          error_signature?: string
          failure_context?: Json | null
          files_touched?: string[] | null
          id?: string
          initiative_id: string
          job_id?: string | null
          organization_id: string
          patch_summary?: string
          repair_prompt_version?: string | null
          repair_result?: string
          repair_strategy?: string
          revalidation_status?: string
          stage_name: string
          validation_after?: Json | null
          validation_before?: Json | null
        }
        Update: {
          attempt_number?: number
          created_at?: string
          duration_ms?: number | null
          error_category?: string
          error_code?: string
          error_message?: string
          error_signature?: string
          failure_context?: Json | null
          files_touched?: string[] | null
          id?: string
          initiative_id?: string
          job_id?: string | null
          organization_id?: string
          patch_summary?: string
          repair_prompt_version?: string | null
          repair_result?: string
          repair_strategy?: string
          revalidation_status?: string
          stage_name?: string
          validation_after?: Json | null
          validation_before?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "repair_evidence_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_evidence_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "initiative_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_policy_adjustments: {
        Row: {
          adjustment_reason: Json
          adjustment_type: string
          bounded_delta: Json | null
          created_at: string
          id: string
          new_state: Json
          organization_id: string
          previous_state: Json
          repair_policy_profile_id: string
        }
        Insert: {
          adjustment_reason?: Json
          adjustment_type: string
          bounded_delta?: Json | null
          created_at?: string
          id?: string
          new_state?: Json
          organization_id: string
          previous_state?: Json
          repair_policy_profile_id: string
        }
        Update: {
          adjustment_reason?: Json
          adjustment_type?: string
          bounded_delta?: Json | null
          created_at?: string
          id?: string
          new_state?: Json
          organization_id?: string
          previous_state?: Json
          repair_policy_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_policy_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_policy_adjustments_repair_policy_profile_id_fkey"
            columns: ["repair_policy_profile_id"]
            isOneToOne: false
            referencedRelation: "repair_policy_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_policy_decisions: {
        Row: {
          confidence: number | null
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error_signature: string
          evidence_refs: Json | null
          fallback_strategy: string | null
          id: string
          organization_id: string
          outcome_status: string
          pipeline_job_id: string | null
          reason_codes: Json
          retry_count: number | null
          selected_strategy: string
          stage_key: string
        }
        Insert: {
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_signature: string
          evidence_refs?: Json | null
          fallback_strategy?: string | null
          id?: string
          organization_id: string
          outcome_status?: string
          pipeline_job_id?: string | null
          reason_codes?: Json
          retry_count?: number | null
          selected_strategy: string
          stage_key: string
        }
        Update: {
          confidence?: number | null
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_signature?: string
          evidence_refs?: Json | null
          fallback_strategy?: string | null
          id?: string
          organization_id?: string
          outcome_status?: string
          pipeline_job_id?: string | null
          reason_codes?: Json
          retry_count?: number | null
          selected_strategy?: string
          stage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_policy_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_policy_profiles: {
        Row: {
          agent_type: string | null
          avg_repair_cost_usd: number | null
          avg_resolution_time_ms: number | null
          avg_retry_count: number | null
          confidence: number | null
          created_at: string
          error_signature: string
          failure_count: number | null
          fallback_strategy: string | null
          id: string
          model_name: string | null
          model_provider: string | null
          organization_id: string
          preferred_strategy: string
          stage_key: string
          status: string
          support_count: number | null
          updated_at: string
        }
        Insert: {
          agent_type?: string | null
          avg_repair_cost_usd?: number | null
          avg_resolution_time_ms?: number | null
          avg_retry_count?: number | null
          confidence?: number | null
          created_at?: string
          error_signature: string
          failure_count?: number | null
          fallback_strategy?: string | null
          id?: string
          model_name?: string | null
          model_provider?: string | null
          organization_id: string
          preferred_strategy: string
          stage_key: string
          status?: string
          support_count?: number | null
          updated_at?: string
        }
        Update: {
          agent_type?: string | null
          avg_repair_cost_usd?: number | null
          avg_resolution_time_ms?: number | null
          avg_retry_count?: number | null
          confidence?: number | null
          created_at?: string
          error_signature?: string
          failure_count?: number | null
          fallback_strategy?: string | null
          id?: string
          model_name?: string | null
          model_provider?: string | null
          organization_id?: string
          preferred_strategy?: string
          stage_key?: string
          status?: string
          support_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_policy_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_routing_log: {
        Row: {
          confidence_score: number
          created_at: string
          decision_source: string
          error_category: string
          error_signature: string
          id: string
          initiative_id: string | null
          organization_id: string | null
          pipeline_stage: string
          selected_strategy: string
          strategy_rankings: Json
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          decision_source?: string
          error_category?: string
          error_signature?: string
          id?: string
          initiative_id?: string | null
          organization_id?: string | null
          pipeline_stage?: string
          selected_strategy?: string
          strategy_rankings?: Json
        }
        Update: {
          confidence_score?: number
          created_at?: string
          decision_source?: string
          error_category?: string
          error_signature?: string
          id?: string
          initiative_id?: string | null
          organization_id?: string | null
          pipeline_stage?: string
          selected_strategy?: string
          strategy_rankings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "repair_routing_log_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_routing_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_strategy_weights: {
        Row: {
          adjusted_at: string
          adjustment_reason: string
          created_at: string
          current_weight: number
          evidence_ids: string[]
          id: string
          organization_id: string
          previous_weight: number
          stage_name: string
          strategy_name: string
        }
        Insert: {
          adjusted_at?: string
          adjustment_reason?: string
          created_at?: string
          current_weight?: number
          evidence_ids?: string[]
          id?: string
          organization_id: string
          previous_weight?: number
          stage_name?: string
          strategy_name?: string
        }
        Update: {
          adjusted_at?: string
          adjustment_reason?: string
          created_at?: string
          current_weight?: number
          evidence_ids?: string[]
          id?: string
          organization_id?: string
          previous_weight?: number
          stage_name?: string
          strategy_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_strategy_weights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      strategy_effectiveness: {
        Row: {
          attempts_total: number
          average_duration_ms: number
          confidence_score: number
          created_at: string
          error_category: string
          failures_total: number
          id: string
          last_used_at: string
          organization_id: string
          repair_strategy: string
          success_rate: number
          successes_total: number
          updated_at: string
        }
        Insert: {
          attempts_total?: number
          average_duration_ms?: number
          confidence_score?: number
          created_at?: string
          error_category: string
          failures_total?: number
          id?: string
          last_used_at?: string
          organization_id: string
          repair_strategy: string
          success_rate?: number
          successes_total?: number
          updated_at?: string
        }
        Update: {
          attempts_total?: number
          average_duration_ms?: number
          confidence_score?: number
          created_at?: string
          error_category?: string
          failures_total?: number
          id?: string
          last_used_at?: string
          organization_id?: string
          repair_strategy?: string
          success_rate?: number
          successes_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_effectiveness_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_effectiveness_metrics: {
        Row: {
          avg_cost: number
          avg_resolution_time: number
          created_at: string
          error_recurrence_rate: number
          error_type: string
          id: string
          last_updated: string
          organization_id: string
          runs_count: number
          strategy_name: string
          success_rate: number
        }
        Insert: {
          avg_cost?: number
          avg_resolution_time?: number
          created_at?: string
          error_recurrence_rate?: number
          error_type?: string
          id?: string
          last_updated?: string
          organization_id: string
          runs_count?: number
          strategy_name?: string
          success_rate?: number
        }
        Update: {
          avg_cost?: number
          avg_resolution_time?: number
          created_at?: string
          error_recurrence_rate?: number
          error_type?: string
          id?: string
          last_updated?: string
          organization_id?: string
          runs_count?: number
          strategy_name?: string
          success_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_effectiveness_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      workspace_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          settings: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          settings?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
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
