// Feed fetching and parsing utilities
import { Article, Source, generateId } from './storage';

// CORS proxy options for fetching feeds
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

interface FeedItem {
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  author: string | null;
  categories: string[];
  imageUrl?: string;
}

interface ParsedFeed {
  title: string;
  link: string;
  description: string;
  items: FeedItem[];
}

// Generate a stable article ID based on source and item
function generateArticleId(sourceId: string, itemUrl: string, itemTitle: string): string {
  const input = `${sourceId}-${itemUrl || itemTitle}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `article-${Math.abs(hash).toString(36)}`;
}

// Fetch with CORS proxy fallback
async function fetchWithProxy(url: string): Promise<string> {
  // Try direct fetch first (might work for some feeds)
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json',
      },
    });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Direct fetch failed, try proxies
  }

  // Try CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(`${proxy}${encodeURIComponent(url)}`);
      if (response.ok) {
        return await response.text();
      }
    } catch {
      continue;
    }
  }

  throw new Error('Failed to fetch feed. The URL may be invalid or blocked.');
}

// Parse RSS 2.0 feed
function parseRSS(doc: Document): ParsedFeed {
  const channel = doc.querySelector('channel');
  if (!channel) throw new Error('Invalid RSS feed: no channel element');

  const items = Array.from(channel.querySelectorAll('item')).map(item => {
    const enclosure = item.querySelector('enclosure');
    const mediaContent = item.querySelector('media\\:content, content');
    
    let imageUrl = enclosure?.getAttribute('url') || mediaContent?.getAttribute('url');
    
    // Try to extract image from description
    const description = item.querySelector('description')?.textContent || '';
    if (!imageUrl) {
      const imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/);
      if (imgMatch) imageUrl = imgMatch[1];
    }

    return {
      title: item.querySelector('title')?.textContent?.trim() || 'Untitled',
      link: item.querySelector('link')?.textContent?.trim() || '',
      description: description.replace(/<[^>]+>/g, ' ').trim().substring(0, 500),
      content: item.querySelector('content\\:encoded, encoded')?.textContent || description,
      pubDate: item.querySelector('pubDate')?.textContent || new Date().toISOString(),
      author: item.querySelector('author, dc\\:creator, creator')?.textContent?.trim() || null,
      categories: Array.from(item.querySelectorAll('category')).map(c => c.textContent?.trim() || '').filter(Boolean),
      imageUrl,
    };
  });

  return {
    title: channel.querySelector('title')?.textContent?.trim() || 'Unknown Feed',
    link: channel.querySelector('link')?.textContent?.trim() || '',
    description: channel.querySelector('description')?.textContent?.trim() || '',
    items,
  };
}

// Parse Atom feed
function parseAtom(doc: Document): ParsedFeed {
  const feed = doc.querySelector('feed');
  if (!feed) throw new Error('Invalid Atom feed');

  const items = Array.from(feed.querySelectorAll('entry')).map(entry => {
    const content = entry.querySelector('content')?.textContent || 
                   entry.querySelector('summary')?.textContent || '';
    
    let imageUrl: string | undefined;
    const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/);
    if (imgMatch) imageUrl = imgMatch[1];

    // Get link href
    const linkEl = entry.querySelector('link[rel="alternate"], link:not([rel])');
    const link = linkEl?.getAttribute('href') || '';

    return {
      title: entry.querySelector('title')?.textContent?.trim() || 'Untitled',
      link,
      description: content.replace(/<[^>]+>/g, ' ').trim().substring(0, 500),
      content,
      pubDate: entry.querySelector('published, updated')?.textContent || new Date().toISOString(),
      author: entry.querySelector('author name')?.textContent?.trim() || null,
      categories: Array.from(entry.querySelectorAll('category')).map(c => c.getAttribute('term') || '').filter(Boolean),
      imageUrl,
    };
  });

  const linkEl = feed.querySelector('link[rel="alternate"], link:not([rel])');
  
  return {
    title: feed.querySelector('title')?.textContent?.trim() || 'Unknown Feed',
    link: linkEl?.getAttribute('href') || '',
    description: feed.querySelector('subtitle')?.textContent?.trim() || '',
    items,
  };
}

// Parse JSON Feed (https://jsonfeed.org/)
function parseJSONFeed(data: unknown): ParsedFeed {
  const feed = data as {
    title?: string;
    home_page_url?: string;
    description?: string;
    items?: Array<{
      id?: string;
      url?: string;
      title?: string;
      summary?: string;
      content_html?: string;
      content_text?: string;
      date_published?: string;
      author?: { name?: string };
      tags?: string[];
      image?: string;
    }>;
  };

  const items = (feed.items || []).map(item => ({
    title: item.title || 'Untitled',
    link: item.url || '',
    description: item.summary || (item.content_text || '').substring(0, 500),
    content: item.content_html || item.content_text || '',
    pubDate: item.date_published || new Date().toISOString(),
    author: item.author?.name || null,
    categories: item.tags || [],
    imageUrl: item.image,
  }));

  return {
    title: feed.title || 'Unknown Feed',
    link: feed.home_page_url || '',
    description: feed.description || '',
    items,
  };
}

// Detect and parse feed
function parseFeed(text: string): ParsedFeed {
  // Try JSON first
  try {
    const json = JSON.parse(text);
    if (json.version?.startsWith('https://jsonfeed.org/')) {
      return parseJSONFeed(json);
    }
  } catch {
    // Not JSON, try XML
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');

  // Check for parse errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid XML feed');
  }

  // Detect feed type
  if (doc.querySelector('rss')) {
    return parseRSS(doc);
  } else if (doc.querySelector('feed')) {
    return parseAtom(doc);
  } else if (doc.querySelector('rdf\\:RDF, RDF')) {
    // RSS 1.0 / RDF - treat similar to RSS
    return parseRSS(doc);
  }

  throw new Error('Unknown feed format');
}

// Auto-discover feed URL from a website
export async function discoverFeedUrl(websiteUrl: string): Promise<string | null> {
  try {
    const html = await fetchWithProxy(websiteUrl);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Look for feed links in <head>
    const feedLinks = doc.querySelectorAll(
      'link[type="application/rss+xml"], ' +
      'link[type="application/atom+xml"], ' +
      'link[type="application/json"]'
    );

    for (const link of feedLinks) {
      const href = link.getAttribute('href');
      if (href) {
        // Convert relative URL to absolute
        try {
          return new URL(href, websiteUrl).toString();
        } catch {
          return href;
        }
      }
    }

    // Try common feed paths
    const commonPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/feed/'];
    for (const path of commonPaths) {
      try {
        const feedUrl = new URL(path, websiteUrl).toString();
        const response = await fetchWithProxy(feedUrl);
        parseFeed(response); // Will throw if not a valid feed
        return feedUrl;
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Feed discovery failed:', error);
    return null;
  }
}

// Fetch and parse a feed
export async function fetchFeed(source: Source): Promise<{ articles: Article[]; error: string | null }> {
  try {
    const text = await fetchWithProxy(source.url);
    const parsed = parseFeed(text);

    const articles: Article[] = parsed.items.map(item => ({
      id: generateArticleId(source.id, item.link, item.title),
      sourceId: source.id,
      title: item.title,
      url: item.link,
      contentHtml: item.content,
      contentText: item.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      summary: item.description,
      publishedAt: new Date(item.pubDate).toISOString(),
      author: item.author,
      categories: item.categories,
      imageUrl: item.imageUrl,
    }));

    return { articles, error: null };
  } catch (error) {
    return { 
      articles: [], 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Validate a feed URL
export async function validateFeedUrl(url: string): Promise<{ 
  valid: boolean; 
  title?: string; 
  type?: Source['type']; 
  error?: string;
  siteUrl?: string;
}> {
  try {
    const text = await fetchWithProxy(url);
    const parsed = parseFeed(text);

    // Determine feed type
    let type: Source['type'] = 'rss';
    try {
      const json = JSON.parse(text);
      if (json.version?.startsWith('https://jsonfeed.org/')) {
        type = 'json';
      }
    } catch {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      if (doc.querySelector('feed')) {
        type = 'atom';
      }
    }

    return {
      valid: true,
      title: parsed.title,
      type,
      siteUrl: parsed.link,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid feed URL',
    };
  }
}

// Extract plain text from HTML for AI processing
export function extractTextContent(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}
