/**
 * Documents Screen
 */

import { supabase, TABLES, STORAGE_BUCKETS, toCamelCase, formatFileSize, getFileIcon, getFileColor } from '../lib/supabase.js';
import { getCurrentUser, isAdmin } from '../lib/auth.js';
import { showToast, debounce } from '../lib/utils.js';

let documents = [];
let filteredDocuments = [];

export function renderDocumentsScreen() {
  const user = getCurrentUser();
  const container = document.getElementById('main-content');

  container.innerHTML = `
    <div class="documents-screen">
      <div class="screen-header">
        <h1>Documenti</h1>
      </div>

      <div class="documents-search">
        <div class="search-input-container">
          <ion-icon name="search"></ion-icon>
          <input type="text" id="search-input" class="search-input" placeholder="Cerca documenti...">
        </div>
      </div>

      <div class="documents-list" id="documents-list">
        <div class="loading-spinner" style="text-align: center; padding: 40px;">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  `;

  // Setup search
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce((e) => {
    filterDocuments(e.target.value);
  }, 300));

  loadDocuments();
}

async function loadDocuments() {
  try {
    let query = supabase
      .from(TABLES.documents)
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by visibility
    if (!isAdmin()) {
      query = query.eq('visibility', 'public');
    }

    const { data, error } = await query;
    if (error) throw error;

    documents = toCamelCase(data);
    filteredDocuments = documents;
    renderDocumentsList();
  } catch (error) {
    console.error('Error loading documents:', error);
    showToast('Errore caricamento documenti', 'error');
  }
}

function filterDocuments(searchTerm) {
  if (!searchTerm) {
    filteredDocuments = documents;
  } else {
    const term = searchTerm.toLowerCase();
    filteredDocuments = documents.filter(doc =>
      doc.title.toLowerCase().includes(term) ||
      doc.description?.toLowerCase().includes(term) ||
      doc.category?.toLowerCase().includes(term)
    );
  }
  renderDocumentsList();
}

function renderDocumentsList() {
  const listContainer = document.getElementById('documents-list');
  if (!listContainer) return;

  if (filteredDocuments.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <ion-icon name="document-text-outline"></ion-icon>
        <p>Nessun documento trovato</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filteredDocuments.map(doc => {
    const icon = getFileIcon(doc.fileName);
    const color = getFileColor(doc.fileName);

    return `
      <div class="document-card" data-url="${doc.fileUrl}">
        <div class="document-icon" style="background-color: ${color}20;">
          <ion-icon name="${icon}" style="color: ${color};"></ion-icon>
        </div>
        <div class="document-info">
          <p class="document-title">${doc.title}</p>
          <div class="document-meta">
            <span>${formatFileSize(doc.fileSize)}</span>
            ${doc.category ? `<span>${doc.category}</span>` : ''}
            ${doc.visibility === 'admin_only' ? '<span class="document-visibility-badge admin-only">Admin</span>' : ''}
          </div>
        </div>
        <ion-icon name="download-outline" style="font-size: 24px; color: var(--color-primary);"></ion-icon>
      </div>
    `;
  }).join('');

  // Add click handlers
  listContainer.querySelectorAll('.document-card').forEach(card => {
    card.addEventListener('click', () => {
      const url = card.getAttribute('data-url');
      if (url) window.open(url, '_blank');
    });
  });
}

export function cleanupDocumentsScreen() {
  documents = [];
  filteredDocuments = [];
}
