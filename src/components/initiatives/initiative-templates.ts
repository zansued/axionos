export interface InitiativeTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  ideaRaw: string;
  discoveryHints: {
    targetUser: string;
    suggestedStack: string;
    complexity: string;
    riskLevel: string;
    mvpScope: string;
  };
}

export const INITIATIVE_TEMPLATES: InitiativeTemplate[] = [
  {
    id: "saas",
    name: "SaaS Multi-tenant",
    icon: "🏢",
    category: "Web App",
    description: "Aplicação SaaS completa com autenticação, multi-tenancy, billing e dashboard administrativo.",
    ideaRaw: "Plataforma SaaS multi-tenant com autenticação, gerenciamento de organizações, planos de assinatura, dashboard administrativo e API REST para integrações.",
    discoveryHints: {
      targetUser: "Empresas B2B que precisam de uma solução cloud escalável",
      suggestedStack: "React + TypeScript + Supabase + Stripe + Tailwind CSS",
      complexity: "high",
      riskLevel: "medium",
      mvpScope: "Auth, onboarding, CRUD principal, dashboard básico, plano free/pro",
    },
  },
  {
    id: "api-rest",
    name: "API REST",
    icon: "🔌",
    category: "Backend",
    description: "API RESTful com autenticação JWT, CRUD completo, validação, rate limiting e documentação OpenAPI.",
    ideaRaw: "API REST robusta com endpoints CRUD, autenticação JWT, autorização por roles, rate limiting, validação de schemas, tratamento de erros padronizado e documentação OpenAPI/Swagger.",
    discoveryHints: {
      targetUser: "Desenvolvedores e equipes que precisam de um backend escalável",
      suggestedStack: "Supabase Edge Functions + PostgreSQL + Zod + OpenAPI",
      complexity: "medium",
      riskLevel: "low",
      mvpScope: "Auth, 3-5 endpoints CRUD, validação, error handling, docs básica",
    },
  },
  {
    id: "landing-page",
    name: "Landing Page",
    icon: "🚀",
    category: "Marketing",
    description: "Landing page de alta conversão com hero, features, pricing, testimonials, FAQ e CTA.",
    ideaRaw: "Landing page moderna e responsiva com seções: hero com CTA, proposta de valor, features grid, planos de preço, depoimentos/social proof, FAQ accordion, footer com links e formulário de contato/newsletter.",
    discoveryHints: {
      targetUser: "Startups e empresas que precisam validar e converter visitantes",
      suggestedStack: "React + TypeScript + Tailwind CSS + Framer Motion + SEO otimizado",
      complexity: "low",
      riskLevel: "low",
      mvpScope: "Hero, features, pricing, CTA, responsivo, SEO básico",
    },
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    icon: "🛒",
    category: "Web App",
    description: "Loja virtual com catálogo, carrinho, checkout, pagamentos e painel administrativo.",
    ideaRaw: "E-commerce completo com catálogo de produtos (categorias, filtros, busca), carrinho de compras persistente, checkout multi-step, integração com gateway de pagamento, gestão de pedidos e painel admin para gerenciar produtos e pedidos.",
    discoveryHints: {
      targetUser: "Lojistas e marcas que vendem produtos online",
      suggestedStack: "React + TypeScript + Supabase + Stripe + Tailwind CSS",
      complexity: "high",
      riskLevel: "medium",
      mvpScope: "Catálogo, carrinho, checkout simples, painel de pedidos",
    },
  },
  {
    id: "dashboard",
    name: "Dashboard Analytics",
    icon: "📊",
    category: "Web App",
    description: "Dashboard interativo com KPIs, gráficos, filtros, exportação e visualização de dados em tempo real.",
    ideaRaw: "Dashboard de analytics com cards de KPIs, gráficos interativos (line, bar, pie, area), filtros por período/categoria, tabelas com sorting/pagination, exportação CSV/PDF e atualização em tempo real via websockets.",
    discoveryHints: {
      targetUser: "Gestores e analistas que precisam monitorar métricas de negócio",
      suggestedStack: "React + TypeScript + Recharts + Supabase Realtime + Tailwind CSS",
      complexity: "medium",
      riskLevel: "low",
      mvpScope: "4-6 KPIs, 3 tipos de gráfico, filtro por período, tabela principal",
    },
  },
  {
    id: "crm",
    name: "CRM",
    icon: "👥",
    category: "Web App",
    description: "Sistema de gestão de relacionamento com clientes: pipeline de vendas, contatos, atividades e relatórios.",
    ideaRaw: "CRM com gestão de contatos e empresas, pipeline de vendas drag-and-drop (Kanban), registro de atividades e notas, agendamento de follow-ups, dashboard de vendas com métricas e relatórios de performance por vendedor.",
    discoveryHints: {
      targetUser: "Equipes de vendas e atendimento de PMEs",
      suggestedStack: "React + TypeScript + Supabase + DnD Kit + Recharts + Tailwind CSS",
      complexity: "high",
      riskLevel: "medium",
      mvpScope: "Contatos CRUD, pipeline Kanban, atividades, dashboard básico",
    },
  },
];
