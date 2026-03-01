import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_API = "https://api.github.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action, github_token, owner, repo, ...params } = body;

    if (!github_token) throw new Error("GitHub token is required");
    if (!owner || !repo) throw new Error("owner and repo are required");

    const ghHeaders = {
      Authorization: `Bearer ${github_token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    };

    let result: any;

    switch (action) {
      case "test_connection": {
        const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders });
        if (!resp.ok) throw new Error(`GitHub: ${resp.status} - Repo not found or no access`);
        const repoData = await resp.json();
        result = { 
          name: repoData.full_name, 
          default_branch: repoData.default_branch,
          private: repoData.private,
          permissions: repoData.permissions,
        };
        break;
      }

      case "list_branches": {
        const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=30`, { headers: ghHeaders });
        if (!resp.ok) throw new Error(`GitHub: ${resp.status}`);
        result = await resp.json();
        break;
      }

      case "create_branch": {
        const { base_branch, new_branch } = params;
        if (!base_branch || !new_branch) throw new Error("base_branch and new_branch required");
        
        // Get base branch SHA
        const refResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${base_branch}`, { headers: ghHeaders });
        if (!refResp.ok) throw new Error(`Base branch '${base_branch}' not found`);
        const refData = await refResp.json();
        const sha = refData.object.sha;

        // Create new branch
        const createResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ ref: `refs/heads/${new_branch}`, sha }),
        });
        if (!createResp.ok) {
          const err = await createResp.json();
          throw new Error(err.message || "Failed to create branch");
        }
        result = await createResp.json();
        break;
      }

      case "create_pr": {
        const { title, head, base, pr_body } = params;
        if (!title || !head || !base) throw new Error("title, head, base required");

        const prResp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({ title, head, base, body: pr_body || "" }),
        });
        if (!prResp.ok) {
          const err = await prResp.json();
          throw new Error(err.message || "Failed to create PR");
        }
        result = await prResp.json();
        break;
      }

      case "list_prs": {
        const state = params.state || "open";
        const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${state}&per_page=20`, { headers: ghHeaders });
        if (!resp.ok) throw new Error(`GitHub: ${resp.status}`);
        result = await resp.json();
        break;
      }

      case "get_file": {
        const { path, ref } = params;
        if (!path) throw new Error("path required");
        const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ""}`;
        const resp = await fetch(url, { headers: ghHeaders });
        if (!resp.ok) throw new Error(`File not found: ${path}`);
        result = await resp.json();
        break;
      }

      case "commit_file": {
        const { path, content, message, branch, sha: fileSha } = params;
        if (!path || !content || !message) throw new Error("path, content, message required");
        const commitBody: any = {
          message,
          content: btoa(content),
          branch: branch || "main",
        };
        if (fileSha) commitBody.sha = fileSha;

        const resp = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
          method: "PUT",
          headers: ghHeaders,
          body: JSON.stringify(commitBody),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.message || "Failed to commit");
        }
        result = await resp.json();
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GitHub proxy error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
