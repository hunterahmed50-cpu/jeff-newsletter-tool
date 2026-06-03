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

const DEFAULT_ACTIVE = [
  'Industry 4.0 conference',
  'industrial automation expo',
  'AI in manufacturing webinar',
  'digital manufacturing workshop',
];

const state = {
  keywords: DEFAULT_KEYWORDS.map((label) => ({ label, active: DEFAULT_ACTIVE.includes(label) })),
  events: [],
  theme: 'light',
  view: 'events',
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
  goSelectedBtn: document.getElementById('goSelectedBtn'),
  backToEventsBtn: document.getElementById('backToEventsBtn'),
  downloadExcelBtn: document.getElementById('downloadExcelBtn'),
  showEventsViewBtn: document.getElementById('showEventsViewBtn'),
  showSelectedViewBtn: document.getElementById('showSelectedViewBtn'),
  searchInput: document.getElementById('searchInput'),
  sortSelect: document.getElementById('sortSelect'),
  selectedOnly: document.getElementById('selectedOnly'),
  resultsCount: document.getElementById('resultsCount'),
  selectionSummary: document.getElementById('selectionSummary'),
  eventsList: document.getElementById('eventsList'),
  status: document.getElementById('status'),
  template: document.getElementById('eventTemplate'),
  selectedPostTemplate: document.getElementById('selectedPostTemplate'),
  selectedPostsList: document.getElementById('selectedPostsList'),
  selectedCountPill: document.getElementById('selectedCountPill'),
  statFetched: document.getElementById('statFetched'),
  statSelected: document.getElementById('statSelected'),
  statNotes: document.getElementById('statNotes'),
  themeToggle: document.getElementById('themeToggle'),
  eventsView: document.getElementById('eventsView'),
  selectedView: document.getElementById('selectedView'),
};

function init() {
  state.theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.theme);
  bindEvents();
  renderKeywords();
  renderEvents();
  renderSelectedPosts();
  renderView();
}

function bindEvents() {
  els.fetchBtn.addEventListener('click', fetchEvents);
  els.selectAllBtn.addEventListener('click', () => {
    getVisibleEvents().forEach((event) => { event.selected = true; });
    renderEvents();
    renderSelectedPosts();
  });
  els.clearBtn.addEventListener('click', () => {
    state.events.forEach((event) => { event.selected = false; });
    renderEvents();
    renderSelectedPosts();
  });
  els.copyBtn.addEventListener('click', copySelected);
  els.goSelectedBtn.addEventListener('click', () => switchView('selected'));
  els.backToEventsBtn.addEventListener('click', () => switchView('events'));
  els.downloadExcelBtn.addEventListener('click', downloadExcel);
  els.showEventsViewBtn.addEventListener('click', () => switchView('events'));
  els.showSelectedViewBtn.addEventListener('click', () => switchView('selected'));
  els.searchInput.addEventListener('input', renderEvents);
  els.sortSelect.addEventListener('change', renderEvents);
  els.selectedOnly.addEventListener('change', renderEvents);
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

function switchView(view) {
  state.view = view;
  renderView();
  if (view === 'selected') renderSelectedPosts();
}

function renderView() {
  const showSelected = state.view === 'selected';
  els.eventsView.hidden = showSelected;
  els.selectedView.hidden = !showSelected;
  els.showEventsViewBtn.classList.toggle('active', !showSelected);
  els.showSelectedViewBtn.classList.toggle('active', showSelected);
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
      note: item.myTake || '',
      selected: Boolean(item.selected),
      jeffHeadline: '',
      jeffWriteup: '',
      priority: 'Medium',
    }));

    renderEvents();
    renderSelectedPosts();
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
  const sortBy = els.sortSelect.value;

  const filtered = state.events.filter((event) => {
    const haystack = [event.title, event.source, event.keyword, event.note].join(' ').toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (selectedOnly && !event.selected) return false;
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
      renderSelectedPosts();
    });

    const noteInput = node.querySelector('.note-input');
    noteInput.value = event.note;
    noteInput.addEventListener('input', () => {
      event.note = noteInput.value;
      updateStats();
    });

    els.eventsList.appendChild(node);
  });

  updateStats();
}

function renderSelectedPosts() {
  const selected = state.events.filter((event) => event.selected);
  els.selectedPostsList.innerHTML = '';
  els.selectedCountPill.textContent = `${selected.length} selected post${selected.length === 1 ? '' : 's'}`;

  if (!selected.length) {
    els.selectedPostsList.innerHTML = `
      <div class="panel empty-state">
        <h3>No selected posts yet.</h3>
        <p>Select events from the main list, then open this page to write Jeff's version.</p>
      </div>
    `;
    return;
  }

  selected.forEach((event) => {
    const node = els.selectedPostTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector('.selected-source').textContent = event.source || 'Unknown source';
    node.querySelector('.selected-date').textContent = formatDate(event.pubDate);
    node.querySelector('.selected-title').textContent = event.title;
    node.querySelector('.selected-keyword').textContent = event.keyword;

    const link = node.querySelector('.selected-link');
    link.href = event.link;

    const headlineInput = node.querySelector('.selected-headline');
    headlineInput.value = event.jeffHeadline;
    headlineInput.addEventListener('input', () => {
      event.jeffHeadline = headlineInput.value;
    });

    const writeupInput = node.querySelector('.selected-writeup');
    writeupInput.value = event.jeffWriteup;
    writeupInput.addEventListener('input', () => {
      event.jeffWriteup = writeupInput.value;
    });

    const priorityInput = node.querySelector('.selected-priority');
    priorityInput.value = event.priority;
    priorityInput.addEventListener('change', () => {
      event.priority = priorityInput.value;
    });

    node.querySelector('.remove-selected-btn').addEventListener('click', () => {
      event.selected = false;
      renderEvents();
      renderSelectedPosts();
    });

    els.selectedPostsList.appendChild(node);
  });
}

async function copySelected() {
  const selected = state.events.filter((event) => event.selected);
  if (!selected.length) {
    setStatus('Select at least one event to copy.');
    return;
  }

  const text = selected.map((event) => (
    `${event.title}\n${formatDate(event.pubDate)} · ${event.source}\n${event.link}\nKeyword: ${event.keyword}\nQuick note: ${event.note || '—'}`
  )).join('\n\n');

  await navigator.clipboard.writeText(text);
  setStatus(`Copied ${selected.length} selected event${selected.length === 1 ? '' : 's'}.`);
}

function downloadExcel() {
  const selected = state.events.filter((event) => event.selected);

  if (!selected.length) {
    setStatus('Select at least one post before downloading Excel.');
    return;
  }

  const rows = selected.map((event) => ({
    Title: event.title,
    Source: event.source,
    Date: formatDate(event.pubDate),
    Keyword: event.keyword,
    Link: event.link,
    QuickNote: event.note,
    JeffHeadline: event.jeffHeadline,
    JeffWriteup: event.jeffWriteup,
    Priority: event.priority,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Selected Posts');
  XLSX.writeFile(workbook, 'jeff-selected-posts.xlsx');

  setStatus(`Downloaded Excel with ${selected.length} selected post${selected.length === 1 ? '' : 's'}.`);
}

function updateStats() {
  els.statFetched.textContent = state.events.length;
  els.statSelected.textContent = state.events.filter((event) => event.selected).length;
  els.statNotes.textContent = state.events.filter((event) => event.note.trim()).length;
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

init();