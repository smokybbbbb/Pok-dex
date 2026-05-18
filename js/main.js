/* global CONFIG */

// ─── State ────────────────────────────────────────────────────────────────────
let allPokemon    = [];
let filtered      = [];
let page          = 0;
let activeType    = 'all';
let searchQuery   = '';
let isLoadingMore = false;

const typeCache     = {};   // id  → string[]  (pokemon types)
const typeListCache = {};   // type name → Set<string> (pokemon names)

const { api, pagination, scroll, typeColors, statLabels } = CONFIG;

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const res  = await fetch(`${api.base}/pokemon?limit=1025&offset=0`);
  const data = await res.json();
  allPokemon = data.results.map((p, i) => ({ ...p, id: i + 1 }));
  applyFilters();
}

// ─── Filters ──────────────────────────────────────────────────────────────────
async function applyFilters() {
  let pool = allPokemon;

  if (activeType !== 'all') {
    if (!typeListCache[activeType]) {
      const res  = await fetch(`${api.base}/type/${activeType}`);
      const data = await res.json();
      typeListCache[activeType] = new Set(data.pokemon.map(p => p.pokemon.name));
    }
    pool = pool.filter(p => typeListCache[activeType].has(p.name));
  }

  if (searchQuery) {
    if (!isNaN(searchQuery)) {
      pool = pool.filter(p => getIdFromUrl(p.url) === parseInt(searchQuery));
    } else {
      pool = pool.filter(p => p.name.includes(searchQuery));
    }
  }

  filtered = pool;
  renderPage(true);
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderPage(reset) {
  const content = document.getElementById('content');

  if (reset) {
    page = 0;
    content.innerHTML = '';
  }

  const chunk = filtered.slice(page * pagination.perPage, (page + 1) * pagination.perPage);
  if (!chunk.length && page === 0) {
    content.innerHTML = `<div class="empty"><div class="icon">?</div><p>No Pokémon found</p></div>`;
    return;
  }

  const grid = reset
    ? (() => { const g = document.createElement('div'); g.className = 'grid'; content.appendChild(g); return g; })()
    : content.querySelector('.grid');

  chunk.forEach((p, i) => {
    const id     = getIdFromUrl(p.url);
    const sprite = `${api.sprites}/${id}.png`;
    const card   = document.createElement('div');
    card.className = 'card';
    card.style.animationDelay = `${(i % pagination.perPage) * 18}ms`;
    card.innerHTML = `
      <p class="card-num">#${String(id).padStart(4, '0')}</p>
      <img class="card-sprite" src="${sprite}" alt="${p.name}" loading="lazy" />
      <p class="card-name">${p.name}</p>
      <div class="types" id="types-${id}"></div>
    `;
    card.addEventListener('click', () => openModal(id));
    grid.appendChild(card);
    fetchTypes(id);
  });

  // sentinel for infinite scroll
  const existing = content.querySelector('.sentinel');
  if (existing) existing.remove();

  if ((page + 1) * pagination.perPage < filtered.length) {
    const sentinel = document.createElement('div');
    sentinel.className = 'sentinel';
    content.appendChild(sentinel);
    scrollObserver.observe(sentinel);
  }
}

// ─── Infinite scroll ──────────────────────────────────────────────────────────
const scrollObserver = new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting || isLoadingMore) return;
  if ((page + 1) * pagination.perPage >= filtered.length) return;
  isLoadingMore = true;
  page++;
  renderPage(false);
  isLoadingMore = false;
}, { rootMargin: scroll.sentinelMargin });

// ─── Type fetching ────────────────────────────────────────────────────────────
async function fetchTypes(id) {
  if (typeCache[id]) { applyTypes(id, typeCache[id]); return; }
  try {
    const res  = await fetch(`${api.base}/pokemon/${id}`);
    const data = await res.json();
    const types = data.types.map(t => t.type.name);
    typeCache[id] = types;
    applyTypes(id, types);
  } catch (_) {}
}

function applyTypes(id, types) {
  const container = document.getElementById(`types-${id}`);
  if (!container) return;
  const color = typeColors[types[0]] || '#888';
  const card  = container.closest('.card');
  if (card) card.style.setProperty('--type-color', color);
  container.innerHTML = types
    .map(t => `<span class="type-badge" style="background:${typeColors[t] || '#888'}">${t}</span>`)
    .join('');
}

// ─── Search ───────────────────────────────────────────────────────────────────
let searchTimer;
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = e.target.value.trim().toLowerCase();
    applyFilters();
  }, 220);
});

// ─── Type filter chips ────────────────────────────────────────────────────────
document.getElementById('filter-bar').addEventListener('click', async e => {
  const chip = e.target.closest('.filter-chip');
  if (!chip || chip.classList.contains('loading')) return;

  const type = chip.dataset.type;
  if (type === activeType) return;

  document.querySelectorAll('.filter-chip').forEach(c => {
    c.classList.remove('active');
    c.style.background = c.style.borderColor = c.style.color = '';
  });

  chip.classList.add('active');
  const color = type === 'all' ? '#1a1a1a' : (typeColors[type] || '#888');
  chip.style.background = chip.style.borderColor = color;

  if (type !== 'all' && !typeListCache[type]) chip.classList.add('loading');

  activeType = type;
  await applyFilters();
  chip.classList.remove('loading');
});

// ─── Modal ────────────────────────────────────────────────────────────────────
const overlay    = document.getElementById('overlay');
const modalClose = document.getElementById('modal-close');

overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

async function openModal(id) {
  const body = document.getElementById('modal-body');
  body.innerHTML = `<div style="display:flex;justify-content:center;padding:40px 0"><div class="spinner"></div></div>`;
  overlay.classList.add('open');

  try {
    const [poke, species] = await Promise.all([
      fetch(`${api.base}/pokemon/${id}`).then(r => r.json()),
      fetch(`${api.base}/pokemon-species/${id}`).then(r => r.json()).catch(() => null),
    ]);

    const types  = poke.types.map(t => t.type.name);
    const color  = typeColors[types[0]] || '#888';
    const sprite = poke.sprites?.other?.['official-artwork']?.front_default
                || poke.sprites?.front_default
                || `${api.sprites}/${id}.png`;

    const flavor = species?.flavor_text_entries
      ?.find(e => e.language.name === 'en')
      ?.flavor_text?.replace(/\f/g, ' ') || '';

    const statRows = poke.stats.map(s => {
      const name = statLabels[s.stat.name] || s.stat.name;
      const val  = s.base_stat;
      const pct  = Math.min(100, Math.round(val / 255 * 100));
      return `
        <div class="stat-row">
          <span class="stat-name">${name}</span>
          <span class="stat-val">${val}</span>
          <div class="stat-bar-bg">
            <div class="stat-bar-fill" style="--type-color:${color}" data-pct="${pct}"></div>
          </div>
        </div>`;
    }).join('');

    body.innerHTML = `
      <div class="modal-header">
        <p class="modal-num">#${String(id).padStart(4, '0')}</p>
        <img class="modal-sprite" src="${sprite}" alt="${poke.name}" />
        <h2 class="modal-name">${poke.name}</h2>
        <div class="types" style="justify-content:center;margin-bottom:${flavor ? '14px' : '0'}">
          ${types.map(t => `<span class="type-badge" style="background:${typeColors[t] || '#888'}">${t}</span>`).join('')}
        </div>
        ${flavor ? `<p style="font-size:13px;color:#666;line-height:1.6;margin-top:12px">${flavor}</p>` : ''}
      </div>

      <div class="modal-section">
        <p class="modal-label">Profile</p>
        <div class="info-row">
          <div class="info-chip">
            <div class="val">${(poke.height / 10).toFixed(1)}m</div>
            <div class="key">Height</div>
          </div>
          <div class="info-chip">
            <div class="val">${(poke.weight / 10).toFixed(1)}kg</div>
            <div class="key">Weight</div>
          </div>
          <div class="info-chip">
            <div class="val">${poke.base_experience || '—'}</div>
            <div class="key">Base XP</div>
          </div>
        </div>
      </div>

      <div class="modal-section">
        <p class="modal-label">Base Stats</p>
        ${statRows}
      </div>
    `;

    requestAnimationFrame(() => {
      setTimeout(() => {
        document.querySelectorAll('.stat-bar-fill').forEach(el => {
          el.style.width = el.dataset.pct + '%';
        });
      }, 120);
    });

  } catch (_) {
    body.innerHTML = `<p style="text-align:center;color:#888;padding:40px">Failed to load data.</p>`;
  }
}

function closeModal() {
  overlay.classList.remove('open');
}

// ─── Go to top ────────────────────────────────────────────────────────────────
const goTop = document.getElementById('go-top');

window.addEventListener('scroll', () => {
  goTop.classList.toggle('visible', window.scrollY > scroll.goTopThreshold);
}, { passive: true });

goTop.addEventListener('click', () => {
  // ripple
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = goTop.offsetWidth;
  r.style.cssText = `width:${size}px;height:${size}px;left:0;top:0`;
  goTop.appendChild(r);
  r.addEventListener('animationend', () => r.remove());

  // flash
  const flash = document.createElement('div');
  flash.className = 'top-flash';
  document.body.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove());

  // eased scroll
  const start     = window.scrollY;
  const duration  = Math.min(scroll.scrollDuration, start * scroll.scrollFactor);
  const startTime = performance.now();
  const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  const step = now => {
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, start * (1 - easeOutExpo(t)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getIdFromUrl(url) {
  return parseInt(url.split('/').filter(Boolean).pop());
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
