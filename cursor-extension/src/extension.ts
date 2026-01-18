import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { config } from 'dotenv';

// Load environment variables from .env.local in workspace root
function loadEnvironmentVariables() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const envPath = path.join(workspaceFolder.uri.fsPath, '.env.local');
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
  }
}

class SentryMCP {
  private authToken: string;
  private org: string;
  private project: string;

  constructor() {
    this.authToken = process.env.SENTRY_AUTH_TOKEN || "";
    this.org = process.env.SENTRY_ORG || "";
    this.project = process.env.SENTRY_PROJECT || "";

    if (!this.authToken || !this.org || !this.project) {
      vscode.window.showWarningMessage(
        'Sentry MCP: Missing environment variables. Please set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT in your .env.local file.'
      );
    }
  }

  async getRecentErrors(hours: number = 24, limit: number = 50): Promise<string> {
    try {
      if (!this.authToken) {
        return '❌ Sentry MCP not configured. Please set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT environment variables.';
      }

      const url = `https://sentry.io/api/0/organizations/${this.org}/issues/?statsPeriod=${hours}h`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();
      const recentIssues = issues.slice(0, limit);

      const formattedIssues = recentIssues.map((issue: any) => ({
        id: issue.id,
        title: issue.title,
        level: issue.level,
        status: issue.status,
        count: issue.count,
        userCount: issue.userCount,
        lastSeen: new Date(issue.lastSeen).toLocaleString(),
        firstSeen: new Date(issue.firstSeen).toLocaleString(),
        url: `https://sentry.io/organizations/${this.org}/issues/${issue.id}/`,
      }));

      if (formattedIssues.length === 0) {
        return `✅ No Sentry errors found in the last ${hours} hours.`;
      }

      return `🚨 Recent Sentry errors (last ${hours} hours):\n\n${formattedIssues.map((issue: any) =>
        `• **${issue.title}**\n  📊 Count: ${issue.count} | Users: ${issue.userCount}\n  🏷️ Level: ${issue.level} | Status: ${issue.status}\n  📅 Last seen: ${issue.lastSeen}\n  🔗 ${issue.url}\n`
      ).join('\n')}`;

    } catch (error: any) {
      return `❌ Failed to fetch Sentry errors: ${error.message}`;
    }
  }

  async analyzeErrorPatterns(days: number = 7): Promise<string> {
    try {
      if (!this.authToken) {
        return '❌ Sentry MCP not configured. Please set environment variables first.';
      }

      const url = `https://sentry.io/api/0/organizations/${this.org}/issues/?statsPeriod=${days * 24}h`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
      }

      const issues = await response.json();

      // Analyze patterns
      const patterns = {
        totalIssues: issues.length,
        byLevel: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        topErrors: [] as Array<{ title: string; count: number; level: string }>,
        trending: [] as Array<{ title: string; change: string }>,
      };

      issues.forEach((issue: any) => {
        // Count by level
        patterns.byLevel[issue.level] = (patterns.byLevel[issue.level] || 0) + 1;

        // Count by status
        patterns.byStatus[issue.status] = (patterns.byStatus[issue.status] || 0) + 1;

        // Track top errors
        patterns.topErrors.push({
          title: issue.title,
          count: issue.count,
          level: issue.level,
        });
      });

      // Sort top errors
      patterns.topErrors.sort((a, b) => b.count - a.count);
      patterns.topErrors = patterns.topErrors.slice(0, 10);

      return `📊 Sentry Error Analysis (last ${days} days):\n\n**Summary:**\n• Total issues: ${patterns.totalIssues}\n\n**By Severity:**\n${Object.entries(patterns.byLevel).map(([level, count]) =>
        `• ${level}: ${count}`
      ).join('\n')}\n\n**By Status:**\n${Object.entries(patterns.byStatus).map(([status, count]) =>
        `• ${status}: ${count}`
      ).join('\n')}\n\n**Top 10 Errors:**\n${patterns.topErrors.map((error, i) =>
        `${i + 1}. ${error.title}\n   Count: ${error.count} (${error.level})`
      ).join('\n')}`;

    } catch (error: any) {
      return `❌ Failed to analyze Sentry patterns: ${error.message}`;
    }
  }

  async getErrorDetails(errorId: string): Promise<string> {
    try {
      if (!this.authToken) {
        return '❌ Sentry MCP not configured. Please set environment variables first.';
      }

      const url = `https://sentry.io/api/0/issues/${errorId}/`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Sentry API error: ${response.status} ${response.statusText}`);
      }

      const issue = await response.json();

      return `🔍 Sentry Error Details: ${issue.title}\n\n**Basic Info:**\n• ID: ${issue.id}\n• Level: ${issue.level}\n• Status: ${issue.status}\n• First seen: ${new Date(issue.firstSeen).toLocaleString()}\n• Last seen: ${new Date(issue.lastSeen).toLocaleString()}\n\n**Stats:**\n• Total events: ${issue.count}\n• Affected users: ${issue.userCount}\n• Tags: ${Object.entries(issue.tags || {}).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}\n\n**URL:** https://sentry.io/organizations/${this.org}/issues/${issue.id}/`;

    } catch (error: any) {
      return `❌ Failed to get Sentry error details: ${error.message}`;
    }
  }
}

let sentryMCP: SentryMCP;

export function activate(context: vscode.ExtensionContext) {
  console.log('JobPing MCP Tools extension is now active!');

  // Load environment variables
  loadEnvironmentVariables();

  // Initialize Sentry MCP
  sentryMCP = new SentryMCP();

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('jobping.getSentryErrors', async () => {
      const result = await sentryMCP.getRecentErrors();
      const document = await vscode.workspace.openTextDocument({
        content: result,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jobping.analyzeSentryPatterns', async () => {
      const days = await vscode.window.showInputBox({
        prompt: 'Enter number of days to analyze',
        value: '7'
      });

      const result = await sentryMCP.analyzeErrorPatterns(days ? parseInt(days) : 7);
      const document = await vscode.workspace.openTextDocument({
        content: result,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jobping.getSentryErrorDetails', async () => {
      const errorId = await vscode.window.showInputBox({
        prompt: 'Enter Sentry error ID',
        placeHolder: 'e.g., 123456789'
      });

      if (!errorId) {
        vscode.window.showErrorMessage('Error ID is required');
        return;
      }

      const result = await sentryMCP.getErrorDetails(errorId);
      const document = await vscode.workspace.openTextDocument({
        content: result,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(document);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('jobping.testMCPConnection', async () => {
      const hasAuthToken = !!process.env.SENTRY_AUTH_TOKEN;
      const hasOrg = !!process.env.SENTRY_ORG;
      const hasProject = !!process.env.SENTRY_PROJECT;

      const status = `🔧 MCP Connection Test:\n\nEnvironment Variables:\n• SENTRY_AUTH_TOKEN: ${hasAuthToken ? '✅ Set' : '❌ Missing'}\n• SENTRY_ORG: ${hasOrg ? '✅ Set' : '❌ Missing'}\n• SENTRY_PROJECT: ${hasProject ? '✅ Set' : '❌ Missing'}\n\nConfiguration Status: ${hasAuthToken && hasOrg && hasProject ? '✅ Ready' : '❌ Incomplete'}`;

      const document = await vscode.workspace.openTextDocument({
        content: status,
        language: 'markdown'
      });
      await vscode.window.showTextDocument(document);

      if (hasAuthToken && hasOrg && hasProject) {
        vscode.window.showInformationMessage('MCP Connection: Ready! Sentry tools should work.');
      } else {
        vscode.window.showErrorMessage('MCP Connection: Incomplete. Check your .env.local file.');
      }
    })
  );
}

export function deactivate() {
  console.log('JobPing MCP Tools extension is now deactivated!');
}