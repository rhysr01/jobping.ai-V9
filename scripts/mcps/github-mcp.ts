import { Octokit } from "@octokit/rest";

export class GitHubMCP {
  private octokit: Octokit;
  private repo: { owner: string; repo: string };

  constructor() {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;

    if (!token || !repo) {
      console.warn("⚠️  GitHub MCP: Missing GITHUB_TOKEN or GITHUB_REPO. GitHub tools will not be available.");
      this.repo = { owner: "", repo: "" };
      this.octokit = null as any;
      return;
    }

    const [owner, repoName] = repo.split("/");
    this.repo = { owner, repo: repoName };
    this.octokit = new Octokit({ auth: token });
  }

  async createIssue(args: any) {
    if (!this.octokit) {
      return {
        content: [
          {
            type: "text",
            text: "⚠️  GitHub MCP not configured. Please set GITHUB_TOKEN and GITHUB_REPO environment variables.",
          },
        ],
      };
    }

    const { title, body, labels = [], assignees = [] } = args;

    try {
      const issue = await this.octokit.issues.create({
        ...this.repo,
        title,
        body,
        labels,
        assignees,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Created GitHub issue: ${issue.data.html_url}\n\n**Title:** ${issue.data.title}\n**Number:** #${issue.data.number}\n**Labels:** ${issue.data.labels.map((l: any) => l.name).join(", ") || "none"}\n**Assignees:** ${issue.data.assignees?.map((a: any) => a.login).join(", ") || "none"}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to create GitHub issue: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getRecentIssues(args: any) {
    if (!this.octokit) {
      return {
        content: [
          {
            type: "text",
            text: "⚠️  GitHub MCP not configured. Please set GITHUB_TOKEN and GITHUB_REPO environment variables.",
          },
        ],
      };
    }

    const { state = "open", limit = 10 } = args;

    try {
      const issues = await this.octokit.issues.listForRepo({
        ...this.repo,
        state: state as "open" | "closed" | "all",
        per_page: Math.min(limit, 100),
        sort: "created",
        direction: "desc",
      });

      const issueList = issues.data.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
        labels: issue.labels.map((l: any) => l.name),
        assignees: issue.assignees?.map((a: any) => a.login) || [],
      }));

      return {
        content: [
          {
            type: "text",
            text: `📋 Recent ${state} issues (last ${issueList.length}):\n\n${issueList.map(issue =>
              `• **#${issue.number}** ${issue.title}\n  📅 ${new Date(issue.created_at).toLocaleDateString()}\n  🏷️ ${issue.labels.join(", ") || "no labels"}\n  🔗 ${issue.html_url}\n`
            ).join("\n")}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to fetch GitHub issues: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async searchIssues(args: any) {
    if (!this.octokit) {
      return {
        content: [
          {
            type: "text",
            text: "⚠️  GitHub MCP not configured. Please set GITHUB_TOKEN and GITHUB_REPO environment variables.",
          },
        ],
      };
    }

    const { query, limit = 10 } = args;

    try {
      const searchQuery = `repo:${this.repo.owner}/${this.repo.repo} ${query}`;
      const search = await this.octokit.search.issuesAndPullRequests({
        q: searchQuery,
        per_page: Math.min(limit, 100),
        sort: "created",
        order: "desc",
      });

      const issues = search.data.items.map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        html_url: issue.html_url,
        labels: issue.labels.map((l: any) => l.name),
      }));

      return {
        content: [
          {
            type: "text",
            text: `🔍 Search results for "${query}" (${issues.length} issues found):\n\n${issues.map(issue =>
              `• **#${issue.number}** ${issue.title}\n  📅 ${new Date(issue.created_at).toLocaleDateString()}\n  🏷️ ${issue.labels.join(", ") || "no labels"}\n  🔗 ${issue.html_url}\n`
            ).join("\n")}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to search GitHub issues: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
