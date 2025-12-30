/**
 * Scroll depth tracking for conversion optimization
 */

export function trackScrollDepth() {
	if (typeof window === "undefined") return;

	const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
	const scrollPercentages = [25, 50, 75, 90, 100];
	const tracked: Set<number> = new Set();

	const handleScroll = () => {
		const scrollY = window.scrollY;
		const percentage = Math.round((scrollY / maxScroll) * 100);

		scrollPercentages.forEach((threshold) => {
			if (percentage >= threshold && !tracked.has(threshold)) {
				tracked.add(threshold);
				// Track scroll depth
				if (typeof window !== "undefined" && (window as any).gtag) {
					(window as any).gtag("event", "scroll_depth", {
						scroll_percentage: threshold,
						page_path: window.location.pathname,
					});
				}
			}
		});
	};

	window.addEventListener("scroll", handleScroll, { passive: true });

	return () => {
		window.removeEventListener("scroll", handleScroll);
	};
}
