/**
 * Navigation Component
 * Gestione bottom navigation e routing
 */

import { isAuthenticated, isAdmin, isSuperuser, addAuthListener } from '../lib/auth.js';
import { getUnviewedEventsCount } from '../lib/notifications.js';

let currentScreen = 'events';
let navigationListeners = [];
let badgeUpdateInterval = null;

/**
 * Initialize navigation
 */
export function initNavigation() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  // Setup nav item click handlers
  const navItems = nav.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.getAttribute('data-screen');
      if (screen) {
        navigateTo(screen);
      }
    });
  });

  // Listen to auth changes
  addAuthListener((user) => {
    updateNavVisibility();
  });

  // Update visibility
  updateNavVisibility();

  // Start badge update
  startBadgeUpdate();
}

/**
 * Navigate to screen
 */
export function navigateTo(screen, data = null) {
  if (!isAuthenticated() && screen !== 'login') {
    screen = 'login';
  }

  currentScreen = screen;
  updateActiveNav(screen);
  notifyNavigationListeners(screen, data);
}

/**
 * Get current screen
 */
export function getCurrentScreen() {
  return currentScreen;
}

/**
 * Update active nav item
 */
function updateActiveNav(screen) {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;

  const navItems = nav.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const itemScreen = item.getAttribute('data-screen');
    if (itemScreen === screen) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

/**
 * Update navigation visibility based on auth state
 */
export function updateNavVisibility() {
  const nav = document.getElementById('bottom-nav');
  const adminBtn = document.getElementById('admin-nav-btn');

  if (!nav) return;

  if (isAuthenticated()) {
    nav.style.display = 'flex';

    // Show/hide admin button (visible for admin and superuser)
    if (adminBtn) {
      adminBtn.style.display = (isAdmin() || isSuperuser()) ? 'flex' : 'none';
    }
  } else {
    nav.style.display = 'none';
  }
}

/**
 * Add navigation listener
 */
export function addNavigationListener(callback) {
  navigationListeners.push(callback);
  return () => {
    navigationListeners = navigationListeners.filter(cb => cb !== callback);
  };
}

/**
 * Notify navigation listeners
 */
function notifyNavigationListeners(screen, data) {
  navigationListeners.forEach(callback => {
    try {
      callback(screen, data);
    } catch (error) {
      console.error('Error in navigation listener:', error);
    }
  });
}

/**
 * Show back button in header (for sub-screens)
 */
export function showBackButton(onBack) {
  const header = document.querySelector('.screen-header');
  if (!header) return;

  // Remove existing back button
  const existingBtn = header.querySelector('.back-button');
  if (existingBtn) existingBtn.remove();

  // Create back button
  const backBtn = document.createElement('button');
  backBtn.className = 'back-button';
  backBtn.innerHTML = '<ion-icon name="arrow-back"></ion-icon>';
  backBtn.style.cssText = `
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-primary);
    font-size: 24px;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  backBtn.onclick = onBack;
  header.style.position = 'relative';
  header.insertBefore(backBtn, header.firstChild);

  return backBtn;
}

/**
 * Hide back button
 */
export function hideBackButton() {
  const backBtn = document.querySelector('.back-button');
  if (backBtn) backBtn.remove();
}

/**
 * Create breadcrumb navigation
 */
export function createBreadcrumb(items) {
  const breadcrumb = document.createElement('nav');
  breadcrumb.className = 'breadcrumb';
  breadcrumb.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background-color: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-separator);
    font-size: 14px;
  `;

  items.forEach((item, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.innerHTML = '<ion-icon name="chevron-forward"></ion-icon>';
      separator.style.color = 'var(--color-text-tertiary)';
      breadcrumb.appendChild(separator);
    }

    const link = document.createElement('a');
    link.textContent = item.label;
    link.style.cssText = `
      color: ${index === items.length - 1 ? 'var(--color-text-primary)' : 'var(--color-primary)'};
      cursor: ${index === items.length - 1 ? 'default' : 'pointer'};
      text-decoration: none;
    `;

    if (index !== items.length - 1 && item.onClick) {
      link.onclick = (e) => {
        e.preventDefault();
        item.onClick();
      };
    }

    breadcrumb.appendChild(link);
  });

  return breadcrumb;
}

/**
 * Start badge update interval
 */
function startBadgeUpdate() {
  // Clear existing interval
  if (badgeUpdateInterval) {
    clearInterval(badgeUpdateInterval);
  }

  // Update immediately
  updateEventsBadge();

  // Update every 30 seconds
  badgeUpdateInterval = setInterval(updateEventsBadge, 30000);
}

/**
 * Update events badge with unviewed count
 */
export async function updateEventsBadge() {
  if (!isAuthenticated()) return;

  try {
    const count = await getUnviewedEventsCount();
    const eventsNavItem = document.querySelector('[data-screen="events"]');

    if (!eventsNavItem) return;

    // Remove existing badge
    const existingBadge = eventsNavItem.querySelector('.nav-badge');
    if (existingBadge) {
      existingBadge.remove();
    }

    // Add badge if count > 0
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.cssText = `
        position: absolute;
        top: 4px;
        right: 12px;
        background-color: var(--color-danger);
        color: white;
        border-radius: 10px;
        padding: 2px 6px;
        font-size: 11px;
        font-weight: 600;
        min-width: 18px;
        text-align: center;
      `;
      eventsNavItem.style.position = 'relative';
      eventsNavItem.appendChild(badge);
    }
  } catch (error) {
    console.error('Error updating events badge:', error);
  }
}
