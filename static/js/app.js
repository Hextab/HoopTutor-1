import { initCategoryPage, initLibraryPage, fetchCatalog, selectDrillOfDay } from './drill-library.js';
import {
  getProfile,
  setProfile,
  clearProfile,
  onProfileChange,
  onFavoritesChange,
  getFavorites,
  setFavorites,
  registerFavoritesSyncer,
  clearFavorites,
} from './state.js';

const DEFAULT_AVATAR = '/static/images/user.jpg';
const DATE_FORMATTER = typeof Intl !== 'undefined'
  ? new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })
  : null;
const JSON_HEADERS = { 'Content-Type': 'application/json' };

function isAuthenticated() {
  const profile = getProfile();
  return Boolean(profile && profile.id);
}

async function fetchJSON(url, options = {}) {
  const config = {
    credentials: 'same-origin',
    ...options,
  };

  if (config.body && !(config.headers && config.headers['Content-Type'])) {
    config.headers = { ...(config.headers || {}), 'Content-Type': 'application/json' };
  }

  const response = await fetch(url, config);
  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const message = data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function applyProfilePayload(payload) {
  if (!payload) {
    clearProfile();
    return null;
  }
  const stored = setProfile({ ...payload, avatar: payload.avatar || DEFAULT_AVATAR });
  return stored;
}

function applyProfileResponse(payload) {
  if (!payload) return null;
  let storedProfile = null;
  if (payload.profile) {
    storedProfile = applyProfilePayload(payload.profile);
  }
  if (Array.isArray(payload.favorites)) {
    setFavorites(payload.favorites, { sync: false });
  }
  return storedProfile || getProfile();
}

async function hydrateSession() {
  try {
    const data = await fetchJSON('/api/session');
    if (!data?.authenticated) {
      clearProfile();
      clearFavorites({ sync: false });
      return;
    }
    applyProfileResponse(data);
  } catch (err) {
    console.info('Unable to hydrate session from server', err);
  }
}

async function persistFavorites(favorites) {
  if (!isAuthenticated()) return;
  try {
    await fetchJSON('/api/favorites', {
      method: 'PUT',
      body: JSON.stringify({ favorites }),
    });
  } catch (err) {
    console.warn('Unable to sync favourites with server', err);
  }
}

async function logout(redirect = true) {
  try {
    await fetchJSON('/api/logout', { method: 'POST' });
  } catch (err) {
    console.info('Logout request failed', err);
  }
  clearProfile();
  clearFavorites({ sync: false });
  if (redirect) {
    window.location.assign('/');
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(() => console.info('Service worker registered'))
      .catch((err) => console.error('Service worker registration failed', err));
  });
}

function monitorOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  const update = () => {
    const isOffline = !navigator.onLine;
    banner.dataset.visible = isOffline ? 'true' : 'false';
    document.documentElement.dataset.connection = isOffline ? 'offline' : 'online';
  };
  window.addEventListener('offline', update);
  window.addEventListener('online', update);
  update();
}

function initNavigation() {
  const menuProfile = document.getElementById('menu-profile');
  const menuProfileName = document.getElementById('menu-profile-name');
  const menuProfileAvatar = document.getElementById('menu-profile-avatar');
  const menuAuthLink = document.getElementById('menu-auth-link');
  const favoriteCount = document.getElementById('menu-favorite-count');

  if (favoriteCount) {
    const updateCount = (favorites) => {
      const count = favorites.length;
      favoriteCount.textContent = String(count);
      favoriteCount.toggleAttribute('hidden', count === 0);
    };
    onFavoritesChange(updateCount);
    updateCount(getFavorites());
  }

  const handleAuthLinkClick = (event) => {
    if (!menuAuthLink) return;
    if (menuAuthLink.dataset.action === 'logout') {
      event.preventDefault();
      logout();
    }
  };

  menuAuthLink?.addEventListener('click', handleAuthLinkClick);

  if (menuProfile && menuProfileName && menuAuthLink) {
    onProfileChange((profile) => {
      const loggedIn = Boolean(profile?.id);
      if (loggedIn) {
        menuProfile.style.display = 'flex';
        menuProfileName.textContent = profile.name || 'Player';
        if (menuProfileAvatar) {
          menuProfileAvatar.src = profile.avatar || DEFAULT_AVATAR;
        }
        menuAuthLink.textContent = 'Log out';
        menuAuthLink.href = '#logout';
        menuAuthLink.dataset.action = 'logout';
      } else {
        menuProfile.style.display = 'none';
        menuAuthLink.textContent = 'Sign up';
        menuAuthLink.href = '/login';
        menuAuthLink.dataset.action = 'signup';
      }
    });
  }
}

function formatSkillLabel(level) {
  if (!level) return 'All Levels';
  const lower = String(level).toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function renderDailyDrillCard(card, selection) {
  if (!card) return;
  card.innerHTML = '';
  if (!selection) {
    card.innerHTML = '<p class="daily-drill__empty">No drill recommendation right now. Check back soon.</p>';
    return;
  }

  const { drill, category } = selection;

  const meta = document.createElement('div');
  meta.className = 'daily-drill__meta';
  const skillBadge = document.createElement('span');
  skillBadge.className = 'pill pill--skill';
  skillBadge.textContent = drill.skillLevel || 'All Levels';
  meta.appendChild(skillBadge);
  if (drill.focus) {
    const focusBadge = document.createElement('span');
    focusBadge.className = 'pill';
    focusBadge.textContent = drill.focus;
    meta.appendChild(focusBadge);
  }
  if (drill.duration) {
    const durationBadge = document.createElement('span');
    durationBadge.className = 'pill';
    durationBadge.textContent = drill.duration;
    meta.appendChild(durationBadge);
  }
  if (category) {
    const categoryBadge = document.createElement('span');
    categoryBadge.className = 'pill';
    categoryBadge.textContent = category.name;
    meta.appendChild(categoryBadge);
  }
  card.appendChild(meta);

  const title = document.createElement('h3');
  title.className = 'daily-drill__title';
  title.textContent = drill.title;
  card.appendChild(title);

  if (drill.summary) {
    const summary = document.createElement('p');
    summary.className = 'daily-drill__summary';
    summary.textContent = drill.summary;
    card.appendChild(summary);
  }

  if (Array.isArray(drill.instructions) && drill.instructions.length) {
    const label = document.createElement('span');
    label.className = 'daily-drill__label';
    label.textContent = 'First three reps';
    card.appendChild(label);

    const list = document.createElement('ol');
    list.className = 'daily-drill__list';
    drill.instructions.slice(0, 3).forEach((step) => {
      const item = document.createElement('li');
      item.textContent = step;
      list.appendChild(item);
    });
    card.appendChild(list);
  }

  if (drill.coachingCue) {
    const cue = document.createElement('p');
    cue.className = 'daily-drill__cue';
    const cueLabel = document.createElement('strong');
    cueLabel.textContent = 'Coaching cue:';
    cue.appendChild(cueLabel);
    cue.appendChild(document.createTextNode(` ${drill.coachingCue}`));
    card.appendChild(cue);
  }

  const cta = document.createElement('a');
  cta.className = 'btn btn--primary daily-drill__cta';
  cta.href = category ? `/${category.id}.html` : '/library.html';
  cta.textContent = category ? `Go to ${category.name} drills` : 'Browse drills';
  card.appendChild(cta);
}

function updateDailySummary(summaryEl, profile, skillLevel) {
  if (!summaryEl) return;
  const displayName = profile?.name ? profile.name.split(' ')[0] : 'you';
  const skillLabel = formatSkillLabel(skillLevel);
  summaryEl.textContent = `Curated for ${displayName} at the ${skillLabel} level. A new focus drops every day.`;
}

function initHomePage() {
  const section = document.querySelector('[data-daily-drill]');
  if (!section) return;

  const card = section.querySelector('[data-daily-drill-card]');
  const summaryEl = section.querySelector('[data-daily-drill-summary]');
  const dateEl = section.querySelector('[data-daily-drill-date]');

  if (DATE_FORMATTER && dateEl) {
    dateEl.textContent = DATE_FORMATTER.format(new Date());
  }

  const renderForProfile = async (profile) => {
    if (!card) return;
    const skillLevel = profile?.skillLevel || 'Intermediate';
    updateDailySummary(summaryEl, profile, skillLevel);
    card.classList.add('is-loading');
    card.innerHTML = '<p class="daily-drill__loading">Loading today\'s drill...</p>';
    try {
      const catalog = await fetchCatalog();
      const selection = selectDrillOfDay(catalog, skillLevel);
      renderDailyDrillCard(card, selection);
    } catch (err) {
      console.error(err);
      card.innerHTML = '<p class="daily-drill__empty">Unable to load today\'s drill. Your saved favourites remain ready to go.</p>';
      if (summaryEl && !summaryEl.textContent) {
        summaryEl.textContent = 'Reconnect to refresh your personalised recommendation.';
      }
    } finally {
      card.classList.remove('is-loading');
    }
  };

  onProfileChange((profile) => {
    renderForProfile(profile);
  });

  renderForProfile(getProfile());
}

function initAuthPage() {
  const container = document.querySelector('[data-page="login"]');
  if (!container) return;

  const signupForm = container.querySelector('#signup-form');
  const signinForm = container.querySelector('#signin-form');
  const tabs = Array.from(container.querySelectorAll('[data-auth-switch]'));
  const panels = {
    signup: container.querySelector('[data-auth-panel="signup"]'),
    signin: container.querySelector('[data-auth-panel="signin"]'),
  };
  const note = container.querySelector('[data-auth-note]');
  const feedbackEl = container.querySelector('[data-auth-feedback]');
  const notes = {
    signup: note?.dataset?.noteSignup || note?.textContent || '',
    signin: note?.dataset?.noteSignin || '',
  };

  const setFeedback = (message, tone = 'info') => {
    if (!feedbackEl) return;
    if (!message) {
      feedbackEl.hidden = true;
      feedbackEl.textContent = '';
      feedbackEl.dataset.tone = '';
      return;
    }
    feedbackEl.hidden = false;
    feedbackEl.dataset.tone = tone;
    feedbackEl.textContent = message;
  };

  const showPanel = (target) => {
    if (!target || !(target in panels)) return;
    Object.entries(panels).forEach(([key, panel]) => {
      if (!panel) return;
      if (key === target) {
        panel.hidden = false;
      } else {
        panel.hidden = true;
      }
    });
    tabs.forEach((tab) => {
      tab.classList.toggle('is-active', tab.dataset.authSwitch === target);
    });
    if (note) {
      note.textContent = notes[target] || '';
    }
    setFeedback('');
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPanel(tab.dataset.authSwitch));
  });

  showPanel('signup');

  const handleAuthSuccess = (data) => {
    applyProfileResponse(data);
  };

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(signupForm);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const skillLevel = String(formData.get('skillLevel') || '').trim();
    if (!name || !email || !password || !skillLevel) {
      setFeedback('Please complete the name, email, password, and skill level fields.', 'error');
      return;
    }

    const payload = {
      name,
      email,
      password,
      dateOfBirth: formData.get('dob') || '',
      gender: formData.get('gender') || '',
      position: formData.get('position') || '',
      skillLevel,
    };

    const submitButton = signupForm.querySelector('[type="submit"]');
    submitButton?.setAttribute('disabled', 'true');
    setFeedback('Creating your account...', 'info');
    try {
      const data = await fetchJSON('/api/signup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      handleAuthSuccess(data);
      window.location.assign('/profile');
    } catch (err) {
      console.error(err);
      setFeedback(err.message || 'Signup failed. Please try again.', 'error');
    } finally {
      submitButton?.removeAttribute('disabled');
    }
  });

  signinForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(signinForm);
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    if (!email || !password) {
      setFeedback('Please enter your email and password.', 'error');
      return;
    }

    const payload = { email, password };
    const submitButton = signinForm.querySelector('[type="submit"]');
    submitButton?.setAttribute('disabled', 'true');
    setFeedback('Signing you in...', 'info');
    try {
      const data = await fetchJSON('/api/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      handleAuthSuccess(data);
      window.location.assign('/profile');
    } catch (err) {
      console.error(err);
      setFeedback(err.message || 'Login failed. Please check your details.', 'error');
    } finally {
      submitButton?.removeAttribute('disabled');
    }
  });
}

function initProfilePage() {
  const container = document.querySelector('[data-page="profile"]');
  if (!container) return;

  const nameHeading = document.getElementById('profile-name');
  const emailParagraph = document.getElementById('profile-email');
  const avatarEl = document.getElementById('profile-avatar');
  const avatarInput = document.getElementById('profile-avatar-input');
  const removeAvatarButton = container.querySelector('[data-action="remove-avatar"]');
  const clearButton = container.querySelector('[data-action="clear-profile"]');
  const logoutButton = container.querySelector('[data-action="logout"]');
  const feedbackEl = container.querySelector('[data-profile-feedback]');
  const form = document.getElementById('profile-form');

  const nameField = document.getElementById('profile-field-name');
  const emailField = document.getElementById('profile-field-email');
  const passwordField = document.getElementById('profile-field-password');
  const dobField = document.getElementById('profile-field-dob');
  const genderField = document.getElementById('profile-field-gender');
  const skillField = document.getElementById('profile-field-skill');
  const positionField = document.getElementById('profile-field-position');

  let activeProfile = getProfile();

  const setFeedback = (message, tone = 'info') => {
    if (!feedbackEl) return;
    if (!message) {
      feedbackEl.textContent = '';
      feedbackEl.hidden = true;
      feedbackEl.dataset.tone = '';
      return;
    }
    feedbackEl.hidden = false;
    feedbackEl.dataset.tone = tone;
    feedbackEl.textContent = message;
  };

  const updateFormAvailability = (canEdit) => {
    if (form) {
      Array.from(form.querySelectorAll('input, select, button')).forEach((element) => {
        if (element.type === 'button' || element.dataset.action === 'clear-profile') return;
        element.disabled = !canEdit && element.type !== 'button';
      });
    }
    if (avatarInput) {
      avatarInput.disabled = !canEdit;
    }
    if (removeAvatarButton) {
      removeAvatarButton.disabled = !canEdit || !activeProfile?.hasCustomAvatar;
    }
    if (logoutButton) {
      logoutButton.disabled = !canEdit;
    }
  };

  const populateForm = (profile) => {
    const hasProfile = Boolean(profile?.name);
    container.dataset.hasProfile = hasProfile ? 'true' : 'false';
    if (nameHeading) nameHeading.textContent = hasProfile ? profile.name : 'Player';
    if (emailParagraph) emailParagraph.textContent = hasProfile ? profile.email : 'Log in to view and edit your saved profile.';
    if (avatarEl) avatarEl.src = profile?.avatar || DEFAULT_AVATAR;

    if (nameField) nameField.value = profile?.name || '';
    if (emailField) emailField.value = profile?.email || '';
    if (dobField) dobField.value = profile?.dateOfBirth || '';
    if (genderField) genderField.value = profile?.gender || '';
    if (skillField) skillField.value = profile?.skillLevel || 'Intermediate';
    if (positionField) positionField.value = profile?.position || '';

    updateFormAvailability(Boolean(profile?.id));
  };

  populateForm(activeProfile);

  (async () => {
    try {
      const data = await fetchJSON('/api/profile');
      const stored = applyProfileResponse(data);
      if (stored) {
        activeProfile = stored;
        populateForm(stored);
      }
    } catch (err) {
      if (err.status === 401) {
        setFeedback('Please log in to manage your profile.', 'error');
        updateFormAvailability(false);
      } else {
        console.info('Unable to refresh profile from server', err);
      }
    }
  })();

  onProfileChange((profile) => {
    activeProfile = profile;
    populateForm(profile);
    if (!profile?.id) {
      setFeedback('Please log in to manage your profile.', 'error');
    }
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!activeProfile?.id) {
      setFeedback('Create a profile first on the sign-up page.', 'error');
      return;
    }

    const payload = {
      name: nameField?.value.trim() || '',
      email: emailField?.value.trim() || '',
      dateOfBirth: dobField?.value || '',
      gender: genderField?.value || '',
      position: positionField?.value || '',
      skillLevel: skillField?.value || 'Intermediate',
    };

    if (!payload.name || !payload.email) {
      setFeedback('Name and email are required.', 'error');
      return;
    }

    if (passwordField && passwordField.value) {
      if (passwordField.value.length < 6) {
        setFeedback('Password must be at least 6 characters.', 'error');
        return;
      }
      payload.password = passwordField.value;
    }

    setFeedback('Saving updates...', 'info');
    try {
      const data = await fetchJSON('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const stored = applyProfileResponse(data);
      if (stored) {
        activeProfile = stored;
        populateForm(stored);
      }
      setFeedback('Profile updated successfully.', 'success');
    } catch (err) {
      console.error(err);
      setFeedback(err.message || 'Unable to update your profile.', 'error');
    } finally {
      if (passwordField) {
        passwordField.value = '';
      }
    }
  });

  avatarInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!activeProfile?.id) {
      setFeedback('Create a profile first on the sign-up page.', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('avatar', file);
    setFeedback('Uploading photo...', 'info');
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to upload that photo.');
      }
      const stored = applyProfileResponse(data);
      if (stored) {
        activeProfile = stored;
        populateForm(stored);
      }
      setFeedback('Profile photo updated.', 'success');
      event.target.value = '';
    } catch (err) {
      console.error(err);
      setFeedback(err.message || 'Unable to upload that photo.', 'error');
    }
  });

  removeAvatarButton?.addEventListener('click', async () => {
    if (!activeProfile?.id) {
      setFeedback('Create a profile first on the sign-up page.', 'error');
      return;
    }
    setFeedback('Removing photo...', 'info');
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to remove the photo.');
      }
      const stored = applyProfileResponse(data);
      if (stored) {
        activeProfile = stored;
        populateForm(stored);
      }
      setFeedback('Profile photo removed.', 'success');
    } catch (err) {
      console.error(err);
      setFeedback(err.message || 'Unable to remove the photo.', 'error');
    }
  });

  clearButton?.addEventListener('click', () => {
    clearProfile();
    clearFavorites({ sync: false });
    setFeedback('Local profile cleared. Log in again to resync your drills.', 'info');
    if (form) {
      form.reset();
    }
    populateForm(getProfile());
  });

  logoutButton?.addEventListener('click', (event) => {
    event.preventDefault();
    logout();
  });
}

async function warmCatalogCache() {
  try {
    await fetchCatalog();
  } catch (err) {
    console.warn('Unable to warm drill catalogue cache', err);
  }
}

function bootstrap() {
  registerServiceWorker();
  monitorOfflineBanner();
  initNavigation();
  registerFavoritesSyncer(persistFavorites);
  hydrateSession();
  warmCatalogCache();
  const page = document.body.dataset.page;
  switch (page) {
    case 'shooting':
    case 'ball-handling':
    case 'defense':
    case 'fitness':
      initCategoryPage(page);
      break;
    case 'library':
      initLibraryPage();
      break;
    case 'login':
      initAuthPage();
      break;
    case 'profile':
      initProfilePage();
      break;
    case 'home':
      initHomePage();
      break;
    default:
      break;
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
