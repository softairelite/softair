/**
 * Admin Screen - Pannello amministrazione
 */

import { isAdmin, isSuperuser, canManageEvents, getAllUsers } from '../lib/auth.js';
import { supabase, TABLES, toCamelCase, getCertificateStatus } from '../lib/supabase.js';
import { showLoading, hideLoading, showToast, createModal } from '../lib/utils.js';
import { navigateTo } from '../components/navigation.js';

let currentView = 'home'; // 'home', 'users', 'events', 'stats'

export function renderAdminScreen(data) {
  if (!isAdmin() && !isSuperuser()) {
    showToast('Accesso negato', 'error');
    navigateTo('events');
    return;
  }

  currentView = data?.view || 'home';

  switch (currentView) {
    case 'users':
      renderUsersView();
      break;
    case 'events':
      renderEventsView();
      break;
    case 'documents':
      renderDocumentsView();
      break;
    case 'stats':
      renderStatsView();
      break;
    default:
      renderAdminHome();
  }
}

function renderAdminHome() {
  const container = document.getElementById('main-content');
  const adminOnly = isAdmin();

  container.innerHTML = `
    <div class="admin-screen">
      <div class="screen-header">
        <h1>${adminOnly ? 'Pannello Admin' : 'Gestione Eventi'}</h1>
      </div>

      <div class="admin-menu">
        ${adminOnly ? `
        <button class="admin-menu-item" data-view="users">
          <ion-icon name="people"></ion-icon>
          <h3 class="admin-menu-item-title">Gestione Utenti</h3>
          <p class="admin-menu-item-desc">Visualizza e modifica utenti</p>
        </button>
        ` : ''}

        <button class="admin-menu-item" data-view="events">
          <ion-icon name="calendar"></ion-icon>
          <h3 class="admin-menu-item-title">Gestione Eventi</h3>
          <p class="admin-menu-item-desc">Crea e modifica eventi</p>
        </button>

        ${adminOnly ? `
        <button class="admin-menu-item" data-view="stats">
          <ion-icon name="stats-chart"></ion-icon>
          <h3 class="admin-menu-item-title">Statistiche</h3>
          <p class="admin-menu-item-desc">Visualizza statistiche e report</p>
        </button>

        <button class="admin-menu-item" data-view="documents">
          <ion-icon name="document-text"></ion-icon>
          <h3 class="admin-menu-item-title">Gestione Documenti</h3>
          <p class="admin-menu-item-desc">Carica e gestisci documenti</p>
        </button>
        ` : ''}
      </div>
    </div>
  `;

  // Add click handlers
  container.querySelectorAll('.admin-menu-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view');
      navigateTo('admin', { view });
    });
  });
}

async function renderUsersView() {
  // Import and use the full admin-users module
  import('./admin-users.js').then(module => {
    module.renderAdminUsersScreen();
  });
}

async function renderEventsView() {
  // Import and use the full admin-events module
  import('./admin-events.js').then(module => {
    module.renderAdminEventsScreen();
  });
}

async function renderDocumentsView() {
  // Import and use the full admin-documents module
  import('./admin-documents.js').then(module => {
    module.renderAdminDocumentsScreen();
  });
}

async function renderStatsView() {
  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="admin-screen">
      <div class="screen-header screen-header-with-action">
        <button class="header-action" id="back-btn">
          <ion-icon name="arrow-back"></ion-icon>
          Indietro
        </button>
        <h1>Statistiche</h1>
        <div></div>
      </div>

      <div class="content-container">
        <div id="stats-content" style="text-align: center; padding: 40px;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    navigateTo('admin');
  });

  await loadStats();
}

async function loadStats() {
  try {
    const users = await getAllUsers();

    const { data: events } = await supabase
      .from(TABLES.events)
      .select('*');

    const { data: documents } = await supabase
      .from(TABLES.documents)
      .select('*');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiredCertUsers = users.filter(u =>
      u.hasMedicalCertificate &&
      u.medicalCertificateExpiry &&
      new Date(u.medicalCertificateExpiry) <= now
    );

    const expiringSoonCertUsers = users.filter(u =>
      u.hasMedicalCertificate &&
      u.medicalCertificateExpiry &&
      new Date(u.medicalCertificateExpiry) > now &&
      new Date(u.medicalCertificateExpiry) <= thirtyDaysFromNow
    );

    // Tessere scadute e in scadenza
    const expiredMembershipUsers = users.filter(u =>
      u.membershipExpiryDate &&
      new Date(u.membershipExpiryDate) <= now
    );

    const expiringSoonMembershipUsers = users.filter(u =>
      u.membershipExpiryDate &&
      new Date(u.membershipExpiryDate) > now &&
      new Date(u.membershipExpiryDate) <= thirtyDaysFromNow
    );

    const statsContainer = document.getElementById('stats-content');
    if (!statsContainer) return;

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <ion-icon name="people" style="color: var(--color-primary);"></ion-icon>
          <p class="stat-number">${users.length}</p>
          <p class="stat-label">Utenti Totali</p>
        </div>
        <div class="stat-card">
          <ion-icon name="calendar" style="color: var(--color-success);"></ion-icon>
          <p class="stat-number">${events?.length || 0}</p>
          <p class="stat-label">Eventi</p>
        </div>
        <div class="stat-card">
          <ion-icon name="document-text" style="color: var(--color-info);"></ion-icon>
          <p class="stat-number">${documents?.length || 0}</p>
          <p class="stat-label">Documenti</p>
        </div>
        <div class="stat-card clickable" id="stat-cert-valid">
          <ion-icon name="checkmark-circle" style="color: var(--color-success);"></ion-icon>
          <p class="stat-number">${users.length - expiredCertUsers.length - expiringSoonCertUsers.length}</p>
          <p class="stat-label">Certificati Validi</p>
        </div>
        <div class="stat-card clickable" id="stat-cert-expiring">
          <ion-icon name="warning" style="color: var(--color-warning);"></ion-icon>
          <p class="stat-number">${expiringSoonCertUsers.length}</p>
          <p class="stat-label">Certificati in Scadenza</p>
          ${expiringSoonCertUsers.length > 0 ? '<p class="stat-hint">Tocca per dettagli</p>' : ''}
        </div>
        <div class="stat-card clickable" id="stat-cert-expired">
          <ion-icon name="close-circle" style="color: var(--color-danger);"></ion-icon>
          <p class="stat-number">${expiredCertUsers.length}</p>
          <p class="stat-label">Certificati Scaduti</p>
          ${expiredCertUsers.length > 0 ? '<p class="stat-hint">Tocca per dettagli</p>' : ''}
        </div>
        <div class="stat-card clickable" id="stat-membership-expiring">
          <ion-icon name="card" style="color: var(--color-warning);"></ion-icon>
          <p class="stat-number">${expiringSoonMembershipUsers.length}</p>
          <p class="stat-label">Tessere in Scadenza</p>
          ${expiringSoonMembershipUsers.length > 0 ? '<p class="stat-hint">Tocca per dettagli</p>' : ''}
        </div>
        <div class="stat-card clickable" id="stat-membership-expired">
          <ion-icon name="card" style="color: var(--color-danger);"></ion-icon>
          <p class="stat-number">${expiredMembershipUsers.length}</p>
          <p class="stat-label">Tessere Scadute</p>
          ${expiredMembershipUsers.length > 0 ? '<p class="stat-hint">Tocca per dettagli</p>' : ''}
        </div>
      </div>
    `;

    // Add click handlers
    if (expiringSoonCertUsers.length > 0) {
      document.getElementById('stat-cert-expiring')?.addEventListener('click', () => {
        showUserListModal('Certificati in Scadenza', expiringSoonCertUsers);
      });
    }

    if (expiredCertUsers.length > 0) {
      document.getElementById('stat-cert-expired')?.addEventListener('click', () => {
        showUserListModal('Certificati Scaduti', expiredCertUsers);
      });
    }

    if (expiringSoonMembershipUsers.length > 0) {
      document.getElementById('stat-membership-expiring')?.addEventListener('click', () => {
        showUserListModal('Tessere in Scadenza', expiringSoonMembershipUsers, 'membership');
      });
    }

    if (expiredMembershipUsers.length > 0) {
      document.getElementById('stat-membership-expired')?.addEventListener('click', () => {
        showUserListModal('Tessere Scadute', expiredMembershipUsers, 'membership');
      });
    }
  } catch (error) {
    console.error('Error loading stats:', error);
    showToast('Errore caricamento statistiche', 'error');
  }
}

function showUserListModal(title, users, type = 'certificate') {
  const content = document.createElement('div');
  content.className = 'user-list';
  content.innerHTML = users.map(u => {
    let badgeLabel, badgeClass;
    if (type === 'membership') {
      const expiry = u.membershipExpiryDate ? new Date(u.membershipExpiryDate) : null;
      const now = new Date();
      if (expiry && expiry <= now) {
        badgeLabel = 'Scaduta';
        badgeClass = 'expired';
      } else {
        badgeLabel = 'In scadenza';
        badgeClass = 'expiring';
      }
    } else {
      const certStatus = getCertificateStatus(u.hasMedicalCertificate, u.medicalCertificateExpiry);
      badgeLabel = certStatus.label;
      badgeClass = certStatus.status;
    }
    return `
      <div class="user-item">
        <div class="user-avatar">${u.firstName[0]}${u.lastName[0]}</div>
        <div class="user-info">
          <p class="user-name">${u.firstName} ${u.lastName}</p>
          <p class="user-email">${u.email}</p>
        </div>
        <span class="user-badge ${badgeClass}">${badgeLabel}</span>
      </div>
    `;
  }).join('');

  createModal(title, content, []);
}

export function cleanupAdminScreen() {
  currentView = 'home';
}
