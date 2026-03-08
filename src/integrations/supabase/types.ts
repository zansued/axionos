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
      architecture_change_agenda_reviews: {
        Row: {
          agenda_id: string
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          agenda_id: string
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          agenda_id?: string
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_change_agenda_reviews_agenda_id_fkey"
            columns: ["agenda_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_agendas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_change_agenda_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_change_agendas: {
        Row: {
          agenda_health_score: number | null
          agenda_name: string
          agenda_payload: Json
          agenda_scope: string
          bundled_items: Json | null
          created_at: string
          deferred_items: Json | null
          id: string
          organization_id: string
          sequencing_graph: Json | null
          status: string
          suppressed_items: Json | null
        }
        Insert: {
          agenda_health_score?: number | null
          agenda_name: string
          agenda_payload?: Json
          agenda_scope: string
          bundled_items?: Json | null
          created_at?: string
          deferred_items?: Json | null
          id?: string
          organization_id: string
          sequencing_graph?: Json | null
          status?: string
          suppressed_items?: Json | null
        }
        Update: {
          agenda_health_score?: number | null
          agenda_name?: string
          agenda_payload?: Json
          agenda_scope?: string
          bundled_items?: Json | null
          created_at?: string
          deferred_items?: Json | null
          id?: string
          organization_id?: string
          sequencing_graph?: Json | null
          status?: string
          suppressed_items?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_change_agendas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_change_plan_reviews: {
        Row: {
          blocker_reasons: Json | null
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          plan_id: string
          review_notes: string | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          blocker_reasons?: Json | null
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          plan_id: string
          review_notes?: string | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          blocker_reasons?: Json | null
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          plan_id?: string
          review_notes?: string | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_change_plan_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_change_plan_reviews_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_change_plans: {
        Row: {
          blast_radius: Json | null
          created_at: string
          dependency_graph: Json | null
          id: string
          implementation_risk: string
          organization_id: string
          plan_name: string
          plan_payload: Json
          proposal_id: string
          readiness_score: number | null
          rollback_blueprint: Json | null
          simulation_outcome_id: string
          status: string
          target_scope: string
          validation_requirements: Json | null
        }
        Insert: {
          blast_radius?: Json | null
          created_at?: string
          dependency_graph?: Json | null
          id?: string
          implementation_risk?: string
          organization_id: string
          plan_name: string
          plan_payload?: Json
          proposal_id: string
          readiness_score?: number | null
          rollback_blueprint?: Json | null
          simulation_outcome_id: string
          status?: string
          target_scope: string
          validation_requirements?: Json | null
        }
        Update: {
          blast_radius?: Json | null
          created_at?: string
          dependency_graph?: Json | null
          id?: string
          implementation_risk?: string
          organization_id?: string
          plan_name?: string
          plan_payload?: Json
          proposal_id?: string
          readiness_score?: number | null
          rollback_blueprint?: Json | null
          simulation_outcome_id?: string
          status?: string
          target_scope?: string
          validation_requirements?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_change_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_change_plans_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_change_plans_simulation_outcome_id_fkey"
            columns: ["simulation_outcome_id"]
            isOneToOne: false
            referencedRelation: "architecture_simulation_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_change_proposals: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string
          priority_score: number | null
          proposal_payload: Json
          proposal_type: string
          safety_class: string
          source_recommendation_id: string | null
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id: string
          priority_score?: number | null
          proposal_payload?: Json
          proposal_type: string
          safety_class?: string
          source_recommendation_id?: string | null
          status?: string
          target_entities?: Json
          target_scope: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          priority_score?: number | null
          proposal_payload?: Json
          proposal_type?: string
          safety_class?: string
          source_recommendation_id?: string | null
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_change_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_change_proposals_source_recommendation_id_fkey"
            columns: ["source_recommendation_id"]
            isOneToOne: false
            referencedRelation: "discovery_architecture_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_economic_assessments: {
        Row: {
          change_ref: Json
          change_type: string
          cost_to_reliability_ratio: number | null
          cost_to_stability_ratio: number | null
          created_at: string
          economic_confidence_score: number | null
          economic_tradeoff_score: number | null
          evidence_refs: Json | null
          forecast_variance_score: number | null
          id: string
          migration_roi_30d: number | null
          migration_roi_90d: number | null
          organization_id: string
          projected_change_cost: number | null
          projected_operational_cost_delta: number | null
          projected_reliability_gain: number | null
          projected_rollback_cost: number | null
          projected_stability_gain: number | null
          rationale_codes: Json | null
          rollback_reserve_ratio: number | null
          rollout_cost_envelope: number | null
          status: string
          tenant_divergence_cost: number | null
          updated_at: string
        }
        Insert: {
          change_ref?: Json
          change_type?: string
          cost_to_reliability_ratio?: number | null
          cost_to_stability_ratio?: number | null
          created_at?: string
          economic_confidence_score?: number | null
          economic_tradeoff_score?: number | null
          evidence_refs?: Json | null
          forecast_variance_score?: number | null
          id?: string
          migration_roi_30d?: number | null
          migration_roi_90d?: number | null
          organization_id: string
          projected_change_cost?: number | null
          projected_operational_cost_delta?: number | null
          projected_reliability_gain?: number | null
          projected_rollback_cost?: number | null
          projected_stability_gain?: number | null
          rationale_codes?: Json | null
          rollback_reserve_ratio?: number | null
          rollout_cost_envelope?: number | null
          status?: string
          tenant_divergence_cost?: number | null
          updated_at?: string
        }
        Update: {
          change_ref?: Json
          change_type?: string
          cost_to_reliability_ratio?: number | null
          cost_to_stability_ratio?: number | null
          created_at?: string
          economic_confidence_score?: number | null
          economic_tradeoff_score?: number | null
          evidence_refs?: Json | null
          forecast_variance_score?: number | null
          id?: string
          migration_roi_30d?: number | null
          migration_roi_90d?: number | null
          organization_id?: string
          projected_change_cost?: number | null
          projected_operational_cost_delta?: number | null
          projected_reliability_gain?: number | null
          projected_rollback_cost?: number | null
          projected_stability_gain?: number | null
          rationale_codes?: Json | null
          rollback_reserve_ratio?: number | null
          rollout_cost_envelope?: number | null
          status?: string
          tenant_divergence_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_economic_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_fitness_dimensions: {
        Row: {
          created_at: string
          critical_threshold: Json
          dimension_definition: Json
          dimension_key: string
          dimension_name: string
          dimension_scope: string
          id: string
          organization_id: string
          scoring_policy: Json
          status: string
          updated_at: string
          warning_threshold: Json
        }
        Insert: {
          created_at?: string
          critical_threshold?: Json
          dimension_definition?: Json
          dimension_key: string
          dimension_name: string
          dimension_scope?: string
          id?: string
          organization_id: string
          scoring_policy?: Json
          status?: string
          updated_at?: string
          warning_threshold?: Json
        }
        Update: {
          created_at?: string
          critical_threshold?: Json
          dimension_definition?: Json
          dimension_key?: string
          dimension_name?: string
          dimension_scope?: string
          id?: string
          organization_id?: string
          scoring_policy?: Json
          status?: string
          updated_at?: string
          warning_threshold?: Json
        }
        Relationships: [
          {
            foreignKeyName: "architecture_fitness_dimensions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_fitness_evaluations: {
        Row: {
          confidence_score: number | null
          created_at: string
          degradation_status: string
          dimension_id: string
          evidence_refs: Json | null
          id: string
          organization_id: string
          rationale_codes: Json | null
          scope_ref: Json | null
          score: number
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          degradation_status?: string
          dimension_id: string
          evidence_refs?: Json | null
          id?: string
          organization_id: string
          rationale_codes?: Json | null
          scope_ref?: Json | null
          score?: number
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          degradation_status?: string
          dimension_id?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string
          rationale_codes?: Json | null
          scope_ref?: Json | null
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "architecture_fitness_evaluations_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "architecture_fitness_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_fitness_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_fitness_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          dimension_id: string
          id: string
          organization_id: string
          priority_score: number | null
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          dimension_id: string
          id?: string
          organization_id: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          dimension_id?: string
          id?: string
          organization_id?: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_fitness_recommendations_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "architecture_fitness_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_fitness_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_fitness_reviews: {
        Row: {
          created_at: string
          evaluation_ref: Json | null
          id: string
          linked_changes: Json | null
          organization_id: string
          recommendation_id: string | null
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          created_at?: string
          evaluation_ref?: Json | null
          id?: string
          linked_changes?: Json | null
          organization_id: string
          recommendation_id?: string | null
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          created_at?: string
          evaluation_ref?: Json | null
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          recommendation_id?: string | null
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_fitness_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_fitness_reviews_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "architecture_fitness_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_migration_executions: {
        Row: {
          activation_constraints: Json | null
          active_phase: number
          baseline_ref: Json
          created_at: string
          id: string
          migration_name: string
          migration_state: string
          organization_id: string
          phase_sequence: Json
          pilot_id: string | null
          plan_id: string
          rollback_blueprint: Json
          rollout_profile: Json
          target_scope: string
          validation_blueprint: Json
        }
        Insert: {
          activation_constraints?: Json | null
          active_phase?: number
          baseline_ref?: Json
          created_at?: string
          id?: string
          migration_name: string
          migration_state?: string
          organization_id: string
          phase_sequence?: Json
          pilot_id?: string | null
          plan_id: string
          rollback_blueprint?: Json
          rollout_profile?: Json
          target_scope: string
          validation_blueprint?: Json
        }
        Update: {
          activation_constraints?: Json | null
          active_phase?: number
          baseline_ref?: Json
          created_at?: string
          id?: string
          migration_name?: string
          migration_state?: string
          organization_id?: string
          phase_sequence?: Json
          pilot_id?: string | null
          plan_id?: string
          rollback_blueprint?: Json
          rollout_profile?: Json
          target_scope?: string
          validation_blueprint?: Json
        }
        Relationships: [
          {
            foreignKeyName: "architecture_migration_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_migration_executions_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_pilots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_migration_executions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_migration_governance_profiles: {
        Row: {
          created_at: string
          id: string
          max_scope_breadth: number | null
          organization_id: string
          profile_constraints: Json
          profile_key: string
          profile_name: string
          required_checkpoint_depth: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_scope_breadth?: number | null
          organization_id: string
          profile_constraints?: Json
          profile_key: string
          profile_name: string
          required_checkpoint_depth?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_scope_breadth?: number | null
          organization_id?: string
          profile_constraints?: Json
          profile_key?: string
          profile_name?: string
          required_checkpoint_depth?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_migration_governance_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_migration_outcomes: {
        Row: {
          baseline_summary: Json
          created_at: string
          delta_summary: Json
          evidence_refs: Json | null
          id: string
          migration_execution_id: string
          migration_summary: Json
          organization_id: string
          outcome_status: string
          phase_number: number
          risk_flags: Json | null
          scope_slice: Json
        }
        Insert: {
          baseline_summary?: Json
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json | null
          id?: string
          migration_execution_id: string
          migration_summary?: Json
          organization_id: string
          outcome_status?: string
          phase_number?: number
          risk_flags?: Json | null
          scope_slice?: Json
        }
        Update: {
          baseline_summary?: Json
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json | null
          id?: string
          migration_execution_id?: string
          migration_summary?: Json
          organization_id?: string
          outcome_status?: string
          phase_number?: number
          risk_flags?: Json | null
          scope_slice?: Json
        }
        Relationships: [
          {
            foreignKeyName: "architecture_migration_outcomes_migration_execution_id_fkey"
            columns: ["migration_execution_id"]
            isOneToOne: false
            referencedRelation: "architecture_migration_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_migration_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_migration_reviews: {
        Row: {
          created_at: string
          id: string
          linked_changes: Json | null
          migration_execution_id: string
          organization_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          migration_execution_id: string
          organization_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          migration_execution_id?: string
          organization_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_migration_reviews_migration_execution_id_fkey"
            columns: ["migration_execution_id"]
            isOneToOne: false
            referencedRelation: "architecture_migration_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_migration_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_migration_rollbacks: {
        Row: {
          created_at: string
          id: string
          migration_execution_id: string
          organization_id: string
          restored_state: Json
          rollback_mode: string
          rollback_reason: Json
          rollback_scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          migration_execution_id: string
          organization_id: string
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
          rollback_scope?: string
        }
        Update: {
          created_at?: string
          id?: string
          migration_execution_id?: string
          organization_id?: string
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
          rollback_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_migration_rollbacks_migration_execution_id_fkey"
            columns: ["migration_execution_id"]
            isOneToOne: false
            referencedRelation: "architecture_migration_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_migration_rollbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_pilot_eligibility_rules: {
        Row: {
          created_at: string
          enforcement_mode: string
          id: string
          organization_id: string
          rule_definition: Json
          rule_key: string
          rule_name: string
          rule_scope: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enforcement_mode?: string
          id?: string
          organization_id: string
          rule_definition?: Json
          rule_key: string
          rule_name: string
          rule_scope?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enforcement_mode?: string
          id?: string
          organization_id?: string
          rule_definition?: Json
          rule_key?: string
          rule_name?: string
          rule_scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_pilot_eligibility_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_portfolio_members: {
        Row: {
          blast_radius_weight: number | null
          conflict_risk_score: number | null
          contribution_score: number | null
          created_at: string
          id: string
          lifecycle_state: string
          member_ref: Json
          member_type: string
          organization_id: string
          portfolio_id: string
        }
        Insert: {
          blast_radius_weight?: number | null
          conflict_risk_score?: number | null
          contribution_score?: number | null
          created_at?: string
          id?: string
          lifecycle_state?: string
          member_ref?: Json
          member_type?: string
          organization_id: string
          portfolio_id: string
        }
        Update: {
          blast_radius_weight?: number | null
          conflict_risk_score?: number | null
          contribution_score?: number | null
          created_at?: string
          id?: string
          lifecycle_state?: string
          member_ref?: Json
          member_type?: string
          organization_id?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_portfolio_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "architecture_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_portfolio_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string
          portfolio_id: string
          priority_score: number | null
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_members: Json
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id: string
          portfolio_id: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_members?: Json
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          portfolio_id?: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_members?: Json
        }
        Relationships: [
          {
            foreignKeyName: "architecture_portfolio_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_portfolio_recommendations_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "architecture_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_portfolios: {
        Row: {
          created_at: string
          id: string
          lifecycle_status: string
          organization_id: string
          portfolio_constraints: Json
          portfolio_key: string
          portfolio_name: string
          portfolio_scope: string
          portfolio_theme: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lifecycle_status?: string
          organization_id: string
          portfolio_constraints?: Json
          portfolio_key: string
          portfolio_name: string
          portfolio_scope?: string
          portfolio_theme?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lifecycle_status?: string
          organization_id?: string
          portfolio_constraints?: Json
          portfolio_key?: string
          portfolio_name?: string
          portfolio_scope?: string
          portfolio_theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_portfolios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_governance_profiles: {
        Row: {
          created_at: string
          id: string
          max_scope_breadth: number | null
          organization_id: string
          profile_constraints: Json
          profile_key: string
          profile_name: string
          required_validation_depth: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_scope_breadth?: number | null
          organization_id: string
          profile_constraints?: Json
          profile_key: string
          profile_name: string
          required_validation_depth?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_scope_breadth?: number | null
          organization_id?: string
          profile_constraints?: Json
          profile_key?: string
          profile_name?: string
          required_validation_depth?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_governance_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_mode_profiles: {
        Row: {
          created_at: string
          id: string
          max_scope_breadth: number | null
          organization_id: string
          profile_key: string
          profile_name: string
          required_review_depth: string
          rollout_constraints: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_scope_breadth?: number | null
          organization_id: string
          profile_key: string
          profile_name: string
          required_review_depth?: string
          rollout_constraints?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_scope_breadth?: number | null
          organization_id?: string
          profile_key?: string
          profile_name?: string
          required_review_depth?: string
          rollout_constraints?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_mode_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_pilot_outcomes: {
        Row: {
          baseline_summary: Json
          created_at: string
          delta_summary: Json
          evidence_refs: Json | null
          id: string
          organization_id: string
          outcome_status: string
          pilot_id: string
          pilot_summary: Json
          risk_flags: Json | null
        }
        Insert: {
          baseline_summary?: Json
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json | null
          id?: string
          organization_id: string
          outcome_status?: string
          pilot_id: string
          pilot_summary?: Json
          risk_flags?: Json | null
        }
        Update: {
          baseline_summary?: Json
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json | null
          id?: string
          organization_id?: string
          outcome_status?: string
          pilot_id?: string
          pilot_summary?: Json
          risk_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_pilot_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_pilot_outcomes_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_pilot_reviews: {
        Row: {
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          pilot_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          pilot_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          pilot_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_pilot_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_pilot_reviews_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_pilot_rollbacks: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          pilot_id: string
          restored_state: Json
          rollback_mode: string
          rollback_reason: Json
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          pilot_id: string
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          pilot_id?: string
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_pilot_rollbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_pilot_rollbacks_pilot_id_fkey"
            columns: ["pilot_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_pilots"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_pilots: {
        Row: {
          activation_window: Json | null
          baseline_ref: Json
          created_at: string
          id: string
          organization_id: string
          pilot_constraints: Json
          pilot_mode: string
          pilot_name: string
          pilot_scope: string
          plan_id: string
          rollback_triggers: Json
          sandbox_outcome_id: string | null
          status: string
          stop_conditions: Json
          target_entities: Json
        }
        Insert: {
          activation_window?: Json | null
          baseline_ref?: Json
          created_at?: string
          id?: string
          organization_id: string
          pilot_constraints?: Json
          pilot_mode?: string
          pilot_name: string
          pilot_scope: string
          plan_id: string
          rollback_triggers?: Json
          sandbox_outcome_id?: string | null
          status?: string
          stop_conditions?: Json
          target_entities?: Json
        }
        Update: {
          activation_window?: Json | null
          baseline_ref?: Json
          created_at?: string
          id?: string
          organization_id?: string
          pilot_constraints?: Json
          pilot_mode?: string
          pilot_name?: string
          pilot_scope?: string
          plan_id?: string
          rollback_triggers?: Json
          sandbox_outcome_id?: string | null
          status?: string
          stop_conditions?: Json
          target_entities?: Json
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_pilots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_pilots_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_pilots_sandbox_outcome_id_fkey"
            columns: ["sandbox_outcome_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_sandbox_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_sandbox_outcomes: {
        Row: {
          blocked_steps: Json | null
          created_at: string
          fragility_findings: Json | null
          id: string
          organization_id: string
          outcome_status: string
          readiness_summary: Json | null
          rehearsal_summary: Json
          rollback_viability_summary: Json | null
          sandbox_id: string
        }
        Insert: {
          blocked_steps?: Json | null
          created_at?: string
          fragility_findings?: Json | null
          id?: string
          organization_id: string
          outcome_status?: string
          readiness_summary?: Json | null
          rehearsal_summary?: Json
          rollback_viability_summary?: Json | null
          sandbox_id: string
        }
        Update: {
          blocked_steps?: Json | null
          created_at?: string
          fragility_findings?: Json | null
          id?: string
          organization_id?: string
          outcome_status?: string
          readiness_summary?: Json | null
          rehearsal_summary?: Json
          rollback_viability_summary?: Json | null
          sandbox_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_sandbox_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_sandbox_outcomes_sandbox_id_fkey"
            columns: ["sandbox_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_sandboxes"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_sandbox_reviews: {
        Row: {
          blocker_reasons: Json | null
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          review_notes: string | null
          review_status: string
          reviewer_ref: Json | null
          sandbox_outcome_id: string
        }
        Insert: {
          blocker_reasons?: Json | null
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          review_notes?: string | null
          review_status?: string
          reviewer_ref?: Json | null
          sandbox_outcome_id: string
        }
        Update: {
          blocker_reasons?: Json | null
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          review_notes?: string | null
          review_status?: string
          reviewer_ref?: Json | null
          sandbox_outcome_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_sandbox_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_sandbox_reviews_sandbox_outcome_id_fkey"
            columns: ["sandbox_outcome_id"]
            isOneToOne: false
            referencedRelation: "architecture_rollout_sandbox_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_rollout_sandboxes: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          plan_id: string
          rehearsal_mode: string
          rollback_hooks: Json | null
          rollout_constraints: Json
          sandbox_name: string
          sandbox_payload: Json
          sandbox_scope: string
          status: string
          validation_hooks: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          plan_id: string
          rehearsal_mode?: string
          rollback_hooks?: Json | null
          rollout_constraints?: Json
          sandbox_name: string
          sandbox_payload?: Json
          sandbox_scope: string
          status?: string
          validation_hooks?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          plan_id?: string
          rehearsal_mode?: string
          rollback_hooks?: Json | null
          rollout_constraints?: Json
          sandbox_name?: string
          sandbox_payload?: Json
          sandbox_scope?: string
          status?: string
          validation_hooks?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "architecture_rollout_sandboxes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_rollout_sandboxes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_simulation_outcomes: {
        Row: {
          affected_layers: Json
          confidence_score: number | null
          created_at: string
          expected_benefits: Json | null
          expected_tradeoffs: Json | null
          id: string
          organization_id: string
          proposal_id: string
          risk_flags: Json | null
          scope_profile_id: string
          simulation_summary: Json
          status: string
        }
        Insert: {
          affected_layers?: Json
          confidence_score?: number | null
          created_at?: string
          expected_benefits?: Json | null
          expected_tradeoffs?: Json | null
          id?: string
          organization_id: string
          proposal_id: string
          risk_flags?: Json | null
          scope_profile_id: string
          simulation_summary?: Json
          status?: string
        }
        Update: {
          affected_layers?: Json
          confidence_score?: number | null
          created_at?: string
          expected_benefits?: Json | null
          expected_tradeoffs?: Json | null
          id?: string
          organization_id?: string
          proposal_id?: string
          risk_flags?: Json | null
          scope_profile_id?: string
          simulation_summary?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_simulation_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_simulation_outcomes_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "architecture_change_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_simulation_outcomes_scope_profile_id_fkey"
            columns: ["scope_profile_id"]
            isOneToOne: false
            referencedRelation: "architecture_simulation_scope_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_simulation_reviews: {
        Row: {
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
          simulation_outcome_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
          simulation_outcome_id: string
        }
        Update: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
          simulation_outcome_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_simulation_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "architecture_simulation_reviews_simulation_outcome_id_fkey"
            columns: ["simulation_outcome_id"]
            isOneToOne: false
            referencedRelation: "architecture_simulation_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_simulation_scope_profiles: {
        Row: {
          allowed_entities: Json
          created_at: string
          forbidden_entities: Json
          id: string
          max_scope_breadth: number | null
          organization_id: string
          scope_key: string
          scope_name: string
          simulation_mode: string
          updated_at: string
        }
        Insert: {
          allowed_entities?: Json
          created_at?: string
          forbidden_entities?: Json
          id?: string
          max_scope_breadth?: number | null
          organization_id: string
          scope_key: string
          scope_name: string
          simulation_mode?: string
          updated_at?: string
        }
        Update: {
          allowed_entities?: Json
          created_at?: string
          forbidden_entities?: Json
          id?: string
          max_scope_breadth?: number | null
          organization_id?: string
          scope_key?: string
          scope_name?: string
          simulation_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_simulation_scope_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      architecture_validation_hooks: {
        Row: {
          created_at: string
          hook_definition: Json
          hook_key: string
          hook_name: string
          hook_scope: string
          id: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hook_definition?: Json
          hook_key: string
          hook_name: string
          hook_scope: string
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hook_definition?: Json
          hook_key?: string
          hook_name?: string
          hook_scope?: string
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "architecture_validation_hooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      canon_conformance_signals: {
        Row: {
          conformance_score: number
          created_at: string
          evidence_links: Json
          id: string
          mutation_boundary_integrity_score: number
          organization_id: string
          principle_alignment_score: number
          signal_layer: string
          signal_payload: Json
          signal_type: string
        }
        Insert: {
          conformance_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          mutation_boundary_integrity_score?: number
          organization_id: string
          principle_alignment_score?: number
          signal_layer?: string
          signal_payload?: Json
          signal_type?: string
        }
        Update: {
          conformance_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          mutation_boundary_integrity_score?: number
          organization_id?: string
          principle_alignment_score?: number
          signal_layer?: string
          signal_payload?: Json
          signal_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "canon_conformance_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_drift_events: {
        Row: {
          assessment_id: string | null
          created_at: string
          description: string
          drift_score: number
          drift_type: string
          evidence_links: Json
          id: string
          integrity_domain: string
          organization_id: string
          principle_violated: string
          recurrence_count: number
          severity: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          description?: string
          drift_score?: number
          drift_type?: string
          evidence_links?: Json
          id?: string
          integrity_domain?: string
          organization_id: string
          principle_violated?: string
          recurrence_count?: number
          severity?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          description?: string
          drift_score?: number
          drift_type?: string
          evidence_links?: Json
          id?: string
          integrity_domain?: string
          organization_id?: string
          principle_violated?: string
          recurrence_count?: number
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "canon_drift_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "canon_integrity_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_drift_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_integrity_assessments: {
        Row: {
          architecture_canon_alignment_score: number
          assumptions: Json
          conformance_score: number
          created_at: string
          cross_doc_consistency_score: number
          drift_score: number
          evidence_links: Json
          expected_outcomes: Json
          governance_canon_alignment_score: number
          id: string
          inconsistency_score: number
          integrity_domain: string
          integrity_risk_score: number
          integrity_scope_id: string
          integrity_scope_type: string
          model_id: string | null
          mutation_boundary_integrity_score: number
          operational_conformance_score: number
          organization_id: string
          principle_alignment_score: number
          realized_outcomes: Json
          remediation_priority_score: number
          updated_at: string
        }
        Insert: {
          architecture_canon_alignment_score?: number
          assumptions?: Json
          conformance_score?: number
          created_at?: string
          cross_doc_consistency_score?: number
          drift_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          governance_canon_alignment_score?: number
          id?: string
          inconsistency_score?: number
          integrity_domain?: string
          integrity_risk_score?: number
          integrity_scope_id?: string
          integrity_scope_type?: string
          model_id?: string | null
          mutation_boundary_integrity_score?: number
          operational_conformance_score?: number
          organization_id: string
          principle_alignment_score?: number
          realized_outcomes?: Json
          remediation_priority_score?: number
          updated_at?: string
        }
        Update: {
          architecture_canon_alignment_score?: number
          assumptions?: Json
          conformance_score?: number
          created_at?: string
          cross_doc_consistency_score?: number
          drift_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          governance_canon_alignment_score?: number
          id?: string
          inconsistency_score?: number
          integrity_domain?: string
          integrity_risk_score?: number
          integrity_scope_id?: string
          integrity_scope_type?: string
          model_id?: string | null
          mutation_boundary_integrity_score?: number
          operational_conformance_score?: number
          organization_id?: string
          principle_alignment_score?: number
          realized_outcomes?: Json
          remediation_priority_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canon_integrity_assessments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "canon_integrity_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_integrity_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_integrity_models: {
        Row: {
          canonical_source_name: string
          canonical_source_type: string
          created_at: string
          evidence_links: Json
          id: string
          integrity_check_definition: Json
          integrity_domain: string
          integrity_scope_type: string
          organization_id: string
          source_of_truth_mapping: Json
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          canonical_source_name: string
          canonical_source_type?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          integrity_check_definition?: Json
          integrity_domain?: string
          integrity_scope_type?: string
          organization_id: string
          source_of_truth_mapping?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          canonical_source_name?: string
          canonical_source_type?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          integrity_check_definition?: Json
          integrity_domain?: string
          integrity_scope_type?: string
          organization_id?: string
          source_of_truth_mapping?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "canon_integrity_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_integrity_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_integrity_outcomes: {
        Row: {
          bounded_alignment_readiness_score: number
          canon_outcome_accuracy_score: number
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          id: string
          organization_id: string
          outcome_status: string
          outcome_type: string
          realized_outcomes: Json
          review_id: string | null
          updated_at: string
        }
        Insert: {
          bounded_alignment_readiness_score?: number
          canon_outcome_accuracy_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          outcome_type?: string
          realized_outcomes?: Json
          review_id?: string | null
          updated_at?: string
        }
        Update: {
          bounded_alignment_readiness_score?: number
          canon_outcome_accuracy_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          outcome_type?: string
          realized_outcomes?: Json
          review_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "canon_integrity_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_integrity_outcomes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "canon_integrity_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_integrity_reviews: {
        Row: {
          assessment_id: string | null
          created_at: string
          evidence_links: Json
          id: string
          linked_changes: Json
          organization_id: string
          recommendation_status: string
          review_notes: string
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          id?: string
          linked_changes?: Json
          organization_id: string
          recommendation_status?: string
          review_notes?: string
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          id?: string
          linked_changes?: Json
          organization_id?: string
          recommendation_status?: string
          review_notes?: string
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "canon_integrity_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "canon_integrity_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canon_integrity_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_exposure_classes: {
        Row: {
          audit_requirements: Json
          class_description: string
          class_key: string
          class_name: string
          created_at: string
          evidence_links: Json
          id: string
          organization_id: string
          policy_requirements: Json
          restriction_level: string
          status: string
          trust_requirements: Json
          updated_at: string
        }
        Insert: {
          audit_requirements?: Json
          class_description?: string
          class_key?: string
          class_name?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id: string
          policy_requirements?: Json
          restriction_level?: string
          status?: string
          trust_requirements?: Json
          updated_at?: string
        }
        Update: {
          audit_requirements?: Json
          class_description?: string
          class_key?: string
          class_name?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id?: string
          policy_requirements?: Json
          restriction_level?: string
          status?: string
          trust_requirements?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_exposure_classes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_exposure_governance_cases: {
        Row: {
          assumptions: Json
          auditability_score: number
          capability_domain: string
          capability_name: string
          capability_type: string
          created_at: string
          criticality_score: number
          current_readiness_score: number
          decision_status: string
          dependency_sensitivity_score: number
          evidence_links: Json
          exposure_case_type: string
          exposure_class_id: string | null
          exposure_governance_score: number
          exposure_recommendation_status: string
          id: string
          organization_id: string
          policy_gate_score: number
          restriction_level: string
          review_status: string
          safety_gate_score: number
          trust_gate_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          auditability_score?: number
          capability_domain?: string
          capability_name?: string
          capability_type?: string
          created_at?: string
          criticality_score?: number
          current_readiness_score?: number
          decision_status?: string
          dependency_sensitivity_score?: number
          evidence_links?: Json
          exposure_case_type?: string
          exposure_class_id?: string | null
          exposure_governance_score?: number
          exposure_recommendation_status?: string
          id?: string
          organization_id: string
          policy_gate_score?: number
          restriction_level?: string
          review_status?: string
          safety_gate_score?: number
          trust_gate_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          auditability_score?: number
          capability_domain?: string
          capability_name?: string
          capability_type?: string
          created_at?: string
          criticality_score?: number
          current_readiness_score?: number
          decision_status?: string
          dependency_sensitivity_score?: number
          evidence_links?: Json
          exposure_case_type?: string
          exposure_class_id?: string | null
          exposure_governance_score?: number
          exposure_recommendation_status?: string
          id?: string
          organization_id?: string
          policy_gate_score?: number
          restriction_level?: string
          review_status?: string
          safety_gate_score?: number
          trust_gate_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capability_exposure_governance_cases_exposure_class_id_fkey"
            columns: ["exposure_class_id"]
            isOneToOne: false
            referencedRelation: "capability_exposure_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_governance_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_governance_cases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_exposure_governance_outcomes: {
        Row: {
          created_at: string
          evidence_links: Json
          expected_outcomes: Json
          exposure_recommendation_quality_score: number
          governance_case_id: string | null
          governance_outcome_accuracy_score: number
          id: string
          organization_id: string
          outcome_status: string
          realized_outcomes: Json
          recommendation_status: string
          recommendation_type: string
          review_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          exposure_recommendation_quality_score?: number
          governance_case_id?: string | null
          governance_outcome_accuracy_score?: number
          id?: string
          organization_id: string
          outcome_status?: string
          realized_outcomes?: Json
          recommendation_status?: string
          recommendation_type?: string
          review_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          exposure_recommendation_quality_score?: number
          governance_case_id?: string | null
          governance_outcome_accuracy_score?: number
          id?: string
          organization_id?: string
          outcome_status?: string
          realized_outcomes?: Json
          recommendation_status?: string
          recommendation_type?: string
          review_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_exposure_governance_outcomes_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "capability_exposure_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_governance_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_governance_outcomes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "capability_exposure_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_exposure_governance_policies: {
        Row: {
          approval_requirements: Json
          created_at: string
          evidence_links: Json
          exposure_class_id: string | null
          gate_conditions: Json
          id: string
          organization_id: string
          policy_domain: string
          policy_name: string
          policy_scope: string
          restriction_conditions: Json
          status: string
          updated_at: string
        }
        Insert: {
          approval_requirements?: Json
          created_at?: string
          evidence_links?: Json
          exposure_class_id?: string | null
          gate_conditions?: Json
          id?: string
          organization_id: string
          policy_domain?: string
          policy_name?: string
          policy_scope?: string
          restriction_conditions?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          approval_requirements?: Json
          created_at?: string
          evidence_links?: Json
          exposure_class_id?: string | null
          gate_conditions?: Json
          id?: string
          organization_id?: string
          policy_domain?: string
          policy_name?: string
          policy_scope?: string
          restriction_conditions?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_exposure_governance_policies_exposure_class_id_fkey"
            columns: ["exposure_class_id"]
            isOneToOne: false
            referencedRelation: "capability_exposure_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_governance_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_exposure_restrictions: {
        Row: {
          capability_name: string
          created_at: string
          dependency_constraints: Json
          evidence_links: Json
          governance_case_id: string | null
          id: string
          organization_id: string
          policy_limitations: Json
          rationale: string
          restriction_severity: string
          restriction_type: string
          updated_at: string
        }
        Insert: {
          capability_name?: string
          created_at?: string
          dependency_constraints?: Json
          evidence_links?: Json
          governance_case_id?: string | null
          id?: string
          organization_id: string
          policy_limitations?: Json
          rationale?: string
          restriction_severity?: string
          restriction_type?: string
          updated_at?: string
        }
        Update: {
          capability_name?: string
          created_at?: string
          dependency_constraints?: Json
          evidence_links?: Json
          governance_case_id?: string | null
          id?: string
          organization_id?: string
          policy_limitations?: Json
          rationale?: string
          restriction_severity?: string
          restriction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_exposure_restrictions_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "capability_exposure_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_restrictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_exposure_reviews: {
        Row: {
          created_at: string
          evidence_links: Json
          gate_evaluation_snapshot: Json
          governance_case_id: string
          id: string
          organization_id: string
          review_decision: string
          review_notes: string
          review_status: string
          reviewer_ref: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          gate_evaluation_snapshot?: Json
          governance_case_id: string
          id?: string
          organization_id: string
          review_decision?: string
          review_notes?: string
          review_status?: string
          reviewer_ref?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          gate_evaluation_snapshot?: Json
          governance_case_id?: string
          id?: string
          organization_id?: string
          review_decision?: string
          review_notes?: string
          review_status?: string
          reviewer_ref?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_exposure_reviews_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "capability_exposure_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_exposure_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry_compatibility_rules: {
        Row: {
          compatibility_score: number
          compatibility_type: string
          conflict_description: string
          created_at: string
          dependency_sensitivity_score: number
          evidence_links: Json
          id: string
          organization_id: string
          registry_entry_id: string | null
          sequencing_constraint: string
          target_capability_name: string
        }
        Insert: {
          compatibility_score?: number
          compatibility_type?: string
          conflict_description?: string
          created_at?: string
          dependency_sensitivity_score?: number
          evidence_links?: Json
          id?: string
          organization_id: string
          registry_entry_id?: string | null
          sequencing_constraint?: string
          target_capability_name?: string
        }
        Update: {
          compatibility_score?: number
          compatibility_type?: string
          conflict_description?: string
          created_at?: string
          dependency_sensitivity_score?: number
          evidence_links?: Json
          id?: string
          organization_id?: string
          registry_entry_id?: string | null
          sequencing_constraint?: string
          target_capability_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_compatibility_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_registry_compatibility_rules_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "capability_registry_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry_entries: {
        Row: {
          assumptions: Json
          capability_domain: string
          capability_name: string
          capability_slug: string
          capability_type: string
          created_at: string
          evidence_links: Json
          exposure_class: string
          governance_score: number
          id: string
          lifecycle_state: string
          organization_id: string
          pilot_scope_type: string
          registry_health_score: number
          registry_status: string
          restriction_level: string
          trust_tier_requirement: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          capability_domain?: string
          capability_name: string
          capability_slug?: string
          capability_type?: string
          created_at?: string
          evidence_links?: Json
          exposure_class?: string
          governance_score?: number
          id?: string
          lifecycle_state?: string
          organization_id: string
          pilot_scope_type?: string
          registry_health_score?: number
          registry_status?: string
          restriction_level?: string
          trust_tier_requirement?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          capability_domain?: string
          capability_name?: string
          capability_slug?: string
          capability_type?: string
          created_at?: string
          evidence_links?: Json
          exposure_class?: string
          governance_score?: number
          id?: string
          lifecycle_state?: string
          organization_id?: string
          pilot_scope_type?: string
          registry_health_score?: number
          registry_status?: string
          restriction_level?: string
          trust_tier_requirement?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_registry_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry_governance_outcomes: {
        Row: {
          bounded_registry_integrity_score: number
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          id: string
          organization_id: string
          outcome_status: string
          outcome_type: string
          realized_outcomes: Json
          registry_entry_id: string | null
          registry_outcome_accuracy_score: number
          updated_at: string
        }
        Insert: {
          bounded_registry_integrity_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          outcome_type?: string
          realized_outcomes?: Json
          registry_entry_id?: string | null
          registry_outcome_accuracy_score?: number
          updated_at?: string
        }
        Update: {
          bounded_registry_integrity_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          outcome_type?: string
          realized_outcomes?: Json
          registry_entry_id?: string | null
          registry_outcome_accuracy_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_governance_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_registry_governance_outcomes_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "capability_registry_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry_policy_bindings: {
        Row: {
          binding_status: string
          created_at: string
          evidence_links: Json
          id: string
          organization_id: string
          policy_binding_score: number
          policy_set_name: string
          registry_entry_id: string | null
          restriction_inherited: string
        }
        Insert: {
          binding_status?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id: string
          policy_binding_score?: number
          policy_set_name?: string
          registry_entry_id?: string | null
          restriction_inherited?: string
        }
        Update: {
          binding_status?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id?: string
          policy_binding_score?: number
          policy_set_name?: string
          registry_entry_id?: string | null
          restriction_inherited?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_policy_bindings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_registry_policy_bindings_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "capability_registry_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry_versions: {
        Row: {
          change_log: Json
          compatibility_score: number
          created_at: string
          deprecation_pressure_score: number
          evidence_links: Json
          id: string
          organization_id: string
          registry_entry_id: string | null
          updated_at: string
          version_label: string
          version_status: string
          version_validity_score: number
        }
        Insert: {
          change_log?: Json
          compatibility_score?: number
          created_at?: string
          deprecation_pressure_score?: number
          evidence_links?: Json
          id?: string
          organization_id: string
          registry_entry_id?: string | null
          updated_at?: string
          version_label?: string
          version_status?: string
          version_validity_score?: number
        }
        Update: {
          change_log?: Json
          compatibility_score?: number
          created_at?: string
          deprecation_pressure_score?: number
          evidence_links?: Json
          id?: string
          organization_id?: string
          registry_entry_id?: string | null
          updated_at?: string
          version_label?: string
          version_status?: string
          version_validity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_registry_versions_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "capability_registry_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      capability_registry_visibility_rules: {
        Row: {
          actor_class_filter: string
          created_at: string
          discoverability_score: number
          evidence_links: Json
          id: string
          organization_id: string
          rationale: string
          registry_entry_id: string | null
          scope_filter: string
          trust_tier_filter: string
          visibility_level: string
        }
        Insert: {
          actor_class_filter?: string
          created_at?: string
          discoverability_score?: number
          evidence_links?: Json
          id?: string
          organization_id: string
          rationale?: string
          registry_entry_id?: string | null
          scope_filter?: string
          trust_tier_filter?: string
          visibility_level?: string
        }
        Update: {
          actor_class_filter?: string
          created_at?: string
          discoverability_score?: number
          evidence_links?: Json
          id?: string
          organization_id?: string
          rationale?: string
          registry_entry_id?: string | null
          scope_filter?: string
          trust_tier_filter?: string
          visibility_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_registry_visibility_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capability_registry_visibility_rules_registry_entry_id_fkey"
            columns: ["registry_entry_id"]
            isOneToOne: false
            referencedRelation: "capability_registry_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      change_advisory_signals: {
        Row: {
          confidence_score: number | null
          created_at: string
          evidence_refs: Json | null
          id: string
          organization_id: string
          priority_hint: number | null
          signal_payload: Json
          signal_source: string
          signal_type: string
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id: string
          priority_hint?: number | null
          signal_payload?: Json
          signal_source: string
          signal_type: string
          status?: string
          target_entities?: Json
          target_scope: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string
          priority_hint?: number | null
          signal_payload?: Json
          signal_source?: string
          signal_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "change_advisory_signals_organization_id_fkey"
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
      convergence_candidates: {
        Row: {
          assumptions: Json
          candidate_type: string
          confidence_score: number
          convergence_domain: string
          convergence_expected_value: number
          convergence_priority_score: number
          created_at: string
          deprecation_candidate_score: number
          evidence_links: Json
          id: string
          merge_safety_score: number
          organization_id: string
          rationale_codes: Json
          retention_justification_score: number
          scope_type: string
          status: string
          target_entities: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          candidate_type?: string
          confidence_score?: number
          convergence_domain?: string
          convergence_expected_value?: number
          convergence_priority_score?: number
          created_at?: string
          deprecation_candidate_score?: number
          evidence_links?: Json
          id?: string
          merge_safety_score?: number
          organization_id: string
          rationale_codes?: Json
          retention_justification_score?: number
          scope_type?: string
          status?: string
          target_entities?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          candidate_type?: string
          confidence_score?: number
          convergence_domain?: string
          convergence_expected_value?: number
          convergence_priority_score?: number
          created_at?: string
          deprecation_candidate_score?: number
          evidence_links?: Json
          id?: string
          merge_safety_score?: number
          organization_id?: string
          rationale_codes?: Json
          retention_justification_score?: number
          scope_type?: string
          status?: string
          target_entities?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convergence_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_decisions: {
        Row: {
          approved_action: string | null
          approved_scope: string | null
          created_at: string
          decision_rationale: Json
          decision_status: string
          governance_case_id: string
          id: string
          organization_id: string
          reviewer_notes: string
          reviewer_ref: Json | null
          rollback_plan: Json
        }
        Insert: {
          approved_action?: string | null
          approved_scope?: string | null
          created_at?: string
          decision_rationale?: Json
          decision_status?: string
          governance_case_id: string
          id?: string
          organization_id: string
          reviewer_notes?: string
          reviewer_ref?: Json | null
          rollback_plan?: Json
        }
        Update: {
          approved_action?: string | null
          approved_scope?: string | null
          created_at?: string
          decision_rationale?: Json
          decision_status?: string
          governance_case_id?: string
          id?: string
          organization_id?: string
          reviewer_notes?: string
          reviewer_ref?: Json | null
          rollback_plan?: Json
        }
        Relationships: [
          {
            foreignKeyName: "convergence_decisions_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "convergence_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_governance_cases: {
        Row: {
          assumptions: Json
          beneficial_specialization_score: number
          confidence_score: number
          convergence_domain: string
          created_at: string
          economic_impact_score: number
          evidence_links: Json
          fragmentation_risk_score: number
          governance_case_type: string
          id: string
          organization_id: string
          promotion_readiness_score: number
          proposed_action: string
          proposed_scope: string
          redundancy_score: number
          retirement_readiness_score: number
          review_status: string
          rollback_complexity_score: number
          source_candidate_id: string | null
          stability_impact_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          beneficial_specialization_score?: number
          confidence_score?: number
          convergence_domain?: string
          created_at?: string
          economic_impact_score?: number
          evidence_links?: Json
          fragmentation_risk_score?: number
          governance_case_type?: string
          id?: string
          organization_id: string
          promotion_readiness_score?: number
          proposed_action?: string
          proposed_scope?: string
          redundancy_score?: number
          retirement_readiness_score?: number
          review_status?: string
          rollback_complexity_score?: number
          source_candidate_id?: string | null
          stability_impact_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          beneficial_specialization_score?: number
          confidence_score?: number
          convergence_domain?: string
          created_at?: string
          economic_impact_score?: number
          evidence_links?: Json
          fragmentation_risk_score?: number
          governance_case_type?: string
          id?: string
          organization_id?: string
          promotion_readiness_score?: number
          proposed_action?: string
          proposed_scope?: string
          redundancy_score?: number
          retirement_readiness_score?: number
          review_status?: string
          rollback_complexity_score?: number
          source_candidate_id?: string | null
          stability_impact_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convergence_governance_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_governance_cases_source_candidate_id_fkey"
            columns: ["source_candidate_id"]
            isOneToOne: false
            referencedRelation: "convergence_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_governance_cases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_governance_outcomes: {
        Row: {
          created_at: string
          decision_id: string | null
          evidence_refs: Json
          expected_economic_gain: number
          expected_fragmentation_reduction: number
          expected_simplification_gain: number
          expected_stability_gain: number
          governance_case_id: string | null
          id: string
          organization_id: string
          outcome_accuracy_score: number
          outcome_status: string
          realized_economic_gain: number
          realized_fragmentation_reduction: number
          realized_simplification_gain: number
          realized_stability_gain: number
        }
        Insert: {
          created_at?: string
          decision_id?: string | null
          evidence_refs?: Json
          expected_economic_gain?: number
          expected_fragmentation_reduction?: number
          expected_simplification_gain?: number
          expected_stability_gain?: number
          governance_case_id?: string | null
          id?: string
          organization_id: string
          outcome_accuracy_score?: number
          outcome_status?: string
          realized_economic_gain?: number
          realized_fragmentation_reduction?: number
          realized_simplification_gain?: number
          realized_stability_gain?: number
        }
        Update: {
          created_at?: string
          decision_id?: string | null
          evidence_refs?: Json
          expected_economic_gain?: number
          expected_fragmentation_reduction?: number
          expected_simplification_gain?: number
          expected_stability_gain?: number
          governance_case_id?: string | null
          id?: string
          organization_id?: string
          outcome_accuracy_score?: number
          outcome_status?: string
          realized_economic_gain?: number
          realized_fragmentation_reduction?: number
          realized_simplification_gain?: number
          realized_stability_gain?: number
        }
        Relationships: [
          {
            foreignKeyName: "convergence_governance_outcomes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "convergence_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_governance_outcomes_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "convergence_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_governance_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_memory_entries: {
        Row: {
          action_type: string
          assumptions: Json
          context_signature: string
          convergence_domain: string
          created_at: string
          evidence_density_score: number
          expected_outcomes: Json
          id: string
          memory_quality_score: number
          memory_type: string
          organization_id: string
          rationale: string
          realized_outcomes: Json
          regression_risk_score: number
          reuse_confidence_score: number
          source_case_id: string | null
          source_decision_id: string | null
          source_outcome_id: string | null
          specialization_type: string
          summary: string
          tags: Json
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          action_type?: string
          assumptions?: Json
          context_signature?: string
          convergence_domain?: string
          created_at?: string
          evidence_density_score?: number
          expected_outcomes?: Json
          id?: string
          memory_quality_score?: number
          memory_type?: string
          organization_id: string
          rationale?: string
          realized_outcomes?: Json
          regression_risk_score?: number
          reuse_confidence_score?: number
          source_case_id?: string | null
          source_decision_id?: string | null
          source_outcome_id?: string | null
          specialization_type?: string
          summary?: string
          tags?: Json
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          action_type?: string
          assumptions?: Json
          context_signature?: string
          convergence_domain?: string
          created_at?: string
          evidence_density_score?: number
          expected_outcomes?: Json
          id?: string
          memory_quality_score?: number
          memory_type?: string
          organization_id?: string
          rationale?: string
          realized_outcomes?: Json
          regression_risk_score?: number
          reuse_confidence_score?: number
          source_case_id?: string | null
          source_decision_id?: string | null
          source_outcome_id?: string | null
          specialization_type?: string
          summary?: string
          tags?: Json
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convergence_memory_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_memory_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_memory_evidence: {
        Row: {
          confidence_score: number
          created_at: string
          evidence_payload: Json
          evidence_type: string
          id: string
          memory_entry_id: string
          organization_id: string
          source_ref: Json
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          evidence_payload?: Json
          evidence_type?: string
          id?: string
          memory_entry_id: string
          organization_id: string
          source_ref?: Json
        }
        Update: {
          confidence_score?: number
          created_at?: string
          evidence_payload?: Json
          evidence_type?: string
          id?: string
          memory_entry_id?: string
          organization_id?: string
          source_ref?: Json
        }
        Relationships: [
          {
            foreignKeyName: "convergence_memory_evidence_memory_entry_id_fkey"
            columns: ["memory_entry_id"]
            isOneToOne: false
            referencedRelation: "convergence_memory_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_memory_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_memory_feedback: {
        Row: {
          created_at: string
          feedback_notes: string
          id: string
          memory_entry_id: string | null
          organization_id: string
          retrieval_id: string | null
          reviewer_ref: Json
          usefulness_status: string
        }
        Insert: {
          created_at?: string
          feedback_notes?: string
          id?: string
          memory_entry_id?: string | null
          organization_id: string
          retrieval_id?: string | null
          reviewer_ref?: Json
          usefulness_status?: string
        }
        Update: {
          created_at?: string
          feedback_notes?: string
          id?: string
          memory_entry_id?: string | null
          organization_id?: string
          retrieval_id?: string | null
          reviewer_ref?: Json
          usefulness_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "convergence_memory_feedback_memory_entry_id_fkey"
            columns: ["memory_entry_id"]
            isOneToOne: false
            referencedRelation: "convergence_memory_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_memory_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_memory_feedback_retrieval_id_fkey"
            columns: ["retrieval_id"]
            isOneToOne: false
            referencedRelation: "convergence_memory_retrievals"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_memory_patterns: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          last_observed_at: string
          occurrence_count: number
          organization_id: string
          pattern_description: string
          pattern_key: string
          pattern_name: string
          pattern_strength: number
          pattern_type: string
          status: string
          supporting_entry_ids: Json
          updated_at: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_observed_at?: string
          occurrence_count?: number
          organization_id: string
          pattern_description?: string
          pattern_key?: string
          pattern_name?: string
          pattern_strength?: number
          pattern_type?: string
          status?: string
          supporting_entry_ids?: Json
          updated_at?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          last_observed_at?: string
          occurrence_count?: number
          organization_id?: string
          pattern_description?: string
          pattern_key?: string
          pattern_name?: string
          pattern_strength?: number
          pattern_type?: string
          status?: string
          supporting_entry_ids?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convergence_memory_patterns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_memory_retrievals: {
        Row: {
          created_at: string
          id: string
          matched_entry_ids: Json
          organization_id: string
          query_context: Json
          relevance_scores: Json
          requester_ref: Json
          retrieval_purpose: string
        }
        Insert: {
          created_at?: string
          id?: string
          matched_entry_ids?: Json
          organization_id: string
          query_context?: Json
          relevance_scores?: Json
          requester_ref?: Json
          retrieval_purpose?: string
        }
        Update: {
          created_at?: string
          id?: string
          matched_entry_ids?: Json
          organization_id?: string
          query_context?: Json
          relevance_scores?: Json
          requester_ref?: Json
          retrieval_purpose?: string
        }
        Relationships: [
          {
            foreignKeyName: "convergence_memory_retrievals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_outcomes: {
        Row: {
          action_taken: string
          convergence_domain: string
          created_at: string
          delta_summary: Json
          evidence_refs: Json
          id: string
          organization_id: string
          outcome_status: string
          projected_impact: Json
          realized_impact: Json
          recommendation_id: string | null
        }
        Insert: {
          action_taken?: string
          convergence_domain?: string
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          projected_impact?: Json
          realized_impact?: Json
          recommendation_id?: string | null
        }
        Update: {
          action_taken?: string
          convergence_domain?: string
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          projected_impact?: Json
          realized_impact?: Json
          recommendation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convergence_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_outcomes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "convergence_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_promotion_plans: {
        Row: {
          blast_radius: Json
          created_at: string
          decision_id: string | null
          governance_case_id: string | null
          id: string
          organization_id: string
          promotion_readiness_score: number
          promotion_scope: string
          rollback_plan: Json
          rollout_plan: Json
          source_pattern_ref: Json
          status: string
          target_default_ref: Json
          updated_at: string
        }
        Insert: {
          blast_radius?: Json
          created_at?: string
          decision_id?: string | null
          governance_case_id?: string | null
          id?: string
          organization_id: string
          promotion_readiness_score?: number
          promotion_scope?: string
          rollback_plan?: Json
          rollout_plan?: Json
          source_pattern_ref?: Json
          status?: string
          target_default_ref?: Json
          updated_at?: string
        }
        Update: {
          blast_radius?: Json
          created_at?: string
          decision_id?: string | null
          governance_case_id?: string | null
          id?: string
          organization_id?: string
          promotion_readiness_score?: number
          promotion_scope?: string
          rollback_plan?: Json
          rollout_plan?: Json
          source_pattern_ref?: Json
          status?: string
          target_default_ref?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convergence_promotion_plans_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "convergence_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_promotion_plans_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "convergence_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_promotion_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_recommendations: {
        Row: {
          candidate_id: string | null
          confidence_score: number
          convergence_domain: string
          created_at: string
          evidence_links: Json
          expected_impact: Json
          id: string
          organization_id: string
          priority_score: number
          recommendation_reason: Json
          recommendation_type: string
          review_requirements: Json
          safety_class: string
          status: string
          target_entities: Json
          target_scope: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          candidate_id?: string | null
          confidence_score?: number
          convergence_domain?: string
          created_at?: string
          evidence_links?: Json
          expected_impact?: Json
          id?: string
          organization_id: string
          priority_score?: number
          recommendation_reason?: Json
          recommendation_type?: string
          review_requirements?: Json
          safety_class?: string
          status?: string
          target_entities?: Json
          target_scope?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          candidate_id?: string | null
          confidence_score?: number
          convergence_domain?: string
          created_at?: string
          evidence_links?: Json
          expected_impact?: Json
          id?: string
          organization_id?: string
          priority_score?: number
          recommendation_reason?: Json
          recommendation_type?: string
          review_requirements?: Json
          safety_class?: string
          status?: string
          target_entities?: Json
          target_scope?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "convergence_recommendations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "convergence_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_retirement_plans: {
        Row: {
          created_at: string
          decision_id: string | null
          dependency_impact: Json
          governance_case_id: string | null
          id: string
          migration_path: Json
          organization_id: string
          retirement_readiness_score: number
          retirement_type: string
          rollback_plan: Json
          status: string
          target_pattern_ref: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_id?: string | null
          dependency_impact?: Json
          governance_case_id?: string | null
          id?: string
          migration_path?: Json
          organization_id: string
          retirement_readiness_score?: number
          retirement_type?: string
          rollback_plan?: Json
          status?: string
          target_pattern_ref?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_id?: string | null
          dependency_impact?: Json
          governance_case_id?: string | null
          id?: string
          migration_path?: Json
          organization_id?: string
          retirement_readiness_score?: number
          retirement_type?: string
          rollback_plan?: Json
          status?: string
          target_pattern_ref?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "convergence_retirement_plans_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "convergence_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_retirement_plans_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "convergence_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_retirement_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      convergence_rollout_reviews: {
        Row: {
          blast_radius_score: number
          created_at: string
          dependency_coupling_score: number
          governance_case_id: string | null
          id: string
          organization_id: string
          review_status: string
          reviewer_notes: string
          rollback_viability_score: number
          rollout_safety_score: number
          staged_rollout_envelope: Json
        }
        Insert: {
          blast_radius_score?: number
          created_at?: string
          dependency_coupling_score?: number
          governance_case_id?: string | null
          id?: string
          organization_id: string
          review_status?: string
          reviewer_notes?: string
          rollback_viability_score?: number
          rollout_safety_score?: number
          staged_rollout_envelope?: Json
        }
        Update: {
          blast_radius_score?: number
          created_at?: string
          dependency_coupling_score?: number
          governance_case_id?: string | null
          id?: string
          organization_id?: string
          review_status?: string
          reviewer_notes?: string
          rollback_viability_score?: number
          rollout_safety_score?: number
          staged_rollout_envelope?: Json
        }
        Relationships: [
          {
            foreignKeyName: "convergence_rollout_reviews_governance_case_id_fkey"
            columns: ["governance_case_id"]
            isOneToOne: false
            referencedRelation: "convergence_governance_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convergence_rollout_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      delivery_assurance_outcomes: {
        Row: {
          assumptions: Json
          created_at: string
          degraded_delivery_visibility_score: number
          delivery_assurance_quality_score: number
          delivery_outcome_accuracy_score: number
          delivery_visibility_score: number
          deploy_confidence_score: number
          deploy_readiness_score: number
          deploy_success_clarity_score: number
          evidence_links: Json
          expected_outcomes: Json
          final_mile_coherence_score: number
          handoff_completeness_score: number
          id: string
          initiative_id: string | null
          one_click_friction_score: number
          organization_id: string
          outcome_domain: string
          output_accessibility_score: number
          realized_outcomes: Json
          recovery_readiness_score: number
          rollback_readiness_score: number
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          degraded_delivery_visibility_score?: number
          delivery_assurance_quality_score?: number
          delivery_outcome_accuracy_score?: number
          delivery_visibility_score?: number
          deploy_confidence_score?: number
          deploy_readiness_score?: number
          deploy_success_clarity_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          final_mile_coherence_score?: number
          handoff_completeness_score?: number
          id?: string
          initiative_id?: string | null
          one_click_friction_score?: number
          organization_id: string
          outcome_domain?: string
          output_accessibility_score?: number
          realized_outcomes?: Json
          recovery_readiness_score?: number
          rollback_readiness_score?: number
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          created_at?: string
          degraded_delivery_visibility_score?: number
          delivery_assurance_quality_score?: number
          delivery_outcome_accuracy_score?: number
          delivery_visibility_score?: number
          deploy_confidence_score?: number
          deploy_readiness_score?: number
          deploy_success_clarity_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          final_mile_coherence_score?: number
          handoff_completeness_score?: number
          id?: string
          initiative_id?: string | null
          one_click_friction_score?: number
          organization_id?: string
          outcome_domain?: string
          output_accessibility_score?: number
          realized_outcomes?: Json
          recovery_readiness_score?: number
          rollback_readiness_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_assurance_outcomes_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_assurance_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orchestration_instances: {
        Row: {
          assumptions: Json
          blocker_score: number
          created_at: string
          current_delivery_state: string
          delivery_model_name: string
          delivery_recommendation_status: string
          delivery_visibility_score: number
          deploy_confidence_score: number
          deploy_readiness_score: number
          deploy_url: string | null
          evidence_links: Json
          handoff_completeness_score: number
          id: string
          initiative_id: string | null
          organization_id: string
          output_accessibility_score: number
          preview_url: string | null
          repo_url: string | null
          rollback_readiness_score: number
          updated_at: string
          validation_gate_score: number
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          blocker_score?: number
          created_at?: string
          current_delivery_state?: string
          delivery_model_name?: string
          delivery_recommendation_status?: string
          delivery_visibility_score?: number
          deploy_confidence_score?: number
          deploy_readiness_score?: number
          deploy_url?: string | null
          evidence_links?: Json
          handoff_completeness_score?: number
          id?: string
          initiative_id?: string | null
          organization_id: string
          output_accessibility_score?: number
          preview_url?: string | null
          repo_url?: string | null
          rollback_readiness_score?: number
          updated_at?: string
          validation_gate_score?: number
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          blocker_score?: number
          created_at?: string
          current_delivery_state?: string
          delivery_model_name?: string
          delivery_recommendation_status?: string
          delivery_visibility_score?: number
          deploy_confidence_score?: number
          deploy_readiness_score?: number
          deploy_url?: string | null
          evidence_links?: Json
          handoff_completeness_score?: number
          id?: string
          initiative_id?: string | null
          organization_id?: string
          output_accessibility_score?: number
          preview_url?: string | null
          repo_url?: string | null
          rollback_readiness_score?: number
          updated_at?: string
          validation_gate_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orchestration_instances_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orchestration_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orchestration_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orchestration_models: {
        Row: {
          assumptions: Json
          assurance_thresholds: Json
          created_at: string
          delivery_model_name: string
          description: string | null
          evidence_links: Json
          gate_requirements: Json
          id: string
          organization_id: string
          release_path_definition: Json
          rollback_policy: Json
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          assurance_thresholds?: Json
          created_at?: string
          delivery_model_name?: string
          description?: string | null
          evidence_links?: Json
          gate_requirements?: Json
          id?: string
          organization_id: string
          release_path_definition?: Json
          rollback_policy?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          assurance_thresholds?: Json
          created_at?: string
          delivery_model_name?: string
          description?: string | null
          evidence_links?: Json
          gate_requirements?: Json
          id?: string
          organization_id?: string
          release_path_definition?: Json
          rollback_policy?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orchestration_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orchestration_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_output_views: {
        Row: {
          created_at: string
          delivery_timestamp: string | null
          delivery_visibility_score: number
          deploy_url: string | null
          handoff_completeness_score: number
          handoff_status: string
          id: string
          initiative_id: string | null
          organization_id: string
          output_accessibility_score: number
          output_details: Json
          preview_url: string | null
          repo_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_timestamp?: string | null
          delivery_visibility_score?: number
          deploy_url?: string | null
          handoff_completeness_score?: number
          handoff_status?: string
          id?: string
          initiative_id?: string | null
          organization_id: string
          output_accessibility_score?: number
          output_details?: Json
          preview_url?: string | null
          repo_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_timestamp?: string | null
          delivery_visibility_score?: number
          deploy_url?: string | null
          handoff_completeness_score?: number
          handoff_status?: string
          id?: string
          initiative_id?: string | null
          organization_id?: string
          output_accessibility_score?: number
          output_details?: Json
          preview_url?: string | null
          repo_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_output_views_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_output_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deploy_assurance_assessments: {
        Row: {
          assessment_status: string
          blocker_count: number
          blocker_details: Json
          created_at: string
          delivery_assurance_quality_score: number
          deploy_confidence_score: number
          deploy_readiness_score: number
          deploy_success_clarity_score: number
          evidence_links: Json
          final_mile_coherence_score: number
          id: string
          initiative_id: string | null
          one_click_friction_score: number
          organization_id: string
          recovery_readiness_score: number
          rollback_readiness_score: number
          updated_at: string
          validation_gate_score: number
        }
        Insert: {
          assessment_status?: string
          blocker_count?: number
          blocker_details?: Json
          created_at?: string
          delivery_assurance_quality_score?: number
          deploy_confidence_score?: number
          deploy_readiness_score?: number
          deploy_success_clarity_score?: number
          evidence_links?: Json
          final_mile_coherence_score?: number
          id?: string
          initiative_id?: string | null
          one_click_friction_score?: number
          organization_id: string
          recovery_readiness_score?: number
          rollback_readiness_score?: number
          updated_at?: string
          validation_gate_score?: number
        }
        Update: {
          assessment_status?: string
          blocker_count?: number
          blocker_details?: Json
          created_at?: string
          delivery_assurance_quality_score?: number
          deploy_confidence_score?: number
          deploy_readiness_score?: number
          deploy_success_clarity_score?: number
          evidence_links?: Json
          final_mile_coherence_score?: number
          id?: string
          initiative_id?: string | null
          one_click_friction_score?: number
          organization_id?: string
          recovery_readiness_score?: number
          rollback_readiness_score?: number
          updated_at?: string
          validation_gate_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "deploy_assurance_assessments_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deploy_assurance_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      deploy_recovery_states: {
        Row: {
          created_at: string
          degraded_delivery_details: Json
          degraded_delivery_visibility_score: number
          degraded_delivery_visible: boolean
          evidence_links: Json
          id: string
          initiative_id: string | null
          organization_id: string
          recovery_action_label: string | null
          recovery_readiness_score: number
          recovery_state: string
          rollback_available: boolean
          rollback_target: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          degraded_delivery_details?: Json
          degraded_delivery_visibility_score?: number
          degraded_delivery_visible?: boolean
          evidence_links?: Json
          id?: string
          initiative_id?: string | null
          organization_id: string
          recovery_action_label?: string | null
          recovery_readiness_score?: number
          recovery_state?: string
          rollback_available?: boolean
          rollback_target?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          degraded_delivery_details?: Json
          degraded_delivery_visibility_score?: number
          degraded_delivery_visible?: boolean
          evidence_links?: Json
          id?: string
          initiative_id?: string | null
          organization_id?: string
          recovery_action_label?: string | null
          recovery_readiness_score?: number
          recovery_state?: string
          rollback_available?: boolean
          rollback_target?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deploy_recovery_states_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deploy_recovery_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_architecture_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          evidence_refs: Json | null
          expected_impact: Json | null
          id: string
          organization_id: string
          priority_score: number | null
          rationale_codes: Json
          recommendation_type: string
          safety_class: string
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          expected_impact?: Json | null
          id?: string
          organization_id: string
          priority_score?: number | null
          rationale_codes?: Json
          recommendation_type: string
          safety_class?: string
          status?: string
          target_entities?: Json
          target_scope: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          expected_impact?: Json | null
          id?: string
          organization_id?: string
          priority_score?: number | null
          rationale_codes?: Json
          recommendation_type?: string
          safety_class?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_architecture_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_architecture_reviews: {
        Row: {
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          recommendation_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          recommendation_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          recommendation_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_architecture_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_architecture_reviews_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "discovery_architecture_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_architecture_signals: {
        Row: {
          confidence_score: number | null
          created_at: string
          evidence_refs: Json | null
          id: string
          organization_id: string
          scope_ref: Json | null
          severity: string
          signal_payload: Json
          signal_type: string
          source_type: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id: string
          scope_ref?: Json | null
          severity?: string
          signal_payload?: Json
          signal_type: string
          source_type: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string
          scope_ref?: Json | null
          severity?: string
          signal_payload?: Json
          signal_type?: string
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_architecture_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      divergence_signals: {
        Row: {
          convergence_domain: string
          created_at: string
          description: string
          divergence_score: number
          evidence_refs: Json
          fragmentation_risk_score: number
          id: string
          organization_id: string
          scope_id: string
          scope_type: string
          severity: string
          signal_type: string
          source_refs: Json
          specialization_debt_score: number
          workspace_id: string | null
        }
        Insert: {
          convergence_domain?: string
          created_at?: string
          description?: string
          divergence_score?: number
          evidence_refs?: Json
          fragmentation_risk_score?: number
          id?: string
          organization_id: string
          scope_id?: string
          scope_type?: string
          severity?: string
          signal_type?: string
          source_refs?: Json
          specialization_debt_score?: number
          workspace_id?: string | null
        }
        Update: {
          convergence_domain?: string
          created_at?: string
          description?: string
          divergence_score?: number
          evidence_refs?: Json
          fragmentation_risk_score?: number
          id?: string
          organization_id?: string
          scope_id?: string
          scope_type?: string
          severity?: string
          signal_type?: string
          source_refs?: Json
          specialization_debt_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "divergence_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divergence_signals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_optimization_outcomes: {
        Row: {
          assessment_id: string | null
          created_at: string
          delta_summary: Json
          evidence_refs: Json | null
          forecast_error: number | null
          id: string
          organization_id: string
          outcome_status: string
          projected_summary: Json
          realized_summary: Json
          recommendation_id: string | null
          scope_ref: Json | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json | null
          forecast_error?: number | null
          id?: string
          organization_id: string
          outcome_status?: string
          projected_summary?: Json
          realized_summary?: Json
          recommendation_id?: string | null
          scope_ref?: Json | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          delta_summary?: Json
          evidence_refs?: Json | null
          forecast_error?: number | null
          id?: string
          organization_id?: string
          outcome_status?: string
          projected_summary?: Json
          realized_summary?: Json
          recommendation_id?: string | null
          scope_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_optimization_outcomes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "architecture_economic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_optimization_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_optimization_outcomes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "economic_optimization_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_optimization_recommendations: {
        Row: {
          assessment_id: string | null
          confidence_score: number | null
          created_at: string
          expected_value: number | null
          id: string
          organization_id: string
          priority_score: number | null
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          assessment_id?: string | null
          confidence_score?: number | null
          created_at?: string
          expected_value?: number | null
          id?: string
          organization_id: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Update: {
          assessment_id?: string | null
          confidence_score?: number | null
          created_at?: string
          expected_value?: number | null
          id?: string
          organization_id?: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "economic_optimization_recommendations_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "architecture_economic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_optimization_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      economic_tradeoff_scenarios: {
        Row: {
          assessment_id: string
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string
          projected_cost: number | null
          projected_roi_30d: number | null
          projected_roi_90d: number | null
          rationale_codes: Json | null
          rollback_exposure: number | null
          scenario_key: string
          scenario_name: string
          scenario_payload: Json
          tradeoff_score: number | null
        }
        Insert: {
          assessment_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id: string
          projected_cost?: number | null
          projected_roi_30d?: number | null
          projected_roi_90d?: number | null
          rationale_codes?: Json | null
          rollback_exposure?: number | null
          scenario_key?: string
          scenario_name?: string
          scenario_payload?: Json
          tradeoff_score?: number | null
        }
        Update: {
          assessment_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          projected_cost?: number | null
          projected_roi_30d?: number | null
          projected_roi_90d?: number | null
          rationale_codes?: Json | null
          rollback_exposure?: number | null
          scenario_key?: string
          scenario_name?: string
          scenario_payload?: Json
          tradeoff_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "economic_tradeoff_scenarios_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "architecture_economic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "economic_tradeoff_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_blast_radius_estimates: {
        Row: {
          affected_scope: Json
          blast_radius_score: number
          containment_quality_score: number
          created_at: string
          id: string
          organization_id: string
          risk_factors: Json
          rollback_strategies: Json
          rollback_viability_score: number
          run_id: string | null
          scenario_id: string | null
        }
        Insert: {
          affected_scope?: Json
          blast_radius_score?: number
          containment_quality_score?: number
          created_at?: string
          id?: string
          organization_id: string
          risk_factors?: Json
          rollback_strategies?: Json
          rollback_viability_score?: number
          run_id?: string | null
          scenario_id?: string | null
        }
        Update: {
          affected_scope?: Json
          blast_radius_score?: number
          containment_quality_score?: number
          created_at?: string
          id?: string
          organization_id?: string
          risk_factors?: Json
          rollback_strategies?: Json
          rollback_viability_score?: number
          run_id?: string | null
          scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_blast_radius_estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_blast_radius_estimates_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_simulation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_blast_radius_estimates_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sandbox_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_capability_inventory: {
        Row: {
          assumptions: Json
          auditability_score: number
          capability_domain: string
          capability_name: string
          capability_type: string
          created_at: string
          dependency_sensitivity_score: number
          evidence_links: Json
          exposure_candidate_status: string
          exposure_restriction_score: number
          externalization_risk_score: number
          id: string
          internal_criticality_score: number
          organization_id: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          auditability_score?: number
          capability_domain?: string
          capability_name?: string
          capability_type?: string
          created_at?: string
          dependency_sensitivity_score?: number
          evidence_links?: Json
          exposure_candidate_status?: string
          exposure_restriction_score?: number
          externalization_risk_score?: number
          id?: string
          internal_criticality_score?: number
          organization_id: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          auditability_score?: number
          capability_domain?: string
          capability_name?: string
          capability_type?: string
          created_at?: string
          dependency_sensitivity_score?: number
          evidence_links?: Json
          exposure_candidate_status?: string
          exposure_restriction_score?: number
          externalization_risk_score?: number
          id?: string
          internal_criticality_score?: number
          organization_id?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_capability_inventory_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_capability_inventory_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_exposure_policies: {
        Row: {
          assumptions: Json
          created_at: string
          evidence_links: Json
          id: string
          organization_id: string
          policy_definition: Json
          policy_domain: string
          policy_name: string
          policy_readiness_score: number
          policy_scope: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id: string
          policy_definition?: Json
          policy_domain?: string
          policy_name?: string
          policy_readiness_score?: number
          policy_scope?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id?: string
          policy_definition?: Json
          policy_domain?: string
          policy_name?: string
          policy_readiness_score?: number
          policy_scope?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_exposure_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_exposure_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_exposure_readiness_assessments: {
        Row: {
          assessment_scope_id: string
          assessment_scope_type: string
          assumptions: Json
          blast_radius_readiness_score: number
          capability_id: string | null
          confidence_score: number
          created_at: string
          ecosystem_readiness_score: number
          evidence_links: Json
          id: string
          organization_id: string
          policy_readiness_score: number
          readiness_status: string
          safety_prerequisite_score: number
          trust_requirement_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assessment_scope_id?: string
          assessment_scope_type?: string
          assumptions?: Json
          blast_radius_readiness_score?: number
          capability_id?: string | null
          confidence_score?: number
          created_at?: string
          ecosystem_readiness_score?: number
          evidence_links?: Json
          id?: string
          organization_id: string
          policy_readiness_score?: number
          readiness_status?: string
          safety_prerequisite_score?: number
          trust_requirement_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assessment_scope_id?: string
          assessment_scope_type?: string
          assumptions?: Json
          blast_radius_readiness_score?: number
          capability_id?: string | null
          confidence_score?: number
          created_at?: string
          ecosystem_readiness_score?: number
          evidence_links?: Json
          id?: string
          organization_id?: string
          policy_readiness_score?: number
          readiness_status?: string
          safety_prerequisite_score?: number
          trust_requirement_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_exposure_readiness_assessments_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_capability_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_exposure_readiness_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_exposure_readiness_assessments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_party_roles: {
        Row: {
          created_at: string
          description: string
          evidence_links: Json
          id: string
          obligations_summary: Json
          organization_id: string
          restriction_level: string
          rights_summary: Json
          role_name: string
          role_slug: string
          role_type: string
          status: string
          trust_tier_requirement: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          evidence_links?: Json
          id?: string
          obligations_summary?: Json
          organization_id: string
          restriction_level?: string
          rights_summary?: Json
          role_name: string
          role_slug?: string
          role_type?: string
          status?: string
          trust_tier_requirement?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          evidence_links?: Json
          id?: string
          obligations_summary?: Json
          organization_id?: string
          restriction_level?: string
          rights_summary?: Json
          role_name?: string
          role_slug?: string
          role_type?: string
          status?: string
          trust_tier_requirement?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_party_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_party_roles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_policy_conflict_events: {
        Row: {
          affected_entities: Json
          conflict_type: string
          created_at: string
          description: string
          id: string
          organization_id: string
          run_id: string | null
          scenario_id: string | null
          severity: string
        }
        Insert: {
          affected_entities?: Json
          conflict_type?: string
          created_at?: string
          description?: string
          id?: string
          organization_id: string
          run_id?: string | null
          scenario_id?: string | null
          severity?: string
        }
        Update: {
          affected_entities?: Json
          conflict_type?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          run_id?: string | null
          scenario_id?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_policy_conflict_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_policy_conflict_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_simulation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_policy_conflict_events_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sandbox_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_readiness_outcomes: {
        Row: {
          assessment_id: string | null
          created_at: string
          evidence_links: Json
          expected_outcomes: Json
          id: string
          organization_id: string
          outcome_status: string
          readiness_outcome_accuracy_score: number
          readiness_recommendation_quality_score: number
          realized_outcomes: Json
          recommendation_status: string
          recommendation_type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          readiness_outcome_accuracy_score?: number
          readiness_recommendation_quality_score?: number
          realized_outcomes?: Json
          recommendation_status?: string
          recommendation_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          readiness_outcome_accuracy_score?: number
          readiness_recommendation_quality_score?: number
          realized_outcomes?: Json
          recommendation_status?: string
          recommendation_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_readiness_outcomes_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_exposure_readiness_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_readiness_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_readiness_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_safety_prerequisites: {
        Row: {
          capability_id: string | null
          created_at: string
          evidence_links: Json
          gap_description: string
          id: string
          is_met: boolean
          organization_id: string
          prerequisite_domain: string
          prerequisite_name: string
          prerequisite_type: string
          severity: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          capability_id?: string | null
          created_at?: string
          evidence_links?: Json
          gap_description?: string
          id?: string
          is_met?: boolean
          organization_id: string
          prerequisite_domain?: string
          prerequisite_name?: string
          prerequisite_type?: string
          severity?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          capability_id?: string | null
          created_at?: string
          evidence_links?: Json
          gap_description?: string
          id?: string
          is_met?: boolean
          organization_id?: string
          prerequisite_domain?: string
          prerequisite_name?: string
          prerequisite_type?: string
          severity?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_safety_prerequisites_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_capability_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_safety_prerequisites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_safety_prerequisites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_sandbox_scenarios: {
        Row: {
          activation_readiness_signal: string
          assumptions: Json
          capability_domain: string
          capability_name: string
          created_at: string
          evidence_links: Json
          exposure_class: string
          id: string
          organization_id: string
          sandbox_safety_score: number
          sandbox_scope_type: string
          scenario_name: string
          scenario_type: string
          simulated_actor_type: string
          simulated_trust_tier: string
          simulation_readiness_score: number
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          activation_readiness_signal?: string
          assumptions?: Json
          capability_domain?: string
          capability_name?: string
          created_at?: string
          evidence_links?: Json
          exposure_class?: string
          id?: string
          organization_id: string
          sandbox_safety_score?: number
          sandbox_scope_type?: string
          scenario_name: string
          scenario_type?: string
          simulated_actor_type?: string
          simulated_trust_tier?: string
          simulation_readiness_score?: number
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          activation_readiness_signal?: string
          assumptions?: Json
          capability_domain?: string
          capability_name?: string
          created_at?: string
          evidence_links?: Json
          exposure_class?: string
          id?: string
          organization_id?: string
          sandbox_safety_score?: number
          sandbox_scope_type?: string
          scenario_name?: string
          scenario_type?: string
          simulated_actor_type?: string
          simulated_trust_tier?: string
          simulation_readiness_score?: number
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_sandbox_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_sandbox_scenarios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_simulation_outcomes: {
        Row: {
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          false_positive_activation_risk_score: number
          id: string
          organization_id: string
          outcome_status: string
          realized_outcomes: Json
          recommendation_quality_score: number
          recommendation_type: string
          run_id: string | null
          scenario_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          false_positive_activation_risk_score?: number
          id?: string
          organization_id: string
          outcome_status?: string
          realized_outcomes?: Json
          recommendation_quality_score?: number
          recommendation_type?: string
          run_id?: string | null
          scenario_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          false_positive_activation_risk_score?: number
          id?: string
          organization_id?: string
          outcome_status?: string
          realized_outcomes?: Json
          recommendation_quality_score?: number
          recommendation_type?: string
          run_id?: string | null
          scenario_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_simulation_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_simulation_outcomes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_simulation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_simulation_outcomes_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sandbox_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_simulation_participants: {
        Row: {
          created_at: string
          evidence_links: Json
          id: string
          organization_id: string
          participant_name: string
          participant_type: string
          restriction_violation_score: number
          run_id: string | null
          scenario_id: string | null
          simulated_participation_viability_score: number
          simulated_trust_tier: string
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id: string
          participant_name: string
          participant_type?: string
          restriction_violation_score?: number
          run_id?: string | null
          scenario_id?: string | null
          simulated_participation_viability_score?: number
          simulated_trust_tier?: string
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id?: string
          participant_name?: string
          participant_type?: string
          restriction_violation_score?: number
          run_id?: string | null
          scenario_id?: string | null
          simulated_participation_viability_score?: number
          simulated_trust_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_simulation_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_simulation_participants_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_simulation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_simulation_participants_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sandbox_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_simulation_runs: {
        Row: {
          assumptions: Json
          blast_radius_score: number
          containment_quality_score: number
          created_at: string
          id: string
          organization_id: string
          policy_conflict_score: number
          result_summary: Json
          rollback_viability_score: number
          run_status: string
          scenario_confidence_score: number
          scenario_id: string | null
          simulation_outcome_accuracy_score: number
          trust_failure_score: number
        }
        Insert: {
          assumptions?: Json
          blast_radius_score?: number
          containment_quality_score?: number
          created_at?: string
          id?: string
          organization_id: string
          policy_conflict_score?: number
          result_summary?: Json
          rollback_viability_score?: number
          run_status?: string
          scenario_confidence_score?: number
          scenario_id?: string | null
          simulation_outcome_accuracy_score?: number
          trust_failure_score?: number
        }
        Update: {
          assumptions?: Json
          blast_radius_score?: number
          containment_quality_score?: number
          created_at?: string
          id?: string
          organization_id?: string
          policy_conflict_score?: number
          result_summary?: Json
          rollback_viability_score?: number
          run_status?: string
          scenario_confidence_score?: number
          scenario_id?: string | null
          simulation_outcome_accuracy_score?: number
          trust_failure_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_simulation_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_simulation_runs_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "ecosystem_sandbox_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_trust_model_candidates: {
        Row: {
          assumptions: Json
          created_at: string
          evidence_links: Json
          id: string
          organization_id: string
          status: string
          trust_boundary_assumptions: Json
          trust_level_definition: Json
          trust_model_confidence_score: number
          trust_model_name: string
          trust_model_type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id: string
          status?: string
          trust_boundary_assumptions?: Json
          trust_level_definition?: Json
          trust_model_confidence_score?: number
          trust_model_name?: string
          trust_model_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id?: string
          status?: string
          trust_boundary_assumptions?: Json
          trust_level_definition?: Json
          trust_model_confidence_score?: number
          trust_model_name?: string
          trust_model_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_trust_model_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_trust_model_candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ecosystem_value_flow_rules: {
        Row: {
          allocation_constraints: Json
          created_at: string
          evidence_links: Json
          id: string
          organization_id: string
          policy_frame_id: string | null
          revenue_bound_score: number
          revenue_rule_type: string
          risk_posture: Json
          settlement_readiness_score: number
          status: string
          updated_at: string
          value_flow_governance_score: number
          value_flow_type: string
        }
        Insert: {
          allocation_constraints?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id: string
          policy_frame_id?: string | null
          revenue_bound_score?: number
          revenue_rule_type?: string
          risk_posture?: Json
          settlement_readiness_score?: number
          status?: string
          updated_at?: string
          value_flow_governance_score?: number
          value_flow_type?: string
        }
        Update: {
          allocation_constraints?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          organization_id?: string
          policy_frame_id?: string | null
          revenue_bound_score?: number
          revenue_rule_type?: string
          risk_posture?: Json
          settlement_readiness_score?: number
          status?: string
          updated_at?: string
          value_flow_governance_score?: number
          value_flow_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecosystem_value_flow_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecosystem_value_flow_rules_policy_frame_id_fkey"
            columns: ["policy_frame_id"]
            isOneToOne: false
            referencedRelation: "multi_party_policy_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_advisory_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          evidence_refs: Json | null
          expected_impact: Json | null
          id: string
          organization_id: string | null
          priority_score: number | null
          rationale_codes: Json
          recommendation_type: string
          review_requirements: Json | null
          safety_class: string
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          expected_impact?: Json | null
          id?: string
          organization_id?: string | null
          priority_score?: number | null
          rationale_codes?: Json
          recommendation_type: string
          review_requirements?: Json | null
          safety_class?: string
          status?: string
          target_entities?: Json
          target_scope: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          expected_impact?: Json | null
          id?: string
          organization_id?: string | null
          priority_score?: number | null
          rationale_codes?: Json
          recommendation_type?: string
          review_requirements?: Json | null
          safety_class?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineering_advisory_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_advisory_reviews: {
        Row: {
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string | null
          recommendation_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string | null
          recommendation_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string | null
          recommendation_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "engineering_advisory_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engineering_advisory_reviews_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "engineering_advisory_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_advisory_scope_profiles: {
        Row: {
          created_at: string
          default_safety_class: string
          id: string
          organization_id: string | null
          required_confidence: number | null
          required_evidence_count: number | null
          scope_key: string
          scope_name: string
          scope_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_safety_class?: string
          id?: string
          organization_id?: string | null
          required_confidence?: number | null
          required_evidence_count?: number | null
          scope_key: string
          scope_name: string
          scope_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_safety_class?: string
          id?: string
          organization_id?: string | null
          required_confidence?: number | null
          required_evidence_count?: number | null
          scope_key?: string
          scope_name?: string
          scope_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineering_advisory_scope_profiles_organization_id_fkey"
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
      execution_policy_decisions: {
        Row: {
          adjustments_applied: Json
          applied_mode: string
          checkpoint: string | null
          context_class: string
          created_at: string
          evidence_refs: Json | null
          execution_policy_profile_id: string
          id: string
          organization_id: string
          pipeline_job_id: string | null
          reason_codes: string[]
        }
        Insert: {
          adjustments_applied?: Json
          applied_mode: string
          checkpoint?: string | null
          context_class: string
          created_at?: string
          evidence_refs?: Json | null
          execution_policy_profile_id: string
          id?: string
          organization_id: string
          pipeline_job_id?: string | null
          reason_codes?: string[]
        }
        Update: {
          adjustments_applied?: Json
          applied_mode?: string
          checkpoint?: string | null
          context_class?: string
          created_at?: string
          evidence_refs?: Json | null
          execution_policy_profile_id?: string
          id?: string
          organization_id?: string
          pipeline_job_id?: string | null
          reason_codes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "execution_policy_decisions_execution_policy_profile_id_fkey"
            columns: ["execution_policy_profile_id"]
            isOneToOne: false
            referencedRelation: "execution_policy_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_policy_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_policy_outcomes: {
        Row: {
          applied_mode: string
          context_class: string
          created_at: string
          evidence_refs: Json | null
          execution_policy_profile_id: string
          id: string
          organization_id: string
          outcome_metrics: Json | null
          outcome_status: string
          pipeline_job_id: string | null
        }
        Insert: {
          applied_mode: string
          context_class: string
          created_at?: string
          evidence_refs?: Json | null
          execution_policy_profile_id: string
          id?: string
          organization_id: string
          outcome_metrics?: Json | null
          outcome_status?: string
          pipeline_job_id?: string | null
        }
        Update: {
          applied_mode?: string
          context_class?: string
          created_at?: string
          evidence_refs?: Json | null
          execution_policy_profile_id?: string
          id?: string
          organization_id?: string
          outcome_metrics?: Json | null
          outcome_status?: string
          pipeline_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_policy_outcomes_execution_policy_profile_id_fkey"
            columns: ["execution_policy_profile_id"]
            isOneToOne: false
            referencedRelation: "execution_policy_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_policy_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_policy_portfolio_entries: {
        Row: {
          context_classes: Json
          cost_efficiency_score: number | null
          created_at: string
          execution_policy_profile_id: string
          id: string
          lifecycle_status: string
          organization_id: string
          portfolio_group: string
          portfolio_rank: number | null
          quality_gain_score: number | null
          risk_score: number | null
          speed_gain_score: number | null
          stability_score: number | null
          updated_at: string
          usefulness_score: number | null
        }
        Insert: {
          context_classes?: Json
          cost_efficiency_score?: number | null
          created_at?: string
          execution_policy_profile_id: string
          id?: string
          lifecycle_status?: string
          organization_id: string
          portfolio_group?: string
          portfolio_rank?: number | null
          quality_gain_score?: number | null
          risk_score?: number | null
          speed_gain_score?: number | null
          stability_score?: number | null
          updated_at?: string
          usefulness_score?: number | null
        }
        Update: {
          context_classes?: Json
          cost_efficiency_score?: number | null
          created_at?: string
          execution_policy_profile_id?: string
          id?: string
          lifecycle_status?: string
          organization_id?: string
          portfolio_group?: string
          portfolio_rank?: number | null
          quality_gain_score?: number | null
          risk_score?: number | null
          speed_gain_score?: number | null
          stability_score?: number | null
          updated_at?: string
          usefulness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_policy_portfolio_ent_execution_policy_profile_id_fkey"
            columns: ["execution_policy_profile_id"]
            isOneToOne: false
            referencedRelation: "execution_policy_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_policy_portfolio_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_policy_portfolio_recommendations: {
        Row: {
          confidence_score: number | null
          context_scope: Json | null
          created_at: string
          id: string
          organization_id: string
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_policy_ids: Json
        }
        Insert: {
          confidence_score?: number | null
          context_scope?: Json | null
          created_at?: string
          id?: string
          organization_id: string
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_policy_ids?: Json
        }
        Update: {
          confidence_score?: number | null
          context_scope?: Json | null
          created_at?: string
          id?: string
          organization_id?: string
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_policy_ids?: Json
        }
        Relationships: [
          {
            foreignKeyName: "execution_policy_portfolio_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_policy_profiles: {
        Row: {
          allowed_adjustments: Json
          confidence_score: number | null
          created_at: string
          default_priority: number | null
          id: string
          organization_id: string
          policy_mode: string
          policy_name: string
          policy_scope: string
          status: string
          support_count: number
          updated_at: string
        }
        Insert: {
          allowed_adjustments?: Json
          confidence_score?: number | null
          created_at?: string
          default_priority?: number | null
          id?: string
          organization_id: string
          policy_mode: string
          policy_name: string
          policy_scope: string
          status?: string
          support_count?: number
          updated_at?: string
        }
        Update: {
          allowed_adjustments?: Json
          confidence_score?: number | null
          created_at?: string
          default_priority?: number | null
          id?: string
          organization_id?: string
          policy_mode?: string
          policy_name?: string
          policy_scope?: string
          status?: string
          support_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_policy_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_strategy_experiments: {
        Row: {
          assignment_mode: string
          baseline_definition: Json
          created_at: string
          experiment_cap: Json
          id: string
          organization_id: string
          scope_ref: Json | null
          status: string
          strategy_family_id: string
          strategy_variant_id: string
          variant_definition: Json
        }
        Insert: {
          assignment_mode?: string
          baseline_definition?: Json
          created_at?: string
          experiment_cap?: Json
          id?: string
          organization_id: string
          scope_ref?: Json | null
          status?: string
          strategy_family_id: string
          strategy_variant_id: string
          variant_definition?: Json
        }
        Update: {
          assignment_mode?: string
          baseline_definition?: Json
          created_at?: string
          experiment_cap?: Json
          id?: string
          organization_id?: string
          scope_ref?: Json | null
          status?: string
          strategy_family_id?: string
          strategy_variant_id?: string
          variant_definition?: Json
        }
        Relationships: [
          {
            foreignKeyName: "execution_strategy_experiments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_strategy_experiments_strategy_family_id_fkey"
            columns: ["strategy_family_id"]
            isOneToOne: false
            referencedRelation: "execution_strategy_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_strategy_experiments_strategy_variant_id_fkey"
            columns: ["strategy_variant_id"]
            isOneToOne: false
            referencedRelation: "execution_strategy_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_strategy_families: {
        Row: {
          allowed_mutation_envelope: Json
          allowed_variant_scope: string
          baseline_strategy_definition: Json
          created_at: string
          evaluation_metrics: Json
          id: string
          organization_id: string
          rollout_mode: string
          status: string
          strategy_family_key: string
          strategy_family_name: string
          updated_at: string
        }
        Insert: {
          allowed_mutation_envelope?: Json
          allowed_variant_scope?: string
          baseline_strategy_definition?: Json
          created_at?: string
          evaluation_metrics?: Json
          id?: string
          organization_id: string
          rollout_mode?: string
          status?: string
          strategy_family_key: string
          strategy_family_name: string
          updated_at?: string
        }
        Update: {
          allowed_mutation_envelope?: Json
          allowed_variant_scope?: string
          baseline_strategy_definition?: Json
          created_at?: string
          evaluation_metrics?: Json
          id?: string
          organization_id?: string
          rollout_mode?: string
          status?: string
          strategy_family_key?: string
          strategy_family_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_strategy_families_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_strategy_outcomes: {
        Row: {
          applied_mode: string
          created_at: string
          evidence_refs: Json | null
          experiment_id: string
          id: string
          organization_id: string
          outcome_metrics: Json | null
          outcome_status: string
          pipeline_job_id: string | null
          strategy_variant_id: string
        }
        Insert: {
          applied_mode?: string
          created_at?: string
          evidence_refs?: Json | null
          experiment_id: string
          id?: string
          organization_id: string
          outcome_metrics?: Json | null
          outcome_status?: string
          pipeline_job_id?: string | null
          strategy_variant_id: string
        }
        Update: {
          applied_mode?: string
          created_at?: string
          evidence_refs?: Json | null
          experiment_id?: string
          id?: string
          organization_id?: string
          outcome_metrics?: Json | null
          outcome_status?: string
          pipeline_job_id?: string | null
          strategy_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_strategy_outcomes_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "execution_strategy_experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_strategy_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_strategy_outcomes_strategy_variant_id_fkey"
            columns: ["strategy_variant_id"]
            isOneToOne: false
            referencedRelation: "execution_strategy_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_strategy_variants: {
        Row: {
          baseline_definition: Json
          confidence_score: number | null
          created_at: string
          expected_impact: Json | null
          hypothesis: string
          id: string
          mutation_delta: Json
          organization_id: string
          scope_ref: Json | null
          status: string
          strategy_family_id: string
          variant_definition: Json
          variant_mode: string
        }
        Insert: {
          baseline_definition?: Json
          confidence_score?: number | null
          created_at?: string
          expected_impact?: Json | null
          hypothesis?: string
          id?: string
          mutation_delta?: Json
          organization_id: string
          scope_ref?: Json | null
          status?: string
          strategy_family_id: string
          variant_definition?: Json
          variant_mode?: string
        }
        Update: {
          baseline_definition?: Json
          confidence_score?: number | null
          created_at?: string
          expected_impact?: Json | null
          hypothesis?: string
          id?: string
          mutation_delta?: Json
          organization_id?: string
          scope_ref?: Json | null
          status?: string
          strategy_family_id?: string
          variant_definition?: Json
          variant_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_strategy_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_strategy_variants_strategy_family_id_fkey"
            columns: ["strategy_family_id"]
            isOneToOne: false
            referencedRelation: "execution_strategy_families"
            referencedColumns: ["id"]
          },
        ]
      }
      external_actor_registry: {
        Row: {
          assumptions: Json
          classification_metadata: Json
          created_at: string
          evidence_links: Json
          external_actor_name: string
          external_actor_scope: string
          external_actor_type: string
          id: string
          identity_confidence_score: number
          organization_id: string
          restriction_level: string
          status: string
          trust_tier_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          classification_metadata?: Json
          created_at?: string
          evidence_links?: Json
          external_actor_name: string
          external_actor_scope?: string
          external_actor_type?: string
          id?: string
          identity_confidence_score?: number
          organization_id: string
          restriction_level?: string
          status?: string
          trust_tier_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          classification_metadata?: Json
          created_at?: string
          evidence_links?: Json
          external_actor_name?: string
          external_actor_scope?: string
          external_actor_type?: string
          id?: string
          identity_confidence_score?: number
          organization_id?: string
          restriction_level?: string
          status?: string
          trust_tier_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_actor_registry_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actor_registry_trust_tier_id_fkey"
            columns: ["trust_tier_id"]
            isOneToOne: false
            referencedRelation: "external_trust_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_actor_registry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_admission_cases: {
        Row: {
          actor_id: string | null
          admission_case_type: string
          admission_readiness_score: number
          assumptions: Json
          auditability_score: number
          created_at: string
          decision_status: string
          evidence_completeness_score: number
          evidence_links: Json
          id: string
          organization_id: string
          policy_alignment_score: number
          rationale: Json
          recommendation_status: string
          restriction_level: string
          review_status: string
          risk_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          actor_id?: string | null
          admission_case_type?: string
          admission_readiness_score?: number
          assumptions?: Json
          auditability_score?: number
          created_at?: string
          decision_status?: string
          evidence_completeness_score?: number
          evidence_links?: Json
          id?: string
          organization_id: string
          policy_alignment_score?: number
          rationale?: Json
          recommendation_status?: string
          restriction_level?: string
          review_status?: string
          risk_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          actor_id?: string | null
          admission_case_type?: string
          admission_readiness_score?: number
          assumptions?: Json
          auditability_score?: number
          created_at?: string
          decision_status?: string
          evidence_completeness_score?: number
          evidence_links?: Json
          id?: string
          organization_id?: string
          policy_alignment_score?: number
          rationale?: Json
          recommendation_status?: string
          restriction_level?: string
          review_status?: string
          risk_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_admission_cases_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "external_actor_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_admission_cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_admission_cases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      external_admission_requirements: {
        Row: {
          admission_case_id: string | null
          created_at: string
          evidence_refs: Json
          gap_description: string | null
          id: string
          is_met: boolean
          organization_id: string
          requirement_description: string
          requirement_name: string
          requirement_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          admission_case_id?: string | null
          created_at?: string
          evidence_refs?: Json
          gap_description?: string | null
          id?: string
          is_met?: boolean
          organization_id: string
          requirement_description?: string
          requirement_name: string
          requirement_type?: string
          severity?: string
          updated_at?: string
        }
        Update: {
          admission_case_id?: string | null
          created_at?: string
          evidence_refs?: Json
          gap_description?: string | null
          id?: string
          is_met?: boolean
          organization_id?: string
          requirement_description?: string
          requirement_name?: string
          requirement_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_admission_requirements_admission_case_id_fkey"
            columns: ["admission_case_id"]
            isOneToOne: false
            referencedRelation: "external_admission_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_admission_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_admission_reviews: {
        Row: {
          admission_case_id: string
          created_at: string
          id: string
          linked_changes: Json | null
          organization_id: string
          review_notes: string | null
          review_reason_codes: Json
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          admission_case_id: string
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id: string
          review_notes?: string | null
          review_reason_codes?: Json
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          admission_case_id?: string
          created_at?: string
          id?: string
          linked_changes?: Json | null
          organization_id?: string
          review_notes?: string | null
          review_reason_codes?: Json
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "external_admission_reviews_admission_case_id_fkey"
            columns: ["admission_case_id"]
            isOneToOne: false
            referencedRelation: "external_admission_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_admission_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_trust_outcomes: {
        Row: {
          actor_id: string | null
          admission_case_id: string | null
          admission_outcome_accuracy_score: number
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          id: string
          organization_id: string
          outcome_status: string
          realized_outcomes: Json
          recommendation_type: string
          trust_drift_score: number
          updated_at: string
        }
        Insert: {
          actor_id?: string | null
          admission_case_id?: string | null
          admission_outcome_accuracy_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          realized_outcomes?: Json
          recommendation_type?: string
          trust_drift_score?: number
          updated_at?: string
        }
        Update: {
          actor_id?: string | null
          admission_case_id?: string | null
          admission_outcome_accuracy_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          realized_outcomes?: Json
          recommendation_type?: string
          trust_drift_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_trust_outcomes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "external_actor_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_trust_outcomes_admission_case_id_fkey"
            columns: ["admission_case_id"]
            isOneToOne: false
            referencedRelation: "external_admission_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_trust_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      external_trust_tiers: {
        Row: {
          admission_implications: Json
          created_at: string
          id: string
          organization_id: string
          restriction_defaults: Json
          status: string
          tier_definition: Json
          tier_key: string
          tier_level: number
          tier_name: string
          updated_at: string
        }
        Insert: {
          admission_implications?: Json
          created_at?: string
          id?: string
          organization_id: string
          restriction_defaults?: Json
          status?: string
          tier_definition?: Json
          tier_key: string
          tier_level?: number
          tier_name: string
          updated_at?: string
        }
        Update: {
          admission_implications?: Json
          created_at?: string
          id?: string
          organization_id?: string
          restriction_defaults?: Json
          status?: string
          tier_definition?: Json
          tier_key?: string
          tier_level?: number
          tier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_trust_tiers_organization_id_fkey"
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
      initiative_templates: {
        Row: {
          category: string
          created_at: string
          default_assumptions: Json
          description: string
          discovery_hints: Json
          evidence_links: Json
          icon: string
          id: string
          idea_scaffold: string
          organization_id: string
          starter_confidence_score: number
          status: string
          template_fit_score: number
          template_name: string
          template_type: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          default_assumptions?: Json
          description?: string
          discovery_hints?: Json
          evidence_links?: Json
          icon?: string
          id?: string
          idea_scaffold?: string
          organization_id: string
          starter_confidence_score?: number
          status?: string
          template_fit_score?: number
          template_name?: string
          template_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          default_assumptions?: Json
          description?: string
          discovery_hints?: Json
          evidence_links?: Json
          icon?: string
          id?: string
          idea_scaffold?: string
          organization_id?: string
          starter_confidence_score?: number
          status?: string
          template_fit_score?: number
          template_name?: string
          template_type?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "initiative_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "initiative_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      institutional_assurance_reviews: {
        Row: {
          assessment_id: string | null
          created_at: string
          evidence_links: Json
          id: string
          linked_changes: Json
          organization_id: string
          recommendation_status: string
          review_notes: string
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          id?: string
          linked_changes?: Json
          organization_id: string
          recommendation_status?: string
          review_notes?: string
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          id?: string
          linked_changes?: Json
          organization_id?: string
          recommendation_status?: string
          review_notes?: string
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_assurance_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "institutional_outcome_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_assurance_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_assurance_signals: {
        Row: {
          created_at: string
          cross_layer_assurance_score: number
          evidence_density_score: number
          evidence_links: Json
          id: string
          organization_id: string
          signal_layer: string
          signal_payload: Json
          signal_type: string
          stability_score: number
        }
        Insert: {
          created_at?: string
          cross_layer_assurance_score?: number
          evidence_density_score?: number
          evidence_links?: Json
          id?: string
          organization_id: string
          signal_layer?: string
          signal_payload?: Json
          signal_type?: string
          stability_score?: number
        }
        Update: {
          created_at?: string
          cross_layer_assurance_score?: number
          evidence_density_score?: number
          evidence_links?: Json
          id?: string
          organization_id?: string
          signal_layer?: string
          signal_payload?: Json
          signal_type?: string
          stability_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "institutional_assurance_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_outcome_assessments: {
        Row: {
          assumptions: Json
          assurance_confidence_score: number
          created_at: string
          drift_score: number
          evidence_density_score: number
          evidence_links: Json
          expected_outcome_score: number
          expected_outcomes: Json
          id: string
          institutional_risk_score: number
          model_id: string | null
          organization_id: string
          outcome_domain: string
          outcome_scope_id: string
          outcome_scope_type: string
          outcome_variance_score: number
          realized_outcome_score: number
          realized_outcomes: Json
          stability_score: number
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          assurance_confidence_score?: number
          created_at?: string
          drift_score?: number
          evidence_density_score?: number
          evidence_links?: Json
          expected_outcome_score?: number
          expected_outcomes?: Json
          id?: string
          institutional_risk_score?: number
          model_id?: string | null
          organization_id: string
          outcome_domain?: string
          outcome_scope_id?: string
          outcome_scope_type?: string
          outcome_variance_score?: number
          realized_outcome_score?: number
          realized_outcomes?: Json
          stability_score?: number
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          assurance_confidence_score?: number
          created_at?: string
          drift_score?: number
          evidence_density_score?: number
          evidence_links?: Json
          expected_outcome_score?: number
          expected_outcomes?: Json
          id?: string
          institutional_risk_score?: number
          model_id?: string | null
          organization_id?: string
          outcome_domain?: string
          outcome_scope_id?: string
          outcome_scope_type?: string
          outcome_variance_score?: number
          realized_outcome_score?: number
          realized_outcomes?: Json
          stability_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_outcome_assessments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "institutional_outcome_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_outcome_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_outcome_assurance_outcomes: {
        Row: {
          assurance_outcome_accuracy_score: number
          bounded_remediation_readiness_score: number
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          id: string
          organization_id: string
          outcome_status: string
          outcome_type: string
          realized_outcomes: Json
          review_id: string | null
          updated_at: string
        }
        Insert: {
          assurance_outcome_accuracy_score?: number
          bounded_remediation_readiness_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          outcome_type?: string
          realized_outcomes?: Json
          review_id?: string | null
          updated_at?: string
        }
        Update: {
          assurance_outcome_accuracy_score?: number
          bounded_remediation_readiness_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          outcome_type?: string
          realized_outcomes?: Json
          review_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_outcome_assurance_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_outcome_assurance_outcomes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "institutional_assurance_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_outcome_models: {
        Row: {
          assurance_dimensions: Json
          created_at: string
          evidence_links: Json
          evidence_requirements: Json
          expected_outcome_definition: Json
          id: string
          organization_id: string
          outcome_domain: string
          outcome_model_name: string
          outcome_scope_type: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assurance_dimensions?: Json
          created_at?: string
          evidence_links?: Json
          evidence_requirements?: Json
          expected_outcome_definition?: Json
          id?: string
          organization_id: string
          outcome_domain?: string
          outcome_model_name: string
          outcome_scope_type?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assurance_dimensions?: Json
          created_at?: string
          evidence_links?: Json
          evidence_requirements?: Json
          expected_outcome_definition?: Json
          id?: string
          organization_id?: string
          outcome_domain?: string
          outcome_model_name?: string
          outcome_scope_type?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_outcome_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_outcome_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_outcome_variances: {
        Row: {
          assessment_id: string | null
          created_at: string
          drift_score: number
          evidence_links: Json
          fragility_score: number
          id: string
          organization_id: string
          outcome_domain: string
          rationale: string
          recurrence_count: number
          remediation_priority_score: number
          variance_type: string
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          drift_score?: number
          evidence_links?: Json
          fragility_score?: number
          id?: string
          organization_id: string
          outcome_domain?: string
          rationale?: string
          recurrence_count?: number
          remediation_priority_score?: number
          variance_type?: string
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          drift_score?: number
          evidence_links?: Json
          fragility_score?: number
          id?: string
          organization_id?: string
          outcome_domain?: string
          rationale?: string
          recurrence_count?: number
          remediation_priority_score?: number
          variance_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_outcome_variances_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "institutional_outcome_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institutional_outcome_variances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      marketplace_pilot_capabilities: {
        Row: {
          capability_domain: string
          capability_name: string
          created_at: string
          evidence_links: Json
          exposure_class: string
          id: string
          organization_id: string
          pilot_capability_eligibility_score: number
          pilot_capability_status: string
          pilot_program_id: string | null
          policy_compliance_score: number
          rationale: Json
          restrictions: Json
          trust_requirement_score: number
          updated_at: string
        }
        Insert: {
          capability_domain?: string
          capability_name: string
          created_at?: string
          evidence_links?: Json
          exposure_class?: string
          id?: string
          organization_id: string
          pilot_capability_eligibility_score?: number
          pilot_capability_status?: string
          pilot_program_id?: string | null
          policy_compliance_score?: number
          rationale?: Json
          restrictions?: Json
          trust_requirement_score?: number
          updated_at?: string
        }
        Update: {
          capability_domain?: string
          capability_name?: string
          created_at?: string
          evidence_links?: Json
          exposure_class?: string
          id?: string
          organization_id?: string
          pilot_capability_eligibility_score?: number
          pilot_capability_status?: string
          pilot_program_id?: string | null
          policy_compliance_score?: number
          rationale?: Json
          restrictions?: Json
          trust_requirement_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_pilot_capabilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_capabilities_pilot_program_id_fkey"
            columns: ["pilot_program_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_pilot_interactions: {
        Row: {
          anomaly_flags: Json
          capability_id: string | null
          created_at: string
          id: string
          interaction_metadata: Json
          interaction_status: string
          interaction_type: string
          organization_id: string
          participant_id: string | null
          pilot_program_id: string | null
          policy_compliance_score: number
          trust_stability_score: number
        }
        Insert: {
          anomaly_flags?: Json
          capability_id?: string | null
          created_at?: string
          id?: string
          interaction_metadata?: Json
          interaction_status?: string
          interaction_type?: string
          organization_id: string
          participant_id?: string | null
          pilot_program_id?: string | null
          policy_compliance_score?: number
          trust_stability_score?: number
        }
        Update: {
          anomaly_flags?: Json
          capability_id?: string | null
          created_at?: string
          id?: string
          interaction_metadata?: Json
          interaction_status?: string
          interaction_type?: string
          organization_id?: string
          participant_id?: string | null
          pilot_program_id?: string | null
          policy_compliance_score?: number
          trust_stability_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_pilot_interactions_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_capabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_interactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_interactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_interactions_pilot_program_id_fkey"
            columns: ["pilot_program_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_pilot_outcomes: {
        Row: {
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          id: string
          organization_id: string
          outcome_status: string
          pilot_learning_score: number
          pilot_outcome_accuracy_score: number
          pilot_program_id: string | null
          pilot_risk_score: number
          pilot_value_signal_score: number
          realized_outcomes: Json
          recommendation_type: string
          rollback_trigger_score: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id: string
          outcome_status?: string
          pilot_learning_score?: number
          pilot_outcome_accuracy_score?: number
          pilot_program_id?: string | null
          pilot_risk_score?: number
          pilot_value_signal_score?: number
          realized_outcomes?: Json
          recommendation_type?: string
          rollback_trigger_score?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          outcome_status?: string
          pilot_learning_score?: number
          pilot_outcome_accuracy_score?: number
          pilot_program_id?: string | null
          pilot_risk_score?: number
          pilot_value_signal_score?: number
          realized_outcomes?: Json
          recommendation_type?: string
          rollback_trigger_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_pilot_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_outcomes_pilot_program_id_fkey"
            columns: ["pilot_program_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_pilot_participants: {
        Row: {
          created_at: string
          evidence_links: Json
          external_actor_id: string | null
          id: string
          organization_id: string
          participant_name: string
          participant_status: string
          participant_type: string
          pilot_participant_eligibility_score: number
          pilot_program_id: string | null
          trust_stability_score: number
          trust_tier: string
          updated_at: string
          violation_count: number
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          external_actor_id?: string | null
          id?: string
          organization_id: string
          participant_name: string
          participant_status?: string
          participant_type?: string
          pilot_participant_eligibility_score?: number
          pilot_program_id?: string | null
          trust_stability_score?: number
          trust_tier?: string
          updated_at?: string
          violation_count?: number
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          external_actor_id?: string | null
          id?: string
          organization_id?: string
          participant_name?: string
          participant_status?: string
          participant_type?: string
          pilot_participant_eligibility_score?: number
          pilot_program_id?: string | null
          trust_stability_score?: number
          trust_tier?: string
          updated_at?: string
          violation_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_pilot_participants_external_actor_id_fkey"
            columns: ["external_actor_id"]
            isOneToOne: false
            referencedRelation: "external_actor_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_participants_pilot_program_id_fkey"
            columns: ["pilot_program_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_pilot_policy_events: {
        Row: {
          capability_id: string | null
          created_at: string
          description: string
          event_type: string
          evidence_refs: Json
          id: string
          organization_id: string
          participant_id: string | null
          pilot_program_id: string | null
          policy_result: string
          severity: string
        }
        Insert: {
          capability_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          evidence_refs?: Json
          id?: string
          organization_id: string
          participant_id?: string | null
          pilot_program_id?: string | null
          policy_result?: string
          severity?: string
        }
        Update: {
          capability_id?: string | null
          created_at?: string
          description?: string
          event_type?: string
          evidence_refs?: Json
          id?: string
          organization_id?: string
          participant_id?: string | null
          pilot_program_id?: string | null
          policy_result?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_pilot_policy_events_capability_id_fkey"
            columns: ["capability_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_capabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_policy_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_policy_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_policy_events_pilot_program_id_fkey"
            columns: ["pilot_program_id"]
            isOneToOne: false
            referencedRelation: "marketplace_pilot_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_pilot_programs: {
        Row: {
          created_at: string
          evidence_links: Json
          governance_constraints: Json
          id: string
          max_capabilities: number
          max_participants: number
          organization_id: string
          pilot_activation_status: string
          pilot_objectives: Json
          pilot_program_name: string
          pilot_scope_type: string
          rollback_policy: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          governance_constraints?: Json
          id?: string
          max_capabilities?: number
          max_participants?: number
          organization_id: string
          pilot_activation_status?: string
          pilot_objectives?: Json
          pilot_program_name: string
          pilot_scope_type?: string
          rollback_policy?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          governance_constraints?: Json
          id?: string
          max_capabilities?: number
          max_participants?: number
          organization_id?: string
          pilot_activation_status?: string
          pilot_objectives?: Json
          pilot_program_name?: string
          pilot_scope_type?: string
          rollback_policy?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_pilot_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_pilot_programs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      multi_party_entitlements: {
        Row: {
          access_limit_score: number
          created_at: string
          entitlement_integrity_score: number
          entitlement_scope: string
          evidence_links: Json
          id: string
          obligation_level: string
          obligations_detail: Json
          organization_id: string
          policy_frame_id: string | null
          restriction_level: string
          rights_detail: Json
          unsafe_combinations: Json
        }
        Insert: {
          access_limit_score?: number
          created_at?: string
          entitlement_integrity_score?: number
          entitlement_scope?: string
          evidence_links?: Json
          id?: string
          obligation_level?: string
          obligations_detail?: Json
          organization_id: string
          policy_frame_id?: string | null
          restriction_level?: string
          rights_detail?: Json
          unsafe_combinations?: Json
        }
        Update: {
          access_limit_score?: number
          created_at?: string
          entitlement_integrity_score?: number
          entitlement_scope?: string
          evidence_links?: Json
          id?: string
          obligation_level?: string
          obligations_detail?: Json
          organization_id?: string
          policy_frame_id?: string | null
          restriction_level?: string
          rights_detail?: Json
          unsafe_combinations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "multi_party_entitlements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_party_entitlements_policy_frame_id_fkey"
            columns: ["policy_frame_id"]
            isOneToOne: false
            referencedRelation: "multi_party_policy_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_party_governance_outcomes: {
        Row: {
          bounded_commercial_integrity_score: number
          created_at: string
          evidence_refs: Json
          expected_outcomes: Json
          governance_outcome_accuracy_score: number
          id: string
          organization_id: string
          outcome_status: string
          outcome_type: string
          policy_frame_id: string | null
          realized_outcomes: Json
          updated_at: string
        }
        Insert: {
          bounded_commercial_integrity_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          governance_outcome_accuracy_score?: number
          id?: string
          organization_id: string
          outcome_status?: string
          outcome_type?: string
          policy_frame_id?: string | null
          realized_outcomes?: Json
          updated_at?: string
        }
        Update: {
          bounded_commercial_integrity_score?: number
          created_at?: string
          evidence_refs?: Json
          expected_outcomes?: Json
          governance_outcome_accuracy_score?: number
          id?: string
          organization_id?: string
          outcome_status?: string
          outcome_type?: string
          policy_frame_id?: string | null
          realized_outcomes?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "multi_party_governance_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_party_governance_outcomes_policy_frame_id_fkey"
            columns: ["policy_frame_id"]
            isOneToOne: false
            referencedRelation: "multi_party_policy_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_party_policy_conflicts: {
        Row: {
          conflict_score: number
          conflict_type: string
          created_at: string
          description: string
          evidence_links: Json
          fairness_impact: string
          id: string
          organization_id: string
          policy_frame_id: string | null
          resolution_recommendation: string
          resolution_status: string
        }
        Insert: {
          conflict_score?: number
          conflict_type?: string
          created_at?: string
          description?: string
          evidence_links?: Json
          fairness_impact?: string
          id?: string
          organization_id: string
          policy_frame_id?: string | null
          resolution_recommendation?: string
          resolution_status?: string
        }
        Update: {
          conflict_score?: number
          conflict_type?: string
          created_at?: string
          description?: string
          evidence_links?: Json
          fairness_impact?: string
          id?: string
          organization_id?: string
          policy_frame_id?: string | null
          resolution_recommendation?: string
          resolution_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "multi_party_policy_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_party_policy_conflicts_policy_frame_id_fkey"
            columns: ["policy_frame_id"]
            isOneToOne: false
            referencedRelation: "multi_party_policy_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      multi_party_policy_frames: {
        Row: {
          access_conditions: Json
          created_at: string
          enforceability_score: number
          evidence_links: Json
          fairness_score: number
          id: string
          interaction_type: string
          organization_id: string
          party_role_a: string
          party_role_b: string
          policy_alignment_score: number
          policy_frame_name: string
          rationale: string
          restriction_level: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          access_conditions?: Json
          created_at?: string
          enforceability_score?: number
          evidence_links?: Json
          fairness_score?: number
          id?: string
          interaction_type?: string
          organization_id: string
          party_role_a?: string
          party_role_b?: string
          policy_alignment_score?: number
          policy_frame_name: string
          rationale?: string
          restriction_level?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          access_conditions?: Json
          created_at?: string
          enforceability_score?: number
          evidence_links?: Json
          fairness_score?: number
          id?: string
          interaction_type?: string
          organization_id?: string
          party_role_a?: string
          party_role_b?: string
          policy_alignment_score?: number
          policy_frame_name?: string
          rationale?: string
          restriction_level?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "multi_party_policy_frames_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "multi_party_policy_frames_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_flows: {
        Row: {
          assumptions: Json
          created_at: string
          evidence_links: Json
          flow_name: string
          flow_type: string
          id: string
          onboarding_clarity_score: number
          organization_id: string
          status: string
          step_definitions: Json
          target_role: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          flow_name?: string
          flow_type?: string
          id?: string
          onboarding_clarity_score?: number
          organization_id: string
          status?: string
          step_definitions?: Json
          target_role?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          flow_name?: string
          flow_type?: string
          id?: string
          onboarding_clarity_score?: number
          organization_id?: string
          status?: string
          step_definitions?: Json
          target_role?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_flows_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_outcomes: {
        Row: {
          created_at: string
          evidence_links: Json
          expected_outcomes: Json
          false_fit_penalty_score: number
          guided_start_coherence_score: number
          id: string
          initiative_id: string | null
          onboarding_outcome_accuracy_score: number
          organization_id: string
          realized_outcomes: Json
          session_id: string | null
          starter_path_effectiveness_score: number
          template_id: string | null
          template_usefulness_score: number
          updated_at: string
          vertical_starter_id: string | null
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          false_fit_penalty_score?: number
          guided_start_coherence_score?: number
          id?: string
          initiative_id?: string | null
          onboarding_outcome_accuracy_score?: number
          organization_id: string
          realized_outcomes?: Json
          session_id?: string | null
          starter_path_effectiveness_score?: number
          template_id?: string | null
          template_usefulness_score?: number
          updated_at?: string
          vertical_starter_id?: string | null
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          false_fit_penalty_score?: number
          guided_start_coherence_score?: number
          id?: string
          initiative_id?: string | null
          onboarding_outcome_accuracy_score?: number
          organization_id?: string
          realized_outcomes?: Json
          session_id?: string | null
          starter_path_effectiveness_score?: number
          template_id?: string | null
          template_usefulness_score?: number
          updated_at?: string
          vertical_starter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_outcomes_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_outcomes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "onboarding_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_outcomes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "initiative_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_outcomes_vertical_starter_id_fkey"
            columns: ["vertical_starter_id"]
            isOneToOne: false
            referencedRelation: "vertical_starters"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_sessions: {
        Row: {
          abandonment_risk_score: number
          created_at: string
          current_step: number
          first_run_friction_score: number
          flow_id: string | null
          friction_points: Json
          id: string
          onboarding_progress_score: number
          organization_id: string
          selections: Json
          session_status: string
          template_id: string | null
          updated_at: string
          user_id: string
          vertical_starter_id: string | null
          workspace_id: string | null
        }
        Insert: {
          abandonment_risk_score?: number
          created_at?: string
          current_step?: number
          first_run_friction_score?: number
          flow_id?: string | null
          friction_points?: Json
          id?: string
          onboarding_progress_score?: number
          organization_id: string
          selections?: Json
          session_status?: string
          template_id?: string | null
          updated_at?: string
          user_id: string
          vertical_starter_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          abandonment_risk_score?: number
          created_at?: string
          current_step?: number
          first_run_friction_score?: number
          flow_id?: string | null
          friction_points?: Json
          id?: string
          onboarding_progress_score?: number
          organization_id?: string
          selections?: Json
          session_status?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
          vertical_starter_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "onboarding_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "initiative_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_vertical_starter_id_fkey"
            columns: ["vertical_starter_id"]
            isOneToOne: false
            referencedRelation: "vertical_starters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_baseline_certifications: {
        Row: {
          baseline_snapshot: Json
          certification_name: string
          certification_readiness_score: number
          certification_status: string
          certified_at: string | null
          completion_score: number
          created_at: string
          evidence_links: Json
          id: string
          open_surfaces_accepted: Json
          organization_id: string
          residual_risk_accepted: Json
          reviewer_ref: Json | null
          round_enough_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          baseline_snapshot?: Json
          certification_name?: string
          certification_readiness_score?: number
          certification_status?: string
          certified_at?: string | null
          completion_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          open_surfaces_accepted?: Json
          organization_id: string
          residual_risk_accepted?: Json
          reviewer_ref?: Json | null
          round_enough_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          baseline_snapshot?: Json
          certification_name?: string
          certification_readiness_score?: number
          certification_status?: string
          certified_at?: string | null
          completion_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          open_surfaces_accepted?: Json
          organization_id?: string
          residual_risk_accepted?: Json
          reviewer_ref?: Json | null
          round_enough_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_baseline_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_baseline_certifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_completion_assessments: {
        Row: {
          assumptions: Json
          assurance_maturity_score: number
          canon_integrity_score: number
          certification_readiness_score: number
          completion_domain: string
          completion_scope_id: string | null
          completion_scope_type: string
          completion_score: number
          created_at: string
          ecosystem_boundedness_score: number
          evidence_links: Json
          governance_maturity_score: number
          id: string
          model_id: string | null
          open_surface_score: number
          organization_id: string
          pipeline_operability_score: number
          residual_risk_score: number
          round_enough_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          assurance_maturity_score?: number
          canon_integrity_score?: number
          certification_readiness_score?: number
          completion_domain?: string
          completion_scope_id?: string | null
          completion_scope_type?: string
          completion_score?: number
          created_at?: string
          ecosystem_boundedness_score?: number
          evidence_links?: Json
          governance_maturity_score?: number
          id?: string
          model_id?: string | null
          open_surface_score?: number
          organization_id: string
          pipeline_operability_score?: number
          residual_risk_score?: number
          round_enough_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          assurance_maturity_score?: number
          canon_integrity_score?: number
          certification_readiness_score?: number
          completion_domain?: string
          completion_scope_id?: string | null
          completion_scope_type?: string
          completion_score?: number
          created_at?: string
          ecosystem_boundedness_score?: number
          evidence_links?: Json
          governance_maturity_score?: number
          id?: string
          model_id?: string | null
          open_surface_score?: number
          organization_id?: string
          pipeline_operability_score?: number
          residual_risk_score?: number
          round_enough_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_completion_assessments_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "operating_completion_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_assessments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_completion_gaps: {
        Row: {
          assessment_id: string | null
          created_at: string
          evidence_links: Json
          gap_description: string
          gap_domain: string
          gap_type: string
          id: string
          is_intentional: boolean
          open_surface_score: number
          organization_id: string
          rationale: string
          residual_risk_score: number
          severity: string
          workspace_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          gap_description?: string
          gap_domain?: string
          gap_type?: string
          id?: string
          is_intentional?: boolean
          open_surface_score?: number
          organization_id: string
          rationale?: string
          residual_risk_score?: number
          severity?: string
          workspace_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          evidence_links?: Json
          gap_description?: string
          gap_domain?: string
          gap_type?: string
          id?: string
          is_intentional?: boolean
          open_surface_score?: number
          organization_id?: string
          rationale?: string
          residual_risk_score?: number
          severity?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_completion_gaps_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "operating_completion_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_gaps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_gaps_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_completion_models: {
        Row: {
          certification_criteria: Json
          completion_domain: string
          completion_model_name: string
          completion_scope_type: string
          created_at: string
          dimensions: Json
          id: string
          organization_id: string
          round_enough_criteria: Json
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          certification_criteria?: Json
          completion_domain?: string
          completion_model_name?: string
          completion_scope_type?: string
          created_at?: string
          dimensions?: Json
          id?: string
          organization_id: string
          round_enough_criteria?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          certification_criteria?: Json
          completion_domain?: string
          completion_model_name?: string
          completion_scope_type?: string
          created_at?: string
          dimensions?: Json
          id?: string
          organization_id?: string
          round_enough_criteria?: Json
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_completion_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_completion_outcomes: {
        Row: {
          baseline_drift_flags: Json
          certification_id: string | null
          created_at: string
          evidence_links: Json
          expected_outcomes: Json
          false_positive_flags: Json
          id: string
          organization_id: string
          outcome_accuracy_score: number
          realized_outcomes: Json
          review_id: string | null
          workspace_id: string | null
        }
        Insert: {
          baseline_drift_flags?: Json
          certification_id?: string | null
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          false_positive_flags?: Json
          id?: string
          organization_id: string
          outcome_accuracy_score?: number
          realized_outcomes?: Json
          review_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          baseline_drift_flags?: Json
          certification_id?: string | null
          created_at?: string
          evidence_links?: Json
          expected_outcomes?: Json
          false_positive_flags?: Json
          id?: string
          organization_id?: string
          outcome_accuracy_score?: number
          realized_outcomes?: Json
          review_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_completion_outcomes_certification_id_fkey"
            columns: ["certification_id"]
            isOneToOne: false
            referencedRelation: "operating_baseline_certifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_outcomes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "operating_completion_reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_completion_reviews: {
        Row: {
          assessment_id: string | null
          created_at: string
          id: string
          linked_gaps: Json
          organization_id: string
          recommendation_status: string
          review_notes: string | null
          review_status: string
          reviewer_ref: Json | null
          workspace_id: string | null
        }
        Insert: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          linked_gaps?: Json
          organization_id: string
          recommendation_status?: string
          review_notes?: string | null
          review_status?: string
          reviewer_ref?: Json | null
          workspace_id?: string | null
        }
        Update: {
          assessment_id?: string | null
          created_at?: string
          id?: string
          linked_gaps?: Json
          organization_id?: string
          recommendation_status?: string
          review_notes?: string | null
          review_status?: string
          reviewer_ref?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_completion_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "operating_completion_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_completion_reviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_profile_bindings: {
        Row: {
          binding_status: string
          bound_at: string | null
          created_at: string
          id: string
          organization_id: string
          profile_id: string
          reviewer_ref: Json
          rollback_plan: Json
          scope_id: string
          scope_type: string
          unbound_at: string | null
          updated_at: string
        }
        Insert: {
          binding_status?: string
          bound_at?: string | null
          created_at?: string
          id?: string
          organization_id: string
          profile_id: string
          reviewer_ref?: Json
          rollback_plan?: Json
          scope_id?: string
          scope_type?: string
          unbound_at?: string | null
          updated_at?: string
        }
        Update: {
          binding_status?: string
          bound_at?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string
          reviewer_ref?: Json
          rollback_plan?: Json
          scope_id?: string
          scope_type?: string
          unbound_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_profile_bindings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_profile_bindings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "operating_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_profile_overrides: {
        Row: {
          created_at: string
          id: string
          justification: string
          organization_id: string
          override_key: string
          override_pressure_score: number
          override_scope: string
          override_value: Json
          profile_id: string
          promotion_candidate: boolean
          review_status: string
          reviewer_ref: Json
          scope_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          justification?: string
          organization_id: string
          override_key?: string
          override_pressure_score?: number
          override_scope?: string
          override_value?: Json
          profile_id: string
          promotion_candidate?: boolean
          review_status?: string
          reviewer_ref?: Json
          scope_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          justification?: string
          organization_id?: string
          override_key?: string
          override_pressure_score?: number
          override_scope?: string
          override_value?: Json
          profile_id?: string
          promotion_candidate?: boolean
          review_status?: string
          reviewer_ref?: Json
          scope_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_profile_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_profile_overrides_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "operating_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_profiles: {
        Row: {
          adoption_status: string
          architecture_mode_compatibility: Json
          assumptions: Json
          cost_bias_score: number
          created_at: string
          description: string
          evidence_links: Json
          expected_outcomes: Json
          governance_strictness_score: number
          id: string
          organization_id: string
          override_budget_score: number
          policy_pack_ids: Json
          profile_drift_score: number
          profile_name: string
          profile_type: string
          profile_version: number
          realized_outcomes: Json
          review_status: string
          rollback_viability_score: number
          scope_type: string
          shared_reuse_score: number
          source_convergence_decision_id: string | null
          source_governance_case_id: string | null
          source_memory_pattern_id: string | null
          speed_bias_score: number
          stability_bias_score: number
          tags: Json
          tenant_fit_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          adoption_status?: string
          architecture_mode_compatibility?: Json
          assumptions?: Json
          cost_bias_score?: number
          created_at?: string
          description?: string
          evidence_links?: Json
          expected_outcomes?: Json
          governance_strictness_score?: number
          id?: string
          organization_id: string
          override_budget_score?: number
          policy_pack_ids?: Json
          profile_drift_score?: number
          profile_name?: string
          profile_type?: string
          profile_version?: number
          realized_outcomes?: Json
          review_status?: string
          rollback_viability_score?: number
          scope_type?: string
          shared_reuse_score?: number
          source_convergence_decision_id?: string | null
          source_governance_case_id?: string | null
          source_memory_pattern_id?: string | null
          speed_bias_score?: number
          stability_bias_score?: number
          tags?: Json
          tenant_fit_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          adoption_status?: string
          architecture_mode_compatibility?: Json
          assumptions?: Json
          cost_bias_score?: number
          created_at?: string
          description?: string
          evidence_links?: Json
          expected_outcomes?: Json
          governance_strictness_score?: number
          id?: string
          organization_id?: string
          override_budget_score?: number
          policy_pack_ids?: Json
          profile_drift_score?: number
          profile_name?: string
          profile_type?: string
          profile_version?: number
          realized_outcomes?: Json
          review_status?: string
          rollback_viability_score?: number
          scope_type?: string
          shared_reuse_score?: number
          source_convergence_decision_id?: string | null
          source_governance_case_id?: string | null
          source_memory_pattern_id?: string | null
          speed_bias_score?: number
          stability_bias_score?: number
          tags?: Json
          tenant_fit_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operating_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operating_profiles_workspace_id_fkey"
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
      platform_calibration_applications: {
        Row: {
          applied_mode: string
          applied_value: Json
          created_at: string
          id: string
          organization_id: string | null
          outcome_status: string
          parameter_key: string
          previous_value: Json
          proposal_id: string
          rollback_guard: Json
          scope_ref: Json | null
        }
        Insert: {
          applied_mode?: string
          applied_value?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          outcome_status?: string
          parameter_key: string
          previous_value?: Json
          proposal_id: string
          rollback_guard?: Json
          scope_ref?: Json | null
        }
        Update: {
          applied_mode?: string
          applied_value?: Json
          created_at?: string
          id?: string
          organization_id?: string | null
          outcome_status?: string
          parameter_key?: string
          previous_value?: Json
          proposal_id?: string
          rollback_guard?: Json
          scope_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_calibration_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_calibration_applications_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "platform_calibration_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_calibration_parameters: {
        Row: {
          allowed_range: Json
          calibration_mode: string
          created_at: string
          current_value: Json
          default_value: Json
          id: string
          organization_id: string | null
          parameter_family: string
          parameter_key: string
          parameter_scope: string
          status: string
          updated_at: string
        }
        Insert: {
          allowed_range?: Json
          calibration_mode?: string
          created_at?: string
          current_value?: Json
          default_value?: Json
          id?: string
          organization_id?: string | null
          parameter_family: string
          parameter_key: string
          parameter_scope: string
          status?: string
          updated_at?: string
        }
        Update: {
          allowed_range?: Json
          calibration_mode?: string
          created_at?: string
          current_value?: Json
          default_value?: Json
          id?: string
          organization_id?: string | null
          parameter_family?: string
          parameter_key?: string
          parameter_scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_calibration_parameters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_calibration_proposals: {
        Row: {
          confidence_score: number | null
          created_at: string
          current_value: Json
          evidence_refs: Json | null
          expected_impact: Json | null
          id: string
          organization_id: string | null
          parameter_key: string
          proposal_mode: string
          proposed_value: Json
          rationale_codes: Json
          scope_ref: Json | null
          status: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          current_value?: Json
          evidence_refs?: Json | null
          expected_impact?: Json | null
          id?: string
          organization_id?: string | null
          parameter_key: string
          proposal_mode?: string
          proposed_value?: Json
          rationale_codes?: Json
          scope_ref?: Json | null
          status?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          current_value?: Json
          evidence_refs?: Json | null
          expected_impact?: Json | null
          id?: string
          organization_id?: string | null
          parameter_key?: string
          proposal_mode?: string
          proposed_value?: Json
          rationale_codes?: Json
          scope_ref?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_calibration_proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_calibration_rollbacks: {
        Row: {
          application_id: string
          created_at: string
          id: string
          organization_id: string | null
          parameter_key: string
          restored_value: Json
          rollback_mode: string
          rollback_reason: Json
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          organization_id?: string | null
          parameter_key: string
          restored_value?: Json
          rollback_mode?: string
          rollback_reason?: Json
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          parameter_key?: string
          restored_value?: Json
          rollback_mode?: string
          rollback_reason?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_calibration_rollbacks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "platform_calibration_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_calibration_rollbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_convergence_profiles: {
        Row: {
          assumptions: Json
          beneficial_specialization_score: number
          confidence_score: number
          convergence_domain: string
          convergence_priority_score: number
          created_at: string
          current_divergence_score: number
          economic_redundancy_score: number
          evidence_links: Json
          fragmentation_risk_score: number
          id: string
          organization_id: string
          rollback_complexity_score: number
          scope_id: string
          scope_type: string
          specialization_debt_score: number
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          beneficial_specialization_score?: number
          confidence_score?: number
          convergence_domain?: string
          convergence_priority_score?: number
          created_at?: string
          current_divergence_score?: number
          economic_redundancy_score?: number
          evidence_links?: Json
          fragmentation_risk_score?: number
          id?: string
          organization_id: string
          rollback_complexity_score?: number
          scope_id?: string
          scope_type?: string
          specialization_debt_score?: number
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          beneficial_specialization_score?: number
          confidence_score?: number
          convergence_domain?: string
          convergence_priority_score?: number
          created_at?: string
          current_divergence_score?: number
          economic_redundancy_score?: number
          evidence_links?: Json
          fragmentation_risk_score?: number
          id?: string
          organization_id?: string
          rollback_complexity_score?: number
          scope_id?: string
          scope_type?: string
          specialization_debt_score?: number
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_convergence_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_convergence_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_insights: {
        Row: {
          affected_scope: string
          confidence_score: number
          created_at: string
          evidence_refs: Json
          id: string
          insight_type: string
          organization_id: string
          recommendation: Json | null
          severity: string
          status: string
          supporting_metrics: Json
        }
        Insert: {
          affected_scope?: string
          confidence_score?: number
          created_at?: string
          evidence_refs?: Json
          id?: string
          insight_type?: string
          organization_id: string
          recommendation?: Json | null
          severity?: string
          status?: string
          supporting_metrics?: Json
        }
        Update: {
          affected_scope?: string
          confidence_score?: number
          created_at?: string
          evidence_refs?: Json
          id?: string
          insight_type?: string
          organization_id?: string
          recommendation?: Json | null
          severity?: string
          status?: string
          supporting_metrics?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_recommendations: {
        Row: {
          confidence_score: number
          created_at: string
          id: string
          organization_id: string
          priority_score: number
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_entity: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          id?: string
          organization_id: string
          priority_score?: number
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entity?: Json
          target_scope?: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          id?: string
          organization_id?: string
          priority_score?: number
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entity?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_safe_mode_profiles: {
        Row: {
          activation_mode: string
          created_at: string
          id: string
          organization_id: string | null
          profile_key: string
          profile_name: string
          profile_scope: string
          stabilization_controls: Json
          status: string
          updated_at: string
        }
        Insert: {
          activation_mode?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          profile_key: string
          profile_name: string
          profile_scope?: string
          stabilization_controls?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          activation_mode?: string
          created_at?: string
          id?: string
          organization_id?: string | null
          profile_key?: string
          profile_name?: string
          profile_scope?: string
          stabilization_controls?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_safe_mode_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stability_signals: {
        Row: {
          baseline_value: Json | null
          created_at: string
          critical_threshold: Json
          current_value: Json
          id: string
          organization_id: string | null
          scope_type: string
          signal_family: string
          signal_key: string
          status: string
          updated_at: string
          warning_threshold: Json
        }
        Insert: {
          baseline_value?: Json | null
          created_at?: string
          critical_threshold?: Json
          current_value?: Json
          id?: string
          organization_id?: string | null
          scope_type?: string
          signal_family?: string
          signal_key: string
          status?: string
          updated_at?: string
          warning_threshold?: Json
        }
        Update: {
          baseline_value?: Json | null
          created_at?: string
          critical_threshold?: Json
          current_value?: Json
          id?: string
          organization_id?: string | null
          scope_type?: string
          signal_family?: string
          signal_key?: string
          status?: string
          updated_at?: string
          warning_threshold?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_stability_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stability_v2_signals: {
        Row: {
          confidence_score: number | null
          created_at: string
          evidence_refs: Json | null
          id: string
          organization_id: string
          scope_ref: Json | null
          severity: string
          signal_family: string
          signal_key: string
          signal_payload: Json
          source_layers: Json
          status: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id: string
          scope_ref?: Json | null
          severity?: string
          signal_family: string
          signal_key: string
          signal_payload?: Json
          source_layers?: Json
          status?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string
          scope_ref?: Json | null
          severity?: string
          signal_family?: string
          signal_key?: string
          signal_payload?: Json
          source_layers?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_stability_v2_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stabilization_actions: {
        Row: {
          action_mode: string
          action_type: string
          bounded_delta: Json
          created_at: string
          expected_impact: Json | null
          id: string
          organization_id: string | null
          rollback_guard: Json
          scope_ref: Json | null
          status: string
          target_entities: Json
          trigger_signals: Json
        }
        Insert: {
          action_mode?: string
          action_type: string
          bounded_delta?: Json
          created_at?: string
          expected_impact?: Json | null
          id?: string
          organization_id?: string | null
          rollback_guard?: Json
          scope_ref?: Json | null
          status?: string
          target_entities?: Json
          trigger_signals?: Json
        }
        Update: {
          action_mode?: string
          action_type?: string
          bounded_delta?: Json
          created_at?: string
          expected_impact?: Json | null
          id?: string
          organization_id?: string | null
          rollback_guard?: Json
          scope_ref?: Json | null
          status?: string
          target_entities?: Json
          trigger_signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_stabilization_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stabilization_envelopes: {
        Row: {
          activation_mode: string
          created_at: string
          envelope_key: string
          envelope_name: string
          expiry_policy: Json | null
          id: string
          organization_id: string
          stabilization_controls: Json
          status: string
          target_scope: string
          updated_at: string
        }
        Insert: {
          activation_mode?: string
          created_at?: string
          envelope_key: string
          envelope_name: string
          expiry_policy?: Json | null
          id?: string
          organization_id: string
          stabilization_controls?: Json
          status?: string
          target_scope: string
          updated_at?: string
        }
        Update: {
          activation_mode?: string
          created_at?: string
          envelope_key?: string
          envelope_name?: string
          expiry_policy?: Json | null
          id?: string
          organization_id?: string
          stabilization_controls?: Json
          status?: string
          target_scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_stabilization_envelopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stabilization_outcomes: {
        Row: {
          after_metrics: Json | null
          before_metrics: Json | null
          created_at: string
          evidence_refs: Json | null
          id: string
          organization_id: string | null
          outcome_status: string
          scope_ref: Json | null
          stabilization_action_id: string
        }
        Insert: {
          after_metrics?: Json | null
          before_metrics?: Json | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string | null
          outcome_status?: string
          scope_ref?: Json | null
          stabilization_action_id: string
        }
        Update: {
          after_metrics?: Json | null
          before_metrics?: Json | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string | null
          outcome_status?: string
          scope_ref?: Json | null
          stabilization_action_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_stabilization_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_stabilization_outcomes_stabilization_action_id_fkey"
            columns: ["stabilization_action_id"]
            isOneToOne: false
            referencedRelation: "platform_stabilization_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stabilization_rollbacks: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          restored_state: Json
          rollback_mode: string
          rollback_reason: Json
          stabilization_action_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
          stabilization_action_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
          stabilization_action_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_stabilization_rollbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_stabilization_rollbacks_stabilization_action_id_fkey"
            columns: ["stabilization_action_id"]
            isOneToOne: false
            referencedRelation: "platform_stabilization_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stabilization_v2_outcomes: {
        Row: {
          after_metrics: Json | null
          before_metrics: Json | null
          created_at: string
          evidence_refs: Json | null
          id: string
          organization_id: string
          outcome_status: string
          scope_ref: Json | null
          stabilization_envelope_id: string | null
        }
        Insert: {
          after_metrics?: Json | null
          before_metrics?: Json | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id: string
          outcome_status?: string
          scope_ref?: Json | null
          stabilization_envelope_id?: string | null
        }
        Update: {
          after_metrics?: Json | null
          before_metrics?: Json | null
          created_at?: string
          evidence_refs?: Json | null
          id?: string
          organization_id?: string
          outcome_status?: string
          scope_ref?: Json | null
          stabilization_envelope_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_stabilization_v2_outcom_stabilization_envelope_id_fkey"
            columns: ["stabilization_envelope_id"]
            isOneToOne: false
            referencedRelation: "platform_stabilization_envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_stabilization_v2_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_stabilization_v2_rollbacks: {
        Row: {
          created_at: string
          envelope_id: string
          id: string
          organization_id: string
          restored_state: Json
          rollback_mode: string
          rollback_reason: Json
          rollback_scope: string
        }
        Insert: {
          created_at?: string
          envelope_id: string
          id?: string
          organization_id: string
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
          rollback_scope?: string
        }
        Update: {
          created_at?: string
          envelope_id?: string
          id?: string
          organization_id?: string
          restored_state?: Json
          rollback_mode?: string
          rollback_reason?: Json
          rollback_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_stabilization_v2_rollbacks_envelope_id_fkey"
            columns: ["envelope_id"]
            isOneToOne: false
            referencedRelation: "platform_stabilization_envelopes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_stabilization_v2_rollbacks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_packs: {
        Row: {
          cohesion_score: number
          compatibility_constraints: Json
          created_at: string
          description: string
          id: string
          organization_id: string
          pack_name: string
          pack_type: string
          pack_version: number
          policy_definitions: Json
          reuse_footprint: Json
          status: string
          updated_at: string
        }
        Insert: {
          cohesion_score?: number
          compatibility_constraints?: Json
          created_at?: string
          description?: string
          id?: string
          organization_id: string
          pack_name?: string
          pack_type?: string
          pack_version?: number
          policy_definitions?: Json
          reuse_footprint?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          cohesion_score?: number
          compatibility_constraints?: Json
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          pack_name?: string
          pack_type?: string
          pack_version?: number
          policy_definitions?: Json
          reuse_footprint?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_packs_organization_id_fkey"
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
      product_architecture_correlations: {
        Row: {
          adoption_score: number
          architecture_alignment_score: number
          architecture_mode_id: string | null
          confidence_score: number
          correlation_strength: string
          correlation_type: string
          created_at: string
          evidence_links: Json
          fitness_impact_score: number
          friction_score: number
          id: string
          limitations: string | null
          organization_id: string
          product_area: string | null
          retention_score: number
          stability_impact_score: number
          value_score: number
          workspace_id: string | null
        }
        Insert: {
          adoption_score?: number
          architecture_alignment_score?: number
          architecture_mode_id?: string | null
          confidence_score?: number
          correlation_strength?: string
          correlation_type?: string
          created_at?: string
          evidence_links?: Json
          fitness_impact_score?: number
          friction_score?: number
          id?: string
          limitations?: string | null
          organization_id: string
          product_area?: string | null
          retention_score?: number
          stability_impact_score?: number
          value_score?: number
          workspace_id?: string | null
        }
        Update: {
          adoption_score?: number
          architecture_alignment_score?: number
          architecture_mode_id?: string | null
          confidence_score?: number
          correlation_strength?: string
          correlation_type?: string
          created_at?: string
          evidence_links?: Json
          fitness_impact_score?: number
          friction_score?: number
          id?: string
          limitations?: string | null
          organization_id?: string
          product_area?: string | null
          retention_score?: number
          stability_impact_score?: number
          value_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_architecture_correlations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_architecture_correlations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_benchmark_outcomes: {
        Row: {
          benchmark_id: string | null
          created_at: string
          drift_detected: boolean
          evidence_links: Json
          expected_impact: number
          false_positive: boolean
          id: string
          notes: string | null
          organization_id: string
          outcome_status: string
          realized_impact: number
          recommendation_id: string | null
          usefulness_score: number
        }
        Insert: {
          benchmark_id?: string | null
          created_at?: string
          drift_detected?: boolean
          evidence_links?: Json
          expected_impact?: number
          false_positive?: boolean
          id?: string
          notes?: string | null
          organization_id: string
          outcome_status?: string
          realized_impact?: number
          recommendation_id?: string | null
          usefulness_score?: number
        }
        Update: {
          benchmark_id?: string | null
          created_at?: string
          drift_detected?: boolean
          evidence_links?: Json
          expected_impact?: number
          false_positive?: boolean
          id?: string
          notes?: string | null
          organization_id?: string
          outcome_status?: string
          realized_impact?: number
          recommendation_id?: string | null
          usefulness_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_benchmark_outcomes_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "product_operational_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_benchmark_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_benchmark_outcomes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "product_operational_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_friction_clusters: {
        Row: {
          affected_signal_ids: Json
          architecture_correlation_score: number
          cluster_name: string
          created_at: string
          evidence_links: Json
          friction_type: string
          id: string
          linked_architecture_mode_id: string | null
          linked_operating_profile_id: string | null
          linked_policy_pack_id: string | null
          organization_id: string
          product_area: string
          profile_correlation_score: number
          recurrence_count: number
          severity_score: number
          status: string
          trend_direction: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          affected_signal_ids?: Json
          architecture_correlation_score?: number
          cluster_name?: string
          created_at?: string
          evidence_links?: Json
          friction_type?: string
          id?: string
          linked_architecture_mode_id?: string | null
          linked_operating_profile_id?: string | null
          linked_policy_pack_id?: string | null
          organization_id: string
          product_area?: string
          profile_correlation_score?: number
          recurrence_count?: number
          severity_score?: number
          status?: string
          trend_direction?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          affected_signal_ids?: Json
          architecture_correlation_score?: number
          cluster_name?: string
          created_at?: string
          evidence_links?: Json
          friction_type?: string
          id?: string
          linked_architecture_mode_id?: string | null
          linked_operating_profile_id?: string | null
          linked_policy_pack_id?: string | null
          organization_id?: string
          product_area?: string
          profile_correlation_score?: number
          recurrence_count?: number
          severity_score?: number
          status?: string
          trend_direction?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_friction_clusters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_friction_clusters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_intelligence_outcomes: {
        Row: {
          created_at: string
          evidence_refs: Json
          expected_adoption_gain: number
          expected_friction_reduction: number
          expected_product_impact: number
          expected_retention_gain: number
          id: string
          notes: string
          opportunity_id: string | null
          organization_id: string
          outcome_status: string
          product_effectiveness_score: number
          realized_adoption_gain: number
          realized_friction_reduction: number
          realized_product_impact: number
          realized_retention_gain: number
        }
        Insert: {
          created_at?: string
          evidence_refs?: Json
          expected_adoption_gain?: number
          expected_friction_reduction?: number
          expected_product_impact?: number
          expected_retention_gain?: number
          id?: string
          notes?: string
          opportunity_id?: string | null
          organization_id: string
          outcome_status?: string
          product_effectiveness_score?: number
          realized_adoption_gain?: number
          realized_friction_reduction?: number
          realized_product_impact?: number
          realized_retention_gain?: number
        }
        Update: {
          created_at?: string
          evidence_refs?: Json
          expected_adoption_gain?: number
          expected_friction_reduction?: number
          expected_product_impact?: number
          expected_retention_gain?: number
          id?: string
          notes?: string
          opportunity_id?: string | null
          organization_id?: string
          outcome_status?: string
          product_effectiveness_score?: number
          realized_adoption_gain?: number
          realized_friction_reduction?: number
          realized_product_impact?: number
          realized_retention_gain?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_intelligence_outcomes_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_intelligence_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_intelligence_profiles: {
        Row: {
          architecture_alignment_score: number
          avg_adoption_score: number
          avg_friction_score: number
          avg_retention_score: number
          avg_value_score: number
          created_at: string
          id: string
          last_updated_at: string
          linked_architecture_mode_id: string | null
          linked_operating_profile_id: string | null
          operating_profile_alignment_score: number
          opportunity_density: number
          organization_id: string
          product_area: string
          profile_scope_id: string
          profile_scope_type: string
          signal_count: number
          signal_quality_posture: number
          tenant_divergence_signal_score: number
          workspace_id: string | null
        }
        Insert: {
          architecture_alignment_score?: number
          avg_adoption_score?: number
          avg_friction_score?: number
          avg_retention_score?: number
          avg_value_score?: number
          created_at?: string
          id?: string
          last_updated_at?: string
          linked_architecture_mode_id?: string | null
          linked_operating_profile_id?: string | null
          operating_profile_alignment_score?: number
          opportunity_density?: number
          organization_id: string
          product_area?: string
          profile_scope_id?: string
          profile_scope_type?: string
          signal_count?: number
          signal_quality_posture?: number
          tenant_divergence_signal_score?: number
          workspace_id?: string | null
        }
        Update: {
          architecture_alignment_score?: number
          avg_adoption_score?: number
          avg_friction_score?: number
          avg_retention_score?: number
          avg_value_score?: number
          created_at?: string
          id?: string
          last_updated_at?: string
          linked_architecture_mode_id?: string | null
          linked_operating_profile_id?: string | null
          operating_profile_alignment_score?: number
          opportunity_density?: number
          organization_id?: string
          product_area?: string
          profile_scope_id?: string
          profile_scope_type?: string
          signal_count?: number
          signal_quality_posture?: number
          tenant_divergence_signal_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_intelligence_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_intelligence_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_intelligence_reviews: {
        Row: {
          created_at: string
          evidence_refs: Json
          friction_cluster_id: string | null
          id: string
          opportunity_id: string | null
          organization_id: string
          review_notes: string
          review_status: string
          review_type: string
          reviewer_ref: Json
        }
        Insert: {
          created_at?: string
          evidence_refs?: Json
          friction_cluster_id?: string | null
          id?: string
          opportunity_id?: string | null
          organization_id: string
          review_notes?: string
          review_status?: string
          review_type?: string
          reviewer_ref?: Json
        }
        Update: {
          created_at?: string
          evidence_refs?: Json
          friction_cluster_id?: string | null
          id?: string
          opportunity_id?: string | null
          organization_id?: string
          review_notes?: string
          review_status?: string
          review_type?: string
          reviewer_ref?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_intelligence_reviews_friction_cluster_id_fkey"
            columns: ["friction_cluster_id"]
            isOneToOne: false
            referencedRelation: "product_friction_clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_intelligence_reviews_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_intelligence_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_operational_benchmarks: {
        Row: {
          adoption_score: number
          architecture_alignment_score: number
          assumptions: Json
          benchmark_period: string
          benchmark_rank: number | null
          benchmark_scope_id: string | null
          benchmark_scope_type: string
          confidence_score: number
          created_at: string
          evidence_links: Json
          friction_score: number
          id: string
          operating_profile_alignment_score: number
          organization_id: string
          product_area: string | null
          product_priority_score: number
          product_signal_quality_score: number
          retention_score: number
          signal_noise_penalty_score: number
          updated_at: string
          value_score: number
          workspace_id: string | null
        }
        Insert: {
          adoption_score?: number
          architecture_alignment_score?: number
          assumptions?: Json
          benchmark_period?: string
          benchmark_rank?: number | null
          benchmark_scope_id?: string | null
          benchmark_scope_type?: string
          confidence_score?: number
          created_at?: string
          evidence_links?: Json
          friction_score?: number
          id?: string
          operating_profile_alignment_score?: number
          organization_id: string
          product_area?: string | null
          product_priority_score?: number
          product_signal_quality_score?: number
          retention_score?: number
          signal_noise_penalty_score?: number
          updated_at?: string
          value_score?: number
          workspace_id?: string | null
        }
        Update: {
          adoption_score?: number
          architecture_alignment_score?: number
          assumptions?: Json
          benchmark_period?: string
          benchmark_rank?: number | null
          benchmark_scope_id?: string | null
          benchmark_scope_type?: string
          confidence_score?: number
          created_at?: string
          evidence_links?: Json
          friction_score?: number
          id?: string
          operating_profile_alignment_score?: number
          organization_id?: string
          product_area?: string | null
          product_priority_score?: number
          product_signal_quality_score?: number
          retention_score?: number
          signal_noise_penalty_score?: number
          updated_at?: string
          value_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_operational_benchmarks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_operational_benchmarks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_operational_recommendations: {
        Row: {
          architecture_alignment_score: number
          assumptions: Json
          confidence_score: number
          created_at: string
          description: string
          evidence_links: Json
          expected_impact_score: number
          expected_outcomes: Json
          id: string
          organization_id: string
          priority_score: number
          product_area: string | null
          profile_alignment_score: number
          rationale: string
          recommendation_status: string
          recommendation_type: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          architecture_alignment_score?: number
          assumptions?: Json
          confidence_score?: number
          created_at?: string
          description?: string
          evidence_links?: Json
          expected_impact_score?: number
          expected_outcomes?: Json
          id?: string
          organization_id: string
          priority_score?: number
          product_area?: string | null
          profile_alignment_score?: number
          rationale?: string
          recommendation_status?: string
          recommendation_type?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          architecture_alignment_score?: number
          assumptions?: Json
          confidence_score?: number
          created_at?: string
          description?: string
          evidence_links?: Json
          expected_impact_score?: number
          expected_outcomes?: Json
          id?: string
          organization_id?: string
          priority_score?: number
          product_area?: string | null
          profile_alignment_score?: number
          rationale?: string
          recommendation_status?: string
          recommendation_type?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_operational_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_operational_recommendations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_candidates: {
        Row: {
          architecture_alignment_score: number
          assumptions: Json
          confidence_score: number
          created_at: string
          description: string
          evidence_links: Json
          expected_outcomes: Json
          expected_product_impact_score: number
          feasibility_score: number
          friction_correlation: number
          id: string
          linked_architecture_mode_id: string | null
          linked_operating_profile_id: string | null
          linked_policy_pack_id: string | null
          linked_strategy_variant_id: string | null
          opportunity_score: number
          opportunity_type: string
          organization_id: string
          priority_score: number
          product_area: string
          profile_alignment_score: number
          status: string
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          architecture_alignment_score?: number
          assumptions?: Json
          confidence_score?: number
          created_at?: string
          description?: string
          evidence_links?: Json
          expected_outcomes?: Json
          expected_product_impact_score?: number
          feasibility_score?: number
          friction_correlation?: number
          id?: string
          linked_architecture_mode_id?: string | null
          linked_operating_profile_id?: string | null
          linked_policy_pack_id?: string | null
          linked_strategy_variant_id?: string | null
          opportunity_score?: number
          opportunity_type?: string
          organization_id: string
          priority_score?: number
          product_area?: string
          profile_alignment_score?: number
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          architecture_alignment_score?: number
          assumptions?: Json
          confidence_score?: number
          created_at?: string
          description?: string
          evidence_links?: Json
          expected_outcomes?: Json
          expected_product_impact_score?: number
          feasibility_score?: number
          friction_correlation?: number
          id?: string
          linked_architecture_mode_id?: string | null
          linked_operating_profile_id?: string | null
          linked_policy_pack_id?: string | null
          linked_strategy_variant_id?: string | null
          opportunity_score?: number
          opportunity_type?: string
          organization_id?: string
          priority_score?: number
          product_area?: string
          profile_alignment_score?: number
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_candidates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_capacity_models: {
        Row: {
          assumptions: Json | null
          capacity_headroom_score: number | null
          capacity_scope: string
          created_at: string
          current_active_count: number | null
          id: string
          max_concurrent_promotions: number | null
          organization_id: string
          queue_pressure_score: number | null
          resource_utilization_score: number | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json | null
          capacity_headroom_score?: number | null
          capacity_scope?: string
          created_at?: string
          current_active_count?: number | null
          id?: string
          max_concurrent_promotions?: number | null
          organization_id: string
          queue_pressure_score?: number | null
          resource_utilization_score?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json | null
          capacity_headroom_score?: number | null
          capacity_scope?: string
          created_at?: string
          current_active_count?: number | null
          id?: string
          max_concurrent_promotions?: number | null
          organization_id?: string
          queue_pressure_score?: number | null
          resource_utilization_score?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_capacity_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_capacity_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_conflicts: {
        Row: {
          affected_items: Json
          cannibalization_score: number | null
          confidence_score: number | null
          conflict_type: string
          created_at: string
          description: string | null
          evidence_links: Json | null
          id: string
          organization_id: string
          overlap_score: number | null
          portfolio_id: string | null
          recommended_resolution: string | null
          severity: string
          status: string
        }
        Insert: {
          affected_items?: Json
          cannibalization_score?: number | null
          confidence_score?: number | null
          conflict_type?: string
          created_at?: string
          description?: string | null
          evidence_links?: Json | null
          id?: string
          organization_id: string
          overlap_score?: number | null
          portfolio_id?: string | null
          recommended_resolution?: string | null
          severity?: string
          status?: string
        }
        Update: {
          affected_items?: Json
          cannibalization_score?: number | null
          confidence_score?: number | null
          conflict_type?: string
          created_at?: string
          description?: string | null
          evidence_links?: Json | null
          id?: string
          organization_id?: string
          overlap_score?: number | null
          portfolio_id?: string | null
          recommended_resolution?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_conflicts_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_decisions: {
        Row: {
          created_at: string
          decision_status: string
          decision_type: string
          evidence_links: Json | null
          id: string
          item_id: string | null
          organization_id: string
          portfolio_id: string | null
          rationale: string | null
          review_notes: string | null
          reviewer_ref: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_status?: string
          decision_type?: string
          evidence_links?: Json | null
          id?: string
          item_id?: string | null
          organization_id: string
          portfolio_id?: string | null
          rationale?: string | null
          review_notes?: string | null
          reviewer_ref?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_status?: string
          decision_type?: string
          evidence_links?: Json | null
          id?: string
          item_id?: string | null
          organization_id?: string
          portfolio_id?: string | null
          rationale?: string | null
          review_notes?: string | null
          reviewer_ref?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_decisions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_decisions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_outcomes: {
        Row: {
          created_at: string
          decision_id: string | null
          evidence_links: Json | null
          expected_outcomes: Json | null
          false_positive_flag: boolean | null
          id: string
          item_id: string | null
          organization_id: string
          outcome_status: string
          portfolio_decision_quality_score: number | null
          portfolio_id: string | null
          portfolio_outcome_accuracy_score: number | null
          realized_outcomes: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_id?: string | null
          evidence_links?: Json | null
          expected_outcomes?: Json | null
          false_positive_flag?: boolean | null
          id?: string
          item_id?: string | null
          organization_id: string
          outcome_status?: string
          portfolio_decision_quality_score?: number | null
          portfolio_id?: string | null
          portfolio_outcome_accuracy_score?: number | null
          realized_outcomes?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_id?: string | null
          evidence_links?: Json | null
          expected_outcomes?: Json | null
          false_positive_flag?: boolean | null
          id?: string
          item_id?: string | null
          organization_id?: string
          outcome_status?: string
          portfolio_decision_quality_score?: number | null
          portfolio_id?: string | null
          portfolio_outcome_accuracy_score?: number | null
          realized_outcomes?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_outcomes_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_outcomes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_outcomes_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_portfolio_items: {
        Row: {
          assumptions: Json | null
          cannibalization_score: number | null
          capacity_pressure_score: number | null
          confidence_score: number | null
          conflict_score: number | null
          created_at: string
          deferral_justification_score: number | null
          evidence_links: Json | null
          expected_value_score: number | null
          feasibility_score: number | null
          governance_state: string
          id: string
          linked_architecture_correlation_id: string | null
          linked_benchmark_id: string | null
          linked_profile_correlation_id: string | null
          linked_recommendation_id: string | null
          opportunity_ref: Json
          organization_id: string
          overlap_score: number | null
          portfolio_id: string
          portfolio_priority_score: number | null
          promotion_readiness_score: number | null
          rationale: string[] | null
          strategic_fit_score: number | null
          updated_at: string
          watchlist_relevance_score: number | null
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json | null
          cannibalization_score?: number | null
          capacity_pressure_score?: number | null
          confidence_score?: number | null
          conflict_score?: number | null
          created_at?: string
          deferral_justification_score?: number | null
          evidence_links?: Json | null
          expected_value_score?: number | null
          feasibility_score?: number | null
          governance_state?: string
          id?: string
          linked_architecture_correlation_id?: string | null
          linked_benchmark_id?: string | null
          linked_profile_correlation_id?: string | null
          linked_recommendation_id?: string | null
          opportunity_ref?: Json
          organization_id: string
          overlap_score?: number | null
          portfolio_id: string
          portfolio_priority_score?: number | null
          promotion_readiness_score?: number | null
          rationale?: string[] | null
          strategic_fit_score?: number | null
          updated_at?: string
          watchlist_relevance_score?: number | null
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json | null
          cannibalization_score?: number | null
          capacity_pressure_score?: number | null
          confidence_score?: number | null
          conflict_score?: number | null
          created_at?: string
          deferral_justification_score?: number | null
          evidence_links?: Json | null
          expected_value_score?: number | null
          feasibility_score?: number | null
          governance_state?: string
          id?: string
          linked_architecture_correlation_id?: string | null
          linked_benchmark_id?: string | null
          linked_profile_correlation_id?: string | null
          linked_recommendation_id?: string | null
          opportunity_ref?: Json
          organization_id?: string
          overlap_score?: number | null
          portfolio_id?: string
          portfolio_priority_score?: number | null
          promotion_readiness_score?: number | null
          rationale?: string[] | null
          strategic_fit_score?: number | null
          updated_at?: string
          watchlist_relevance_score?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_portfolio_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_portfolio_items_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "product_opportunity_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_portfolio_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_opportunity_portfolios: {
        Row: {
          created_at: string
          deferred_count: number | null
          evidence_links: Json | null
          id: string
          lifecycle_status: string
          monitored_count: number | null
          organization_id: string
          portfolio_balance_score: number | null
          portfolio_name: string
          portfolio_scope_id: string | null
          portfolio_scope_type: string
          promoted_count: number | null
          rejected_count: number | null
          total_items: number | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          deferred_count?: number | null
          evidence_links?: Json | null
          id?: string
          lifecycle_status?: string
          monitored_count?: number | null
          organization_id: string
          portfolio_balance_score?: number | null
          portfolio_name?: string
          portfolio_scope_id?: string | null
          portfolio_scope_type?: string
          promoted_count?: number | null
          rejected_count?: number | null
          total_items?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          deferred_count?: number | null
          evidence_links?: Json | null
          id?: string
          lifecycle_status?: string
          monitored_count?: number | null
          organization_id?: string
          portfolio_balance_score?: number | null
          portfolio_name?: string
          portfolio_scope_id?: string | null
          portfolio_scope_type?: string
          promoted_count?: number | null
          rejected_count?: number | null
          total_items?: number | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_opportunity_portfolios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_opportunity_portfolios_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
      product_profile_correlations: {
        Row: {
          adoption_score: number
          confidence_score: number
          correlation_strength: string
          correlation_type: string
          created_at: string
          evidence_links: Json
          friction_score: number
          id: string
          limitations: string | null
          operating_profile_id: string | null
          organization_id: string
          override_impact_score: number
          policy_pack_id: string | null
          product_area: string | null
          profile_alignment_score: number
          retention_score: number
          value_score: number
          workspace_id: string | null
        }
        Insert: {
          adoption_score?: number
          confidence_score?: number
          correlation_strength?: string
          correlation_type?: string
          created_at?: string
          evidence_links?: Json
          friction_score?: number
          id?: string
          limitations?: string | null
          operating_profile_id?: string | null
          organization_id: string
          override_impact_score?: number
          policy_pack_id?: string | null
          product_area?: string | null
          profile_alignment_score?: number
          retention_score?: number
          value_score?: number
          workspace_id?: string | null
        }
        Update: {
          adoption_score?: number
          confidence_score?: number
          correlation_strength?: string
          correlation_type?: string
          created_at?: string
          evidence_links?: Json
          friction_score?: number
          id?: string
          limitations?: string | null
          operating_profile_id?: string | null
          organization_id?: string
          override_impact_score?: number
          policy_pack_id?: string | null
          product_area?: string | null
          profile_alignment_score?: number
          retention_score?: number
          value_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_profile_correlations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_profile_correlations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_signal_events: {
        Row: {
          adoption_score: number
          confidence_score: number
          created_at: string
          evidence_links: Json
          friction_score: number
          id: string
          noise_penalty_score: number
          organization_id: string
          product_area: string
          raw_payload: Json
          retention_signal_score: number
          signal_quality_score: number
          signal_scope_id: string
          signal_scope_type: string
          signal_source: string
          signal_type: string
          tags: Json
          value_signal_score: number
          workspace_id: string | null
        }
        Insert: {
          adoption_score?: number
          confidence_score?: number
          created_at?: string
          evidence_links?: Json
          friction_score?: number
          id?: string
          noise_penalty_score?: number
          organization_id: string
          product_area?: string
          raw_payload?: Json
          retention_signal_score?: number
          signal_quality_score?: number
          signal_scope_id?: string
          signal_scope_type?: string
          signal_source?: string
          signal_type?: string
          tags?: Json
          value_signal_score?: number
          workspace_id?: string | null
        }
        Update: {
          adoption_score?: number
          confidence_score?: number
          created_at?: string
          evidence_links?: Json
          friction_score?: number
          id?: string
          noise_penalty_score?: number
          organization_id?: string
          product_area?: string
          raw_payload?: Json
          retention_signal_score?: number
          signal_quality_score?: number
          signal_scope_id?: string
          signal_scope_type?: string
          signal_source?: string
          signal_type?: string
          tags?: Json
          value_signal_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_signal_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_signal_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      product_signal_quality_reviews: {
        Row: {
          confidence_score: number
          consistency_score: number
          created_at: string
          evidence_links: Json
          id: string
          noise_penalty_score: number
          organization_id: string
          product_area: string | null
          quality_score: number
          review_notes: string | null
          review_period: string
          signal_id: string | null
          signal_type: string
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number
          consistency_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          noise_penalty_score?: number
          organization_id: string
          product_area?: string | null
          quality_score?: number
          review_notes?: string | null
          review_period?: string
          signal_id?: string | null
          signal_type?: string
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number
          consistency_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          noise_penalty_score?: number
          organization_id?: string
          product_area?: string | null
          quality_score?: number
          review_notes?: string | null
          review_period?: string
          signal_id?: string | null
          signal_type?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_signal_quality_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_signal_quality_reviews_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_adoption_reviews: {
        Row: {
          binding_id: string | null
          created_at: string
          evidence_refs: Json
          id: string
          organization_id: string
          profile_id: string
          review_notes: string
          review_status: string
          review_type: string
          reviewer_ref: Json
        }
        Insert: {
          binding_id?: string | null
          created_at?: string
          evidence_refs?: Json
          id?: string
          organization_id: string
          profile_id: string
          review_notes?: string
          review_status?: string
          review_type?: string
          reviewer_ref?: Json
        }
        Update: {
          binding_id?: string | null
          created_at?: string
          evidence_refs?: Json
          id?: string
          organization_id?: string
          profile_id?: string
          review_notes?: string
          review_status?: string
          review_type?: string
          reviewer_ref?: Json
        }
        Relationships: [
          {
            foreignKeyName: "profile_adoption_reviews_binding_id_fkey"
            columns: ["binding_id"]
            isOneToOne: false
            referencedRelation: "operating_profile_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_adoption_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_adoption_reviews_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "operating_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_outcomes: {
        Row: {
          binding_id: string | null
          created_at: string
          evidence_refs: Json
          expected_cost_efficiency_gain: number
          expected_fragmentation_reduction: number
          expected_speed_gain: number
          expected_stability_gain: number
          id: string
          notes: string
          organization_id: string
          outcome_status: string
          profile_effectiveness_score: number
          profile_id: string
          realized_cost_efficiency_gain: number
          realized_fragmentation_reduction: number
          realized_speed_gain: number
          realized_stability_gain: number
        }
        Insert: {
          binding_id?: string | null
          created_at?: string
          evidence_refs?: Json
          expected_cost_efficiency_gain?: number
          expected_fragmentation_reduction?: number
          expected_speed_gain?: number
          expected_stability_gain?: number
          id?: string
          notes?: string
          organization_id: string
          outcome_status?: string
          profile_effectiveness_score?: number
          profile_id: string
          realized_cost_efficiency_gain?: number
          realized_fragmentation_reduction?: number
          realized_speed_gain?: number
          realized_stability_gain?: number
        }
        Update: {
          binding_id?: string | null
          created_at?: string
          evidence_refs?: Json
          expected_cost_efficiency_gain?: number
          expected_fragmentation_reduction?: number
          expected_speed_gain?: number
          expected_stability_gain?: number
          id?: string
          notes?: string
          organization_id?: string
          outcome_status?: string
          profile_effectiveness_score?: number
          profile_id?: string
          realized_cost_efficiency_gain?: number
          realized_fragmentation_reduction?: number
          realized_speed_gain?: number
          realized_stability_gain?: number
        }
        Relationships: [
          {
            foreignKeyName: "profile_outcomes_binding_id_fkey"
            columns: ["binding_id"]
            isOneToOne: false
            referencedRelation: "operating_profile_bindings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_outcomes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "operating_profiles"
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
      role_experience_models: {
        Row: {
          assumptions: Json
          complexity_threshold: number
          created_at: string
          default_surface_type: string
          description: string | null
          evidence_links: Json
          id: string
          navigation_profile_name: string
          organization_id: string
          role_name: string
          role_type: string
          status: string
          updated_at: string
          visibility_rules: Json
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          complexity_threshold?: number
          created_at?: string
          default_surface_type?: string
          description?: string | null
          evidence_links?: Json
          id?: string
          navigation_profile_name?: string
          organization_id: string
          role_name?: string
          role_type?: string
          status?: string
          updated_at?: string
          visibility_rules?: Json
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          complexity_threshold?: number
          created_at?: string
          default_surface_type?: string
          description?: string | null
          evidence_links?: Json
          id?: string
          navigation_profile_name?: string
          organization_id?: string
          role_name?: string
          role_type?: string
          status?: string
          updated_at?: string
          visibility_rules?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_experience_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_experience_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_experience_outcomes: {
        Row: {
          admin_surface_integrity_score: number
          approval_visibility_score: number
          assumptions: Json
          bounded_visibility_coherence_score: number
          complexity_exposure_score: number
          created_at: string
          default_user_journey_clarity_score: number
          evidence_links: Json
          expected_outcomes: Json
          id: string
          information_summarization_score: number
          internal_complexity_leakage_score: number
          navigation_clarity_score: number
          operator_surface_effectiveness_score: number
          organization_id: string
          outcome_domain: string
          permission_alignment_score: number
          realized_outcomes: Json
          role_experience_outcome_accuracy_score: number
          role_experience_quality_score: number
          role_friction_score: number
          role_name: string
          role_surface_separation_score: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          admin_surface_integrity_score?: number
          approval_visibility_score?: number
          assumptions?: Json
          bounded_visibility_coherence_score?: number
          complexity_exposure_score?: number
          created_at?: string
          default_user_journey_clarity_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          id?: string
          information_summarization_score?: number
          internal_complexity_leakage_score?: number
          navigation_clarity_score?: number
          operator_surface_effectiveness_score?: number
          organization_id: string
          outcome_domain?: string
          permission_alignment_score?: number
          realized_outcomes?: Json
          role_experience_outcome_accuracy_score?: number
          role_experience_quality_score?: number
          role_friction_score?: number
          role_name?: string
          role_surface_separation_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          admin_surface_integrity_score?: number
          approval_visibility_score?: number
          assumptions?: Json
          bounded_visibility_coherence_score?: number
          complexity_exposure_score?: number
          created_at?: string
          default_user_journey_clarity_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          id?: string
          information_summarization_score?: number
          internal_complexity_leakage_score?: number
          navigation_clarity_score?: number
          operator_surface_effectiveness_score?: number
          organization_id?: string
          outcome_domain?: string
          permission_alignment_score?: number
          realized_outcomes?: Json
          role_experience_outcome_accuracy_score?: number
          role_experience_quality_score?: number
          role_friction_score?: number
          role_name?: string
          role_surface_separation_score?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_experience_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_experience_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_experience_overrides: {
        Row: {
          assumptions: Json
          created_at: string
          evidence_links: Json
          experience_quality_score: number
          friction_score: number
          id: string
          organization_id: string
          override_key: string
          override_status: string
          override_value: Json
          recommendation_status: string
          role_name: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          experience_quality_score?: number
          friction_score?: number
          id?: string
          organization_id: string
          override_key?: string
          override_status?: string
          override_value?: Json
          recommendation_status?: string
          role_name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          experience_quality_score?: number
          friction_score?: number
          id?: string
          organization_id?: string
          override_key?: string
          override_status?: string
          override_value?: Json
          recommendation_status?: string
          role_name?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_experience_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_experience_overrides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_information_layers: {
        Row: {
          created_at: string
          evidence_links: Json
          id: string
          information_class: string
          information_summarization_score: number
          organization_id: string
          rationale: string | null
          role_name: string
          status: string
          summarization_level: string
          updated_at: string
          visibility_mode: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          evidence_links?: Json
          id?: string
          information_class?: string
          information_summarization_score?: number
          organization_id: string
          rationale?: string | null
          role_name?: string
          status?: string
          summarization_level?: string
          updated_at?: string
          visibility_mode?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          evidence_links?: Json
          id?: string
          information_class?: string
          information_summarization_score?: number
          organization_id?: string
          rationale?: string | null
          role_name?: string
          status?: string
          summarization_level?: string
          updated_at?: string
          visibility_mode?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_information_layers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_information_layers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_navigation_profiles: {
        Row: {
          complexity_exposure_score: number
          created_at: string
          evidence_links: Json
          id: string
          navigation_items: Json
          organization_id: string
          profile_name: string
          role_name: string
          status: string
          surface_priority: string
          tab_items: Json
          updated_at: string
          visibility_density_score: number
          workspace_id: string | null
        }
        Insert: {
          complexity_exposure_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          navigation_items?: Json
          organization_id: string
          profile_name?: string
          role_name?: string
          status?: string
          surface_priority?: string
          tab_items?: Json
          updated_at?: string
          visibility_density_score?: number
          workspace_id?: string | null
        }
        Update: {
          complexity_exposure_score?: number
          created_at?: string
          evidence_links?: Json
          id?: string
          navigation_items?: Json
          organization_id?: string
          profile_name?: string
          role_name?: string
          status?: string
          surface_priority?: string
          tab_items?: Json
          updated_at?: string
          visibility_density_score?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_navigation_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_navigation_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      role_surface_permissions: {
        Row: {
          allowed: boolean
          approval_visibility_score: number
          created_at: string
          evidence_links: Json
          governance_surface_score: number
          id: string
          organization_id: string
          permission_scope_id: string | null
          permission_scope_type: string
          role_name: string
          status: string
          surface_key: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          allowed?: boolean
          approval_visibility_score?: number
          created_at?: string
          evidence_links?: Json
          governance_surface_score?: number
          id?: string
          organization_id: string
          permission_scope_id?: string | null
          permission_scope_type?: string
          role_name?: string
          status?: string
          surface_key?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          allowed?: boolean
          approval_visibility_score?: number
          created_at?: string
          evidence_links?: Json
          governance_surface_score?: number
          id?: string
          organization_id?: string
          permission_scope_id?: string | null
          permission_scope_type?: string
          role_name?: string
          status?: string
          surface_key?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_surface_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_surface_permissions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_economic_plans: {
        Row: {
          assessment_id: string
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string
          phases: Json
          plan_name: string
          rollback_reserve: number | null
          status: string
          stop_loss_thresholds: Json | null
          total_budget_envelope: number | null
          updated_at: string
        }
        Insert: {
          assessment_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id: string
          phases?: Json
          plan_name?: string
          rollback_reserve?: number | null
          status?: string
          stop_loss_thresholds?: Json | null
          total_budget_envelope?: number | null
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          phases?: Json
          plan_name?: string
          rollback_reserve?: number | null
          status?: string
          stop_loss_thresholds?: Json | null
          total_budget_envelope?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rollout_economic_plans_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "architecture_economic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rollout_economic_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_retrieval_domains: {
        Row: {
          created_at: string | null
          domain_key: string
          domain_name: string
          embedding_enabled: boolean
          id: string
          scope_type: string
          source_tables: Json
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain_key: string
          domain_name: string
          embedding_enabled?: boolean
          id?: string
          scope_type: string
          source_tables?: Json
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain_key?: string
          domain_name?: string
          embedding_enabled?: boolean
          id?: string
          scope_type?: string
          source_tables?: Json
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      semantic_retrieval_feedback: {
        Row: {
          created_at: string | null
          feedback_reason: Json | null
          id: string
          linked_outcome: Json | null
          organization_id: string
          retrieval_session_id: string
          usefulness_status: string
        }
        Insert: {
          created_at?: string | null
          feedback_reason?: Json | null
          id?: string
          linked_outcome?: Json | null
          organization_id: string
          retrieval_session_id: string
          usefulness_status: string
        }
        Update: {
          created_at?: string | null
          feedback_reason?: Json | null
          id?: string
          linked_outcome?: Json | null
          organization_id?: string
          retrieval_session_id?: string
          usefulness_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_retrieval_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "semantic_retrieval_feedback_retrieval_session_id_fkey"
            columns: ["retrieval_session_id"]
            isOneToOne: false
            referencedRelation: "semantic_retrieval_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_retrieval_indices: {
        Row: {
          created_at: string | null
          domain_id: string
          embedding_model: string
          freshness_policy: Json | null
          id: string
          index_key: string
          ranking_policy: Json
          source_scope: Json
          status: string
          updated_at: string | null
          vector_dimensions: number
        }
        Insert: {
          created_at?: string | null
          domain_id: string
          embedding_model: string
          freshness_policy?: Json | null
          id?: string
          index_key: string
          ranking_policy?: Json
          source_scope?: Json
          status?: string
          updated_at?: string | null
          vector_dimensions: number
        }
        Update: {
          created_at?: string | null
          domain_id?: string
          embedding_model?: string
          freshness_policy?: Json | null
          id?: string
          index_key?: string
          ranking_policy?: Json
          source_scope?: Json
          status?: string
          updated_at?: string | null
          vector_dimensions?: number
        }
        Relationships: [
          {
            foreignKeyName: "semantic_retrieval_indices_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "semantic_retrieval_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      semantic_retrieval_sessions: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          domains_used: Json
          id: string
          organization_id: string
          query_payload: Json
          ranked_results: Json
          rationale_codes: Json | null
          scope_ref: Json | null
          session_type: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          domains_used?: Json
          id?: string
          organization_id: string
          query_payload?: Json
          ranked_results?: Json
          rationale_codes?: Json | null
          scope_ref?: Json | null
          session_type: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          domains_used?: Json
          id?: string
          organization_id?: string
          query_payload?: Json
          ranked_results?: Json
          rationale_codes?: Json | null
          scope_ref?: Json | null
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "semantic_retrieval_sessions_organization_id_fkey"
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
      strategy_portfolio_conflicts: {
        Row: {
          affected_strategy_ids: Json
          confidence: number
          conflict_type: string
          created_at: string
          description: string
          evidence_refs: Json
          id: string
          organization_id: string
          portfolio_id: string
          recommended_resolution: string
          resolved_at: string | null
          severity: string
          status: string
        }
        Insert: {
          affected_strategy_ids?: Json
          confidence?: number
          conflict_type?: string
          created_at?: string
          description?: string
          evidence_refs?: Json
          id?: string
          organization_id: string
          portfolio_id: string
          recommended_resolution?: string
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Update: {
          affected_strategy_ids?: Json
          confidence?: number
          conflict_type?: string
          created_at?: string
          description?: string
          evidence_refs?: Json
          id?: string
          organization_id?: string
          portfolio_id?: string
          recommended_resolution?: string
          resolved_at?: string | null
          severity?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_portfolio_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_portfolio_conflicts_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "strategy_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_portfolio_members: {
        Row: {
          cost_efficiency_score: number | null
          created_at: string
          exposure_weight: number
          id: string
          last_evaluated_at: string | null
          lifecycle_status: string
          organization_id: string
          performance_score: number | null
          portfolio_id: string
          stability_score: number | null
          strategy_family_id: string
          updated_at: string
        }
        Insert: {
          cost_efficiency_score?: number | null
          created_at?: string
          exposure_weight?: number
          id?: string
          last_evaluated_at?: string | null
          lifecycle_status?: string
          organization_id: string
          performance_score?: number | null
          portfolio_id: string
          stability_score?: number | null
          strategy_family_id: string
          updated_at?: string
        }
        Update: {
          cost_efficiency_score?: number | null
          created_at?: string
          exposure_weight?: number
          id?: string
          last_evaluated_at?: string | null
          lifecycle_status?: string
          organization_id?: string
          performance_score?: number | null
          portfolio_id?: string
          stability_score?: number | null
          strategy_family_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_portfolio_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_portfolio_members_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "strategy_portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_portfolio_members_strategy_family_id_fkey"
            columns: ["strategy_family_id"]
            isOneToOne: false
            referencedRelation: "execution_strategy_families"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_portfolio_metrics: {
        Row: {
          active_count: number
          created_at: string
          degrading_count: number
          id: string
          member_count: number
          organization_id: string
          portfolio_cost_efficiency: number
          portfolio_id: string
          portfolio_regression_rate: number
          portfolio_stability_index: number
          portfolio_success_rate: number
          snapshot_data: Json
          strategy_concentration_index: number
        }
        Insert: {
          active_count?: number
          created_at?: string
          degrading_count?: number
          id?: string
          member_count?: number
          organization_id: string
          portfolio_cost_efficiency?: number
          portfolio_id: string
          portfolio_regression_rate?: number
          portfolio_stability_index?: number
          portfolio_success_rate?: number
          snapshot_data?: Json
          strategy_concentration_index?: number
        }
        Update: {
          active_count?: number
          created_at?: string
          degrading_count?: number
          id?: string
          member_count?: number
          organization_id?: string
          portfolio_cost_efficiency?: number
          portfolio_id?: string
          portfolio_regression_rate?: number
          portfolio_stability_index?: number
          portfolio_success_rate?: number
          snapshot_data?: Json
          strategy_concentration_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "strategy_portfolio_metrics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_portfolio_metrics_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "strategy_portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_portfolios: {
        Row: {
          created_at: string
          description: string
          id: string
          organization_id: string
          portfolio_key: string
          portfolio_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          organization_id: string
          portfolio_key: string
          portfolio_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          portfolio_key?: string
          portfolio_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_portfolios_organization_id_fkey"
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
      template_initialization_rules: {
        Row: {
          created_at: string
          id: string
          initialization_payload: Json
          initialization_quality_score: number
          journey_defaults: Json
          organization_id: string
          rule_name: string
          starter_artifacts: Json
          status: string
          template_id: string | null
          updated_at: string
          vertical_starter_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          initialization_payload?: Json
          initialization_quality_score?: number
          journey_defaults?: Json
          organization_id: string
          rule_name?: string
          starter_artifacts?: Json
          status?: string
          template_id?: string | null
          updated_at?: string
          vertical_starter_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          initialization_payload?: Json
          initialization_quality_score?: number
          journey_defaults?: Json
          organization_id?: string
          rule_name?: string
          starter_artifacts?: Json
          status?: string
          template_id?: string | null
          updated_at?: string
          vertical_starter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_initialization_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_initialization_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "initiative_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_initialization_rules_vertical_starter_id_fkey"
            columns: ["vertical_starter_id"]
            isOneToOne: false
            referencedRelation: "vertical_starters"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_architecture_mode_outcomes: {
        Row: {
          baseline_summary: Json
          created_at: string | null
          delta_summary: Json
          evidence_refs: Json | null
          id: string
          mode_id: string
          mode_summary: Json
          organization_id: string
          outcome_status: string
          scope_ref: Json | null
          workspace_id: string | null
        }
        Insert: {
          baseline_summary?: Json
          created_at?: string | null
          delta_summary?: Json
          evidence_refs?: Json | null
          id?: string
          mode_id: string
          mode_summary?: Json
          organization_id: string
          outcome_status?: string
          scope_ref?: Json | null
          workspace_id?: string | null
        }
        Update: {
          baseline_summary?: Json
          created_at?: string | null
          delta_summary?: Json
          evidence_refs?: Json | null
          id?: string
          mode_id?: string
          mode_summary?: Json
          organization_id?: string
          outcome_status?: string
          scope_ref?: Json | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_architecture_mode_outcomes_mode_id_fkey"
            columns: ["mode_id"]
            isOneToOne: false
            referencedRelation: "tenant_architecture_modes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_architecture_mode_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_architecture_mode_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_architecture_mode_reviews: {
        Row: {
          created_at: string | null
          id: string
          linked_changes: Json | null
          mode_ref: Json
          organization_id: string
          review_notes: string | null
          review_reason_codes: Json | null
          review_status: string
          reviewer_ref: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          linked_changes?: Json | null
          mode_ref?: Json
          organization_id: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          linked_changes?: Json | null
          mode_ref?: Json
          organization_id?: string
          review_notes?: string | null
          review_reason_codes?: Json | null
          review_status?: string
          reviewer_ref?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_architecture_mode_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_architecture_modes: {
        Row: {
          activation_mode: string
          allowed_envelope: Json
          anti_fragmentation_constraints: Json
          created_at: string | null
          id: string
          mode_definition: Json
          mode_key: string
          mode_name: string
          mode_scope: string
          organization_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          activation_mode?: string
          allowed_envelope?: Json
          anti_fragmentation_constraints?: Json
          created_at?: string | null
          id?: string
          mode_definition?: Json
          mode_key: string
          mode_name: string
          mode_scope: string
          organization_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          activation_mode?: string
          allowed_envelope?: Json
          anti_fragmentation_constraints?: Json
          created_at?: string | null
          id?: string
          mode_definition?: Json
          mode_key?: string
          mode_name?: string
          mode_scope?: string
          organization_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_architecture_modes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_architecture_preference_profiles: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          organization_id: string
          override_limits: Json
          preference_scope: string
          preferred_mode_refs: Json
          priority_weights: Json
          status: string
          support_count: number | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          override_limits?: Json
          preference_scope?: string
          preferred_mode_refs?: Json
          priority_weights?: Json
          status?: string
          support_count?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          override_limits?: Json
          preference_scope?: string
          preferred_mode_refs?: Json
          priority_weights?: Json
          status?: string
          support_count?: number | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_architecture_preference_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_architecture_preference_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_architecture_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          organization_id: string
          priority_score: number | null
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_entities: Json
          target_scope: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          organization_id: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          organization_id?: string
          priority_score?: number | null
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_entities?: Json
          target_scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_architecture_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_policy_outcomes: {
        Row: {
          applied_mode: string
          context_class: string
          created_at: string
          evidence_refs: Json | null
          execution_policy_profile_id: string
          id: string
          organization_id: string
          outcome_metrics: Json | null
          outcome_status: string
          pipeline_job_id: string | null
          tenant_preference_profile_id: string | null
          workspace_id: string | null
        }
        Insert: {
          applied_mode: string
          context_class: string
          created_at?: string
          evidence_refs?: Json | null
          execution_policy_profile_id: string
          id?: string
          organization_id: string
          outcome_metrics?: Json | null
          outcome_status: string
          pipeline_job_id?: string | null
          tenant_preference_profile_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          applied_mode?: string
          context_class?: string
          created_at?: string
          evidence_refs?: Json | null
          execution_policy_profile_id?: string
          id?: string
          organization_id?: string
          outcome_metrics?: Json | null
          outcome_status?: string
          pipeline_job_id?: string | null
          tenant_preference_profile_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_policy_outcomes_execution_policy_profile_id_fkey"
            columns: ["execution_policy_profile_id"]
            isOneToOne: false
            referencedRelation: "execution_policy_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_policy_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_policy_outcomes_tenant_preference_profile_id_fkey"
            columns: ["tenant_preference_profile_id"]
            isOneToOne: false
            referencedRelation: "tenant_policy_preference_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_policy_outcomes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_policy_preference_profiles: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string
          override_limits: Json
          preference_name: string
          preference_scope: string
          preferred_policy_modes: Json
          priority_weights: Json
          status: string
          support_count: number
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id: string
          override_limits?: Json
          preference_name: string
          preference_scope: string
          preferred_policy_modes?: Json
          priority_weights?: Json
          status?: string
          support_count?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          override_limits?: Json
          preference_name?: string
          preference_scope?: string
          preferred_policy_modes?: Json
          priority_weights?: Json
          status?: string
          support_count?: number
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_policy_preference_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_policy_preference_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_policy_recommendations: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          organization_id: string
          recommendation_reason: Json
          recommendation_type: string
          status: string
          target_profile_ids: Json
          workspace_id: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id: string
          recommendation_reason?: Json
          recommendation_type: string
          status?: string
          target_profile_ids?: Json
          workspace_id?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          organization_id?: string
          recommendation_reason?: Json
          recommendation_type?: string
          status?: string
          target_profile_ids?: Json
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_policy_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_policy_recommendations_workspace_id_fkey"
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
      user_journey_approval_states: {
        Row: {
          approval_description: string | null
          approval_label: string
          approval_status: string
          approval_type: string
          created_at: string
          evidence_links: Json
          id: string
          journey_instance_id: string
          organization_id: string
          required_actor_type: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          visible_stage: string
        }
        Insert: {
          approval_description?: string | null
          approval_label?: string
          approval_status?: string
          approval_type?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          journey_instance_id: string
          organization_id: string
          required_actor_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          visible_stage?: string
        }
        Update: {
          approval_description?: string | null
          approval_label?: string
          approval_status?: string
          approval_type?: string
          created_at?: string
          evidence_links?: Json
          id?: string
          journey_instance_id?: string
          organization_id?: string
          required_actor_type?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          visible_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_approval_states_journey_instance_id_fkey"
            columns: ["journey_instance_id"]
            isOneToOne: false
            referencedRelation: "user_journey_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_approval_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_artifact_views: {
        Row: {
          artifact_label: string
          artifact_ref: Json
          artifact_summary: string | null
          artifact_type: string
          created_at: string
          id: string
          journey_instance_id: string
          organization_id: string
          surfaced: boolean
          visibility_priority: number
          visible_stage: string
        }
        Insert: {
          artifact_label?: string
          artifact_ref?: Json
          artifact_summary?: string | null
          artifact_type?: string
          created_at?: string
          id?: string
          journey_instance_id: string
          organization_id: string
          surfaced?: boolean
          visibility_priority?: number
          visible_stage?: string
        }
        Update: {
          artifact_label?: string
          artifact_ref?: Json
          artifact_summary?: string | null
          artifact_type?: string
          created_at?: string
          id?: string
          journey_instance_id?: string
          organization_id?: string
          surfaced?: boolean
          visibility_priority?: number
          visible_stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_artifact_views_journey_instance_id_fkey"
            columns: ["journey_instance_id"]
            isOneToOne: false
            referencedRelation: "user_journey_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_artifact_views_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_instances: {
        Row: {
          approval_actor_type: string
          approval_required: boolean
          approval_state: string
          assumptions: Json
          clarity_score: number
          created_at: string
          current_internal_stage: string
          current_visible_stage: string
          deployment_visibility_score: number
          evidence_links: Json
          expected_outcomes: Json
          handoff_readiness_score: number
          id: string
          initiative_id: string | null
          journey_friction_score: number
          journey_model_id: string | null
          journey_progress_score: number
          next_action_label: string
          next_action_type: string
          orchestration_health_score: number
          organization_id: string
          realized_outcomes: Json
          recommendation_status: string
          updated_at: string
          visible_artifact_count: number
          workspace_id: string | null
        }
        Insert: {
          approval_actor_type?: string
          approval_required?: boolean
          approval_state?: string
          assumptions?: Json
          clarity_score?: number
          created_at?: string
          current_internal_stage?: string
          current_visible_stage?: string
          deployment_visibility_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          handoff_readiness_score?: number
          id?: string
          initiative_id?: string | null
          journey_friction_score?: number
          journey_model_id?: string | null
          journey_progress_score?: number
          next_action_label?: string
          next_action_type?: string
          orchestration_health_score?: number
          organization_id: string
          realized_outcomes?: Json
          recommendation_status?: string
          updated_at?: string
          visible_artifact_count?: number
          workspace_id?: string | null
        }
        Update: {
          approval_actor_type?: string
          approval_required?: boolean
          approval_state?: string
          assumptions?: Json
          clarity_score?: number
          created_at?: string
          current_internal_stage?: string
          current_visible_stage?: string
          deployment_visibility_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          handoff_readiness_score?: number
          id?: string
          initiative_id?: string | null
          journey_friction_score?: number
          journey_model_id?: string | null
          journey_progress_score?: number
          next_action_label?: string
          next_action_type?: string
          orchestration_health_score?: number
          organization_id?: string
          realized_outcomes?: Json
          recommendation_status?: string
          updated_at?: string
          visible_artifact_count?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_instances_initiative_id_fkey"
            columns: ["initiative_id"]
            isOneToOne: false
            referencedRelation: "initiatives"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_instances_journey_model_id_fkey"
            columns: ["journey_model_id"]
            isOneToOne: false
            referencedRelation: "user_journey_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_instances_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_models: {
        Row: {
          approval_gate_definitions: Json
          artifact_visibility_rules: Json
          assumptions: Json
          created_at: string
          evidence_links: Json
          id: string
          journey_model_name: string
          journey_model_version: string
          organization_id: string
          stage_definitions: Json
          status: string
          transition_rules: Json
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          approval_gate_definitions?: Json
          artifact_visibility_rules?: Json
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          journey_model_name?: string
          journey_model_version?: string
          organization_id: string
          stage_definitions?: Json
          status?: string
          transition_rules?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          approval_gate_definitions?: Json
          artifact_visibility_rules?: Json
          assumptions?: Json
          created_at?: string
          evidence_links?: Json
          id?: string
          journey_model_name?: string
          journey_model_version?: string
          organization_id?: string
          stage_definitions?: Json
          status?: string
          transition_rules?: Json
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_models_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_models_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_outcomes: {
        Row: {
          approval_clarity_score: number
          assumptions: Json
          blocked_transition_score: number
          created_at: string
          deployment_visibility_score: number
          evidence_links: Json
          expected_outcomes: Json
          handoff_readiness_score: number
          id: string
          internal_complexity_leakage_score: number
          journey_clarity_score: number
          journey_friction_score: number
          journey_instance_id: string
          journey_outcome_accuracy_score: number
          journey_progress_score: number
          next_step_confidence_score: number
          orchestration_health_score: number
          organization_id: string
          outcome_domain: string
          outcome_scope_id: string | null
          outcome_scope_type: string
          realized_outcomes: Json
          recommendation_status: string
          resume_readiness_score: number
          updated_at: string
          user_visible_coherence_score: number
          visible_artifact_coverage_score: number
        }
        Insert: {
          approval_clarity_score?: number
          assumptions?: Json
          blocked_transition_score?: number
          created_at?: string
          deployment_visibility_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          handoff_readiness_score?: number
          id?: string
          internal_complexity_leakage_score?: number
          journey_clarity_score?: number
          journey_friction_score?: number
          journey_instance_id: string
          journey_outcome_accuracy_score?: number
          journey_progress_score?: number
          next_step_confidence_score?: number
          orchestration_health_score?: number
          organization_id: string
          outcome_domain?: string
          outcome_scope_id?: string | null
          outcome_scope_type?: string
          realized_outcomes?: Json
          recommendation_status?: string
          resume_readiness_score?: number
          updated_at?: string
          user_visible_coherence_score?: number
          visible_artifact_coverage_score?: number
        }
        Update: {
          approval_clarity_score?: number
          assumptions?: Json
          blocked_transition_score?: number
          created_at?: string
          deployment_visibility_score?: number
          evidence_links?: Json
          expected_outcomes?: Json
          handoff_readiness_score?: number
          id?: string
          internal_complexity_leakage_score?: number
          journey_clarity_score?: number
          journey_friction_score?: number
          journey_instance_id?: string
          journey_outcome_accuracy_score?: number
          journey_progress_score?: number
          next_step_confidence_score?: number
          orchestration_health_score?: number
          organization_id?: string
          outcome_domain?: string
          outcome_scope_id?: string | null
          outcome_scope_type?: string
          realized_outcomes?: Json
          recommendation_status?: string
          resume_readiness_score?: number
          updated_at?: string
          user_visible_coherence_score?: number
          visible_artifact_coverage_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_outcomes_journey_instance_id_fkey"
            columns: ["journey_instance_id"]
            isOneToOne: false
            referencedRelation: "user_journey_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_outcomes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_journey_transitions: {
        Row: {
          approval_required: boolean
          approval_status: string
          block_reason: string | null
          blocked: boolean
          created_at: string
          evidence_links: Json
          from_internal_stage: string
          from_visible_stage: string
          id: string
          journey_instance_id: string
          organization_id: string
          to_internal_stage: string
          to_visible_stage: string
          transition_health_score: number
          trigger_label: string
          trigger_type: string
        }
        Insert: {
          approval_required?: boolean
          approval_status?: string
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          evidence_links?: Json
          from_internal_stage?: string
          from_visible_stage?: string
          id?: string
          journey_instance_id: string
          organization_id: string
          to_internal_stage?: string
          to_visible_stage?: string
          transition_health_score?: number
          trigger_label?: string
          trigger_type?: string
        }
        Update: {
          approval_required?: boolean
          approval_status?: string
          block_reason?: string | null
          blocked?: boolean
          created_at?: string
          evidence_links?: Json
          from_internal_stage?: string
          from_visible_stage?: string
          id?: string
          journey_instance_id?: string
          organization_id?: string
          to_internal_stage?: string
          to_visible_stage?: string
          transition_health_score?: number
          trigger_label?: string
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_journey_transitions_journey_instance_id_fkey"
            columns: ["journey_instance_id"]
            isOneToOne: false
            referencedRelation: "user_journey_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_journey_transitions_organization_id_fkey"
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
      vertical_starters: {
        Row: {
          assumption_visibility_score: number
          category: string
          created_at: string
          default_stack: Json
          description: string
          evidence_links: Json
          icon: string
          id: string
          included_templates: Json
          organization_id: string
          starter_type: string
          status: string
          updated_at: string
          vertical_fit_score: number
          vertical_name: string
          workspace_id: string | null
        }
        Insert: {
          assumption_visibility_score?: number
          category?: string
          created_at?: string
          default_stack?: Json
          description?: string
          evidence_links?: Json
          icon?: string
          id?: string
          included_templates?: Json
          organization_id: string
          starter_type?: string
          status?: string
          updated_at?: string
          vertical_fit_score?: number
          vertical_name?: string
          workspace_id?: string | null
        }
        Update: {
          assumption_visibility_score?: number
          category?: string
          created_at?: string
          default_stack?: Json
          description?: string
          evidence_links?: Json
          icon?: string
          id?: string
          included_templates?: Json
          organization_id?: string
          starter_type?: string
          status?: string
          updated_at?: string
          vertical_fit_score?: number
          vertical_name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vertical_starters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vertical_starters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
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
