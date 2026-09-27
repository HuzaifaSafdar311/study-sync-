import { useEffect } from 'react';

/**
 * useSEO – A lightweight hook to set per-page <title> and <meta description>.
 * No external dependency required; directly mutates document head.
 */
export function useSEO({
  title,
  description,
  canonical,
  ogImage = '/studysync-logo-horizontal.png',
}: {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}) {
  useEffect(() => {
    // Title
    document.title = title;

    // Helper: upsert a <meta> tag
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // Standard
    setMeta('meta[name="description"]', 'name', 'description');
    document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = description;

    // Open Graph
    setMeta('meta[property="og:title"]', 'property', 'og:title');
    (document.querySelector('meta[property="og:title"]') as HTMLMetaElement).content = title;

    setMeta('meta[property="og:description"]', 'property', 'og:description');
    (document.querySelector('meta[property="og:description"]') as HTMLMetaElement).content = description;

    setMeta('meta[property="og:type"]', 'property', 'og:type');
    (document.querySelector('meta[property="og:type"]') as HTMLMetaElement).content = 'website';

    setMeta('meta[property="og:image"]', 'property', 'og:image');
    (document.querySelector('meta[property="og:image"]') as HTMLMetaElement).content = ogImage;

    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name');
    (document.querySelector('meta[property="og:site_name"]') as HTMLMetaElement).content = 'StudySync AI';

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card');
    (document.querySelector('meta[name="twitter:card"]') as HTMLMetaElement).content = 'summary_large_image';

    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title');
    (document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement).content = title;

    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description');
    (document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement).content = description;

    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image');
    (document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement).content = ogImage;

    // Canonical
    if (canonical) {
      let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.href = canonical;
    }

    return () => {
      // Reset to default on unmount
      document.title = 'StudySync AI — Intelligent Academic Platform';
    };
  }, [title, description, canonical, ogImage]);
}
