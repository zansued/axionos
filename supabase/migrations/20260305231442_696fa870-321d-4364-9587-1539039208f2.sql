-- Add v3 Venture Intelligence Layer stages
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'opportunity_discovering';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'opportunity_discovered';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'analyzing_market_signals';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'market_signals_analyzed';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'validating_product';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'product_validated';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'strategizing_revenue';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'revenue_strategized';

-- Add v3 Growth & Evolution Layer stages
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'observing_product';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'product_observed';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'analyzing_product_metrics';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'product_metrics_analyzed';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'analyzing_user_behavior';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'user_behavior_analyzed';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'optimizing_growth';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'growth_optimized';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'evolving_product';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'product_evolved';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'evolving_architecture';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'architecture_evolved';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'managing_portfolio';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'portfolio_managed';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'evolving_system';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'system_evolved';