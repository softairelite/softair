/**
 * Login Screen
 * Schermata di autenticazione
 */

import { login, sendPasswordReset } from '../lib/auth.js';
import { showLoading, hideLoading, showToast, isValidEmail } from '../lib/utils.js';
import { navigateTo } from '../components/navigation.js';

/**
 * Render login screen
 */
export function renderLoginScreen() {
  const container = document.getElementById('main-content');

  container.innerHTML = `
    <div class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <div class="login-logo">
            <ion-icon name="shield-checkmark"></ion-icon>
          </div>
          <h1 class="login-title">Softair Event</h1>
          <p class="login-subtitle">Accedi con le tue credenziali</p>
        </div>

        <form id="login-form" class="login-form">
          <div class="form-group">
            <label class="form-label" for="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="mario.rossi@example.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Inserisci la tua password"
              required
              autocomplete="current-password"
            />
          </div>

          <button type="submit" class="btn-primary login-button">
            <ion-icon name="log-in-outline"></ion-icon>
            Accedi
          </button>
        </form>

        <div class="login-footer">
          <a href="#" id="forgot-password-link" class="forgot-password-link">Password dimenticata?</a>
          <p>Contatta l'amministratore per ottenere le credenziali</p>
        </div>
      </div>
    </div>
  `;

  // Setup form handler
  const form = document.getElementById('login-form');
  form.addEventListener('submit', handleLogin);

  // Setup forgot password link
  document.getElementById('forgot-password-link')?.addEventListener('click', handleForgotPassword);
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  // Validate
  if (!email || !password) {
    showToast('Inserisci email e password', 'error');
    return;
  }

  if (!isValidEmail(email)) {
    showToast('Email non valida', 'error');
    return;
  }

  try {
    showLoading();

    const user = await login(email, password);

    hideLoading();
    showToast(`Benvenuto ${user.firstName}!`, 'success');

    // Navigate to events screen
    setTimeout(() => {
      navigateTo('events');
    }, 500);

  } catch (error) {
    hideLoading();
    console.error('Login error:', error);
    showToast(error.message || 'Errore durante il login', 'error');
  }
}

/**
 * Handle forgot password
 */
async function handleForgotPassword(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();

  if (!email) {
    showToast('Inserisci la tua email nel campo sopra', 'info');
    document.getElementById('email')?.focus();
    return;
  }

  if (!isValidEmail(email)) {
    showToast('Email non valida', 'error');
    return;
  }

  try {
    showLoading();
    await sendPasswordReset(email);
    hideLoading();
    showToast('Email di reset inviata! Controlla la tua casella di posta', 'success');
  } catch (error) {
    hideLoading();
    console.error('Password reset error:', error);
    showToast(error.message || 'Errore invio email', 'error');
  }
}

/**
 * Cleanup login screen
 */
export function cleanupLoginScreen() {
  const form = document.getElementById('login-form');
  if (form) {
    form.removeEventListener('submit', handleLogin);
  }
}
