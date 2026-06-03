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

const state = {
  keywords: DEFAULT_KEYWORDS.map((label) => ({ label, active: ['Industry 4.0 conference', 'industrial automation expo', 'AI in manufacturing webinar', 'digital manufacturing workshop'].includes(label) })),
  events: [],
  theme: 'light',
};

const els = {
  keywordGrid: document.getElementById('keywordGrid'),
  selectedKeywordGrid: document.getElementById('selectedKeywordGrid'),
  keywordSearch: document.getElementById('keywordSearch'),
  clearKeywordBtn: document.getElementById('clearKeywordBtn'),
  selectVisibleKeywordBtn: document.getElementById('selectVisibleKeywordBtn'),
  customKeywords: document.getElementById('customKeywords'),
  fetchBtn: document.getElementById('fetchBtn'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  clearBtn: document.getElementById('clearBtn'),
  copyBtn: document.getElementById('copyBtn'),
  exportBtn: document.getElementById('exportBtn'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  selectedOnly: document.getElementById('selectedOnly'),
  withImagesOnly: document.getElementById('withImagesOnly'),
  resultsCount: document.getElementById('resultsCount'),
  selectionSummary: document.getElementById('selectionSummary'),
  eventsList: document.getElementById('eventsList'),
  status: document.getElementById('status'),
  template: document.getElementById('eventTemplate'),
  statFetched: document.getElementById('statFetched'),
  statSelected: document.getElementById('statSelected'),
  statNotes: document.getElementById('statNotes'),
  statImages: document.getElementById('statImages'),
  themeToggle: document.getElementById('themeToggle'),
};

function init() {
  state.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  bindEvents();
  renderKeywords();
  renderEvents();
}

function bindEvents() {
  els.fetchBtn.addEventListener('click', fetchEvents);
  els.selectAllBtn.addEventListener('click', () => {
    getVisibleEvents().forEach((event) => { event.selected = true; });
    renderEvents();
  });
  els.clearBtn.addEventListener('click', () => {
    state.events.forEach((event) => { event.selected = false; });
    renderEvents();
  });
  els.copyBtn.addEventListener('click', copySelected);
  els.exportBtn.addEventListener('click', exportCsv);
  els.searchInput.addEventListener('input', renderEvents);
  els.sortSelect.addEventListener('change', renderEvents);
  els.selectedOnly.addEventListener('change', renderEvents);
  els.withImagesOnly.addEventListener('change', renderEvents);
  els.keywordSearch.addEventListener('input', renderKeywords);
  els.clearKeywordBtn.addEventListener('click', () => {
    state.keywords.forEach((keyword) => { keyword.active = false; });
    renderKeywords();
  });
  els.selectVisibleKeywordBtn.addEventListener('click', () => {
    const filter = els.keywordSearch.value.trim().toLowerCase();
    state.keywords.forEach((keyword) => {
      if (!filter || keyword.label.toLowerCase().includes(filter)) keyword.active = true;
    });
    renderKeywords();
  });
  els.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
  });
}

function renderKeywords() {
  const filter = els.keywordSearch.value.trim().toLowerCase();
  const visibleKeywords = state.keywords.filter((keyword) => !filter || keyword.label.toLowerCase().includes(filter));
  const selectedKeywords = state.keywords.filter((keyword) => keyword.active);

  els.keywordGrid.innerHTML = '';
  els.selectedKeywordGrid.innerHTML = '';

  selectedKeywords.forEach((keyword) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.textContent = keyword.label;
    button.addEventListener('click', () => {
      keyword.active = false;
      renderKeywords();
    });
    els.selectedKeywordGrid.appendChild(button);
  });

  visibleKeywords.forEach((keyword) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `chip ${keyword.active ? 'active' : ''}`;
    button.textContent = keyword.label;
    button.addEventListener('click', () => {
      keyword.active = !keyword.active;
      renderKeywords();
    });
    els.keywordGrid.appendChild(button);
  });

  if (!selectedKeywords.length) {
    els.selectedKeywordGrid.innerHTML = '<span class="muted">No keywords selected yet.</span>';
  }
  if (!visibleKeywords.length) {
    els.keywordGrid.innerHTML = '<span class="muted">No keywords match this filter.</span>';
  }
}

function getSelectedKeywords() {
  const picked = state.keywords.filter((item) => item.active).map((item) => item.label);
  const custom = els.customKeywords.value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return [...new Set([...picked, ...custom])];
}

async function fetchEvents() {
  const keywords = getSelectedKeywords();
  if (!keywords.length) {
    setStatus('Pick at least one keyword to search.');
    return;
  }

  setStatus('Fetching events...');
  els.fetchBtn.disabled = true;

  try {
    const response = await fetch(`/.netlify/functions/scrape?keywords=${encodeURIComponent(keywords.join('|'))}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to fetch events');
    }
    const data = await response.json();
    state.events = (data.items || []).map((item, index) => ({
      id: `${index}-${slugify(item.title)}`,
      title: item.title,
      link: item.link,
      source: item.source,
      pubDate: item.pubDate,
      keyword: item.keyword,
      myTake: item.myTake || '',
      selected: Boolean(item.selected),
      image: item.image || '',
    }));
    renderEvents();
    setStatus(`Fetched ${state.events.length} events.`);
  } catch (error) {
    console.error(error);
    setStatus(`Error: ${error.message}`);
  } finally {
    els.fetchBtn.disabled = false;
  }
}

function getVisibleEvents() {
  const search = els.searchInput.value.trim().toLowerCase();
  const selectedOnly = els.selectedOnly.checked;
  const withImagesOnly = els.withImagesOnly.checked;
  const sortBy = els.sortSelect.value;

  const filtered = state.events.filter((event) => {
    const haystack = [event.title, event.source, event.keyword, event.myTake].join(' ').toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (selectedOnly && !event.selected) return false;
    if (withImagesOnly && !event.image) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.pubDate) - new Date(b.pubDate);
    if (sortBy === 'source') return a.source.localeCompare(b.source);
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    return new Date(b.pubDate) - new Date(a.pubDate);
  });

  return filtered;
}

function renderEvents() {
  const visible = getVisibleEvents();
  els.eventsList.innerHTML = '';
  els.resultsCount.textContent = `${visible.length} result${visible.length === 1 ? '' : 's'}`;
  els.selectionSummary.textContent = `${state.events.filter((event) => event.selected).length} selected`;

  if (!visible.length) {
    els.eventsList.innerHTML = `
      <div class="panel empty-state">
        <h3>No results found.</h3>
        <p>Try different keywords or fetch a wider set of events.</p>
      </div>
    `;
    updateStats();
    return;
  }

  visible.forEach((event) => {
    const node = els.template.content.firstElementChild.cloneNode(true);

    node.querySelector('.event-title').textContent = event.title;
    node.querySelector('.event-source').textContent = event.source || 'Unknown source';
    node.querySelector('.event-date').textContent = formatDate(event.pubDate);
    node.querySelector('.event-keyword').textContent = event.keyword;

    const link = node.querySelector('.event-link');
    link.href = event.link;

    const checkbox = node.querySelector('.event-select');
    checkbox.checked = event.selected;
    checkbox.addEventListener('change', () => {
      event.selected = checkbox.checked;
      renderEvents();
    });

    const noteInput = node.querySelector('.note-input');
    noteInput.value = event.myTake;
    noteInput.addEventListener('input', () => {
      event.myTake = noteInput.value;
      updateStats();
    });

    const image = node.querySelector('.event-image');
    const placeholder = node.querySelector('.image-placeholder');
    updateImageUi(event, image, placeholder);

    node.querySelector('.image-fetch-btn').addEventListener('click', async (buttonEvent) => {
      const button = buttonEvent.currentTarget;
      button.disabled = true;
      button.textContent = 'Refreshing...';
      try {
        const response = await fetch(`/.netlify/functions/scrape?single=${encodeURIComponent(event.link)}&title=${encodeURIComponent(event.title)}&source=${encodeURIComponent(event.source)}`);
        const data = await response.json();
        event.image = data.image || event.image;
        updateImageUi(event, image, placeholder);
        updateStats();
        setStatus(`Updated photo for “${event.title}”.`);
      } catch (error) {
        setStatus(`Could not refresh photo for “${event.title}”.`);
      } finally {
        button.disabled = false;
        button.textContent = 'Refresh photo';
      }
    });

    node.querySelector('.image-clear-btn').addEventListener('click', () => {
      event.image = '';
      updateImageUi(event, image, placeholder);
      updateStats();
    });

    els.eventsList.appendChild(node);
  });

  updateStats();
}

function updateImageUi(event, imageEl, placeholderEl) {
  if (event.image) {
    imageEl.src = event.image;
    imageEl.alt = `${event.title} photo`;
    imageEl.hidden = false;
    placeholderEl.hidden = true;
    imageEl.onerror = () => {
      imageEl.hidden = true;
      placeholderEl.hidden = false;
    };
  } else {
    imageEl.hidden = true;
    imageEl.removeAttribute('src');
    placeholderEl.hidden = false;
  }
}

async function copySelected() {
  const selected = state.events.filter((event) => event.selected);
  if (!selected.length) {
    setStatus('Select at least one event to copy.');
    return;
  }

  const text = selected.map((event) => (
    `${event.title}\n${formatDate(event.pubDate)} · ${event.source}\n${event.link}\nKeyword: ${event.keyword}\nJeff's take: ${event.myTake || '—'}\nPhoto: ${event.image || '—'}`
  )).join('\n\n');

  await navigator.clipboard.writeText(text);
  setStatus(`Copied ${selected.length} selected event${selected.length === 1 ? '' : 's'}.`);
}

function exportCsv() {
  const selected = state.events.filter((event) => event.selected);
  const rows = (selected.length ? selected : state.events).map((event) => ({
    title: event.title,
    source: event.source,
    pubDate: formatDate(event.pubDate),
    keyword: event.keyword,
    link: event.link,
    myTake: event.myTake,
    image: event.image,
  }));

  if (!rows.length) {
    setStatus('Nothing to export yet.');
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [headers.join(',')].concat(rows.map((row) => headers.map((key) => csvEscape(row[key] || '')).join(','))).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'jeff-newsletter-events.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`Exported ${rows.length} event${rows.length === 1 ? '' : 's'} to CSV.`);
}

function updateStats() {
  els.statFetched.textContent = state.events.length;
  els.statSelected.textContent = state.events.filter((event) => event.selected).length;
  els.statNotes.textContent = state.events.filter((event) => event.myTake.trim()).length;
  els.statImages.textContent = state.events.filter((event) => event.image).length;
  els.selectionSummary.textContent = `${state.events.filter((event) => event.selected).length} selected`;
}

function setStatus(message) {
  els.status.textContent = message;
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function csvEscape(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

init();