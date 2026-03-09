-- Sprint 110 fix: add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_scenario_simulation_runs_scenario ON public.scenario_simulation_runs(scenario_id);
CREATE INDEX IF NOT EXISTS idx_scenario_simulation_runs_subject ON public.scenario_simulation_runs(subject_id);
CREATE INDEX IF NOT EXISTS idx_scenario_simulation_runs_constitution ON public.scenario_simulation_runs(constitution_id);
CREATE INDEX IF NOT EXISTS idx_simulation_stress_points_run ON public.simulation_stress_points(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_simulation_recommendations_run ON public.simulation_recommendations(simulation_run_id);
CREATE INDEX IF NOT EXISTS idx_future_continuity_snapshots_scenario ON public.future_continuity_snapshots(scenario_id);
CREATE INDEX IF NOT EXISTS idx_future_continuity_snapshots_subject ON public.future_continuity_snapshots(subject_id);