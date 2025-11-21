/**
 * Utility Functions
 * Funzioni helper generali
 */

/**
 * Show loading spinner
 */
export function showLoading() {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.display = 'flex';
  }
}

/**
 * Hide loading spinner
 */
export function hideLoading() {
  const loading = document.getElementById('loading-screen');
  if (loading) {
    loading.style.display = 'none';
  }
}

/**
 * Show toast message
 */
export function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add styles
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '100px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: type === 'error' ? '#FF3B30' : type === 'success' ? '#34C759' : '#007AFF',
    color: 'white',
    padding: '16px 24px',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    zIndex: '10000',
    maxWidth: '90%',
    textAlign: 'center',
    animation: 'slideUp 0.3s ease'
  });

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show confirmation dialog
 */
export function showConfirm(message, title = 'Conferma') {
  return new Promise((resolve) => {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    resolve(confirmed);
  });
}

/**
 * Show alert dialog
 */
export function showAlert(message, title = 'Attenzione') {
  window.alert(`${title}\n\n${message}`);
}

/**
 * Create modal
 */
export function createModal(title, content, actions = []) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'modal';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';

  const titleEl = document.createElement('h2');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.innerHTML = '<ion-icon name="close"></ion-icon>';
  closeBtn.onclick = () => overlay.remove();

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';
  if (typeof content === 'string') {
    body.innerHTML = content;
  } else {
    body.appendChild(content);
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  actions.forEach(action => {
    const btn = document.createElement('button');
    btn.className = action.className || 'btn-primary';
    btn.textContent = action.label;
    btn.onclick = () => {
      action.onClick();
      if (action.close !== false) {
        overlay.remove();
      }
    };
    footer.appendChild(btn);
  });

  // Assemble modal
  modal.appendChild(header);
  modal.appendChild(body);
  if (actions.length > 0) {
    modal.appendChild(footer);
  }

  overlay.appendChild(modal);

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };

  document.body.appendChild(overlay);

  return overlay;
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format currency
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Validate email
 */
export function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Generate UUID v4
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copiato negli appunti', 'success');
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Errore durante la copia', 'error');
    return false;
  }
}

/**
 * Open in maps app
 */
export function openInMaps(latitude, longitude, label = '') {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  let url;
  if (isIOS) {
    url = `maps:0,0?q=${encodeURIComponent(label)}@${latitude},${longitude}`;
  } else if (isAndroid) {
    url = `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(label)})`;
  } else {
    // Default to Google Maps web
    url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  window.open(url, '_blank');
}

/**
 * Get static map image URL
 */
export function getStaticMapUrl(latitude, longitude, zoom = 14, width = 600, height = 300) {
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s+007AFF(${longitude},${latitude})/${longitude},${latitude},${zoom},0/${width}x${height}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`;
}

/**
 * Download file
 */
export function downloadFile(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Scroll to top
 */
export function scrollToTop(smooth = true) {
  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'auto'
  });
}

/**
 * Get relative time string (es. "2 ore fa")
 */
export function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Date(date).toLocaleDateString('it-IT');
  } else if (days > 0) {
    return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minuto' : 'minuti'} fa`;
  } else {
    return 'Adesso';
  }
}

/**
 * Format phone number (Italian format)
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  // Format as +39 XXX XXX XXXX
  if (cleaned.startsWith('39')) {
    return `+39 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  } else if (cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Check if device is mobile
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is iOS
 */
export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if running as PWA
 */
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
}

/**
 * Add CSS animation keyframes
 */
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
