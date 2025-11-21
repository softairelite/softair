/**
 * Admin Documents Management
 * Gestione completa documenti (CRUD + Upload)
 */

import { supabase, TABLES, STORAGE_BUCKETS, toCamelCase, formatFileSize, getFileIcon, getFileColor } from '../lib/supabase.js';
import { getCurrentUser, isAdmin } from '../lib/auth.js';
import { showLoading, hideLoading, showToast, showConfirm, createModal, generateUUID } from '../lib/utils.js';
import { navigateTo, showBackButton } from '../components/navigation.js';

let documents = [];
let currentDocument = null;
let isEditMode = false;
let selectedFile = null;

const CATEGORIES = [
  { value: 'generale', label: 'Generale' },
  { value: 'regolamento', label: 'Regolamento' },
  { value: 'modulistica', label: 'Modulistica' },
  { value: 'verbali', label: 'Verbali' },
  { value: 'guide', label: 'Guide' },
  { value: 'bilanci', label: 'Bilanci' },
  { value: 'altro', label: 'Altro' }
];

/**
 * Render documents management screen
 */
export function renderAdminDocumentsScreen() {
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
        <h1>Gestione Documenti</h1>
        <button class="header-action" id="add-btn">
          <ion-icon name="add"></ion-icon>
          Carica
        </button>
      </div>

      <div class="content-container">
        <div class="alert alert-info" style="margin-bottom: 20px;">
          <ion-icon name="information-circle"></ion-icon>
          <div>
            <strong>Nota:</strong> I file vengono caricati direttamente nel browser.
            Per file molto grandi (>10MB) il caricamento potrebbe richiedere tempo.
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <input type="text" id="search-documents" placeholder="Cerca documenti..." style="width: 100%;">
        </div>

        <div id="documents-list" style="min-height: 200px;">
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
  document.getElementById('add-btn')?.addEventListener('click', () => showUploadForm());

  // Search
  document.getElementById('search-documents')?.addEventListener('input', (e) => {
    renderDocumentsList(e.target.value);
  });

  // Load documents
  loadDocuments();
}

/**
 * Load documents from database
 */
async function loadDocuments() {
  try {
    const { data, error } = await supabase
      .from(TABLES.documents)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    documents = toCamelCase(data);
    renderDocumentsList();
  } catch (error) {
    console.error('Error loading documents:', error);
    showToast('Errore caricamento documenti', 'error');
  }
}

/**
 * Render documents list
 */
function renderDocumentsList(searchTerm = '') {
  const listContainer = document.getElementById('documents-list');
  if (!listContainer) return;

  let filteredDocs = documents;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredDocs = documents.filter(doc =>
      doc.title.toLowerCase().includes(term) ||
      doc.description?.toLowerCase().includes(term) ||
      doc.category?.toLowerCase().includes(term)
    );
  }

  if (filteredDocs.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <ion-icon name="document-text-outline"></ion-icon>
        <p>${searchTerm ? 'Nessun documento trovato' : 'Nessun documento presente'}</p>
        <p style="font-size: 14px; color: var(--color-text-tertiary);">
          Clicca "Carica" per aggiungere documenti
        </p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = filteredDocs.map(doc => {
    const icon = getFileIcon(doc.fileName);
    const color = getFileColor(doc.fileName);

    return `
      <div class="card">
        <div style="display: flex; gap: 16px; align-items: center;">
          <div class="document-icon" style="background-color: ${color}20; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <ion-icon name="${icon}" style="color: ${color}; font-size: 24px;"></ion-icon>
          </div>

          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <strong style="font-size: 16px;">${doc.title}</strong>
              ${doc.visibility === 'admin_only' ? '<span class="user-badge" style="background: #FF9500; color: white;">Admin</span>' : '<span class="user-badge" style="background: #34C759; color: white;">Pubblico</span>'}
            </div>

            ${doc.description ? `<div style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 4px;">${doc.description}</div>` : ''}

            <div style="color: var(--color-text-tertiary); font-size: 13px; display: flex; gap: 12px;">
              <span>${formatFileSize(doc.fileSize)}</span>
              ${doc.category ? `<span>• ${doc.category}</span>` : ''}
              <span>• ${new Date(doc.createdAt).toLocaleDateString('it-IT')}</span>
            </div>
          </div>

          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <button class="btn-secondary" style="padding: 8px;" onclick="window.open('${doc.fileUrl}', '_blank')" title="Scarica">
              <ion-icon name="download"></ion-icon>
            </button>
            <button class="btn-secondary" style="padding: 8px;" onclick="editDocument('${doc.id}')" title="Modifica">
              <ion-icon name="create"></ion-icon>
            </button>
            <button class="btn-danger" style="padding: 8px;" onclick="deleteDocument('${doc.id}')" title="Elimina">
              <ion-icon name="trash"></ion-icon>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Show upload form
 */
function showUploadForm() {
  selectedFile = null;

  const formHTML = `
    <form id="upload-form" style="display: flex; flex-direction: column; gap: 16px;">
      <div class="alert alert-info">
        <ion-icon name="information-circle"></ion-icon>
        <div>Carica un documento per condividerlo con gli utenti del club.</div>
      </div>

      <div class="form-group">
        <label class="form-label">Seleziona File *</label>
        <input type="file" id="file-input" required
               accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar">
        <span class="form-helper">Max 50 MB - PDF, DOC, XLS, immagini, ZIP</span>
      </div>

      <div id="file-preview" style="display: none; padding: 12px; background: var(--color-bg-tertiary); border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <ion-icon name="document" style="font-size: 32px; color: var(--color-primary);"></ion-icon>
          <div style="flex: 1;">
            <strong id="file-name"></strong>
            <div style="font-size: 13px; color: var(--color-text-tertiary);" id="file-size"></div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Titolo *</label>
        <input type="text" id="doc-title" required placeholder="Es: Regolamento Club 2024">
      </div>

      <div class="form-group">
        <label class="form-label">Descrizione</label>
        <textarea id="doc-description" rows="3" placeholder="Breve descrizione del documento..."></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select id="doc-category">
          <option value="">Seleziona categoria...</option>
          ${CATEGORIES.map(cat => `<option value="${cat.value}">${cat.label}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="doc-admin-only">
          <span>Solo amministratori</span>
        </label>
        <span class="form-helper">Se selezionato, solo gli admin potranno vedere questo documento</span>
      </div>
    </form>
  `;

  const modal = createModal(
    '📤 Carica Documento',
    formHTML,
    [
      {
        label: 'Annulla',
        className: 'btn-secondary',
        onClick: () => modal.remove()
      },
      {
        label: 'Carica',
        className: 'btn-primary',
        onClick: () => handleUpload(modal),
        close: false
      }
    ]
  );

  // Setup file input handler
  const fileInput = document.getElementById('file-input');
  fileInput?.addEventListener('change', handleFileSelect);
}

/**
 * Handle file selection
 */
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) {
    selectedFile = null;
    document.getElementById('file-preview').style.display = 'none';
    return;
  }

  // Check file size (50 MB max)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast('File troppo grande! Max 50 MB', 'error');
    e.target.value = '';
    selectedFile = null;
    document.getElementById('file-preview').style.display = 'none';
    return;
  }

  selectedFile = file;

  // Show preview
  const preview = document.getElementById('file-preview');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');

  if (preview && fileName && fileSize) {
    preview.style.display = 'block';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
  }

  // Auto-fill title if empty
  const titleInput = document.getElementById('doc-title');
  if (titleInput && !titleInput.value) {
    // Remove extension from filename
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
    titleInput.value = nameWithoutExt;
  }
}

/**
 * Handle document upload
 */
async function handleUpload(modal) {
  const form = document.getElementById('upload-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!selectedFile) {
    showToast('Seleziona un file da caricare', 'error');
    return;
  }

  const title = document.getElementById('doc-title').value.trim();
  const description = document.getElementById('doc-description').value.trim();
  const category = document.getElementById('doc-category').value;
  const adminOnly = document.getElementById('doc-admin-only').checked;

  try {
    showLoading();

    // Upload file to Supabase Storage
    const user = getCurrentUser();
    const fileExt = selectedFile.name.split('.').pop();
    const fileName = `${generateUUID()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    const documentData = {
      title,
      description: description || null,
      category: category || null,
      file_url: fileUrl,
      file_name: selectedFile.name,
      file_size: selectedFile.size,
      file_type: selectedFile.type,
      visibility: adminOnly ? 'admin_only' : 'public',
      uploaded_by: user.id
    };

    console.log('Current user:', user);
    console.log('Document data:', documentData);
    console.log('Is admin?', isAdmin());

    // Test is_admin() function from database
    const { data: adminTest, error: adminTestError } = await supabase.rpc('is_admin');
    console.log('Database is_admin() result:', adminTest, adminTestError);

    const { data, error } = await supabase
      .from(TABLES.documents)
      .insert([documentData])
      .select();

    console.log('Insert result:', { data, error });
    if (error) throw error;

    hideLoading();
    showToast('Documento caricato con successo', 'success');
    modal.remove();
    await loadDocuments();

  } catch (error) {
    hideLoading();
    console.error('Error uploading document:', error);
    showToast(error.message || 'Errore caricamento documento', 'error');
  }
}

/**
 * Show edit form
 */
function showEditForm(docId) {
  isEditMode = true;
  currentDocument = documents.find(d => d.id === docId);
  if (!currentDocument) return;

  const formHTML = `
    <form id="edit-doc-form" style="display: flex; flex-direction: column; gap: 16px;">
      <div class="alert alert-warning">
        <ion-icon name="warning"></ion-icon>
        <div><strong>Nota:</strong> Non è possibile modificare il file. Puoi solo aggiornare titolo, descrizione e visibilità.</div>
      </div>

      <div class="form-group">
        <label class="form-label">File Attuale</label>
        <div style="padding: 12px; background: var(--color-bg-tertiary); border-radius: 8px;">
          <strong>${currentDocument.fileName}</strong>
          <div style="font-size: 13px; color: var(--color-text-tertiary);">
            ${formatFileSize(currentDocument.fileSize)}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Titolo *</label>
        <input type="text" id="edit-title" value="${currentDocument.title}" required>
      </div>

      <div class="form-group">
        <label class="form-label">Descrizione</label>
        <textarea id="edit-description" rows="3">${currentDocument.description || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Categoria</label>
        <select id="edit-category">
          <option value="">Nessuna categoria</option>
          ${CATEGORIES.map(cat => `
            <option value="${cat.value}" ${currentDocument.category === cat.value ? 'selected' : ''}>
              ${cat.label}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="form-group">
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="edit-admin-only"
                 ${currentDocument.visibility === 'admin_only' ? 'checked' : ''}>
          <span>Solo amministratori</span>
        </label>
      </div>
    </form>
  `;

  const modal = createModal(
    '✏️ Modifica Documento',
    formHTML,
    [
      {
        label: 'Annulla',
        className: 'btn-secondary',
        onClick: () => modal.remove()
      },
      {
        label: 'Elimina',
        className: 'btn-danger',
        onClick: () => {
          modal.remove();
          handleDeleteDocument(docId);
        }
      },
      {
        label: 'Salva',
        className: 'btn-primary',
        onClick: () => handleUpdateDocument(modal),
        close: false
      }
    ]
  );
}

/**
 * Handle update document
 */
async function handleUpdateDocument(modal) {
  const form = document.getElementById('edit-doc-form');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-description').value.trim();
  const category = document.getElementById('edit-category').value;
  const adminOnly = document.getElementById('edit-admin-only').checked;

  try {
    showLoading();

    const updates = {
      title,
      description: description || null,
      category: category || null,
      visibility: adminOnly ? 'admin_only' : 'public'
    };

    const { error } = await supabase
      .from(TABLES.documents)
      .update(updates)
      .eq('id', currentDocument.id);

    if (error) throw error;

    hideLoading();
    showToast('Documento aggiornato', 'success');
    modal.remove();
    await loadDocuments();

  } catch (error) {
    hideLoading();
    console.error('Error updating document:', error);
    showToast(error.message || 'Errore aggiornamento documento', 'error');
  }
}

/**
 * Handle delete document
 */
async function handleDeleteDocument(docId) {
  const doc = documents.find(d => d.id === docId);
  if (!doc) return;

  const confirmed = await showConfirm(
    `Sei sicuro di voler eliminare il documento "${doc.title}"?\n\nQuesta azione non può essere annullata.`,
    'Conferma Eliminazione'
  );

  if (!confirmed) return;

  try {
    showLoading();

    // In produzione, qui elimineresti anche il file da Supabase Storage
    // await supabase.storage.from(STORAGE_BUCKETS.documents).remove([doc.filePath])

    const { error } = await supabase
      .from(TABLES.documents)
      .delete()
      .eq('id', docId);

    if (error) throw error;

    hideLoading();
    showToast('Documento eliminato', 'success');
    await loadDocuments();

  } catch (error) {
    hideLoading();
    console.error('Error deleting document:', error);
    showToast(error.message || 'Errore eliminazione documento', 'error');
  }
}

/**
 * Global functions for HTML onclick handlers
 */
window.editDocument = function(docId) {
  showEditForm(docId);
};

window.deleteDocument = function(docId) {
  handleDeleteDocument(docId);
};

/**
 * Cleanup
 */
export function cleanupAdminDocumentsScreen() {
  documents = [];
  currentDocument = null;
  isEditMode = false;
  selectedFile = null;
}
