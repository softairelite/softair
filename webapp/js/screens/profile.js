/**
 * Profile Screen
 */

import { getCurrentUser, logout, refreshCurrentUser, updateProfile } from '../lib/auth.js';
import { formatDate, getCertificateStatus, getUserInitials } from '../lib/supabase.js';
import { showConfirm, showToast, createModal, showLoading, hideLoading } from '../lib/utils.js';
import { navigateTo } from '../components/navigation.js';

export function renderProfileScreen() {
  const user = getCurrentUser();
  if (!user) return;

  const certStatus = getCertificateStatus(user.hasMedicalCertificate, user.medicalCertificateExpiry);
  const initials = getUserInitials(user.firstName, user.lastName);

  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="profile-screen">
      <div class="profile-header">
        <div class="profile-avatar-container">
          <div class="profile-avatar-large">
            ${user.nicknameImageUrl ? `<img src="${user.nicknameImageUrl}" alt="${user.firstName}">` : initials}
          </div>
        </div>
        <h2 class="profile-name">${user.firstName} ${user.lastName}</h2>
        <p class="profile-email">${user.email}</p>
      </div>

      <div class="profile-content">
        <div class="profile-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0;">Informazioni Personali</h3>
            <button class="btn-secondary" id="edit-profile-btn" style="padding: 8px 16px;">
              <ion-icon name="create"></ion-icon>
              Modifica
            </button>
          </div>
          <div class="profile-field">
            <span class="profile-field-label">Nome</span>
            <span class="profile-field-value">${user.firstName}</span>
          </div>
          <div class="profile-field">
            <span class="profile-field-label">Cognome</span>
            <span class="profile-field-value">${user.lastName}</span>
          </div>
          ${user.nickname ? `
          <div class="profile-field">
            <span class="profile-field-label">Nickname</span>
            <span class="profile-field-value">${user.nickname}</span>
          </div>
          ` : ''}
          <div class="profile-field">
            <span class="profile-field-label">Email</span>
            <span class="profile-field-value">${user.email}</span>
          </div>
          ${user.phoneNumber ? `
          <div class="profile-field">
            <span class="profile-field-label">Telefono</span>
            <span class="profile-field-value">${user.phoneNumber}</span>
          </div>
          ` : ''}
          <div class="profile-field">
            <span class="profile-field-label">Numero Tessera</span>
            <span class="profile-field-value">${user.membershipNumber}</span>
          </div>
          ${user.age ? `
          <div class="profile-field">
            <span class="profile-field-label">Età</span>
            <span class="profile-field-value">${user.age} anni</span>
          </div>
          ` : ''}
        </div>

        <div class="profile-section">
          <h3 class="profile-section-title">Certificato Medico</h3>
          <div class="profile-field">
            <span class="profile-field-label">Stato</span>
            <span class="certificate-status ${certStatus.status}">
              <ion-icon name="${certStatus.status === 'valid' ? 'checkmark-circle' : certStatus.status === 'expired' ? 'close-circle' : certStatus.status === 'expiring' ? 'warning' : 'help-circle'}"></ion-icon>
              ${certStatus.label}
            </span>
          </div>
          ${user.medicalCertificateExpiry ? `
          <div class="profile-field">
            <span class="profile-field-label">Scadenza</span>
            <span class="profile-field-value">${formatDate(user.medicalCertificateExpiry)}</span>
          </div>
          ` : ''}
          ${certStatus.status === 'expired' || certStatus.status === 'expiring' ? `
          <div class="alert alert-${certStatus.status === 'expired' ? 'danger' : 'warning'} mt-md">
            <ion-icon name="alert-circle"></ion-icon>
            <div>
              ${certStatus.status === 'expired' ? 'Il tuo certificato medico è scaduto. Contatta l\'amministratore per aggiornarlo.' : 'Il tuo certificato medico scadrà tra meno di 30 giorni. Ricordati di rinnovarlo.'}
            </div>
          </div>
          ` : ''}
        </div>

        ${user.isAdmin ? `
        <div class="profile-section">
          <h3 class="profile-section-title">Amministrazione</h3>
          <div class="alert alert-info">
            <ion-icon name="shield-checkmark"></ion-icon>
            <div>Hai privilegi di amministratore</div>
          </div>
        </div>
        ` : ''}

        <div class="profile-section">
          <button class="btn-danger" id="logout-btn" style="width: 100%;">
            <ion-icon name="log-out-outline"></ion-icon>
            Logout
          </button>
        </div>
      </div>
    </div>
  `;

  // Setup logout button
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Setup edit button
  document.getElementById('edit-profile-btn')?.addEventListener('click', showEditProfileModal);
}

/**
 * Show edit profile modal
 */
function showEditProfileModal() {
  const user = getCurrentUser();
  if (!user) return;

  const formHTML = `
    <form id="edit-profile-form" style="display: flex; flex-direction: column; gap: 16px; max-height: 60vh; overflow-y: auto;">
      <div class="alert alert-info">
        <ion-icon name="information-circle"></ion-icon>
        <div>Puoi modificare solo alcuni campi. Per modifiche importanti contatta l'amministratore.</div>
      </div>

      <div class="form-group">
        <label class="form-label">Nickname</label>
        <input type="text" id="edit-nickname" value="${user.nickname || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Telefono</label>
        <input type="tel" id="edit-phone" value="${user.phoneNumber || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Indirizzo</label>
        <textarea id="edit-address" rows="3">${user.residentialAddress || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Cambia Password</label>
        <input type="password" id="edit-password" placeholder="Lascia vuoto per non modificare">
        <span class="form-helper">Inserisci solo se vuoi cambiare la password</span>
      </div>

      <div class="form-group">
        <label class="form-label">Conferma Password</label>
        <input type="password" id="edit-password-confirm" placeholder="Conferma nuova password">
      </div>
    </form>
  `;

  const modal = createModal(
    '✏️ Modifica Profilo',
    formHTML,
    [
      {
        label: 'Annulla',
        className: 'btn-secondary',
        onClick: () => modal.remove()
      },
      {
        label: 'Salva',
        className: 'btn-primary',
        onClick: () => handleSaveProfile(modal),
        close: false
      }
    ]
  );
}

/**
 * Handle save profile
 */
async function handleSaveProfile(modal) {
  const nickname = document.getElementById('edit-nickname').value.trim();
  const phone = document.getElementById('edit-phone').value.trim();
  const address = document.getElementById('edit-address').value.trim();
  const password = document.getElementById('edit-password').value;
  const passwordConfirm = document.getElementById('edit-password-confirm').value;

  // Validate password if provided
  if (password || passwordConfirm) {
    if (password !== passwordConfirm) {
      showToast('Le password non corrispondono', 'error');
      return;
    }
    if (password.length < 6) {
      showToast('La password deve essere di almeno 6 caratteri', 'error');
      return;
    }
  }

  try {
    showLoading();

    const updates = {
      nickname: nickname || null,
      phone_number: phone || null,
      residential_address: address || null
    };

    // Add password if provided
    if (password) {
      updates.password = password;
    }

    await updateProfile(updates);

    hideLoading();
    showToast('Profilo aggiornato', 'success');
    modal.remove();

    // Refresh profile screen
    renderProfileScreen();

  } catch (error) {
    hideLoading();
    console.error('Error updating profile:', error);
    showToast(error.message || 'Errore aggiornamento profilo', 'error');
  }
}

async function handleLogout() {
  const confirmed = await showConfirm('Sei sicuro di voler uscire?', 'Logout');
  if (!confirmed) return;

  await logout();
  showToast('Logout effettuato', 'success');
  navigateTo('login');
}

export function cleanupProfileScreen() {
  // Cleanup
}
