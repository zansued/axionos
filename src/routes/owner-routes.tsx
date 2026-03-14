import { Route } from "react-router-dom";
import { W, P } from "./guards";
import {
  SystemIntelligence, SystemHealthDashboard, AdoptionIntelligence, DeliveryOutcomes,
  Observability, CognitiveArchitectureMap,
  PatternLibraryDashboard, CanonIntelligenceDashboard, KnowledgeHealthDashboard,
  KnowledgePortfolioDashboard, KnowledgeDemandForecastDashboard, KnowledgeAcquisitionDashboard,
  KnowledgeAcquisitionExecutionDashboard, KnowledgeAcquisitionRoiDashboard,
  SecurityWarRoom, SecurityIntelligenceDashboard, RedTeamSimulationDashboard,
  BlueTeamDefenseDashboard, PurpleLearningDashboard, CanonPoisoningPreventionDashboard,
  SecurityMonitoringDashboard, CapabilityRegistry,
  Governance, GovernanceOverviewPage, ApprovalQueue, PolicyControlsPage, ActionCenter,
  AutonomyPostureDashboard, SwarmExecution, Calibration, OrgSettings,
  IntelligenceMemory, Playbooks, BoundedOperations, DecisionEngine, DoctrineAdaptation,
  InstitutionalConflicts, FederatedBoundaries, ResilienceContinuity,
  InstitutionalMemoryConstitution, SovereignDecisionRights, DependencySovereignty,
  StrategicSuccession, MultiHorizonAlignment, TradeoffArbitration, MissionIntegrity,
  ContinuitySimulation, ImprovementLedger, ImprovementCandidates, ImprovementBenchmarks,
  CapabilityGovernance, PostDeployFeedback, Extensions, AuditLogs, Billing,
  AgentRouting, AgentDebates, WorkingMemory, PilotMarketplace, MarketplaceOutcomes,
  MetaAgents, MetaArtifacts, PromptOptimization,
  DistributedJobs, CrossRegionRecovery, TenantRuntime, LargeScaleOrchestration,
  DeliveryTuning, OutcomeAssurance,
  ArchitectureHypotheses, ResearchSandbox, ResearchPatterns, ArchitecturePromotion,
  AIRoutingPolicy, EvolutionProposalGovernance, ArchitecturalMutationControl,
  ReflectiveValidationAudit, KernelIntegrityGuard, CanonGovernanceDashboard,
  FailureMemoryDashboard, ExternalKnowledgeDashboard, RuntimeFeedbackDashboard,
  TenantDoctrineDashboard, CompoundingAdvantageDashboard, RuntimeValidationHarness,
  LearningSignalsDashboard, CanonEvolutionDashboard, PatternDistillationDashboard,
  CanonReuseImpactDashboard, OperationalPostureDashboard, AttentionAllocationDashboard,
  AdaptiveRoutingDashboard, OperationalCyclesDashboard, OperationalLoopsDashboard,
  OrganismMemoryDashboard, OrganismConsoleDashboard,
  GovernanceInsights, GovernanceDecisions, GovernanceExecutionHandoff,
  GovernanceChangeApplicationTracking,
  CanonIntelligenceControlCenter,
} from "./lazy-pages";

export function OwnerRoutes() {
  return (
    <>
      {/* System Intelligence */}
      <Route path="/owner/system-intelligence" element={<P><SystemIntelligence /></P>} />
      <Route path="/owner/system-health" element={<P><SystemHealthDashboard /></P>} />
      <Route path="/owner/adoption" element={<W><AdoptionIntelligence /></W>} />
      <Route path="/owner/delivery-outcomes" element={<W><DeliveryOutcomes /></W>} />
      <Route path="/owner/platform-observability" element={<P><Observability /></P>} />
      <Route path="/owner/cognitive-architecture-map" element={<P><CognitiveArchitectureMap /></P>} />

      {/* Knowledge Command */}
      <Route path="/owner/pattern-library" element={<P><PatternLibraryDashboard /></P>} />
      <Route path="/owner/canon-intelligence" element={<P><CanonIntelligenceDashboard /></P>} />
      <Route path="/owner/knowledge-health" element={<P><KnowledgeHealthDashboard /></P>} />
      <Route path="/owner/knowledge-portfolio" element={<P><KnowledgePortfolioDashboard /></P>} />
      <Route path="/owner/knowledge-demand" element={<P><KnowledgeDemandForecastDashboard /></P>} />
      <Route path="/owner/knowledge-acquisition" element={<P><KnowledgeAcquisitionDashboard /></P>} />
      <Route path="/owner/knowledge-acquisition-execution" element={<P><KnowledgeAcquisitionExecutionDashboard /></P>} />
      <Route path="/owner/knowledge-acquisition-roi" element={<P><KnowledgeAcquisitionRoiDashboard /></P>} />

      {/* Security Command */}
      <Route path="/owner/security-war-room" element={<P><SecurityWarRoom /></P>} />
      <Route path="/owner/security-intelligence" element={<P><SecurityIntelligenceDashboard /></P>} />
      <Route path="/owner/red-team-simulation" element={<P><RedTeamSimulationDashboard /></P>} />
      <Route path="/owner/blue-team-defense" element={<P><BlueTeamDefenseDashboard /></P>} />
      <Route path="/owner/purple-learning" element={<P><PurpleLearningDashboard /></P>} />
      <Route path="/owner/canon-poisoning-prevention" element={<P><CanonPoisoningPreventionDashboard /></P>} />
      <Route path="/owner/security-monitoring" element={<P><SecurityMonitoringDashboard /></P>} />
      <Route path="/owner/capabilities" element={<W><CapabilityRegistry /></W>} />

      {/* Delivery & Governance */}
      <Route path="/owner/delivery-governance" element={<W><Governance /></W>} />
      <Route path="/owner/governance-overview" element={<W><GovernanceOverviewPage /></W>} />
      <Route path="/owner/pending-approvals" element={<W><ApprovalQueue /></W>} />
      <Route path="/owner/policy-controls" element={<W><PolicyControlsPage /></W>} />
      <Route path="/owner/action-center" element={<W><ActionCenter /></W>} />
      <Route path="/owner/autonomy-posture" element={<P><AutonomyPostureDashboard /></P>} />
      <Route path="/owner/agent-swarm" element={<P><SwarmExecution /></P>} />
      <Route path="/owner/calibration" element={<P><Calibration /></P>} />
      <Route path="/owner/settings" element={<W><OrgSettings /></W>} />

      {/* Institutional */}
      <Route path="/owner/intelligence-memory" element={<W><IntelligenceMemory /></W>} />
      <Route path="/owner/playbooks" element={<W><Playbooks /></W>} />
      <Route path="/owner/bounded-operations" element={<W><BoundedOperations /></W>} />
      <Route path="/owner/decision-engine" element={<W><DecisionEngine /></W>} />
      <Route path="/owner/doctrine-adaptation" element={<W><DoctrineAdaptation /></W>} />
      <Route path="/owner/institutional-conflicts" element={<W><InstitutionalConflicts /></W>} />
      <Route path="/owner/federated-boundaries" element={<W><FederatedBoundaries /></W>} />
      <Route path="/owner/resilience-continuity" element={<W><ResilienceContinuity /></W>} />
      <Route path="/owner/memory-constitution" element={<W><InstitutionalMemoryConstitution /></W>} />
      <Route path="/owner/decision-rights" element={<W><SovereignDecisionRights /></W>} />
      <Route path="/owner/dependency-sovereignty" element={<W><DependencySovereignty /></W>} />
      <Route path="/owner/strategic-succession" element={<W><StrategicSuccession /></W>} />
      <Route path="/owner/multi-horizon-alignment" element={<W><MultiHorizonAlignment /></W>} />
      <Route path="/owner/tradeoff-arbitration" element={<W><TradeoffArbitration /></W>} />
      <Route path="/owner/mission-integrity" element={<W><MissionIntegrity /></W>} />
      <Route path="/owner/continuity-simulation" element={<W><ContinuitySimulation /></W>} />
      <Route path="/owner/improvement-ledger" element={<W><ImprovementLedger /></W>} />
      <Route path="/owner/improvement-candidates" element={<W><ImprovementCandidates /></W>} />
      <Route path="/owner/improvement-benchmarks" element={<W><ImprovementBenchmarks /></W>} />
      <Route path="/owner/capability-governance" element={<W><CapabilityGovernance /></W>} />
      <Route path="/owner/post-deploy-feedback" element={<W><PostDeployFeedback /></W>} />
      <Route path="/owner/extensions" element={<W><Extensions /></W>} />
      <Route path="/owner/audit" element={<W><AuditLogs /></W>} />
      {/* Connections moved to /builder/connections */}
      <Route path="/owner/billing" element={<W><Billing /></W>} />

      {/* Agent Architecture */}
      <Route path="/owner/agent-routing" element={<P><AgentRouting /></P>} />
      <Route path="/owner/agent-debates" element={<P><AgentDebates /></P>} />
      <Route path="/owner/working-memory" element={<P><WorkingMemory /></P>} />
      <Route path="/owner/pilot-marketplace" element={<P><PilotMarketplace /></P>} />
      <Route path="/owner/marketplace-outcomes" element={<P><MarketplaceOutcomes /></P>} />
      <Route path="/owner/meta-agents" element={<P><MetaAgents /></P>} />
      <Route path="/owner/meta-artifacts" element={<P><MetaArtifacts /></P>} />
      <Route path="/owner/prompt-optimization" element={<P><PromptOptimization /></P>} />

      {/* Distributed Runtime */}
      <Route path="/owner/distributed-jobs" element={<P><DistributedJobs /></P>} />
      <Route path="/owner/cross-region-recovery" element={<P><CrossRegionRecovery /></P>} />
      <Route path="/owner/tenant-runtime" element={<P><TenantRuntime /></P>} />
      <Route path="/owner/large-scale-orchestration" element={<P><LargeScaleOrchestration /></P>} />
      <Route path="/owner/delivery-tuning" element={<P><DeliveryTuning /></P>} />
      <Route path="/owner/outcome-assurance" element={<P><OutcomeAssurance /></P>} />

      {/* Research */}
      <Route path="/owner/architecture-hypotheses" element={<P><ArchitectureHypotheses /></P>} />
      <Route path="/owner/research-sandbox" element={<P><ResearchSandbox /></P>} />
      <Route path="/owner/research-patterns" element={<P><ResearchPatterns /></P>} />
      <Route path="/owner/architecture-promotion" element={<P><ArchitecturePromotion /></P>} />
      <Route path="/owner/ai-routing-policy" element={<P><AIRoutingPolicy /></P>} />

      {/* Evolution & Mutation */}
      <Route path="/owner/evolution-governance" element={<P><EvolutionProposalGovernance /></P>} />
      <Route path="/owner/mutation-control" element={<P><ArchitecturalMutationControl /></P>} />
      <Route path="/owner/reflective-validation" element={<P><ReflectiveValidationAudit /></P>} />
      <Route path="/owner/kernel-integrity" element={<P><KernelIntegrityGuard /></P>} />
      <Route path="/owner/canon-governance" element={<P><CanonGovernanceDashboard /></P>} />

      {/* Canon & Learning */}
      <Route path="/owner/failure-memory" element={<P><FailureMemoryDashboard /></P>} />
      <Route path="/owner/external-knowledge" element={<P><ExternalKnowledgeDashboard /></P>} />
      <Route path="/owner/runtime-feedback" element={<P><RuntimeFeedbackDashboard /></P>} />
      <Route path="/owner/tenant-doctrine" element={<P><TenantDoctrineDashboard /></P>} />
      <Route path="/owner/compounding-advantage" element={<P><CompoundingAdvantageDashboard /></P>} />
      <Route path="/owner/runtime-harness" element={<P><RuntimeValidationHarness /></P>} />
      <Route path="/owner/learning-signals" element={<P><LearningSignalsDashboard /></P>} />
      <Route path="/owner/canon-evolution" element={<P><CanonEvolutionDashboard /></P>} />
      <Route path="/owner/pattern-distillation" element={<P><PatternDistillationDashboard /></P>} />
      <Route path="/owner/canon-reuse" element={<P><CanonReuseImpactDashboard /></P>} />

      {/* Operational */}
      <Route path="/owner/operational-posture" element={<P><OperationalPostureDashboard /></P>} />
      <Route path="/owner/attention-allocation" element={<P><AttentionAllocationDashboard /></P>} />
      <Route path="/owner/adaptive-routing" element={<P><AdaptiveRoutingDashboard /></P>} />
      <Route path="/owner/operational-cycles" element={<P><OperationalCyclesDashboard /></P>} />
      <Route path="/owner/operational-loops" element={<P><OperationalLoopsDashboard /></P>} />
      <Route path="/owner/organism-memory" element={<P><OrganismMemoryDashboard /></P>} />
      <Route path="/owner/organism-console" element={<P><OrganismConsoleDashboard /></P>} />

      {/* Governance Insights */}
      <Route path="/owner/governance-insights" element={<P><GovernanceInsights /></P>} />
      <Route path="/owner/governance-decisions" element={<P><GovernanceDecisions /></P>} />
      <Route path="/owner/governance-handoff" element={<P><GovernanceExecutionHandoff /></P>} />
      <Route path="/owner/governance-application-tracking" element={<P><GovernanceChangeApplicationTracking /></P>} />
    </>
  );
}
