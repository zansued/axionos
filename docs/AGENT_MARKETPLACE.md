# Agent Marketplace & Global Capability Registry — v1.0

> Normative specification for the Agent OS package ecosystem.

## 1. Design Rationale

The Agent OS executes agents locally but lacks a mechanism for sharing, discovering and distributing agents and capabilities across environments. The Marketplace and Global Capability Registry close this gap by introducing:

- **CapabilityDescriptor / CapabilityRegistryEntry** — machine-readable metadata for every capability in the ecosystem.
- **AgentPackageManifest / AgentRegistryEntry** — distributable agent definitions with declared capabilities, tools and model requirements.
- **IPackageManager** — install / update / uninstall operations with full dependency resolution.
- **IRegistrySyncService** — periodic synchronization with remote registries, enabling offline-first operation.
- **ITrustScoreEvaluator** — reputation signals derived from execution telemetry that feed into the Selection Engine.

## 2. Module Structure

```
agent-os/
  marketplace.ts       ← All types, interfaces and defaults
```

## 3. Capability Registry Model

Each capability is described by a `CapabilityDescriptor` (id, schemas, tools) and tracked as a `CapabilityRegistryEntry` with version history, publisher identity and trust score.

Versions follow **Semantic Versioning**. Once published, a version is immutable; it can only be deprecated.

## 4. Agent Package Model

Agents are distributed as `AgentPackage` bundles containing an `AgentPackageManifest` (capabilities, tools, models, dependencies) and a specific `AgentVersion`.

Dependencies use semver range constraints and are resolved via `IPackageManager.resolveDependencies()`.

## 5. Trust & Reputation

`TrustScore` aggregates five dimensions:
- `execution_success_rate`
- `validation_pass_rate`
- `stability`
- `publisher_reputation`
- `community_rating`

Scores map to `TrustLevel` tiers (untrusted → verified). The Selection Engine may use trust levels to filter or boost candidates.

## 6. Registry Synchronization

`IRegistrySyncService` manages multiple `RegistryEndpoint` sources with configurable priority and authentication. Sync results report new/updated counts and errors.

Default sync interval: 60 minutes. Configurable via `RegistrySyncConfig`.

## 7. Integration Points

| System | Integration |
|---|---|
| Selection Engine | Trust scores influence agent ranking |
| Policy Engine | Policies may require minimum trust levels |
| Observability | Telemetry feeds trust score updates |
| Distributed Runtime | Remote workers can install packages on demand |
| Memory System | Installation history persisted as memory records |

## 8. EventBus Events

19 event types covering search, publish, install, sync and trust lifecycle.

## 9. Extension Points

- Agent reputation systems
- Capability certification workflows
- Paid marketplace with billing
- Private / enterprise registries
- Automatic capability promotion/demotion based on trust trends
