import { initCategoryPage, initLibraryPage, fetchCatalog } from './drill-library.js';
import { getProfile, setProfile, clearProfile, onProfileChange, onFavoritesChange, getFavorites } from './state.js';

const DEFAULT_AVATAR = '/static/images/user.jpg';

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
      favoriteCount.style.display = count > 0 ? 'inline-flex' : 'none';
    };
    onFavoritesChange(updateCount);
    updateCount(getFavorites());
  }

  if (menuProfile && menuProfileName && menuAuthLink) {
    onProfileChange((profile) => {
      if (profile?.name) {
        menuProfile.style.display = 'flex';
        menuProfileName.textContent = profile.name;
        if (menuProfileAvatar) {
          menuProfileAvatar.src = profile.avatar || DEFAULT_AVATAR;
        }
        menuAuthLink.textContent = 'Profile';
        menuAuthLink.href = '/profile';
      } else {
        menuProfile.style.display = 'none';
        menuAuthLink.textContent = 'Sign up';
        menuAuthLink.href = '/login';
      }
    });
  }
}

function initSignupForm() {
  const form = document.getElementById('signup-form');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    if (!name || !email || !password) {
      alert('Please complete the name, email, and password fields.');
      return;
    }

    const payload = {
      name,
      email,
      password,
      dateOfBirth: formData.get('dob') || '',
      gender: formData.get('gender') || '',
      position: formData.get('position') || '',
    };

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Signup failed.' }));
        throw new Error(error.error || 'Signup failed.');
      }
      const profile = await response.json();
      const storedProfile = setProfile({ ...profile, avatar: profile.avatar || DEFAULT_AVATAR });
      console.info('Profile saved', storedProfile);
      window.location.assign('/profile');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Something went wrong. Please try again.');
    }
  });
}

function initProfilePage() {
  const container = document.querySelector('[data-page="profile"]');
  if (!container) return;
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const dobEl = document.getElementById('profile-dob');
  const genderEl = document.getElementById('profile-gender');
  const positionEl = document.getElementById('profile-position');
  const avatarEl = document.getElementById('profile-avatar');
  const clearButton = container.querySelector('[data-action="clear-profile"]');
  onProfileChange((profile) => {
    const hasProfile = profile && profile.name;
    if (nameEl) nameEl.textContent = hasProfile ? profile.name : 'Player';
    if (emailEl) emailEl.textContent = hasProfile ? profile.email : 'Tap “Sign up” to add your details.';
    if (dobEl) dobEl.textContent = profile?.dateOfBirth ? `Birthday: ${profile.dateOfBirth}` : 'Birthday: —';
    if (genderEl) genderEl.textContent = profile?.gender ? `Gender: ${profile.gender}` : 'Gender: —';
    if (positionEl) positionEl.textContent = profile?.position ? `Position: ${profile.position}` : 'Position: —';
    if (avatarEl) avatarEl.src = profile?.avatar || DEFAULT_AVATAR;
  });
  clearButton?.addEventListener('click', () => {
    clearProfile();
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
      initSignupForm();
      break;
    case 'profile':
      initProfilePage();
      break;
    default:
      break;
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
