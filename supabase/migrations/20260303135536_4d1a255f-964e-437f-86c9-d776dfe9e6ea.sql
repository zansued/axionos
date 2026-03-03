
ALTER TABLE public.git_connections ADD COLUMN github_token text;

COMMENT ON COLUMN public.git_connections.github_token IS 'Personal Access Token for GitHub API operations';
