"use client";
import { useEffect, useState } from "react";

interface PilotMetrics {
	users: {
		total: number;
		verified: number;
		unverified: number;
		newToday: number;
	};
	matches: {
		totalGenerated: number;
		todayGenerated: number;
		avgPerUser: number;
	};
	emails: {
		sent: number;
		delivered: number;
		opened: number;
		clicked: number;
	};
	system: {
		uptime: string;
		errors: unknown;
		performance: unknown;
	};
}

export default function PilotAdminDashboard() {
	const [metrics, setMetrics] = useState<PilotMetrics | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchMetrics = async () => {
		try {
			// Mock data for now - replace with actual API when available
			const mockData = {
				users: { total: 0, verified: 0, unverified: 0, newToday: 0 },
				matches: { totalGenerated: 0, todayGenerated: 0, avgPerUser: 0 },
				emails: { sent: 0, delivered: 0, opened: 0, clicked: 0 },
				system: { uptime: "99.9%", errors: null, performance: null },
			};
			setMetrics(mockData);
		} catch (error) {
			console.error("Failed to fetch metrics:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchMetrics();
		const interval = setInterval(fetchMetrics, 30000);
		return () => clearInterval(interval);
	}, [fetchMetrics]);

	if (loading) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black py-20 md:py-28">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
				<h1 className="text-3xl md:text-4xl font-semibold text-white mb-8 tracking-tight">
					JobPing Pilot Dashboard
				</h1>

				{/* Real-time Status */}
				<div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
					<h2 className="text-xl font-semibold text-white mb-4 tracking-tight">
						System Status
					</h2>
					<div className="flex items-center space-x-4">
						<div className="flex items-center">
							<div className="w-3 h-3 bg-white/80 rounded-full mr-2"></div>
							<span className="text-white">All Systems Operational</span>
						</div>
						<div className="text-sm text-zinc-400">
							Uptime: {metrics?.system.uptime}
						</div>
					</div>
				</div>

				{/* Key Metrics Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<MetricCard
						title="Total Students"
						value={metrics?.users.total || 0}
						subtitle={`${metrics?.users.newToday || 0} new today`}
						color="blue"
					/>
					<MetricCard
						title="Verified Users"
						value={metrics?.users.verified || 0}
						subtitle={`${metrics?.users.unverified || 0} pending`}
						color="green"
					/>
					<MetricCard
						title="Matches Generated"
						value={metrics?.matches.totalGenerated || 0}
						subtitle={`${metrics?.matches.todayGenerated || 0} today`}
						color="purple"
					/>
					<MetricCard
						title="Emails Sent"
						value={metrics?.emails.sent || 0}
						subtitle={`${metrics?.emails.opened || 0} opened`}
						color="orange"
					/>
				</div>

				{/* User Activity Chart */}
				<UserActivity metrics={metrics} />

				{/* System Health */}
				<SystemHealth metrics={metrics} />
			</div>
		</div>
	);
}

function MetricCard({
	title,
	value,
	subtitle,
	color,
}: {
	title: string;
	value: string | number;
	subtitle: string;
	color: string;
}) {
	const colorClasses = {
		blue: "bg-indigo-500",
		green: "bg-white/60",
		purple: "bg-white/80",
		orange: "bg-white/40",
	};

	return (
		<div className="bg-white/5 rounded-2xl border border-white/10 p-6">
			<div className="flex items-center">
				<div
					className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]} bg-opacity-10`}
				>
					<div
						className={`w-6 h-6 ${colorClasses[color as keyof typeof colorClasses]} rounded-full`}
					></div>
				</div>
				<div className="ml-4">
					<p className="text-sm font-medium text-zinc-400">{title}</p>
					<p className="text-2xl font-semibold text-white">{value}</p>
					<p className="text-sm text-zinc-400">{subtitle}</p>
				</div>
			</div>
		</div>
	);
}

function UserActivity({ metrics }: { metrics: PilotMetrics | null }) {
	return (
		<div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
			<h2 className="text-xl font-semibold text-white mb-4 tracking-tight">
				User Activity
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="text-center">
					<div className="text-2xl font-bold text-white">
						{metrics?.users.total || 0}
					</div>
					<div className="text-sm text-zinc-400">Total Users</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-bold text-white">
						{metrics?.matches.avgPerUser || 0}
					</div>
					<div className="text-sm text-zinc-400">Avg Matches/User</div>
				</div>
				<div className="text-center">
					<div className="text-2xl font-bold text-white">
						{metrics?.emails.delivered || 0}
					</div>
					<div className="text-sm text-zinc-400">Emails Delivered</div>
				</div>
			</div>
		</div>
	);
}

function SystemHealth({ metrics }: { metrics: PilotMetrics | null }) {
	const [recentErrors, setRecentErrors] = useState<
		Array<{ message: string; timestamp: string }>
	>([]);

	const fetchRecentErrors = async () => {
		try {
			// Mock data for now - replace with actual API when available
			setRecentErrors([]);
		} catch (error) {
			console.error("Failed to fetch errors:", error);
		}
	};

	useEffect(() => {
		fetchRecentErrors();
		const interval = setInterval(fetchRecentErrors, 60000); // Refresh every minute
		return () => clearInterval(interval);
	}, [fetchRecentErrors]);

	return (
		<div className="bg-white/5 rounded-2xl border border-white/10 p-6">
			<h2 className="text-xl font-semibold text-white mb-4 tracking-tight">
				System Health
			</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div>
					<h3 className="text-lg font-medium text-white mb-2">Recent Errors</h3>
					{recentErrors.length > 0 ? (
						<div className="space-y-2">
							{recentErrors.slice(0, 5).map((error, index) => (
								<div key={index} className="error-state rounded-lg p-3">
									<div className="text-sm font-medium">{error.message}</div>
									<div className="text-xs opacity-80">{error.timestamp}</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-white/80 text-sm">No recent errors</div>
					)}
				</div>
				<div>
					<h3 className="text-lg font-medium text-white mb-2">Performance</h3>
					<div className="space-y-2">
						<div className="flex justify-between">
							<span className="text-sm text-zinc-400">Response Time</span>
							<span className="text-sm font-medium text-white">~200ms</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-zinc-400">Uptime</span>
							<span className="text-sm font-medium text-white">99.9%</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-zinc-400">Active Users</span>
							<span className="text-sm font-medium text-white">
								{metrics?.users.total || 0}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
