import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn } from "child_process";
import { resolve } from "path";

export class SupabaseMCP {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn("⚠️  Supabase MCP: Missing environment variables. Supabase tools will not be available.");
      console.warn("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
      this.supabase = null as any;
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async queryUsers(args: any) {
    const { limit = 10, offset = 0, filters = {} } = args;

    try {
      if (!this.supabase) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Supabase MCP not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
            },
          ],
        };
      }

      let query = this.supabase
        .from("users")
        .select("id, email, created_at, updated_at, user_type, subscription_status")
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.user_type) {
        query = query.eq("user_type", filters.user_type);
      }
      if (filters.subscription_status) {
        query = query.eq("subscription_status", filters.subscription_status);
      }

      const { data: users, error, count } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const formattedUsers = users?.map((user: any) => ({
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        subscription_status: user.subscription_status,
        created_at: new Date(user.created_at).toLocaleString(),
        updated_at: new Date(user.updated_at).toLocaleString(),
      })) || [];

      return {
        content: [
          {
            type: "text",
            text: `👥 Users Query Results (${formattedUsers.length} users):\n\n${formattedUsers.length === 0 ? "No users found matching criteria." :
              formattedUsers.map((user: any) =>
                `• **${user.email}**\n  🆔 ID: ${user.id}\n  👤 Type: ${user.user_type || 'unknown'}\n  💳 Subscription: ${user.subscription_status || 'none'}\n  📅 Created: ${user.created_at}\n`
              ).join("\n")}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to query users: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getUserDetails(args: any) {
    const { userId } = args;

    try {
      if (!this.supabase) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Supabase MCP not configured. Please set environment variables first.",
            },
          ],
        };
      }

      const { data: user, error } = await this.supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!user) {
        return {
          content: [
            {
              type: "text",
              text: `❌ User with ID ${userId} not found.`,
            },
          ],
        };
      }

      // Get additional user data
      const { data: userMatches } = await this.supabase
        .from("user_matches")
        .select("id, created_at")
        .eq("user_id", userId);

      const { data: userPreferences } = await this.supabase
        .from("user_job_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      return {
        content: [
          {
            type: "text",
            text: `👤 User Details: ${user.email}\n\n**Basic Info:**\n• ID: ${user.id}\n• Email: ${user.email}\n• Type: ${user.user_type || 'unknown'}\n• Subscription: ${user.subscription_status || 'none'}\n• Email Verified: ${user.email_confirmed_at ? '✅' : '❌'}\n\n**Timestamps:**\n• Created: ${new Date(user.created_at).toLocaleString()}\n• Updated: ${new Date(user.updated_at).toLocaleString()}\n${user.email_confirmed_at ? `• Email Confirmed: ${new Date(user.email_confirmed_at).toLocaleString()}\n` : ''}\n**Activity:**\n• Total Matches: ${userMatches?.length || 0}\n\n**Preferences:**\n${userPreferences ?
              `• Location: ${userPreferences.location || 'not set'}\n• Job Types: ${userPreferences.job_types?.join(', ') || 'not set'}\n• Experience Level: ${userPreferences.experience_level || 'not set'}` :
              'No preferences set'}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to get user details: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async queryJobs(args: any) {
    const { limit = 10, offset = 0, filters = {} } = args;

    try {
      if (!this.supabase) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Supabase MCP not configured. Please set environment variables first.",
            },
          ],
        };
      }

      let query = this.supabase
        .from("jobs")
        .select("id, title, company, location, job_type, created_at, updated_at, status")
        .range(offset, offset + limit - 1)
        .order("created_at", { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.job_type) {
        query = query.eq("job_type", filters.job_type);
      }
      if (filters.location) {
        query = query.ilike("location", `%${filters.location}%`);
      }

      const { data: jobs, error } = await query;

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      const formattedJobs = jobs?.map((job: any) => ({
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        job_type: job.job_type,
        status: job.status,
        created_at: new Date(job.created_at).toLocaleString(),
      })) || [];

      return {
        content: [
          {
            type: "text",
            text: `💼 Jobs Query Results (${formattedJobs.length} jobs):\n\n${formattedJobs.length === 0 ? "No jobs found matching criteria." :
              formattedJobs.map((job: any) =>
                `• **${job.title}**\n  🏢 ${job.company}\n  📍 ${job.location}\n  👔 ${job.job_type}\n  📊 Status: ${job.status}\n  📅 Posted: ${job.created_at}\n`
              ).join("\n")}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to query jobs: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async getTableStats(args: any) {
    const { tables = ["users", "jobs", "user_matches"] } = args;

    try {
      if (!this.supabase) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Supabase MCP not configured. Please set environment variables first.",
            },
          ],
        };
      }

      const stats: Record<string, any> = {};

      for (const table of tables) {
        try {
          const { count, error } = await this.supabase
            .from(table)
            .select("*", { count: "exact", head: true });

          if (error) {
            stats[table] = { error: error.message };
          } else {
            stats[table] = { count: count || 0 };

            // Get some recent records for context
            const { data: recentRecords } = await this.supabase
              .from(table)
              .select("*")
              .order("created_at", { ascending: false })
              .limit(1);

            if (recentRecords && recentRecords.length > 0) {
              stats[table].latest_record = new Date(recentRecords[0].created_at).toLocaleString();
            }
          }
        } catch (error: any) {
          stats[table] = { error: error.message };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: `📊 Database Table Statistics:\n\n${Object.entries(stats).map(([table, info]: [string, any]) =>
              `**${table}:**\n${info.error ?
                `❌ Error: ${info.error}` :
                `• Count: ${info.count}\n• Latest Record: ${info.latest_record || 'unknown'}`
              }\n`
            ).join("\n")}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to get table stats: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async runMaintenanceMigrations(args: any) {
    const { run_all = false, specific_migration = null } = args;

    try {
      if (!this.supabase) {
        return {
          content: [
            {
              type: "text",
              text: "⚠️  Supabase MCP not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
            },
          ],
        };
      }

      let command: string;
      let args_array: string[];

      if (specific_migration) {
        // Run specific migration
        command = "npx";
        args_array = ["supabase", "db", "push"];
        if (specific_migration !== "latest") {
          args_array.push("--include-all");
        }
      } else if (run_all) {
        // Run all maintenance migrations
        command = "./run_maintenance_migrations.sh";
        args_array = [];
      } else {
        // Run latest migration only
        command = "npx";
        args_array = ["supabase", "db", "push"];
      }

      return new Promise((resolve) => {
        const child = spawn(command, args_array, {
          cwd: resolve(process.cwd()),
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          if (code === 0) {
            resolve({
              content: [
                {
                  type: "text",
                  text: `✅ Maintenance migrations completed successfully!\n\n📋 Output:\n${stdout}\n\n${stderr ? `⚠️  Warnings:\n${stderr}` : ""}`,
                },
              ],
            });
          } else {
            resolve({
              content: [
                {
                  type: "text",
                  text: `❌ Maintenance migrations failed with exit code ${code}\n\n📋 Output:\n${stdout}\n\n❌ Errors:\n${stderr}`,
                },
              ],
              isError: true,
            });
          }
        });

        child.on("error", (error) => {
          resolve({
            content: [
              {
                type: "text",
                text: `❌ Failed to execute maintenance migrations: ${error.message}`,
              },
            ],
            isError: true,
          });
        });
      });
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to run maintenance migrations: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
}
