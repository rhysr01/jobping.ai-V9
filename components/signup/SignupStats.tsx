"use client";

import { useEffect } from "react";
import { apiCallJson } from "../../lib/api-client";
import { logger } from "../../lib/monitoring";

interface SignupStatsProps {
	setTotalUsers: (users: string) => void;
	setIsLoadingStats: (loading: boolean) => void;
}

export function SignupStats({
	setTotalUsers,
	setIsLoadingStats,
}: SignupStatsProps) {
	useEffect(() => {
		const normalize = (value: unknown): number => {
			if (typeof value === "number" && !Number.isNaN(value)) return value;
			if (typeof value === "string") {
				const numeric = Number(value.replace(/,/g, ""));
				if (!Number.isNaN(numeric)) return numeric;
			}
			return 0;
		};

		apiCallJson<{
			totalUsers?: number;
			totalUsersFormatted?: string;
		}>("/api/stats")
			.then((data) => {
				if (!data) {
					setTotalUsers("3,400");
					return;
				}

				const totalValue = normalize(
					data.totalUsers ?? data.totalUsersFormatted,
				);

				setTotalUsers(
					totalValue > 0 ? totalValue.toLocaleString("en-US") : "3,400",
				);
			})
			.catch((err) => {
				logger.error("Failed to fetch stats", {
					error: err,
					component: "signup-stats",
					metadata: {
						fallbackValues: { totalUsers: "3,400" },
					},
				});
				setTotalUsers("3,400");
			})
			.finally(() => setIsLoadingStats(false));
	}, [setTotalUsers, setIsLoadingStats]);

	return null;
}
