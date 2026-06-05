const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

const DEFAULT_KEYWORDS = [
  'Industry 4.0 conference',
  'smart manufacturing conference',
  'industrial automation conference',
  'manufacturing summit',
  'manufacturing expo',
  'robotics expo manufacturing',
  'IIoT conference',
  'digital twin manufacturing',
  'manufacturing analytics conference',
  'manufacturing event',
  'factory automation event',
  'industrial AI conference',
];

function cleanTitle(title = '') {
  return title.replace(/\s*-\s*[^-]+$/, '').trim();
}

function absoluteUrl(value, base) {
  if (!value) return '';
  try {
    return new URL(value, base).toString();
  } catch {
    return '';
  }
}

function extractMetaImage(html, baseUrl) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const src = absoluteUrl(match[1], baseUrl);
      if (src && !src.includes('logo') && !src.includes('icon')) return src;
    }
  }
  return '';
}

async function resolveArticleImage(link) {
  if (!link) return '';
  try {
    const res = await fetch(link, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const html = await res.text();
    return extractMetaImage(html, res.url || link);
  } catch {
    return '';
  }
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const params = event.queryStringParameters || {};

  if (params.single) {
    const image = await resolveArticleImage(params.single);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        image,
        title: params.title || '',
        source: params.source || '',
      }),
    };
  }

  const customKeywords = params.keywords
    ? params.keywords.split('|').map(k => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;
  const days = params.days === '7' ? 7 : 30;

  const results = [];

  for (const keyword of customKeywords) {
    try {
      const q = `${keyword} when:${days}d`;
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const parsed = parser.parse(xml);
      const items = parsed?.rss?.channel?.item || [];
      const list = Array.isArray(items) ? items : [items];

      for (const item of list.slice(0, 10)) {
        const title = typeof item.title === 'string' ? item.title : item.title?.['#text'] || '';
        const link = typeof item.link === 'string' ? item.link : item.link?.['#text'] || '';
        const source = typeof item.source === 'string' ? item.source : item.source?.['#text'] || 'Unknown';
        const pubDate = item.pubDate || '';

        if (!title) continue;

        results.push({
          title: cleanTitle(title),
          link,
          source,
          pubDate,
          keyword,
          myTake: '',
          selected: false,
          image: '',
        });
      }
    } catch (e) {
      console.error(`Failed for keyword "${keyword}":`, e.message);
    }
  }

  const seen = new Set();
  const unique = results.filter((r) => {
    const key = `${r.title.toLowerCase().slice(0, 100)}|${r.source.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  unique.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ items: unique, count: unique.length }),
  };
};
