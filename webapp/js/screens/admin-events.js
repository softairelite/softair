/**
 * Admin Events Management
 * Gestione completa eventi (CRUD)
 */

import { supabase, TABLES, toCamelCase, toSnakeCase, formatDate, formatTime, toPostGISPoint, parsePostGISPoint } from '../lib/supabase.js';
import { getCurrentUser, isAdmin, canManageEvents } from '../lib/auth.js';
import { showLoading, hideLoading, showToast, showConfirm, createModal, generateUUID } from '../lib/utils.js';
import { navigateTo, showBackButton } from '../components/navigation.js';

let events = [];
let currentEvent = null;
let isEditMode = false;

/**
 * Render events management screen
 */
export function renderAdminEventsScreen() {
  if (!canManageEvents()) {
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
        <h1>Gestione Eventi</h1>
        <button class="header-action" id="add-btn">
          <ion-icon name="add"></ion-icon>
          Nuovo
        </button>
      </div>

      <div class="content-container">
        <div id="events-list" style="min-height: 200px;">
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
  document.getElementById('add-btn')?.addEventListener('click', () => showEventForm(null));

  // Load events
  loadEvents();
}

/**
 * Load events from database
 */
async function loadEvents() {
  try {
    const { data, error } = await supabase
      .from(TABLES.events)
      .select('*')
      .order('event_date', { ascending: false });

    if (error) throw error;

    events = toCamelCase(data);
    renderEventsList();
  } catch (error) {
    console.error('Error loading events:', error);
    showToast('Errore caricamento eventi', 'error');
  }
}

/**
 * Render events list
 */
function renderEventsList() {
  const listContainer = document.getElementById('events-list');
  if (!listContainer) return;

  if (events.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <ion-icon name="calendar-outline"></ion-icon>
        <p>Nessun evento presente</p>
        <p style="font-size: 14px; color: var(--color-text-tertiary);">
          Clicca "Nuovo" per creare il primo evento
        </p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = events.map(event => {
    const isPast = new Date(event.eventDate) < new Date();
    return `
      <div class="card card-clickable" data-event-id="${event.id}">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <h3 style="margin: 0 0 8px 0;">${event.shortDescription || 'Senza titolo'}</h3>
            <div style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 4px;">
              <ion-icon name="calendar"></ion-icon>
              ${formatDate(event.eventDate)} ${formatTime(event.eventDate)}
            </div>
            <div style="color: var(--color-text-secondary); font-size: 14px;">
              <ion-icon name="location"></ion-icon>
              ${event.location}
            </div>
            ${isPast ? '<span class="event-badge past" style="margin-top: 8px; display: inline-block;">Passato</span>' : ''}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" style="padding: 8px;" onclick="editEvent('${event.id}')">
              <ion-icon name="create"></ion-icon>
            </button>
            <button class="btn-danger" style="padding: 8px;" onclick="deleteEvent('${event.id}')">
              <ion-icon name="trash"></ion-icon>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Show event form (create or edit)
 */
function showEventForm(eventId) {
  isEditMode = !!eventId;
  currentEvent = eventId ? events.find(e => e.id === eventId) : null;

  const coords = currentEvent ? parsePostGISPoint(currentEvent.locationCoordinates) : null;

  const formHTML = `
    <form id="event-form" style="display: flex; flex-direction: column; gap: 16px;">
      <div class="form-group">
        <label class="form-label">Data e Ora *</label>
        <input type="datetime-local" id="event-datetime"
               value="${currentEvent ? new Date(currentEvent.eventDate).toISOString().slice(0, 16) : ''}"
               required>
      </div>

      <div class="form-group">
        <label class="form-label">Luogo *</label>
        <input type="text" id="event-location" value="${currentEvent?.location || ''}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Coordinate GPS</label>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <input type="number" id="event-lat" placeholder="Latitudine" step="any"
                 value="${coords?.latitude || ''}">
          <input type="number" id="event-lng" placeholder="Longitudine" step="any"
                 value="${coords?.longitude || ''}">
        </div>
        <span class="form-helper">Opzionale - per mostrare l'evento su mappa</span>
      </div>

      <div class="form-group">
        <label class="form-label">Descrizione Breve *</label>
        <input type="text" id="event-short-desc" value="${currentEvent?.shortDescription || ''}"
               maxlength="255" required>
        <span class="form-helper">Max 255 caratteri</span>
      </div>

      <div class="form-group">
        <label class="form-label">Descrizione Completa</label>
        <textarea id="event-long-desc" rows="4">${currentEvent?.longDescription || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Note Amministrative</label>
        <textarea id="event-admin-notes" rows="3">${currentEvent?.adminNotes || ''}</textarea>
        <span class="form-helper">Visibili a tutti gli utenti</span>
      </div>
    </form>
  `;

  const modal = createModal(
    isEditMode ? '✏️ Modifica Evento' : '➕ Nuovo Evento',
    formHTML,
    [
      {
        label: 'Annulla',
        className: 'btn-secondary',
        onClick: () => modal.remove()
      },
      {
        label: isEditMode ? 'Salva' : 'Crea',
        className: 'btn-primary',
        onClick: () => handleSaveEvent(modal),
        close: false
      }
    ]
  );
}

/**
 * Handle save event
 */
async function handleSaveEvent(modal) {
  const form = document.getElementById('event-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const datetime = document.getElementById('event-datetime').value;
  const location = document.getElementById('event-location').value.trim();
  const lat = document.getElementById('event-lat').value;
  const lng = document.getElementById('event-lng').value;
  const shortDesc = document.getElementById('event-short-desc').value.trim();
  const longDesc = document.getElementById('event-long-desc').value.trim();
  const adminNotes = document.getElementById('event-admin-notes').value.trim();

  if (!datetime || !location || !shortDesc) {
    showToast('Compila tutti i campi obbligatori', 'error');
    return;
  }

  try {
    showLoading();

    const eventData = {
      event_date: new Date(datetime).toISOString(),
      location,
      short_description: shortDesc,
      long_description: longDesc || null,
      admin_notes: adminNotes || null
    };

    // Add coordinates if provided
    if (lat && lng) {
      eventData.location_coordinates = toPostGISPoint(parseFloat(lng), parseFloat(lat));
    }

    if (isEditMode) {
      // Update existing event
      console.log('Updating event:', currentEvent.id);
      console.log('Event data for update:', eventData);
      const { data, error } = await supabase
        .from(TABLES.events)
        .update(eventData)
        .eq('id', currentEvent.id)
        .select();

      console.log('Update response:', { data, error });
      if (error) throw error;
      showToast('Evento aggiornato', 'success');
    } else {
      // Create new event
      const user = getCurrentUser();
      console.log('Current user object:', user);
      console.log('Auth ID to use:', user.authId);
      eventData.created_by = user.authId;

      console.log('Event data being inserted:', eventData);
      const { data, error } = await supabase
        .from(TABLES.events)
        .insert([eventData])
        .select();

      console.log('Insert response:', { data, error });
      if (error) throw error;
      showToast('Evento creato', 'success');
    }

    hideLoading();
    modal.remove();
    await loadEvents();

  } catch (error) {
    hideLoading();
    console.error('Error saving event:', error);
    showToast(error.message || 'Errore salvataggio evento', 'error');
  }
}

/**
 * Edit event
 */
window.editEvent = function(eventId) {
  showEventForm(eventId);
};

/**
 * Delete event
 */
window.deleteEvent = async function(eventId) {
  const event = events.find(e => e.id === eventId);
  if (!event) return;

  const confirmed = await showConfirm(
    `Sei sicuro di voler eliminare l'evento "${event.shortDescription}"? Questa azione non può essere annullata.`,
    'Conferma Eliminazione'
  );

  if (!confirmed) return;

  try {
    showLoading();

    const { error } = await supabase
      .from(TABLES.events)
      .delete()
      .eq('id', eventId);

    if (error) throw error;

    hideLoading();
    showToast('Evento eliminato', 'success');
    await loadEvents();

  } catch (error) {
    hideLoading();
    console.error('Error deleting event:', error);
    showToast(error.message || 'Errore eliminazione evento', 'error');
  }
};

/**
 * Cleanup
 */
export function cleanupAdminEventsScreen() {
  events = [];
  currentEvent = null;
  isEditMode = false;
}
