const keywords = [
  "Industry 4.0 conference",
  "smart manufacturing summit",
  "industrial automation expo",
  "AI in manufacturing webinar",
  "digital manufacturing workshop",
  "IIoT conference",
  "digital twin manufacturing webinar",
  "OT cybersecurity manufacturing webinar",
  "connected worker summit",
  "predictive maintenance workshop",
  "manufacturing analytics conference",
  "robotics automation expo",
  "Industry 4.0 summit",
  "generative AI manufacturing event",
  "manufacturing leadership event"
];

let selectedKeywords = new Set(keywords.slice(0, 4));
let allEvents = [];
let shownEvents = [];

const els = {
  keywordSearch: document.getElementById("keywordSearch"),
  keywordList: document.getElementById("keywordList"),
  selectedKeywords: document.getElementById("selectedKeywords"),
  fetchBtn: document.getElementById("fetchBtn"),
  copyBtn: document.getElementById("copyBtn"),
  exportBtn: document.getElementById("exportBtn"),
  clearKeywordsBtn: document.getElementById("clearKeywordsBtn"),
  selectAllKeywordsBtn: document.getElementById("selectAllKeywordsBtn"),
  selectedOnlyToggle: document.getElementById("selectedOnlyToggle"),
  sortSelect: document.getElementById("sortSelect"),
  resultsList: document.getElementById("resultsList"),
  resultsSummary: document.getElementById("resultsSummary"),
  selectedCount: document.getElementById("selectedCount"),
  selectAllResultsBtn: document.getElementById("selectAllResultsBtn"),
  clearResultSelectionBtn: document.getElementById("clearResultSelectionBtn"),
  eventCardTemplate: document.getElementById("eventCardTemplate")
};

function normalizeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function getFilteredKeywords() {
  const q = els.keywordSearch.value.trim().toLowerCase();
  if (!q) return keywords;
  return keywords.filter(k => k.toLowerCase().includes(q));
}

function renderKeywordChips() {
  const visible = getFilteredKeywords();

  els.keywordList.innerHTML = "";
  visible.forEach(keyword => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `chip ${selectedKeywords.has(keyword) ? "active" : ""}`;
    btn.textContent = keyword;
    btn.addEventListener("click", () => {
      if (selectedKeywords.has(keyword)) selectedKeywords.delete(keyword);
      else selectedKeywords.add(keyword);
      renderKeywordChips();
      applyFiltersAndRender();
    });
    els.keywordList.appendChild(btn);
  });

  els.selectedKeywords.innerHTML = "";
  [...selectedKeywords].forEach(keyword => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip active";
    btn.textContent = keyword;
    btn.addEventListener("click", () => {
      selectedKeywords.delete(keyword);
      renderKeywordChips();
      applyFiltersAndRender();
    });
    els.selectedKeywords.appendChild(btn);
  });
}

function sortEvents(events) {
  const mode = els.sortSelect.value;
  const copy = [...events];

  if (mode === "date-asc") return copy.sort((a, b) => normalizeDate(a.date) - normalizeDate(b.date));
  if (mode === "source-asc") return copy.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
  return copy.sort((a, b) => normalizeDate(b.date) - normalizeDate(a.date));
}

function applyFiltersAndRender() {
  let filtered = [...allEvents];

  if (selectedKeywords.size) {
    filtered = filtered.filter(event =>
      (event.keywords || []).some(k => selectedKeywords.has(k))
    );
  }

  if (els.selectedOnlyToggle.checked) {
    filtered = filtered.filter(event => event.selected);
  }

  shownEvents = sortEvents(filtered);
  renderEvents(shownEvents);
}

function renderEvents(events) {
  els.resultsList.innerHTML = "";
  els.resultsSummary.textContent = `${events.length} result${events.length === 1 ? "" : "s"}`;
  els.selectedCount.textContent = allEvents.filter(e => e.selected).length;

  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "panel";
    empty.style.padding = "24px";
    empty.innerHTML = `<strong>No results found.</strong><p class="muted">Try different keywords or fetch a wider set of events.</p>`;
    els.resultsList.appendChild(empty);
    return;
  }

  events.forEach(event => {
    const node = els.eventCardTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".event-checkbox");
    const link = node.querySelector(".event-link");
    const source = node.querySelector(".event-source");
    const date = node.querySelector(".event-date");
    const tags = node.querySelector(".event-tags");
    const note = node.querySelector(".event-note");

    if (event.selected) node.classList.add("is-selected");

    checkbox.checked = !!event.selected;
    checkbox.addEventListener("change", () => {
      event.selected = checkbox.checked;
      applyFiltersAndRender();
    });

    link.textContent = event.title || "Untitled event";
    link.href = event.url || "#";

    source.textContent = event.source || "Unknown source";
    date.textContent = event.date || "No date";

    (event.keywords || []).forEach(tagText => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = tagText;
      tags.appendChild(tag);
    });

    note.value = event.note || "";
    note.addEventListener("input", e => {
      event.note = e.target.value;
    });

    els.resultsList.appendChild(node);
  });
}

async function fetchEvents() {
  els.fetchBtn.disabled = true;
  els.fetchBtn.textContent = "Fetching...";

  try {
    // Replace this with your real fetch logic.
    allEvents = [
      {
        title: "PDF Solutions Schedules CONNECT 2026 Conference to Focus on Semiconductor Manufacturing Analytics",
        url: "https://example.com/event-1",
        source: "geneonline.com",
        date: "2026-06-02",
        keywords: ["manufacturing analytics conference"],
        selected: true,
        note: ""
      },
      {
        title: "PDF Solutions Announces PDF Solutions CONNECT 2026 Conference",
        url: "https://example.com/event-2",
        source: "GlobeNewswire",
        date: "2026-06-02",
        keywords: ["manufacturing analytics conference"],
        selected: true,
        note: ""
      }
    ];

    applyFiltersAndRender();
  } finally {
    els.fetchBtn.disabled = false;
    els.fetchBtn.textContent = "Fetch events";
  }
}

function copySelected() {
  const selected = allEvents.filter(e => e.selected);
  const text = selected.map(e =>
    `${e.title}\n${e.source} — ${e.date}\n${e.url}\nJeff's take: ${e.note || ""}`
  ).join("\n\n");

  navigator.clipboard.writeText(text);
}

function exportCSV() {
  const selected = allEvents.filter(e => e.selected);
  const rows = [
    ["title", "source", "date", "url", "keywords", "note"],
    ...selected.map(e => [
      e.title || "",
      e.source || "",
      e.date || "",
      e.url || "",
      (e.keywords || []).join(" | "),
      e.note || ""
    ])
  ];

  const csv = rows
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "selected-events.csv";
  a.click();
  URL.revokeObjectURL(url);
}

els.keywordSearch.addEventListener("input", renderKeywordChips);
els.sortSelect.addEventListener("change", applyFiltersAndRender);
els.selectedOnlyToggle.addEventListener("change", applyFiltersAndRender);
els.fetchBtn.addEventListener("click", fetchEvents);
els.copyBtn.addEventListener("click", copySelected);
els.exportBtn.addEventListener("click", exportCSV);

els.clearKeywordsBtn.addEventListener("click", () => {
  selectedKeywords.clear();
  renderKeywordChips();
  applyFiltersAndRender();
});

els.selectAllKeywordsBtn.addEventListener("click", () => {
  getFilteredKeywords().forEach(k => selectedKeywords.add(k));
  renderKeywordChips();
  applyFiltersAndRender();
});

els.selectAllResultsBtn.addEventListener("click", () => {
  shownEvents.forEach(e => { e.selected = true; });
  applyFiltersAndRender();
});

els.clearResultSelectionBtn.addEventListener("click", () => {
  allEvents.forEach(e => { e.selected = false; });
  applyFiltersAndRender();
});

renderKeywordChips();
renderEvents([]);