const archPath = 'C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/ARCHITECTURE.md';
const planPath = 'C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/PLAN.md';
const agentsPath = 'C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/AGENTS.md';
const govPath = 'C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/GOVERNANCE.md';
const pipelinePath = 'C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/PIPELINE_CONTRACTS.md';

let arch = Deno.readTextFileSync(archPath);
const plan = Deno.readTextFileSync(planPath);

// Update some links just in case
arch = arch.replace(/\[PLAN\.md\]\(PLAN\.md\)/g, '#axionos--sprint-ledger');
Deno.writeTextFileSync(archPath, arch + '\n\n' + plan);

let agents = Deno.readTextFileSync(agentsPath);
const pipeline = Deno.readTextFileSync(pipelinePath);

// Rename references to itself
agents = agents.replace(/AGENTS\.md/g, 'GOVERNANCE.md');
agents = agents.replace(/# AxionOS — Agent Operating System/, '# AxionOS — Governance & Agent OS');

Deno.writeTextFileSync(govPath, agents + '\n\n' + pipeline);

Deno.removeSync(planPath);
Deno.removeSync(agentsPath);
Deno.removeSync(pipelinePath);
Deno.removeSync('C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/ROADMAP.md');
Deno.removeSync('C:/Users/zan_s/OneDrive/Documentos/GitHub/axionos/docs/VALUE_THESIS.md');
console.log('Merge complete. 5 deprecated files removed.');
