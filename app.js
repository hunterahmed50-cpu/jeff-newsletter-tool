const ALL_KEYWORDS = [
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

let activeKeywords = new Set(ALL_KEYWORDS);
let currentResults = [];

function init() {
  const tagContainer = document.getElementById('keyword-tags');
  ALL_KEYWORDS.forEach(kw => {
    const tag = document.createElement('button');
    tag.className = 'tag active';
    tag.textContent = kw;
    tag.setAttribute('data-kw', kw);
    tag.addEventListener('click', () => {
      if (activeKeywords.has(kw)) {
        activeKeywords.delete(kw);
        tag.classList.remove('active');
      } else {
        activeKeywords.add(kw);
        tag.classList.add('active');
      }
    });
    tagContainer.appendChild(tag);
  });

  document.getElementById('fetch-btn').addEventListener('click', fetchEvents);
  document.getElementById('copy-btn').addEventListener('click', copySelected);
  document.getElementById('csv-btn').addEventListener('click', exportCSV);
  document.getElementById('select-all-btn').addEventListener('click', selectAll);
}

async function fetchEvents() {
  const btn = document.getElementById('fetch-btn');
  const status = document.getElementById('status');
  const resultsEl = document.getElementById('results');

  if (activeKeywords.size === 0) {
    alert('Please select at least one keyword.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Fetching…';
  status.textContent = '';
  resultsEl.innerHTML = '';

  try {
    const params = new URLSearchParams({ keywords: [...activeKeywords].join(',') });
    const res = await fetch(`/.netlify/functions/scrape?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    currentResults = await res.json();
    renderResults(currentResults);
    status.textContent = `${currentResults.length} results found`;
  } catch (err) {
    status.textContent = 'Error fetching results. Try again.';
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Fetch events';
  }
}

function renderResults(items) {
  const resultsEl = document.getElementById('results');

  if (items.length === 0) {
    resultsEl.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
        </svg>
        <h3>No results found</h3>
        <p>Try different keywords or fetch again later.</p>
      </div>`;
    return;
  }

  resultsEl.innerHTML = items.map((item, i) => `
    <div class="result-card" data-index="${i}">
      <input type="checkbox" id="check-${i}" checked>
      <div>
        <div class="result-title">
          <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
        </div>
        <div class="result-meta">
          <span>${item.source || 'Unknown source'}</span>
          <span>${item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-GB') : ''}</span>
        </div>
        <div class="result-keyword">${item.keyword}</div>
        <div class="my-take-label">My Take</div>
        <textarea class="my-take-input" id="take-${i}" placeholder="Add Jeff's take on this event…"></textarea>
      </div>
    </div>
  `).join('');
}

function getSelected() {
  return currentResults
    .map((item, i) => {
      const checked = document.getElementById(`check-${i}`)?.checked;
      const take = document.getElementById(`take-${i}`)?.value || '';
      return checked ? { ...item, take } : null;
    })
    .filter(Boolean);
}

function selectAll() {
  currentResults.forEach((_, i) => {
    const cb = document.getElementById(`check-${i}`);
    if (cb) cb.checked = true;
  });
}

function copySelected() {
  const selected = getSelected();
  if (selected.length === 0) { alert('No items selected.'); return; }

  const text = selected.map(item => {
    const date = item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-GB') : '';
    let out = `📌 ${item.title}\n🔗 ${item.link}\n📅 ${date} | ${item.source}`;
    if (item.take.trim()) out += `\n💬 My Take: ${item.take.trim()}`;
    return out;
  }).join('\n\n');

  navigator.clipboard.writeText(text)
    .then(() => alert(`${selected.length} item(s) copied to clipboard.`))
    .catch(() => alert('Copy failed. Please copy manually.'));
}

function exportCSV() {
  const selected = getSelected();
  if (selected.length === 0) { alert('No items selected.'); return; }

  const headers = ['Title', 'Source', 'Date', 'Link', 'Keyword', 'My Take'];
  const rows = selected.map(item => [
    item.title,
    item.source,
    item.pubDate ? new Date(item.pubDate).toLocaleDateString('en-GB') : '',
    item.link,
    item.keyword,
    item.take,
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `jeff-newsletter-events-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

document.addEventListener('DOMContentLoaded', init);