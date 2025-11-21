/**
 * Events Screen - Lista eventi
 */

import { supabase, TABLES, toCamelCase, formatDate, formatTime, isEventPast } from '../lib/supabase.js';
import { getCurrentUser } from '../lib/auth.js';
import { showLoading, hideLoading, showToast } from '../lib/utils.js';
import { navigateTo } from '../components/navigation.js';

let events = [];
let filter = 'all'; // 'all', 'future', 'past'

export function renderEventsScreen() {
  const container = document.getElementById('main-content');
  const user = getCurrentUser();

  container.innerHTML = `
    <div class="events-screen">
      <div class="screen-header">
        <h1>Eventi</h1>
      </div>

      <div class="events-filter">
        <button class="filter-chip ${filter === 'all' ? 'active' : ''}" data-filter="all">
          Tutti
        </button>
        <button class="filter-chip ${filter === 'future' ? 'active' : ''}" data-filter="future">
          Futuri
        </button>
        <button class="filter-chip ${filter === 'past' ? 'active' : ''}" data-filter="past">
          Passati
        </button>
      </div>

      <div class="events-list" id="events-list">
        <div class="loading-spinner" style="text-align: center; padding: 40px;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  // Setup filter handlers
  const filterButtons = container.querySelectorAll('.filter-chip');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filter = btn.getAttribute('data-filter');
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderEventsList();
    });
  });

  // Load events
  loadEvents();
}

export async function refreshEventsList() {
  await loadEvents();
}

async function loadEvents() {
  try {
    const user = getCurrentUser();
    const { data, error } = await supabase
      .from(TABLES.events)
      .select('*')
      .order('event_date', { ascending: false });

    if (error) throw error;

    events = toCamelCase(data);

    // Load attendance stats and user's response for each event
    for (const event of events) {
      const { data: attendance } = await supabase
        .from(TABLES.attendance)
        .select('status, user_id')
        .eq('event_id', event.id);

      const attendanceData = attendance || [];
      event.attendingCount = attendanceData.filter(a => a.status === 'attending').length;
      event.notAttendingCount = attendanceData.filter(a => a.status === 'not_attending').length;

      // Check if current user has responded
      const userResponse = attendanceData.find(a => a.user_id === user.id);
      event.userHasResponded = userResponse && (userResponse.status === 'attending' || userResponse.status === 'not_attending');
    }

    renderEventsList();
  } catch (error) {
    console.error('Error loading events:', error);
    showToast('Errore caricamento eventi', 'error');
  }
}

function renderEventsList() {
  const listContainer = document.getElementById('events-list');
  if (!listContainer) return;

  // Filter events
  let filteredEvents = events;
  if (filter === 'future') {
    filteredEvents = events.filter(e => !isEventPast(e.eventDate));
  } else if (filter === 'past') {
    filteredEvents = events.filter(e => isEventPast(e.eventDate));
  }

  if (filteredEvents.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <ion-icon name="calendar-outline"></ion-icon>
        <p>Nessun evento trovato</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filteredEvents.map(event => {
    const isPast = isEventPast(event.eventDate);
    const needsResponse = !isPast && !event.userHasResponded;
    return `
      <div class="event-card ${isPast ? 'past-event' : ''}" data-event-id="${event.id}">
        <div class="event-card-header">
          <h3 class="event-card-title">${event.shortDescription || 'Evento'}</h3>
          ${isPast ? '<span class="event-badge past">Passato</span>' : ''}
        </div>
        ${needsResponse ? `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px;">
            <ion-icon name="alert-circle" style="color: var(--color-danger); font-size: 18px;"></ion-icon>
            <span style="color: var(--color-danger); font-size: 13px; font-weight: 600;">Non hai dato la tua disponibilità!</span>
          </div>
        ` : ''}
        <div class="event-card-info">
          <div class="event-info-row">
            <ion-icon name="calendar"></ion-icon>
            <span>${formatDate(event.eventDate)}</span>
          </div>
          <div class="event-info-row">
            <ion-icon name="time"></ion-icon>
            <span>${formatTime(event.eventDate)}</span>
          </div>
          <div class="event-info-row">
            <ion-icon name="location"></ion-icon>
            <span>${event.location}</span>
          </div>
        </div>
        <div class="event-card-stats">
          <div class="event-stat-item">
            <ion-icon name="checkmark-circle" style="color: var(--color-success);"></ion-icon>
            <span>${event.attendingCount || 0} Presenti</span>
          </div>
          <div class="event-stat-item">
            <ion-icon name="close-circle" style="color: var(--color-danger);"></ion-icon>
            <span>${event.notAttendingCount || 0} Assenti</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  listContainer.querySelectorAll('.event-card:not(.past-event)').forEach(card => {
    card.addEventListener('click', () => {
      const eventId = card.getAttribute('data-event-id');
      const event = events.find(e => e.id === eventId);
      if (event) {
        navigateTo('event-detail', event);
      }
    });
  });
}

export function cleanupEventsScreen() {
  events = [];
  filter = 'all';
}
