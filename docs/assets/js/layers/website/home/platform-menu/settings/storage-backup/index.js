/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) STORAGE SERVICE
   03) EXPORT/IMPORT SERVICE
   04) BACKUP SERVICE
   05) UI EVENT HANDLERS
   06) STORAGE USAGE CALCULATION
   07) INITIALIZATION
   08) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
import { mountSettingsCategory } from '../_shared/settings-category.js';

/* =============================================================================
   02) STORAGE SERVICE
============================================================================= */
const STORAGE_KEYS = {
  preferences: 'neuroartan-preferences',
  chatHistory: 'neuroartan-chat-history',
  modelState: 'neuroartan-model-state'
};

function getLocalStorageItem(key) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`[Storage] Failed to get ${key}:`, error);
    return null;
  }
}

function setLocalStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to set ${key}:`, error);
    return false;
  }
}

function removeLocalStorageItem(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to remove ${key}:`, error);
    return false;
  }
}

function clearLocalStorage() {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear localStorage:', error);
    return false;
  }
}

/* =============================================================================
   03) EXPORT/IMPORT SERVICE
============================================================================= */
function exportSettings() {
  const data = {
    preferences: getLocalStorageItem(STORAGE_KEYS.preferences),
    chatHistory: getLocalStorageItem(STORAGE_KEYS.chatHistory),
    modelState: getLocalStorageItem(STORAGE_KEYS.modelState),
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  link.href = url;
  link.download = `neuroartan-settings-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function archiveAndClearLocal() {
  const data = {
    preferences: getLocalStorageItem(STORAGE_KEYS.preferences),
    chatHistory: getLocalStorageItem(STORAGE_KEYS.chatHistory),
    modelState: getLocalStorageItem(STORAGE_KEYS.modelState),
    archivedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  link.href = url;
  link.download = `neuroartan-archive-${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  clearLocalStorage();
  updateStorageUsage();
}

/* =============================================================================
   04) BACKUP SERVICE
============================================================================= */
async function createBackup() {
  if (!window.neuroartanSupabase) {
    console.error('[Backup] Supabase client not available');
    return false;
  }

  const data = {
    preferences: getLocalStorageItem(STORAGE_KEYS.preferences),
    chatHistory: getLocalStorageItem(STORAGE_KEYS.chatHistory),
    modelState: getLocalStorageItem(STORAGE_KEYS.modelState),
    backedUpAt: new Date().toISOString(),
    version: '1.0.0'
  };

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) {
      console.error('[Backup] User not authenticated');
      return false;
    }

    const { error } = await window.neuroartanSupabase
      .from('backups')
      .insert({
        user_id: user.id,
        backup_data: data,
        backup_type: 'manual',
        metadata: {
          version: '1.0.0',
          data_types: ['preferences', 'chatHistory', 'modelState'],
          size: JSON.stringify(data).length
        }
      });

    if (error) {
      console.error('[Backup] Failed to create backup:', error);
      return false;
    }

    updateBackupStatus();
    return true;
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error);
    return false;
  }
}

async function restoreBackup() {
  if (!window.neuroartanSupabase) {
    console.error('[Backup] Supabase client not available');
    return false;
  }

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) {
      console.error('[Backup] User not authenticated');
      return false;
    }

    const { data: backups, error } = await window.neuroartanSupabase
      .from('backups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Backup] Failed to fetch backups:', error);
      return false;
    }

    if (!backups || backups.length === 0) {
      console.error('[Backup] No backups found');
      return false;
    }

    const backup = backups[0];
    const backupData = backup.backup_data;

    if (backupData.preferences) {
      setLocalStorageItem(STORAGE_KEYS.preferences, backupData.preferences);
    }
    if (backupData.chatHistory) {
      setLocalStorageItem(STORAGE_KEYS.chatHistory, backupData.chatHistory);
    }
    if (backupData.modelState) {
      setLocalStorageItem(STORAGE_KEYS.modelState, backupData.modelState);
    }

    updateStorageUsage();
    return true;
  } catch (error) {
    console.error('[Backup] Failed to restore backup:', error);
    return false;
  }
}

async function updateBackupStatus() {
  if (!window.neuroartanSupabase) {
    return;
  }

  try {
    const { data: { user } } = await window.neuroartanSupabase.auth.getUser();
    if (!user) {
      return;
    }

    const { data: backups, error } = await window.neuroartanSupabase
      .from('backups')
      .select('created_at, metadata')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[Backup] Failed to fetch backup status:', error);
      return;
    }

    if (backups && backups.length > 0) {
      const lastBackup = backups[0];
      const lastBackupTime = new Date(lastBackup.created_at).toLocaleString();
      console.log('[Backup] Last backup:', lastBackupTime);
      if (lastBackup.metadata) {
        const sizeInKB = (lastBackup.metadata.size / 1024).toFixed(2);
        console.log('[Backup] Backup size:', sizeInKB, 'KB');
      }
    }
  } catch (error) {
    console.error('[Backup] Failed to update backup status:', error);
  }
}

/* =============================================================================
   05) UI EVENT HANDLERS
============================================================================= */
function handleStorageAction(action) {
  switch (action) {
    case 'export-settings':
      exportSettings();
      break;
    case 'archive-clear-local':
      if (confirm('This will archive your current data and clear all local storage. Continue?')) {
        archiveAndClearLocal();
      }
      break;
    case 'create-backup':
      createBackup();
      break;
    case 'restore-backup':
      if (confirm('This will restore your data from the most recent cloud backup. Any unsaved local changes will be lost. Continue?')) {
        restoreBackup();
      }
      break;
    case 'clear-preferences':
      if (confirm('Clear all preferences?')) {
        removeLocalStorageItem(STORAGE_KEYS.preferences);
        updateStorageUsage();
      }
      break;
    case 'clear-chat':
      if (confirm('Clear all chat history?')) {
        removeLocalStorageItem(STORAGE_KEYS.chatHistory);
        updateStorageUsage();
      }
      break;
    case 'clear-model':
      if (confirm('Clear all model state?')) {
        removeLocalStorageItem(STORAGE_KEYS.modelState);
        updateStorageUsage();
      }
      break;
    default:
      console.warn('[Storage] Unknown action:', action);
  }
}

/* =============================================================================
   06) STORAGE USAGE CALCULATION
============================================================================= */
function calculateStorageSize(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return 0;
    return new Blob([item]).size;
  } catch (error) {
    console.error(`[Storage] Failed to calculate size for ${key}:`, error);
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function updateStorageUsage() {
  const preferencesSize = calculateStorageSize(STORAGE_KEYS.preferences);
  const chatSize = calculateStorageSize(STORAGE_KEYS.chatHistory);
  const modelSize = calculateStorageSize(STORAGE_KEYS.modelState);
  const totalSize = preferencesSize + chatSize + modelSize;

  const preferencesElement = document.querySelector('[data-home-platform-storage-preferences]');
  const chatElement = document.querySelector('[data-home-platform-storage-chat]');
  const modelElement = document.querySelector('[data-home-platform-storage-model]');
  const totalElement = document.querySelector('[data-home-platform-storage-total]');

  if (preferencesElement) {
    preferencesElement.textContent = formatBytes(preferencesSize);
  }
  if (chatElement) {
    chatElement.textContent = formatBytes(chatSize);
  }
  if (modelElement) {
    modelElement.textContent = formatBytes(modelSize);
  }
  if (totalElement) {
    totalElement.textContent = formatBytes(totalSize);
  }
}

/* =============================================================================
   07) INITIALIZATION
============================================================================= */
export function mountHomePlatformDestination(root, options = {}) {
  mountSettingsCategory(root, options);

  const storageActions = root.querySelectorAll('[data-home-platform-settings-action]');
  storageActions.forEach(button => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-home-platform-settings-action');
      handleStorageAction(action);
    });
  });

  updateStorageUsage();

  if (window.neuroartanSupabase) {
    window.addEventListener('neuroartan:supabase-ready', () => {
      updateBackupStatus();
    });
  }
}

/* =============================================================================
   08) END OF FILE
============================================================================= */
