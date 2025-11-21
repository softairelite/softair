/**
 * Main App Entry Point
 * Punto di ingresso principale dell'applicazione
 */

import { initAuth, addAuthListener } from './lib/auth.js';
import { initNavigation, addNavigationListener, navigateTo } from './components/navigation.js';
import { showLoading, hideLoading } from './lib/utils.js';
import { renderLoginScreen, cleanupLoginScreen } from './screens/login.js';
import { renderEventsScreen, cleanupEventsScreen } from './screens/events.js';
import { renderEventDetailScreen, cleanupEventDetailScreen } from './screens/event-detail.js';
import { renderDocumentsScreen, cleanupDocumentsScreen } from './screens/documents.js';
import { renderProfileScreen, cleanupProfileScreen } from './screens/profile.js';
import { renderAdminScreen, cleanupAdminScreen } from './screens/admin.js';

// Cleanup functions for each screen
const cleanupFunctions = {
  login: cleanupLoginScreen,
  events: cleanupEventsScreen,
  'event-detail': cleanupEventDetailScreen,
  documents: cleanupDocumentsScreen,
  profile: cleanupProfileScreen,
  admin: cleanupAdminScreen
};

// Current screen cleanup function
let currentCleanup = null;

/**
 * Initialize app
 */
async function init() {
  console.log('Softair Event Web App - Starting...');

  showLoading();

  try {
    // Initialize auth
    const user = await initAuth();

    // Initialize navigation
    initNavigation();

    // Listen to navigation changes
    addNavigationListener(handleNavigation);

    // Listen to auth changes
    addAuthListener(handleAuthChange);

    // Navigate to initial screen
    if (user) {
      navigateTo('events');
    } else {
      navigateTo('login');
    }

    hideLoading();
  } catch (error) {
    console.error('App initialization error:', error);
    hideLoading();
  }
}

/**
 * Handle navigation changes
 */
function handleNavigation(screen, data) {
  console.log('Navigate to:', screen, data);

  // Call cleanup function for previous screen
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  // Render new screen
  switch (screen) {
    case 'login':
      renderLoginScreen();
      currentCleanup = cleanupFunctions.login;
      break;

    case 'events':
      renderEventsScreen();
      currentCleanup = cleanupFunctions.events;
      break;

    case 'event-detail':
      renderEventDetailScreen(data);
      currentCleanup = cleanupFunctions['event-detail'];
      break;

    case 'documents':
      renderDocumentsScreen();
      currentCleanup = cleanupFunctions.documents;
      break;

    case 'profile':
      renderProfileScreen();
      currentCleanup = cleanupFunctions.profile;
      break;

    case 'admin':
      renderAdminScreen(data);
      currentCleanup = cleanupFunctions.admin;
      break;

    default:
      console.error('Unknown screen:', screen);
      renderEventsScreen();
      currentCleanup = cleanupFunctions.events;
  }
}

/**
 * Handle auth state changes
 */
function handleAuthChange(user) {
  console.log('Auth state changed:', user ? 'Logged in' : 'Logged out');

  if (!user) {
    // User logged out, go to login
    navigateTo('login');
  }
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Export for debugging
window.softairApp = {
  init,
  navigateTo
};
