/**
 * Admin Users Management
 * Gestione completa utenti (CRUD)
 */

import { supabase, TABLES, toCamelCase, toSnakeCase, formatDate, getCertificateStatus, getUserInitials } from '../lib/supabase.js';
import { getCurrentUser, isAdmin, getAllUsers, sendPasswordReset, createUser, updateUser } from '../lib/auth.js';
import { showLoading, hideLoading, showToast, showConfirm, createModal, generateUUID } from '../lib/utils.js';
import { navigateTo, showBackButton } from '../components/navigation.js';

let users = [];
let currentUser = null;
let isEditMode = false;

/**
 * Render users management screen
 */
export function renderAdminUsersScreen() {
  if (!isAdmin()) {
    showToast('Accesso negato', 'error');
    navigateTo('admin');
    return;
  }

  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="admin-screen">
      <div class="screen-header screen-header-with-action">
        <button class="header-action" id="back-btn">
          <ion-icon name="arrow-back"></ion-icon>
          Indietro
        </button>
        <h1>Gestione Utenti</h1>
        <button class="header-action" id="add-btn">
          <ion-icon name="add"></ion-icon>
          Nuovo
        </button>
      </div>

      <div class="content-container">
        <div class="form-group" style="margin-bottom: 20px;">
          <input type="text" id="search-users" placeholder="Cerca utenti..." style="width: 100%;">
        </div>

        <div id="users-list" style="min-height: 200px;">
          <div style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Show back button
  showBackButton(() => navigateTo('admin'));

  // Setup handlers
  document.getElementById('back-btn')?.addEventListener('click', () => navigateTo('admin'));
  document.getElementById('add-btn')?.addEventListener('click', () => showUserForm(null));

  // Search
  document.getElementById('search-users')?.addEventListener('input', (e) => {
    renderUsersList(e.target.value);
  });

  // Load users
  loadUsers();
}

/**
 * Load users from database
 */
async function loadUsers() {
  try {
    users = await getAllUsers();
    renderUsersList();
  } catch (error) {
    console.error('Error loading users:', error);
    showToast('Errore caricamento utenti', 'error');
  }
}

/**
 * Render users list
 */
function renderUsersList(searchTerm = '') {
  const listContainer = document.getElementById('users-list');
  if (!listContainer) return;

  let filteredUsers = users;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredUsers = users.filter(u =>
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.membershipNumber.toLowerCase().includes(term)
    );
  }

  if (filteredUsers.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <ion-icon name="people-outline"></ion-icon>
        <p>${searchTerm ? 'Nessun utente trovato' : 'Nessun utente presente'}</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filteredUsers.map(user => {
    const certStatus = getCertificateStatus(user.hasMedicalCertificate, user.medicalCertificateExpiry);
    const initials = getUserInitials(user.firstName, user.lastName);

    return `
      <div class="card card-clickable" onclick="editUser('${user.id}')">
        <div style="display: flex; gap: 16px; align-items: center;">
          <div class="user-avatar" style="flex-shrink: 0;">
            ${user.nicknameImageUrl ? `<img src="${user.nicknameImageUrl}" alt="${initials}">` : initials}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px;">${user.firstName} ${user.lastName}</strong>
              ${user.role === 'admin' ? '<span class="user-badge" style="background: #4A5D23; color: white;">Admin</span>' : ''}
              ${user.role === 'superuser' ? '<span class="user-badge" style="background: #5856D6; color: white;">Superuser</span>' : ''}
              ${user.isActive === false ? '<span class="user-badge" style="background: #8E8E93; color: white;">Inattivo</span>' : ''}
            </div>
            <div style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 4px;">
              ${user.email}
            </div>
            <div style="color: var(--color-text-tertiary); font-size: 13px;">
              Tessera: ${user.membershipNumber}
            </div>
          </div>
          <span class="user-badge ${certStatus.status}">
            ${certStatus.label}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Show user form (create or edit)
 */
function showUserForm(userId) {
  isEditMode = !!userId;
  currentUser = userId ? users.find(u => u.id === userId) : null;

  const formHTML = `
    <form id="user-form" style="display: flex; flex-direction: column; gap: 16px; max-height: 60vh; overflow-y: auto;">
      <div class="form-group">
        <label class="form-label">Nome *</label>
        <input type="text" id="user-first-name" value="${currentUser?.firstName || ''}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Cognome *</label>
        <input type="text" id="user-last-name" value="${currentUser?.lastName || ''}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Email *</label>
        <input type="email" id="user-email" value="${currentUser?.email || ''}" required>
      </div>

      ${!isEditMode ? `
      <div class="form-group">
        <label class="form-label">Password *</label>
        <input type="password" id="user-password" required minlength="6">
        <span class="form-helper">Minimo 6 caratteri</span>
      </div>
      ` : `
      <div class="form-group">
        <button type="button" class="btn btn-secondary" id="btn-reset-password" style="width: 100%;">
          <ion-icon name="key"></ion-icon>
          Invia email reset password
        </button>
        <span class="form-helper">L'utente riceverà un'email per reimpostare la password</span>
      </div>
      `}

      <div class="form-group">
        <label class="form-label">Numero Tessera *</label>
        <input type="text" id="user-membership" value="${currentUser?.membershipNumber || ''}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Scadenza Tessera</label>
        <input type="date" id="user-membership-expiry" value="${currentUser?.membershipExpiryDate || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Nickname</label>
        <input type="text" id="user-nickname" value="${currentUser?.nickname || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Telefono</label>
        <input type="tel" id="user-phone" value="${currentUser?.phoneNumber || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Età</label>
        <input type="number" id="user-age" min="0" max="150" value="${currentUser?.age || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Data di Nascita</label>
        <input type="date" id="user-birthdate"
               value="${currentUser?.dateOfBirth || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Codice Fiscale</label>
        <input type="text" id="user-tax-code" value="${currentUser?.taxCode || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Indirizzo</label>
        <textarea id="user-address" rows="2">${currentUser?.residentialAddress || ''}</textarea>
      </div>

      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="user-has-cert"
                 ${currentUser?.hasMedicalCertificate ? 'checked' : ''}>
          <span>Ha certificato medico</span>
        </label>
      </div>

      <div class="form-group" id="cert-expiry-group" style="display: ${currentUser?.hasMedicalCertificate ? 'block' : 'none'};">
        <label class="form-label">Scadenza Certificato</label>
        <input type="date" id="user-cert-expiry"
               value="${currentUser?.medicalCertificateExpiry || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Ruolo</label>
        <select id="user-role">
          <option value="user" ${currentUser?.role === 'user' || (!currentUser?.role && !currentUser?.isAdmin) ? 'selected' : ''}>Utente</option>
          <option value="superuser" ${currentUser?.role === 'superuser' ? 'selected' : ''}>Superuser (può creare eventi)</option>
          <option value="admin" ${currentUser?.role === 'admin' || currentUser?.isAdmin ? 'selected' : ''}>Amministratore</option>
        </select>
      </div>

      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="user-is-active"
                 ${currentUser?.isActive !== false ? 'checked' : ''}>
          <span>Attivo</span>
        </label>
      </div>

      ${isEditMode ? `
        <div class="alert alert-warning">
          <ion-icon name="warning"></ion-icon>
          <div>
            <strong>Attenzione:</strong> Le modifiche avranno effetto immediato.
            ${currentUser.role === 'admin' ? '<br><strong>Questo è un account amministratore.</strong>' : ''}
            ${currentUser.role === 'superuser' ? '<br><strong>Questo è un account superuser.</strong>' : ''}
          </div>
        </div>
      ` : ''}
    </form>
  `;

  const modal = createModal(
    isEditMode ? '✏️ Modifica Utente' : '➕ Nuovo Utente',
    formHTML,
    [
      {
        label: 'Annulla',
        className: 'btn-secondary',
        onClick: () => modal.remove()
      },
      ...(isEditMode ? [{
        label: currentUser?.isActive === false ? 'Riattiva' : 'Disattiva',
        className: currentUser?.isActive === false ? 'btn-success' : 'btn-danger',
        onClick: () => handleToggleUserActive(modal),
        close: false
      }] : []),
      {
        label: isEditMode ? 'Salva' : 'Crea',
        className: 'btn-primary',
        onClick: () => handleSaveUser(modal),
        close: false
      }
    ]
  );

  // Toggle certificate expiry field
  document.getElementById('user-has-cert')?.addEventListener('change', (e) => {
    const expiryGroup = document.getElementById('cert-expiry-group');
    if (expiryGroup) {
      expiryGroup.style.display = e.target.checked ? 'block' : 'none';
    }
  });

  // Reset password button (only in edit mode)
  document.getElementById('btn-reset-password')?.addEventListener('click', async () => {
    if (!currentUser?.email) return;

    const confirmed = await showConfirm(
      'Reset Password',
      `Vuoi inviare un'email di reset password a ${currentUser.email}?`
    );

    if (confirmed) {
      try {
        showLoading();
        await sendPasswordReset(currentUser.email);
        hideLoading();
        showToast('Email di reset inviata', 'success');
      } catch (error) {
        hideLoading();
        showToast('Errore invio email: ' + error.message, 'error');
      }
    }
  });
}

/**
 * Handle save user
 */
async function handleSaveUser(modal) {
  const form = document.getElementById('user-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const firstName = document.getElementById('user-first-name').value.trim();
  const lastName = document.getElementById('user-last-name').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const passwordEl = document.getElementById('user-password');
  const password = passwordEl ? passwordEl.value : '';
  const membership = document.getElementById('user-membership').value.trim();
  const membershipExpiry = document.getElementById('user-membership-expiry').value;
  const nickname = document.getElementById('user-nickname').value.trim();
  const phone = document.getElementById('user-phone').value.trim();
  const age = document.getElementById('user-age').value;
  const birthdate = document.getElementById('user-birthdate').value;
  const taxCode = document.getElementById('user-tax-code').value.trim().toUpperCase();
  const address = document.getElementById('user-address').value.trim();
  const hasCert = document.getElementById('user-has-cert').checked;
  const certExpiry = document.getElementById('user-cert-expiry').value;
  const userRole = document.getElementById('user-role').value;
  const isActive = document.getElementById('user-is-active').checked;

  if (!isEditMode && !password) {
    showToast('La password è obbligatoria per nuovi utenti', 'error');
    return;
  }

  try {
    showLoading();

    const userData = {
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      membership_number: membership,
      membership_expiry_date: membershipExpiry || null,
      nickname: nickname || null,
      phone_number: phone || null,
      age: age ? parseInt(age) : null,
      date_of_birth: birthdate || null,
      tax_code: taxCode || null,
      residential_address: address || null,
      has_medical_certificate: hasCert,
      medical_certificate_expiry: hasCert && certExpiry ? certExpiry : null,
      role: userRole,
      is_active: isActive
    };

    if (isEditMode) {
      // Update existing user using auth module
      await updateUser(currentUser.id, userData);
      showToast('Utente aggiornato', 'success');
    } else {
      // Create new user with Supabase Auth
      userData.password = password;
      await createUser(userData);
      showToast('Utente creato', 'success');
    }

    hideLoading();
    modal.remove();
    await loadUsers();

  } catch (error) {
    hideLoading();
    console.error('Error saving user:', error);
    showToast(error.message || 'Errore salvataggio utente', 'error');
  }
}

/**
 * Handle toggle user active status
 */
async function handleToggleUserActive(modal) {
  if (!currentUser) return;

  const isCurrentlyActive = currentUser.isActive !== false;
  const action = isCurrentlyActive ? 'disattivare' : 'riattivare';

  const confirmed = await showConfirm(
    `Sei sicuro di voler ${action} l'utente "${currentUser.firstName} ${currentUser.lastName}"?`,
    isCurrentlyActive ? 'Conferma Disattivazione' : 'Conferma Riattivazione'
  );

  if (!confirmed) return;

  try {
    showLoading();

    const { error } = await supabase
      .from(TABLES.users)
      .update({ is_active: !isCurrentlyActive })
      .eq('id', currentUser.id);

    if (error) throw error;

    hideLoading();
    showToast(isCurrentlyActive ? 'Utente disattivato' : 'Utente riattivato', 'success');
    modal.remove();
    await loadUsers();

  } catch (error) {
    hideLoading();
    console.error('Error toggling user status:', error);
    showToast(error.message || 'Errore modifica stato utente', 'error');
  }
}

/**
 * Edit user (called from HTML)
 */
window.editUser = function(userId) {
  showUserForm(userId);
};

/**
 * Cleanup
 */
export function cleanupAdminUsersScreen() {
  users = [];
  currentUser = null;
  isEditMode = false;
}
