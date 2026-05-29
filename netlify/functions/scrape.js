const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({ ignoreAttributes: false });

const DEFAULT_KEYWORDS = [
  'Industry 4.0 conference',
  'smart manufacturing summit',
  'industrial automation expo',
  'AI in manufacturing webinar',
  'digital manufacturing workshop',
  'IIoT conference',
  'digital twin manufacturing webinar',
  'OT cybersecurity manufacturing webinar',
  'connected worker summit',
  'predictive maintenance workshop',
  'manufacturing analytics conference',
  'robotics automation expo',
  'Industry 4.0 summit',
  'generative AI manufacturing event',
  'manufacturing leadership event',
];

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const customKeywords = params.keywords
    ? params.keywords.split(',').map(k => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;

  const results = [];

  for (const keyword of customKeywords) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const xml = await res.text();
      const parsed = parser.parse(xml);
      const items = parsed?.rss?.channel?.item || [];
      const list = Array.isArray(items) ? items : [items];

      for (const item of list.slice(0, 5)) {
        results.push({
          title: item.title || '',
          link: item.link || '',
          source: item.source?.['#text'] || String(item.source || ''),
          pubDate: item.pubDate || '',
          keyword,
        });
      }
    } catch (err) {
      console.error(`Failed for keyword "${keyword}":`, err.message);
    }
  }

  // deduplicate by title
  const seen = new Set();
  const unique = results.filter(r => {
    if (!r.title || seen.has(r.title)) return false;
    seen.add(r.title);
    return true;
  });

  // sort by date descending
  unique.sort((a, b) => {
    const da = new Date(a.pubDate);
    const db = new Date(b.pubDate);
    return isNaN(db) ? -1 : isNaN(da) ? 1 : db - da;
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(unique),
  };
};