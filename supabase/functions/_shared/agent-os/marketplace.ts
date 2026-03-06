/**
 * Agent Marketplace & Global Capability Registry — v1.0
 *
 * Enables a shared ecosystem where agents and capabilities can be
 * published, discovered, installed and versioned across environments.
 *
 * Design principles:
 *  - Infrastructure-agnostic: no network or storage dependency in contracts
 *  - Version-first: every package is immutable once published
 *  - Trust-driven: reputation signals feed into Selection Engine ranking
 *  - Offline-capable: local index + periodic sync
 */

// ─── Versioning ──────────────────────────────────────────────

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  label: string; // e.g. "1.2.3-beta.1"
}

// ─── Capability Descriptor ───────────────────────────────────

export interface CapabilityDescriptor {
  capability_id: string;
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  supported_tools: string[];
  validation_profile: string | null;
  tags: string[];
}

export interface CapabilityVersion {
  version: SemanticVersion;
  published_at: string;
  changelog: string;
  checksum: string;
  deprecated: boolean;
  min_runtime_version?: string;
}

export interface CapabilityRegistryEntry {
  descriptor: CapabilityDescriptor;
  versions: CapabilityVersion[];
  latest_version: SemanticVersion;
  publisher: PublisherIdentity;
  trust_score: TrustScore;
  download_count: number;
  created_at: string;
  updated_at: string;
}

// ─── Agent Package ───────────────────────────────────────────

export interface AgentPackageManifest {
  agent_id: string;
  agent_name: string;
  description: string;
  supported_capabilities: string[];
  required_tools: string[];
  supported_models: string[];
  dependencies: PackageDependency[];
  entry_point: string;
  tags: string[];
}

export interface AgentVersion {
  version: SemanticVersion;
  published_at: string;
  changelog: string;
  checksum: string;
  deprecated: boolean;
  min_runtime_version?: string;
}

export interface AgentRegistryEntry {
  manifest: AgentPackageManifest;
  versions: AgentVersion[];
  latest_version: SemanticVersion;
  publisher: PublisherIdentity;
  trust_score: TrustScore;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export interface PackageDependency {
  package_id: string;
  package_type: "agent" | "capability";
  version_constraint: string; // semver range e.g. "^1.2.0"
  optional: boolean;
}

// ─── Capability Package ──────────────────────────────────────

export interface CapabilityPackage {
  descriptor: CapabilityDescriptor;
  version: CapabilityVersion;
  dependencies: PackageDependency[];
  publisher: PublisherIdentity;
}

export interface AgentPackage {
  manifest: AgentPackageManifest;
  version: AgentVersion;
  publisher: PublisherIdentity;
}

// ─── Publisher & Trust ───────────────────────────────────────

export interface PublisherIdentity {
  publisher_id: string;
  name: string;
  verified: boolean;
  organization_id?: string;
  registry_url?: string;
}

export interface TrustScore {
  overall: number; // 0-1
  dimensions: TrustDimensions;
  computed_at: string;
  sample_size: number;
}

export interface TrustDimensions {
  execution_success_rate: number;
  validation_pass_rate: number;
  stability: number;
  publisher_reputation: number;
  community_rating: number;
}

export type TrustLevel = "untrusted" | "low" | "medium" | "high" | "verified";

// ─── Marketplace Query ───────────────────────────────────────

export interface MarketplaceQuery {
  search_text?: string;
  tags?: string[];
  package_type?: "agent" | "capability" | "all";
  min_trust_score?: number;
  trust_level?: TrustLevel;
  publisher_id?: string;
  capability_ids?: string[];
  sort_by?: MarketplaceSortKey;
  sort_order?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

export type MarketplaceSortKey =
  | "relevance"
  | "trust_score"
  | "download_count"
  | "updated_at"
  | "name";

export interface MarketplaceResult {
  agents: AgentRegistryEntry[];
  capabilities: CapabilityRegistryEntry[];
  total_count: number;
  has_more: boolean;
  query_time_ms: number;
}

// ─── Package Installation ────────────────────────────────────

export interface PackageInstallRequest {
  package_id: string;
  package_type: "agent" | "capability";
  version_constraint?: string;
  force?: boolean;
  skip_dependency_check?: boolean;
}

export interface PackageInstallResult {
  success: boolean;
  package_id: string;
  installed_version: SemanticVersion;
  dependencies_installed: InstalledDependency[];
  warnings: string[];
  errors: string[];
}

export interface InstalledDependency {
  package_id: string;
  package_type: "agent" | "capability";
  version: SemanticVersion;
  already_installed: boolean;
}

export interface PackageUninstallRequest {
  package_id: string;
  package_type: "agent" | "capability";
  remove_unused_dependencies?: boolean;
}

export interface PackageUpdateRequest {
  package_id: string;
  package_type: "agent" | "capability";
  target_version?: string;
}

export interface InstalledPackageInfo {
  package_id: string;
  package_type: "agent" | "capability";
  installed_version: SemanticVersion;
  installed_at: string;
  updated_at: string;
  auto_update: boolean;
}

// ─── Dependency Resolution ───────────────────────────────────

export interface DependencyResolutionResult {
  resolved: boolean;
  install_order: PackageDependency[];
  conflicts: DependencyConflict[];
  warnings: string[];
}

export interface DependencyConflict {
  package_id: string;
  required_by: string[];
  conflicting_constraints: string[];
  suggested_resolution?: string;
}

// ─── Registry Sync ───────────────────────────────────────────

export interface RegistryEndpoint {
  registry_id: string;
  url: string;
  name: string;
  priority: number;
  auth_method: "none" | "api_key" | "oauth" | "token";
  enabled: boolean;
}

export interface RegistrySyncResult {
  registry_id: string;
  synced_at: string;
  new_capabilities: number;
  updated_capabilities: number;
  new_agents: number;
  updated_agents: number;
  errors: string[];
  duration_ms: number;
}

export interface RegistrySyncConfig {
  sync_interval_minutes: number;
  max_retries: number;
  timeout_ms: number;
  auto_sync: boolean;
}

// ─── Capability & Agent Index ────────────────────────────────

export interface ICapabilityIndex {
  search(query: MarketplaceQuery): Promise<CapabilityRegistryEntry[]>;
  get(capability_id: string): CapabilityRegistryEntry | undefined;
  getVersion(capability_id: string, version: string): CapabilityVersion | undefined;
  list(): CapabilityRegistryEntry[];
  count(): number;
  refresh(): Promise<void>;
}

export interface IAgentIndex {
  search(query: MarketplaceQuery): Promise<AgentRegistryEntry[]>;
  get(agent_id: string): AgentRegistryEntry | undefined;
  getVersion(agent_id: string, version: string): AgentVersion | undefined;
  list(): AgentRegistryEntry[];
  count(): number;
  refresh(): Promise<void>;
}

// ─── Core Interfaces ─────────────────────────────────────────

export interface ICapabilityRegistryClient {
  fetchCapabilities(query: MarketplaceQuery): Promise<CapabilityRegistryEntry[]>;
  fetchCapability(capability_id: string): Promise<CapabilityRegistryEntry | undefined>;
  publishCapability(pkg: CapabilityPackage): Promise<void>;
  deprecateVersion(capability_id: string, version: string): Promise<void>;
}

export interface IMarketplaceClient {
  search(query: MarketplaceQuery): Promise<MarketplaceResult>;
  getAgentPackage(agent_id: string, version?: string): Promise<AgentPackage | undefined>;
  getCapabilityPackage(capability_id: string, version?: string): Promise<CapabilityPackage | undefined>;
  publishAgent(pkg: AgentPackage): Promise<void>;
  publishCapability(pkg: CapabilityPackage): Promise<void>;
}

export interface IPackageManager {
  install(request: PackageInstallRequest): Promise<PackageInstallResult>;
  update(request: PackageUpdateRequest): Promise<PackageInstallResult>;
  uninstall(request: PackageUninstallRequest): Promise<boolean>;
  listInstalled(): InstalledPackageInfo[];
  isInstalled(package_id: string): boolean;
  resolveDependencies(deps: PackageDependency[]): Promise<DependencyResolutionResult>;
  checkCompatibility(package_id: string, version: string): Promise<boolean>;
}

export interface IRegistrySyncService {
  sync(registry_id?: string): Promise<RegistrySyncResult[]>;
  addRegistry(endpoint: RegistryEndpoint): void;
  removeRegistry(registry_id: string): void;
  listRegistries(): RegistryEndpoint[];
  getLastSync(registry_id: string): RegistrySyncResult | undefined;
}

export interface ITrustScoreEvaluator {
  evaluate(entry: AgentRegistryEntry | CapabilityRegistryEntry): TrustScore;
  getTrustLevel(score: number): TrustLevel;
  updateFromFeedback(package_id: string, feedback: TrustFeedback): void;
}

export interface TrustFeedback {
  package_id: string;
  execution_success: boolean;
  validation_passed: boolean;
  latency_ms: number;
  cost_usd: number;
  reporter_id: string;
  reported_at: string;
}

// ─── Events ──────────────────────────────────────────────────

export type MarketplaceEventType =
  | "marketplace.search_executed"
  | "marketplace.capability_published"
  | "marketplace.agent_published"
  | "marketplace.capability_deprecated"
  | "marketplace.agent_deprecated"
  | "package.install_requested"
  | "package.install_completed"
  | "package.install_failed"
  | "package.update_completed"
  | "package.uninstalled"
  | "package.dependency_conflict"
  | "registry.sync_started"
  | "registry.sync_completed"
  | "registry.sync_failed"
  | "registry.endpoint_added"
  | "registry.endpoint_removed"
  | "trust.score_updated"
  | "trust.level_changed"
  | "trust.feedback_received";

// ─── Configuration ───────────────────────────────────────────

export interface MarketplaceConfig {
  default_registry: RegistryEndpoint;
  sync: RegistrySyncConfig;
  trust_thresholds: Record<TrustLevel, number>;
  min_trust_for_auto_install: number;
  cache_ttl_minutes: number;
  max_concurrent_installs: number;
}

export const DEFAULT_TRUST_THRESHOLDS: Record<TrustLevel, number> = {
  untrusted: 0,
  low: 0.2,
  medium: 0.5,
  high: 0.75,
  verified: 0.95,
};

export const DEFAULT_REGISTRY_SYNC_CONFIG: RegistrySyncConfig = {
  sync_interval_minutes: 60,
  max_retries: 3,
  timeout_ms: 30_000,
  auto_sync: true,
};

export const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  default_registry: {
    registry_id: "default",
    url: "https://registry.agent-os.local",
    name: "Default Registry",
    priority: 1,
    auth_method: "none",
    enabled: true,
  },
  sync: DEFAULT_REGISTRY_SYNC_CONFIG,
  trust_thresholds: DEFAULT_TRUST_THRESHOLDS,
  min_trust_for_auto_install: 0.5,
  cache_ttl_minutes: 30,
  max_concurrent_installs: 4,
};
