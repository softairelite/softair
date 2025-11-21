/**
 * Supabase Configuration
 * Configurazione client Supabase per webapp
 */

// Credenziali Supabase (stesse dell'app iOS)
const SUPABASE_URL = 'https://uyubwlukwemqcwropljl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5dWJ3bHVrd2VtcWN3cm9wbGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjA0NjEsImV4cCI6MjA3OTAzNjQ2MX0.CYbKw55zi6t-IaX92pThdpaPNcL3AIYjDakmpHwWKeg';

// Crea client Supabase
// NOTA: La libreria Supabase è caricata globalmente come window.supabase
const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

// Nomi tabelle
const TABLES = {
  users: 'users',
  events: 'events',
  attendance: 'event_attendance',
  documents: 'documents'
};

// Storage buckets
const STORAGE_BUCKETS = {
  avatars: 'avatars',
  documents: 'documents'
};

/**
 * Conversione da snake_case (DB) a camelCase (JS)
 */
function toCamelCase(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }

  const camelObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelObj[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelObj;
}

/**
 * Conversione da camelCase (JS) a snake_case (DB)
 */
function toSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(toSnakeCase);
  }

  const snakeObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeObj[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return snakeObj;
}

/**
 * Parse PostGIS Point to coordinate object
 */
function parsePostGISPoint(pointString) {
  if (!pointString) return null;

  // Format: "POINT(longitude latitude)"
  const match = pointString.match(/POINT\(([^ ]+) ([^ ]+)\)/);
  if (!match) return null;

  return {
    longitude: parseFloat(match[1]),
    latitude: parseFloat(match[2])
  };
}

/**
 * Convert coordinate to PostGIS Point string
 */
function toPostGISPoint(longitude, latitude) {
  return `POINT(${longitude} ${latitude})`;
}

/**
 * Helper: format date
 */
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Helper: format time
 */
function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Helper: format datetime
 */
function formatDateTime(dateString) {
  if (!dateString) return '';
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

/**
 * Helper: check if event is past
 */
function isEventPast(eventDate) {
  return new Date(eventDate) < new Date();
}

/**
 * Helper: get certificate status
 */
function getCertificateStatus(hasCertificate, expiryDate) {
  if (!hasCertificate || !expiryDate) {
    return { status: 'none', label: 'Nessuno', color: 'gray' };
  }

  const now = new Date();
  const expiry = new Date(expiryDate);
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  if (expiry <= now) {
    return { status: 'expired', label: 'Scaduto', color: 'danger' };
  } else if (expiry <= thirtyDaysFromNow) {
    return { status: 'expiring', label: 'In scadenza', color: 'warning' };
  } else {
    return { status: 'valid', label: 'Valido', color: 'success' };
  }
}

/**
 * Helper: get user initials
 */
function getUserInitials(firstName, lastName) {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

/**
 * Helper: format file size
 */
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Helper: get file extension
 */
function getFileExtension(filename) {
  return filename?.split('.').pop()?.toLowerCase() || '';
}

/**
 * Helper: get file icon based on extension
 */
function getFileIcon(filename) {
  const ext = getFileExtension(filename);
  const iconMap = {
    pdf: 'document-text',
    doc: 'document',
    docx: 'document',
    xls: 'grid',
    xlsx: 'grid',
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    zip: 'archive',
    rar: 'archive'
  };
  return iconMap[ext] || 'document';
}

/**
 * Helper: get file color based on extension
 */
function getFileColor(filename) {
  const ext = getFileExtension(filename);
  const colorMap = {
    pdf: '#FF3B30',
    doc: '#007AFF',
    docx: '#007AFF',
    xls: '#34C759',
    xlsx: '#34C759',
    jpg: '#FF9500',
    jpeg: '#FF9500',
    png: '#FF9500',
    gif: '#FF9500',
    zip: '#8E8E93',
    rar: '#8E8E93'
  };
  return colorMap[ext] || '#8E8E93';
}

// Export tutto
export {
  supabase,
  TABLES,
  STORAGE_BUCKETS,
  toCamelCase,
  toSnakeCase,
  parsePostGISPoint,
  toPostGISPoint,
  formatDate,
  formatTime,
  formatDateTime,
  isEventPast,
  getCertificateStatus,
  getUserInitials,
  formatFileSize,
  getFileExtension,
  getFileIcon,
  getFileColor
};
