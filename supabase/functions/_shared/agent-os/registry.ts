// Agent OS — Agent Registry
// Central registry for agent definitions.
// Agents are sorted by priority (descending) and matched by stage + input.

import type { AgentDefinition, StageName, WorkInput } from "./types.ts";

export class AgentRegistry {
  private agents: AgentDefinition[] = [];

  register(agent: AgentDefinition): void {
    this.agents.push(agent);
    this.agents.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  unregister(agentId: string): boolean {
    const idx = this.agents.findIndex((a) => a.id === agentId);
    if (idx === -1) return false;
    this.agents.splice(idx, 1);
    return true;
  }

  list(): AgentDefinition[] {
    return [...this.agents];
  }

  findById(agentId: string): AgentDefinition | undefined {
    return this.agents.find((a) => a.id === agentId);
  }

  findByType(type: string): AgentDefinition[] {
    return this.agents.filter((a) => a.type === type);
  }

  findForStage(stage: StageName, input: WorkInput): AgentDefinition[] {
    return this.agents.filter((agent) => agent.canHandle(input, stage));
  }

  count(): number {
    return this.agents.length;
  }
}
