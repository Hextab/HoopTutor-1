import { getFavorites, toggleFavorite, onFavoritesChange, cacheCatalog, getCachedCatalog } from './state.js';

const DATA_URL = '/static/data/drills.json';
let catalogPromise = null;

async function fetchCatalog() {
  if (catalogPromise) return catalogPromise;
  catalogPromise = (async () => {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`Failed to load catalog: ${response.status}`);
      const data = await response.json();
      cacheCatalog(data);
      return data;
    } catch (err) {
      console.warn('Falling back to cached catalog', err);
      const cached = getCachedCatalog();
      if (cached) return cached;
      throw err;
    }
  })();
  return catalogPromise;
}

function updateHero(category, scope) {
  if (!category || !scope) return;
  const heroImage = scope.querySelector('[data-category-hero-image]');
  if (heroImage && category.heroImage) {
    heroImage.src = `/${category.heroImage}`.replace(/\/\//g, '/');
    heroImage.alt = `${category.name} training visual`;
  }
  const eyebrow = scope.querySelector('[data-category-eyebrow]');
  if (eyebrow) {
    eyebrow.textContent = `${category.name} Pathway`;
  }
  const title = scope.querySelector('[data-category-title]');
  if (title) {
    title.textContent = category.headline || category.name;
  }
  const description = scope.querySelector('[data-category-description]');
  if (description) {
    description.textContent = category.description || category.tagline || '';
  }
  const focusList = scope.querySelector('[data-category-focus-list]');
  if (focusList) {
    focusList.innerHTML = '';
    (category.focusAreas || []).slice(0, 4).forEach((item) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = item;
      focusList.appendChild(pill);
    });
  }
}

function applyFocusOptions(select, options) {
  if (!select) return;
  const unique = Array.from(new Set(options)).sort();
  unique.forEach((value) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });
}

function buildMedia(drill) {
  const wrapper = document.createElement('div');
  wrapper.className = 'resource-card__media';
  const badge = document.createElement('span');
  badge.className = 'resource-card__type';
  badge.textContent = drill.media?.type ? drill.media.type.toUpperCase() : 'RESOURCE';
  wrapper.appendChild(badge);

  const type = drill.media?.type || 'image';
  if (type === 'video') {
    if (navigator.onLine) {
      const iframe = document.createElement('iframe');
      iframe.src = drill.media.url;
      iframe.title = `${drill.title} video demonstration`;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.loading = 'lazy';
      wrapper.appendChild(iframe);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'resource-card__details';
      fallback.textContent = 'Connect to the internet to stream this drill walkthrough.';
      wrapper.appendChild(fallback);
    }
  } else if (type === 'article') {
    const articleBox = document.createElement('div');
    articleBox.className = 'resource-card__details';
    wrapper.appendChild(articleBox);
    if (navigator.onLine) {
      articleBox.appendChild(document.createTextNode('External resource – tap to view guide.'));
      articleBox.appendChild(document.createElement('br'));
      const link = document.createElement('a');
      link.href = drill.media.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open linked resource';
      link.className = 'btn btn--primary';
      articleBox.appendChild(link);
    } else {
      articleBox.textContent = 'Offline: reconnect to open the linked recovery guide.';
    }
  } else {
    const img = document.createElement('img');
    img.src = `/${drill.media?.url || ''}`.replace(/\/\//g, '/');
    img.alt = `${drill.title} illustration`;
    wrapper.appendChild(img);
  }

  return wrapper;
}

function buildList(items) {
  const list = document.createElement('ul');
  list.className = 'resource-card__list';
  items.forEach((step) => {
    const li = document.createElement('li');
    li.textContent = step;
    list.appendChild(li);
  });
  return list;
}

function formatFavoriteButton(button, isActive) {
  button.dataset.active = String(isActive);
  const icon = isActive ? '★' : '☆';
  button.innerHTML = `<span class="favorite-toggle__icon">${icon}</span>${isActive ? 'Saved' : 'Save to favourites'}`;
}

function createCard(drill, favorites) {
  const card = document.createElement('article');
  card.className = 'resource-card';
  card.dataset.drillId = drill.id;
  card.dataset.categoryId = drill.categoryId;
  card.dataset.focus = drill.focus;
  card.dataset.skill = drill.skillLevel;

  card.appendChild(buildMedia(drill));

  const title = document.createElement('h3');
  title.className = 'resource-card__title';
  title.textContent = drill.title;
  card.appendChild(title);

  const summary = document.createElement('p');
  summary.className = 'resource-card__summary';
  summary.textContent = drill.summary;
  card.appendChild(summary);

  const meta = document.createElement('div');
  meta.className = 'resource-card__meta';

  if (drill.skillLevel) {
    const skill = document.createElement('span');
    skill.className = 'pill pill--skill';
    skill.textContent = drill.skillLevel;
    meta.appendChild(skill);
  }
  if (drill.focus) {
    const focus = document.createElement('span');
    focus.className = 'pill';
    focus.textContent = drill.focus;
    meta.appendChild(focus);
  }
  if (drill.duration) {
    const duration = document.createElement('span');
    duration.className = 'pill';
    duration.textContent = drill.duration;
    meta.appendChild(duration);
  }
  card.appendChild(meta);

  if (Array.isArray(drill.instructions) && drill.instructions.length) {
    const instructionsTitle = document.createElement('h4');
    instructionsTitle.textContent = 'Instructions';
    card.appendChild(instructionsTitle);
    card.appendChild(buildList(drill.instructions));
  }

  if (Array.isArray(drill.equipment) && drill.equipment.length) {
    const equipmentTitle = document.createElement('h4');
    equipmentTitle.textContent = 'Equipment';
    card.appendChild(equipmentTitle);
    card.appendChild(buildList(drill.equipment));
  }

  if (drill.coachingCue) {
    const cue = document.createElement('p');
    cue.className = 'resource-card__details';
    cue.innerHTML = `<strong>Coaching cue:</strong> ${drill.coachingCue}`;
    card.appendChild(cue);
  }

  const favButton = document.createElement('button');
  favButton.type = 'button';
  favButton.className = 'favorite-toggle';
  favButton.dataset.drillId = drill.id;
  formatFavoriteButton(favButton, favorites.includes(drill.id));
  card.appendChild(favButton);

  return card;
}

function filterDrills(drills, filters) {
  const keyword = (filters.keyword || '').trim().toLowerCase();
  return drills.filter((drill) => {
    const matchSkill = !filters.skill || drill.skillLevel === filters.skill;
    const matchFocus = !filters.focus || drill.focus === filters.focus;
    const matchCategory = !filters.category || drill.categoryId === filters.category;
    const matchKeyword = !keyword || [
      drill.title,
      drill.summary,
      drill.instructions?.join(' '),
      drill.equipment?.join(' ')
    ].filter(Boolean).join(' ').toLowerCase().includes(keyword);
    return matchSkill && matchFocus && matchCategory && matchKeyword;
  });
}

function setupFavoriteListeners(container) {
  const handleClick = (event) => {
    const button = event.target.closest('.favorite-toggle');
    if (!button) return;
    const drillId = button.dataset.drillId;
    if (!drillId) return;
    const { active } = toggleFavorite(drillId);
    formatFavoriteButton(button, active);
  };
  container.addEventListener('click', handleClick);
}

export async function initCategoryPage(categoryId) {
  const heroScope = document.querySelector('[data-category-hero="' + categoryId + '"]');
  const panel = document.querySelector('[data-drill-page="' + categoryId + '"]');
  const grid = document.querySelector('[data-resource-grid]');
  const emptyState = document.querySelector('[data-empty-state]');
  if (!panel || !grid) return;

  const catalog = await fetchCatalog();
  const category = catalog.categories.find((cat) => cat.id === categoryId);
  updateHero(category, heroScope || document);

  const drills = catalog.drills.filter((drill) => drill.categoryId === categoryId);

  const skillSelect = panel.querySelector('[data-filter="skill"]');
  const focusSelect = panel.querySelector('[data-filter="focus"]');
  applyFocusOptions(skillSelect, drills.map((d) => d.skillLevel));
  applyFocusOptions(focusSelect, drills.map((d) => d.focus));

  const filters = { keyword: '', skill: '', focus: '' };

  const render = () => {
    const favorites = getFavorites();
    grid.innerHTML = '';
    const filtered = filterDrills(drills, filters);
    if (!filtered.length) {
      emptyState?.removeAttribute('hidden');
      return;
    }
    emptyState?.setAttribute('hidden', '');
    filtered.forEach((drill) => {
      grid.appendChild(createCard(drill, favorites));
    });
  };

  const keywordInput = panel.querySelector('[data-filter="keyword"]');
  keywordInput?.addEventListener('input', (event) => {
    filters.keyword = event.target.value;
  });

  skillSelect?.addEventListener('change', (event) => {
    filters.skill = event.target.value;
  });

  focusSelect?.addEventListener('change', (event) => {
    filters.focus = event.target.value;
  });

  panel.querySelector('[data-action="apply"]')?.addEventListener('click', () => render());
  panel.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
    filters.keyword = '';
    filters.skill = '';
    filters.focus = '';
    if (keywordInput) keywordInput.value = '';
    if (skillSelect) skillSelect.value = '';
    if (focusSelect) focusSelect.value = '';
    render();
  });

  onFavoritesChange(() => render());
  setupFavoriteListeners(grid);
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  render();
}

export async function initLibraryPage() {
  const grid = document.querySelector('[data-library-grid]');
  const panel = document.querySelector('[data-library-filter-panel]');
  const emptyState = document.querySelector('[data-empty-state]');
  if (!grid || !panel) return;

  const catalog = await fetchCatalog();
  const filters = { category: '', skill: '', focus: '', keyword: '' };

  const populateSelect = (select, options) => {
    if (!select) return;
    const unique = Array.from(new Set(options)).sort();
    unique.forEach((value) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
  };

  populateSelect(panel.querySelector('[data-filter="category"]'), catalog.categories.map((c) => c.id));
  populateSelect(panel.querySelector('[data-filter="skill"]'), catalog.drills.map((d) => d.skillLevel));
  populateSelect(panel.querySelector('[data-filter="focus"]'), catalog.drills.map((d) => d.focus));

  const render = () => {
    const favorites = getFavorites();
    const favouriteDrills = catalog.drills.filter((drill) => favorites.includes(drill.id));
    const filtered = filterDrills(favouriteDrills, filters);
    grid.innerHTML = '';
    if (!filtered.length) {
      emptyState?.removeAttribute('hidden');
      return;
    }
    emptyState?.setAttribute('hidden', '');
    filtered.forEach((drill) => {
      const card = createCard(drill, favorites);
      const categoryName = catalog.categories.find((cat) => cat.id === drill.categoryId)?.name;
      if (categoryName) {
        const badge = document.createElement('span');
        badge.className = 'pill';
        badge.textContent = categoryName;
        card.querySelector('.resource-card__meta')?.appendChild(badge);
      }
      grid.appendChild(card);
    });
  };

  Array.from(panel.querySelectorAll('[data-filter]')).forEach((input) => {
    const key = input.dataset.filter;
    input.addEventListener('input', (event) => {
      filters[key] = event.target.value;
      render();
    });
  });

  panel.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
    Object.keys(filters).forEach((key) => {
      filters[key] = '';
    });
    Array.from(panel.querySelectorAll('[data-filter]')).forEach((input) => {
      input.value = '';
    });
    render();
  });

  onFavoritesChange(() => render());
  setupFavoriteListeners(grid);
  window.addEventListener('online', render);
  window.addEventListener('offline', render);
  render();
}

export { fetchCatalog };
