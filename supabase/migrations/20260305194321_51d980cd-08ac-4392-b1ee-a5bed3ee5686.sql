ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'repairing_build';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'build_repaired';
ALTER TYPE initiative_stage_status ADD VALUE IF NOT EXISTS 'repair_failed';