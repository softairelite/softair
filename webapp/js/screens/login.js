/**
 * Login Screen
 * Schermata di autenticazione
 */

import { login, sendPasswordReset, loginWithBiometric } from '../lib/auth.js';
import { showLoading, hideLoading, showToast, isValidEmail } from '../lib/utils.js';
import { navigateTo } from '../components/navigation.js';
import { isPlatformAuthenticatorAvailable, getBiometricName, hasRegisteredCredentials, registerCredential } from '../lib/webauthn.js';

/**
 * Render login screen
 */
export async function renderLoginScreen() {
  const container = document.getElementById('main-content');

  // Check if biometric authentication is available
  const isBiometricAvailable = await isPlatformAuthenticatorAvailable();
  const biometricName = getBiometricName();

  container.innerHTML = `
    <div class="login-screen">
      <div class="login-container">
        <div class="login-header">
          <div class="login-logo">
            <img src="assets/logo.png" alt="Elite Army Contractors" class="login-logo-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <ion-icon name="shield-checkmark" style="display:none;"></ion-icon>
          </div>
          <h1 class="login-title">Elite Army Contractors</h1>
          <p class="login-subtitle">Accedi con le tue credenziali</p>
        </div>

        ${isBiometricAvailable ? `
          <button type="button" id="biometric-login-btn" class="btn-biometric">
            <ion-icon name="finger-print"></ion-icon>
            Accedi con ${biometricName}
          </button>

          <div class="login-divider">
            <span>oppure</span>
          </div>
        ` : ''}

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

  // Setup biometric login button
  if (isBiometricAvailable) {
    const biometricBtn = document.getElementById('biometric-login-btn');
    if (biometricBtn) {
      biometricBtn.addEventListener('click', handleBiometricLogin);
    }
  }
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

    // Check if user wants to enable biometric authentication
    const isBiometricAvailable = await isPlatformAuthenticatorAvailable();
    if (isBiometricAvailable) {
      const hasCredentials = await hasRegisteredCredentials(user.id);
      if (!hasCredentials) {
        // Ask if user wants to enable biometric login
        setTimeout(() => {
          offerBiometricRegistration(user);
        }, 1000);
      }
    }

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
 * Handle biometric login
 */
async function handleBiometricLogin(e) {
  e.preventDefault();

  try {
    showLoading();

    const user = await loginWithBiometric();

    hideLoading();
    showToast(`Benvenuto ${user.firstName}!`, 'success');

    // Navigate to events screen
    setTimeout(() => {
      navigateTo('events');
    }, 500);

  } catch (error) {
    hideLoading();
    console.error('Biometric login error:', error);
    showToast(error.message || 'Errore durante l\'autenticazione biometrica', 'error');
  }
}

/**
 * Offer to register biometric authentication
 */
async function offerBiometricRegistration(user) {
  const biometricName = getBiometricName();

  // Show custom confirmation dialog
  const message = `Vuoi abilitare ${biometricName} per accedere più velocemente la prossima volta?`;

  if (confirm(message)) {
    try {
      showLoading();
      await registerCredential(user);
      hideLoading();
      showToast(`${biometricName} abilitato con successo!`, 'success');
    } catch (error) {
      hideLoading();
      console.error('Error registering biometric:', error);

      // Don't show error if user cancelled
      if (!error.message.includes('annullata')) {
        showToast(error.message || 'Errore durante la registrazione', 'error');
      }
    }
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
