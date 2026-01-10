import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/utils/url-helpers";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: ["/api/", "/admin/"],
		},
		sitemap: `${getBaseUrl()}/sitemap.xml`,
	};
}
