/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) IMPORTS
   03) CONSTANTS
   04) VALUE HELPERS
   05) STORAGE STATE
   06) UPLOAD API
   07) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/system/profile/profile-image-storage.js */

/* =============================================================================
   02) IMPORTS
============================================================================= */
import {
  getSupabaseClient,
  normalizeString
} from '../account/identity/account-profile-identity.js';

/* =============================================================================
   03) CONSTANTS
============================================================================= */
const PROFILE_IMAGES_BUCKET = 'profile-media';
const STORAGE_MODE = 'supabase_storage_profile_media';

/* =============================================================================
   04) VALUE HELPERS
============================================================================= */
function normalizeStorageKind(kind = 'avatar') {
  const normalizedKind = normalizeString(kind || 'avatar').toLowerCase();
  if (normalizedKind === 'cover') return 'cover';
  if (normalizedKind === 'post') return 'post';
  return 'avatar';
}

function getUserId(user = {}) {
  return String(
    user.auth_user_id ||
    user.authUserId ||
    user.user_id ||
    user.userId ||
    user.profile?.auth_user_id ||
    user.profile?.authUserId ||
    user.profile?.user_id ||
    user.profile?.userId ||
    user.profile?.id ||
    user.id ||
    user.uid ||
    user.sub ||
    user.session?.user?.id ||
    user.session?.user?.user_metadata?.auth_user_id ||
    ''
  ).trim();
}

async function resolveAuthenticatedUserId({ user = null, supabase = null } = {}) {
  const directUserId = getUserId(user || {});
  if (directUserId) return directUserId;

  if (!supabase) return '';

  try {
    const authUserResult = await supabase.auth.getUser();
    const authUser = authUserResult?.data?.user || authUserResult?.user || null;
    return getUserId(authUser || {});
  } catch (error) {
    return '';
  }
}

function isUploadableFile(file) {
  return typeof File !== 'undefined' && file instanceof File && file.size > 0;
}

function createSafeFileName(file) {
  const originalName = normalizeString(file?.name || 'profile-image');
  const normalizedName = originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalizedName || 'profile-image';
}

function createStoragePath({ file, user, kind }) {
  const userId = String(user || '').trim();
  const storageKind = normalizeStorageKind(kind);
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
  return `${userId}/profile/${storageKind}/${timestamp}-${createSafeFileName(file)}`;
}

/* =============================================================================
   05) STORAGE STATE
============================================================================= */
export function getProfileImageStorageState() {
  return {
    bucket: PROFILE_IMAGES_BUCKET,
    mode: STORAGE_MODE,
    supabaseConfigured: Boolean(getSupabaseClient())
  };
}

export async function resolveProfileImageDisplayUrl({
  storagePath = '',
  publicUrl = '',
  expiresIn = 3600,
  supabase = getSupabaseClient()
} = {}) {
  const normalizedStoragePath = normalizeString(storagePath);
  const normalizedPublicUrl = normalizeString(publicUrl);

  if (!supabase || !normalizedStoragePath) {
    return normalizedPublicUrl;
  }

  try {
    const { data, error } = await supabase
      .storage
      .from(PROFILE_IMAGES_BUCKET)
      .createSignedUrl(normalizedStoragePath, expiresIn);

    if (error) {
      return normalizedPublicUrl;
    }

    return normalizeString(data?.signedUrl || normalizedPublicUrl);
  } catch (_) {
    return normalizedPublicUrl;
  }
}

/* =============================================================================
   06) UPLOAD API
============================================================================= */
export async function uploadProfileImage({
  file = null,
  user = null,
  kind = 'avatar',
  supabase = getSupabaseClient()
} = {}) {
  if (!supabase) {
    const error = new Error('PROFILE_IMAGE_STORAGE_UNAVAILABLE');
    error.code = 'PROFILE_IMAGE_STORAGE_UNAVAILABLE';
    throw error;
  }

  const resolvedUserId = await resolveAuthenticatedUserId({ user, supabase });

  if (!resolvedUserId) {
    const error = new Error('AUTH_REQUIRED');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  if (!isUploadableFile(file)) {
    const error = new Error('PROFILE_IMAGE_FILE_REQUIRED');
    error.code = 'PROFILE_IMAGE_FILE_REQUIRED';
    throw error;
  }

  const storageKind = normalizeStorageKind(kind);
  const storagePath = createStoragePath({ file, user: resolvedUserId, kind: storageKind });
  const { data, error } = await supabase
    .storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/octet-stream'
    });

  if (error) {
    const uploadError = new Error(error.message || 'PROFILE_IMAGE_UPLOAD_FAILED');
    uploadError.code = error.code || 'PROFILE_IMAGE_UPLOAD_FAILED';
    uploadError.cause = error;
    throw uploadError;
  }

  const publicUrlResult = supabase
    .storage
    .from(PROFILE_IMAGES_BUCKET)
    .getPublicUrl(data?.path || storagePath);

  return {
    bucket: PROFILE_IMAGES_BUCKET,
    kind: storageKind,
    storagePath: data?.path || storagePath,
    publicUrl: publicUrlResult?.data?.publicUrl || '',
    mode: 'supabase_storage'
  };
}

/* =============================================================================
   07) END OF FILE
============================================================================= */
