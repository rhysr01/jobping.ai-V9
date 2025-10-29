import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/Utils/url-helpers'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${getBaseUrl()}/sitemap.xml`,
  }
}
