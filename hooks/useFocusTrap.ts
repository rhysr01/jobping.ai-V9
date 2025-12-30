import { useEffect, useRef } from "react";

/**
 * Hook to trap focus within a modal/dialog element
 * Implements WCAG 2.1 focus trap pattern
 */
export function useFocusTrap(isOpen: boolean) {
	const containerRef = useRef<HTMLElement>(null);

	useEffect(() => {
		if (!isOpen || !containerRef.current) return;

		const container = containerRef.current;
		const focusableElements = container.querySelectorAll<HTMLElement>(
			'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
		);

		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		// Focus first element when modal opens
		if (firstElement) {
			firstElement.focus();
		}

		const handleTabKey = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;

			if (focusableElements.length === 0) {
				e.preventDefault();
				return;
			}

			if (e.shiftKey) {
				// Shift + Tab
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement?.focus();
				}
			} else {
				// Tab
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement?.focus();
				}
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				// Find close button and trigger it
				const closeButton = container.querySelector<HTMLElement>(
					'button[aria-label*="close" i], button[aria-label*="Close" i]',
				);
				if (closeButton) {
					closeButton.click();
				}
			}
		};

		container.addEventListener("keydown", handleTabKey);
		container.addEventListener("keydown", handleEscape);

		return () => {
			container.removeEventListener("keydown", handleTabKey);
			container.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	return containerRef;
}
