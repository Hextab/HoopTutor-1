const FAVORITES_KEY = 'hooptutor:favorites';
const PROFILE_KEY = 'hooptutor:profile';
const CATALOG_KEY = 'hooptutor:catalog';

const FAVORITES_EVENT = 'hooptutor:favorites-changed';
const PROFILE_EVENT = 'hooptutor:profile-changed';
const DEFAULT_AVATAR = '/static/images/user.jpg';

function duplicate(value) {
  if (value === null || value === undefined) return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    return value;
  }
}

function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return duplicate(fallback);
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`Unable to parse localStorage key ${key}`, err);
    return duplicate(fallback);
  }
}

function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Unable to save localStorage key ${key}`, err);
  }
}

function dispatch(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function getFavorites() {
  return loadJSON(FAVORITES_KEY, []);
}

export function setFavorites(ids) {
  const unique = Array.from(new Set((ids || []).filter(Boolean)));
  saveJSON(FAVORITES_KEY, unique);
  dispatch(FAVORITES_EVENT, { favorites: unique });
  return unique;
}

export function toggleFavorite(id) {
  const current = new Set(getFavorites());
  let active;
  if (current.has(id)) {
    current.delete(id);
    active = false;
  } else {
    current.add(id);
    active = true;
  }
  const list = Array.from(current);
  setFavorites(list);
  return { favorites: list, active };
}

export function onFavoritesChange(callback) {
  const handler = (event) => callback(event.detail.favorites);
  window.addEventListener(FAVORITES_EVENT, handler);
  callback(getFavorites());
  return () => window.removeEventListener(FAVORITES_EVENT, handler);
}

export function getProfile() {
  const profile = loadJSON(PROFILE_KEY, {});
  if (profile && !profile.avatar) {
    profile.avatar = DEFAULT_AVATAR;
  }
  return profile;
}

export function setProfile(profile) {
  const sanitised = profile && typeof profile === 'object' ? { ...profile } : {};
  if (sanitised && !sanitised.avatar) {
    sanitised.avatar = DEFAULT_AVATAR;
  }
  saveJSON(PROFILE_KEY, sanitised);
  dispatch(PROFILE_EVENT, { profile: sanitised });
  return sanitised;
}

export function clearProfile() {
  window.localStorage.removeItem(PROFILE_KEY);
  dispatch(PROFILE_EVENT, { profile: {} });
}

export function onProfileChange(callback) {
  const handler = (event) => callback(event.detail.profile);
  window.addEventListener(PROFILE_EVENT, handler);
  callback(getProfile());
  return () => window.removeEventListener(PROFILE_EVENT, handler);
}

export function cacheCatalog(data) {
  saveJSON(CATALOG_KEY, data);
}

export function getCachedCatalog() {
  return loadJSON(CATALOG_KEY, null);
}
