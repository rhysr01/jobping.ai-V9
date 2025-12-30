"use client";

import { type ReactNode, useState } from "react";

interface AriaLiveRegionProps {
	children: ReactNode;
	level?: "polite" | "assertive";
	id?: string;
}

/**
 * ARIA Live Region component for announcing dynamic content updates
 * to screen readers. Use for form validation, status updates, etc.
 */
export default function AriaLiveRegion({
	children,
	level = "polite",
	id = "aria-live-region",
}: AriaLiveRegionProps) {
	return (
		<div
			id={id}
			role="status"
			aria-live={level}
			aria-atomic="true"
			className="sr-only"
		>
			{children}
		</div>
	);
}

/**
 * Hook to announce messages to screen readers
 */
export function useAriaAnnounce() {
	const [announcement, setAnnouncement] = useState<string>("");
	const [level, setLevel] = useState<"polite" | "assertive">("polite");

	const announce = (
		message: string,
		priority: "polite" | "assertive" = "polite",
	) => {
		setLevel(priority);
		setAnnouncement(message);
		// Clear after announcement to allow re-announcing same message
		setTimeout(() => setAnnouncement(""), 1000);
	};

	return {
		announce,
		Announcement: announcement ? (
			<AriaLiveRegion level={level}>{announcement}</AriaLiveRegion>
		) : null,
	};
}
