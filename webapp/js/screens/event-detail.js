/**
 * Event Detail Screen
 */

import { supabase, TABLES, toCamelCase, formatDate, formatTime, parsePostGISPoint, getUserInitials } from '../lib/supabase.js';
import { getCurrentUser } from '../lib/auth.js';
import { showLoading, hideLoading, showToast, openInMaps, getStaticMapUrl, createModal } from '../lib/utils.js';
import { navigateTo, showBackButton, hideBackButton, updateEventsBadge } from '../components/navigation.js';
import { markEventAsViewed } from '../lib/notifications.js';

let currentEvent = null;
let userAttendance = null;
let attendingUsers = [];
let notAttendingUsers = [];
let pendingUsers = [];

export function renderEventDetailScreen(event) {
  currentEvent = event;
  const user = getCurrentUser();
  const coords = parsePostGISPoint(event.locationCoordinates);

  const container = document.getElementById('main-content');
  container.innerHTML = `
    <div class="event-detail-screen">
      <div class="event-detail-hero">
        <h1 class="event-detail-title">${event.shortDescription || 'Evento'}</h1>
        <div class="event-detail-info">
          <div class="event-detail-info-row">
            <ion-icon name="calendar"></ion-icon>
            <span>${formatDate(event.eventDate)}</span>
          </div>
          <div class="event-detail-info-row">
            <ion-icon name="time"></ion-icon>
            <span>${formatTime(event.eventDate)}</span>
          </div>
          <div class="event-detail-info-row">
            <ion-icon name="location"></ion-icon>
            <span>${event.location}</span>
          </div>
        </div>
      </div>

      <div class="event-detail-content">
        <div class="event-section">
          <h3 class="event-section-title">
            <ion-icon name="information-circle"></ion-icon>
            Descrizione
          </h3>
          <p>${event.longDescription || event.shortDescription || 'Nessuna descrizione disponibile'}</p>
          ${event.adminNotes ? `
            <div class="alert alert-info mt-md">
              <ion-icon name="alert-circle"></ion-icon>
              <div>${event.adminNotes}</div>
            </div>
          ` : ''}
        </div>

        ${coords ? `
          <div class="event-section">
            <h3 class="event-section-title">
              <ion-icon name="map"></ion-icon>
              Posizione
            </h3>
            <div class="event-map-container" id="map-container">
              <img src="${getStaticMapUrl(coords.latitude, coords.longitude)}"
                   alt="Mappa evento" class="event-map-image" />
              <div class="event-map-overlay">
                <ion-icon name="navigate" style="font-size: 32px; margin-right: 8px;"></ion-icon>
                Apri in Mappe
              </div>
            </div>
          </div>
        ` : ''}

        <div class="event-section">
          <h3 class="event-section-title">
            <ion-icon name="people"></ion-icon>
            Partecipazione
          </h3>
          <div class="stats-grid" id="attendance-stats">
            <div class="stat-card">
              <div class="spinner"></div>
            </div>
          </div>
          <div class="attendance-buttons" id="attendance-buttons">
            <button class="btn-success" id="btn-attend">
              <ion-icon name="checkmark-circle"></ion-icon>
              Parteciperò
            </button>
            <button class="btn-danger" id="btn-not-attend">
              <ion-icon name="close-circle"></ion-icon>
              Non parteciperò
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Show back button
  showBackButton(() => navigateTo('events'));

  // Setup map click
  if (coords) {
    document.getElementById('map-container')?.addEventListener('click', () => {
      openInMaps(coords.latitude, coords.longitude, event.location);
    });
  }

  // Load attendance
  loadAttendance();

  // Mark event as viewed
  markEventAsViewed(currentEvent.id).then(() => {
    updateEventsBadge();
  });
}

async function loadAttendance() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Get user's attendance
    const { data: myAttendance } = await supabase
      .from(TABLES.attendance)
      .select('*')
      .eq('event_id', currentEvent.id)
      .eq('user_id', user.id)
      .single();

    userAttendance = myAttendance ? toCamelCase(myAttendance) : null;

    // Get total number of active users
    const { count: totalUsers, error: countError } = await supabase
      .from(TABLES.users)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    console.log('Total active users query result:', { totalUsers, countError });

    // Also get all users to verify
    const { data: allUsers, error: usersError } = await supabase
      .from(TABLES.users)
      .select('id, email, first_name, last_name, is_active');

    console.log('All users:', allUsers);
    console.log('Active users:', allUsers?.filter(u => u.is_active === true).length);

    // Get all attendance with user data
    const { data: allAttendance } = await supabase
      .from(TABLES.attendance)
      .select('*, users(*)')
      .eq('event_id', currentEvent.id);

    const attendanceData = toCamelCase(allAttendance || []);

    // Debug: log all statuses
    console.log('All attendance records:', attendanceData.map(a => ({ id: a.id, status: a.status })));

    attendingUsers = attendanceData.filter(a => a.status === 'attending').map(a => a.users);
    notAttendingUsers = attendanceData.filter(a => a.status === 'not_attending').map(a => a.users);

    console.log('Attending count:', attendingUsers.length);
    console.log('Not attending count:', notAttendingUsers.length);

    // Calculate pending: total users - attending - not attending
    const pendingCount = (totalUsers || 0) - attendingUsers.length - notAttendingUsers.length;
    pendingUsers = { length: pendingCount }; // Store only count for display

    renderAttendanceStats();
    setupAttendanceButtons();
  } catch (error) {
    console.error('Error loading attendance:', error);
  }
}

function renderAttendanceStats() {
  const statsContainer = document.getElementById('attendance-stats');
  if (!statsContainer) return;

  statsContainer.innerHTML = `
    <div class="stat-card clickable" id="stat-attending">
      <ion-icon name="checkmark-circle" style="color: var(--color-success);"></ion-icon>
      <p class="stat-number">${attendingUsers.length}</p>
      <p class="stat-label">Presenti</p>
      ${attendingUsers.length > 0 ? '<p class="stat-hint">Tocca per dettagli</p>' : ''}
    </div>
    <div class="stat-card clickable" id="stat-not-attending">
      <ion-icon name="close-circle" style="color: var(--color-danger);"></ion-icon>
      <p class="stat-number">${notAttendingUsers.length}</p>
      <p class="stat-label">Assenti</p>
      ${notAttendingUsers.length > 0 ? '<p class="stat-hint">Tocca per dettagli</p>' : ''}
    </div>
    <div class="stat-card" id="stat-pending">
      <ion-icon name="help-circle" style="color: #FFB800;"></ion-icon>
      <p class="stat-number">${pendingUsers.length}</p>
      <p class="stat-label">In attesa</p>
    </div>
  `;

  // Add click handlers
  document.getElementById('stat-attending')?.addEventListener('click', () => {
    if (attendingUsers.length > 0) showUserList('Iscritti all\'Evento', attendingUsers);
  });
  document.getElementById('stat-not-attending')?.addEventListener('click', () => {
    if (notAttendingUsers.length > 0) showUserList('Non Iscritti all\'Evento', notAttendingUsers);
  });
}

function showUserList(title, users) {
  const content = document.createElement('div');
  content.className = 'user-list';
  content.innerHTML = users.map(u => `
    <div class="user-item">
      <div class="user-avatar">${getUserInitials(u.firstName, u.lastName)}</div>
      <div class="user-info">
        <p class="user-name">${u.firstName} ${u.lastName}</p>
        <p class="user-email">${u.email}</p>
      </div>
    </div>
  `).join('');

  createModal(title, content, []);
}

function setupAttendanceButtons() {
  const btnAttend = document.getElementById('btn-attend');
  const btnNotAttend = document.getElementById('btn-not-attend');

  if (!btnAttend || !btnNotAttend) return;

  // Reset both buttons to default state first
  btnAttend.style.opacity = '1';
  btnAttend.style.cursor = 'pointer';
  btnNotAttend.style.opacity = '1';
  btnNotAttend.style.cursor = 'pointer';

  // Update button visual states based on current attendance
  if (userAttendance) {
    console.log('Current attendance status:', userAttendance.status);

    if (userAttendance.status === 'attending') {
      btnAttend.style.opacity = '0.6';
      btnAttend.style.cursor = 'default';
    } else if (userAttendance.status === 'notAttending' || userAttendance.status === 'not_attending') {
      // Handle both camelCase and snake_case
      btnNotAttend.style.opacity = '0.6';
      btnNotAttend.style.cursor = 'default';
    }
    // If status is 'toChoose' or 'to_choose', both buttons stay at full opacity
  }

  btnAttend.onclick = () => setAttendance('attending');
  btnNotAttend.onclick = () => setAttendance('notAttending');
}

async function setAttendance(status) {
  const user = getCurrentUser();
  if (!user) return;

  try {
    showLoading();

    // Convert status to snake_case for database
    const dbStatus = status === 'attending' ? 'attending' : 'not_attending';
    console.log('Setting attendance:', { status, dbStatus, userAttendance });

    if (userAttendance) {
      // Update existing
      console.log('Updating record:', userAttendance.id, 'to status:', dbStatus);
      const { data, error } = await supabase
        .from(TABLES.attendance)
        .update({ status: dbStatus })
        .eq('id', userAttendance.id)
        .select();

      console.log('Update result:', { data, error });
      if (error) throw error;
    } else {
      // Create new
      console.log('Creating new record for user:', user.id, 'event:', currentEvent.id, 'status:', dbStatus);
      const { data, error } = await supabase
        .from(TABLES.attendance)
        .insert([{
          event_id: currentEvent.id,
          user_id: user.id,
          status: dbStatus
        }])
        .select();

      console.log('Insert result:', { data, error });
      if (error) throw error;
    }

    hideLoading();
    showToast('Presenza aggiornata', 'success');
    await loadAttendance();
  } catch (error) {
    hideLoading();
    console.error('Error updating attendance:', error);
    showToast('Errore aggiornamento presenza', 'error');
  }
}

export function cleanupEventDetailScreen() {
  currentEvent = null;
  userAttendance = null;
  attendingUsers = [];
  notAttendingUsers = [];
  pendingUsers = [];
  hideBackButton();
}
