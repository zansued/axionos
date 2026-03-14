/**
 * Lazy-loaded page imports — route-level code splitting.
 * Pages are grouped by domain for readability.
 * Dashboard and Auth are eagerly loaded (critical path).
 */
import { lazy } from "react";

// ─── Eager (critical path) ─────────────────────────────────────────────────
export { default as Dashboard } from "@/pages/Dashboard";
export { default as Auth } from "@/pages/Auth";
export { default as NotFound } from "@/pages/NotFound";

// ─── Builder: Core ─────────────────────────────────────────────────────────
export const Initiatives = lazy(() => import("@/pages/Initiatives"));
export const Stories = lazy(() => import("@/pages/Stories"));
export const Kanban = lazy(() => import("@/pages/Kanban"));
export const CodeExplorer = lazy(() => import("@/pages/CodeExplorer"));
export const Artifacts = lazy(() => import("@/pages/Artifacts"));
export const Projects = lazy(() => import("@/pages/Projects"));
export const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
export const Agents = lazy(() => import("@/pages/Agents"));
export const Squads = lazy(() => import("@/pages/Squads"));
export const Journey = lazy(() => import("@/pages/Journey"));
export const Onboarding = lazy(() => import("@/pages/Onboarding"));
export const Workspace = lazy(() => import("@/pages/Workspace"));

// ─── Builder: Pipelines & Runtime ──────────────────────────────────────────
export const Delivery = lazy(() => import("@/pages/Delivery"));
export const Pipelines = lazy(() => import("@/pages/Pipelines"));
export const Runtime = lazy(() => import("@/pages/Runtime"));

// ─── Builder: Settings ─────────────────────────────────────────────────────
export const OrgSettings = lazy(() => import("@/pages/OrgSettings"));
export const Billing = lazy(() => import("@/pages/Billing"));
export const Connections = lazy(() => import("@/pages/Connections"));
export const SettingsPage = lazy(() => import("@/pages/Settings"));

// ─── Builder: Observability ────────────────────────────────────────────────
export const SystemHealthDashboard = lazy(() => import("@/pages/SystemHealthDashboard"));

// ─── Builder: Governance (redirected to owner) ─────────────────────────────
export const ApprovalQueue = lazy(() => import("@/pages/ApprovalQueue"));
export const ActionCenter = lazy(() => import("@/pages/ActionCenter"));
export const Governance = lazy(() => import("@/pages/Governance"));

// ─── Owner: System Intelligence ────────────────────────────────────────────
export const SystemIntelligence = lazy(() => import("@/pages/SystemIntelligence"));
export const Observability = lazy(() => import("@/pages/Observability"));
export const AdoptionIntelligence = lazy(() => import("@/pages/AdoptionIntelligence"));
export const DeliveryOutcomes = lazy(() => import("@/pages/DeliveryOutcomes"));
export const CognitiveArchitectureMap = lazy(() => import("@/pages/CognitiveArchitectureMap"));

// ─── Owner: Knowledge Command ──────────────────────────────────────────────
export const PatternLibraryDashboard = lazy(() => import("@/pages/PatternLibraryDashboard"));
export const CanonIntelligenceDashboard = lazy(() => import("@/pages/CanonIntelligenceDashboard"));
export const KnowledgeHealthDashboard = lazy(() => import("@/pages/KnowledgeHealthDashboard"));
export const KnowledgePortfolioDashboard = lazy(() => import("@/pages/KnowledgePortfolioDashboard"));
export const KnowledgeDemandForecastDashboard = lazy(() => import("@/pages/KnowledgeDemandForecastDashboard"));
export const KnowledgeAcquisitionDashboard = lazy(() => import("@/pages/KnowledgeAcquisitionDashboard"));
export const KnowledgeAcquisitionExecutionDashboard = lazy(() => import("@/pages/KnowledgeAcquisitionExecutionDashboard"));
export const KnowledgeAcquisitionRoiDashboard = lazy(() => import("@/pages/KnowledgeAcquisitionRoiDashboard"));

// ─── Owner: Security Command ───────────────────────────────────────────────
export const SecurityWarRoom = lazy(() => import("@/pages/SecurityWarRoom"));
export const SecurityIntelligenceDashboard = lazy(() => import("@/pages/SecurityIntelligenceDashboard"));
export const RedTeamSimulationDashboard = lazy(() => import("@/pages/RedTeamSimulationDashboard"));
export const BlueTeamDefenseDashboard = lazy(() => import("@/pages/BlueTeamDefenseDashboard"));
export const PurpleLearningDashboard = lazy(() => import("@/pages/PurpleLearningDashboard"));
export const CanonPoisoningPreventionDashboard = lazy(() => import("@/pages/CanonPoisoningPreventionDashboard"));
export const SecurityMonitoringDashboard = lazy(() => import("@/pages/SecurityMonitoringDashboard"));

// ─── Owner: Delivery & Operations ──────────────────────────────────────────
export const CapabilityRegistry = lazy(() => import("@/pages/CapabilityRegistry"));
export const CapabilityGovernance = lazy(() => import("@/pages/CapabilityGovernance"));
export const PostDeployFeedback = lazy(() => import("@/pages/PostDeployFeedback"));
export const DeliveryTuning = lazy(() => import("@/pages/DeliveryTuning"));
export const OutcomeAssurance = lazy(() => import("@/pages/OutcomeAssurance"));
export const ImprovementLedger = lazy(() => import("@/pages/ImprovementLedger"));
export const ImprovementCandidates = lazy(() => import("@/pages/ImprovementCandidates"));
export const ImprovementBenchmarks = lazy(() => import("@/pages/ImprovementBenchmarks"));
export const Extensions = lazy(() => import("@/pages/Extensions"));
export const AuditLogs = lazy(() => import("@/pages/AuditLogs"));

// ─── Owner: Agent Architecture ─────────────────────────────────────────────
export const AgentRouting = lazy(() => import("@/pages/AgentRouting"));
export const AgentDebates = lazy(() => import("@/pages/AgentDebates"));
export const WorkingMemory = lazy(() => import("@/pages/WorkingMemory"));
export const SwarmExecution = lazy(() => import("@/pages/SwarmExecution"));
export const MetaAgents = lazy(() => import("@/pages/MetaAgents"));
export const MetaArtifacts = lazy(() => import("@/pages/MetaArtifacts"));
export const Calibration = lazy(() => import("@/pages/Calibration"));
export const PromptOptimization = lazy(() => import("@/pages/PromptOptimization"));
export const PilotMarketplace = lazy(() => import("@/pages/PilotMarketplace"));
export const MarketplaceOutcomes = lazy(() => import("@/pages/MarketplaceOutcomes"));

// ─── Owner: Governance & Institutional ─────────────────────────────────────
export const GovernanceInsights = lazy(() => import("@/pages/GovernanceInsights"));
export const GovernanceDecisions = lazy(() => import("@/pages/GovernanceDecisions"));
export const GovernanceExecutionHandoff = lazy(() => import("@/pages/GovernanceExecutionHandoff"));
export const GovernanceChangeApplicationTracking = lazy(() => import("@/pages/GovernanceChangeApplicationTracking"));
export const IntelligenceMemory = lazy(() => import("@/pages/IntelligenceMemory"));
export const Playbooks = lazy(() => import("@/pages/Playbooks"));
export const BoundedOperations = lazy(() => import("@/pages/BoundedOperations"));
export const DecisionEngine = lazy(() => import("@/pages/DecisionEngine"));
export const DoctrineAdaptation = lazy(() => import("@/pages/DoctrineAdaptation"));
export const InstitutionalConflicts = lazy(() => import("@/pages/InstitutionalConflicts"));
export const FederatedBoundaries = lazy(() => import("@/pages/FederatedBoundaries"));
export const ResilienceContinuity = lazy(() => import("@/pages/ResilienceContinuity"));
export const InstitutionalMemoryConstitution = lazy(() => import("@/pages/InstitutionalMemoryConstitution"));
export const SovereignDecisionRights = lazy(() => import("@/pages/SovereignDecisionRights"));
export const DependencySovereignty = lazy(() => import("@/pages/DependencySovereignty"));
export const StrategicSuccession = lazy(() => import("@/pages/StrategicSuccession"));
export const MultiHorizonAlignment = lazy(() => import("@/pages/MultiHorizonAlignment"));
export const TradeoffArbitration = lazy(() => import("@/pages/TradeoffArbitration"));
export const MissionIntegrity = lazy(() => import("@/pages/MissionIntegrity"));
export const ContinuitySimulation = lazy(() => import("@/pages/ContinuitySimulation"));
export const EvolutionProposalGovernance = lazy(() => import("@/pages/EvolutionProposalGovernance"));
export const ArchitecturalMutationControl = lazy(() => import("@/pages/ArchitecturalMutationControl"));
export const ReflectiveValidationAudit = lazy(() => import("@/pages/ReflectiveValidationAudit"));
export const KernelIntegrityGuard = lazy(() => import("@/pages/KernelIntegrityGuard"));
export const CanonGovernanceDashboard = lazy(() => import("@/pages/CanonGovernanceDashboard"));
export const AutonomyPostureDashboard = lazy(() => import("@/pages/AutonomyPostureDashboard"));
export const AIRoutingPolicy = lazy(() => import("@/pages/AIRoutingPolicy"));

// ─── Owner: Canon & Learning ───────────────────────────────────────────────
export const FailureMemoryDashboard = lazy(() => import("@/pages/FailureMemoryDashboard"));
export const ExternalKnowledgeDashboard = lazy(() => import("@/pages/ExternalKnowledgeDashboard"));
export const RuntimeFeedbackDashboard = lazy(() => import("@/pages/RuntimeFeedbackDashboard"));
export const TenantDoctrineDashboard = lazy(() => import("@/pages/TenantDoctrineDashboard"));
export const CompoundingAdvantageDashboard = lazy(() => import("@/pages/CompoundingAdvantageDashboard"));
export const RuntimeValidationHarness = lazy(() => import("@/pages/RuntimeValidationHarness"));
export const LearningSignalsDashboard = lazy(() => import("@/pages/LearningSignalsDashboard"));
export const CanonEvolutionDashboard = lazy(() => import("@/pages/CanonEvolutionDashboard"));
export const PatternDistillationDashboard = lazy(() => import("@/pages/PatternDistillationDashboard"));
export const CanonReuseImpactDashboard = lazy(() => import("@/pages/CanonReuseImpactDashboard"));

// ─── Owner: Operational ────────────────────────────────────────────────────
export const OperationalPostureDashboard = lazy(() => import("@/pages/OperationalPostureDashboard"));
export const AttentionAllocationDashboard = lazy(() => import("@/pages/AttentionAllocationDashboard"));
export const AdaptiveRoutingDashboard = lazy(() => import("@/pages/AdaptiveRoutingDashboard"));
export const OperationalCyclesDashboard = lazy(() => import("@/pages/OperationalCyclesDashboard"));
export const OperationalLoopsDashboard = lazy(() => import("@/pages/OperationalLoopsDashboard"));
export const OrganismMemoryDashboard = lazy(() => import("@/pages/OrganismMemoryDashboard"));
export const OrganismConsoleDashboard = lazy(() => import("@/pages/OrganismConsoleDashboard"));
export const CanonIntelligenceControlCenter = lazy(() => import("@/pages/CanonIntelligenceControlCenter"));

// ─── Owner: Distributed Runtime ────────────────────────────────────────────
export const DistributedJobs = lazy(() => import("@/pages/DistributedJobs"));
export const CrossRegionRecovery = lazy(() => import("@/pages/CrossRegionRecovery"));
export const TenantRuntime = lazy(() => import("@/pages/TenantRuntime"));
export const LargeScaleOrchestration = lazy(() => import("@/pages/LargeScaleOrchestration"));

// ─── Owner: Research ───────────────────────────────────────────────────────
export const ArchitectureHypotheses = lazy(() => import("@/pages/ArchitectureHypotheses"));
export const ResearchSandbox = lazy(() => import("@/pages/ResearchSandbox"));
export const ResearchPatterns = lazy(() => import("@/pages/ResearchPatterns"));
export const ArchitecturePromotion = lazy(() => import("@/pages/ArchitecturePromotion"));

// ─── Builder: Modes ────────────────────────────────────────────────────────
export const Modes = lazy(() => import("@/pages/Modes"));

// ─── Blueprint placeholder pages (lazy) ────────────────────────────────────
const blueprintModule = () => import("@/pages/blueprint");
export const RuntimeStatusPage = lazy(() => blueprintModule().then(m => ({ default: m.RuntimeStatusPage })));
export const AgentDetailPage = lazy(() => blueprintModule().then(m => ({ default: m.AgentDetailPage })));
export const AgentPerformancePage = lazy(() => blueprintModule().then(m => ({ default: m.AgentPerformancePage })));
export const AgentMemoryPage = lazy(() => blueprintModule().then(m => ({ default: m.AgentMemoryPage })));
export const AgentPoliciesPage = lazy(() => blueprintModule().then(m => ({ default: m.AgentPoliciesPage })));
export const PipelineDetailPage = lazy(() => blueprintModule().then(m => ({ default: m.PipelineDetailPage })));
export const ExecutionHistoryPage = lazy(() => blueprintModule().then(m => ({ default: m.ExecutionHistoryPage })));
export const RepairLoopPage = lazy(() => blueprintModule().then(m => ({ default: m.RepairLoopPage })));
export const PreflightValidationPage = lazy(() => blueprintModule().then(m => ({ default: m.PreflightValidationPage })));
export const PublishQueuePage = lazy(() => blueprintModule().then(m => ({ default: m.PublishQueuePage })));
export const ErrorsAlertsPage = lazy(() => blueprintModule().then(m => ({ default: m.ErrorsAlertsPage })));
export const ValidationAnalyticsPage = lazy(() => blueprintModule().then(m => ({ default: m.ValidationAnalyticsPage })));
export const ThroughputMetricsPage = lazy(() => blueprintModule().then(m => ({ default: m.ThroughputMetricsPage })));
export const LogsExplorerPage = lazy(() => blueprintModule().then(m => ({ default: m.LogsExplorerPage })));
export const GovernanceOverviewPage = lazy(() => blueprintModule().then(m => ({ default: m.GovernanceOverviewPage })));
export const PendingApprovalsPage = lazy(() => blueprintModule().then(m => ({ default: m.PendingApprovalsPage })));
export const PolicyControlsPage = lazy(() => blueprintModule().then(m => ({ default: m.PolicyControlsPage })));
export const ModesOverviewPage = lazy(() => blueprintModule().then(m => ({ default: m.ModesOverviewPage })));
export const SurfaceModesPage = lazy(() => blueprintModule().then(m => ({ default: m.SurfaceModesPage })));
export const StrategyModesPage = lazy(() => blueprintModule().then(m => ({ default: m.StrategyModesPage })));
export const RuntimeModesPage = lazy(() => blueprintModule().then(m => ({ default: m.RuntimeModesPage })));
export const UserSettingsPage = lazy(() => blueprintModule().then(m => ({ default: m.UserSettingsPage })));
export const RolesAccessPage = lazy(() => blueprintModule().then(m => ({ default: m.RolesAccessPage })));
export const EnvironmentControlsPage = lazy(() => blueprintModule().then(m => ({ default: m.EnvironmentControlsPage })));
export const ApiIntegrationsPage = lazy(() => blueprintModule().then(m => ({ default: m.ApiIntegrationsPage })));
