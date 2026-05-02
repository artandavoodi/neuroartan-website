/* =============================================================================
   00) FILE INDEX
   01) MODULE IDENTITY
   02) SUPABASE SESSION HELPERS
   03) GATE RESOLUTION
   04) END OF FILE
============================================================================= */

/* =============================================================================
   01) MODULE IDENTITY
============================================================================= */
/* /website/docs/assets/js/layers/website/development-cockpit/developer-mode-gate.js */

/* =============================================================================
   02) SUPABASE SESSION HELPERS
============================================================================= */
function getSupabaseClient() {
  return typeof window !== 'undefined' ? window.neuroartanSupabase || null : null;
}

async function resolveSupabaseUser() {
  const supabase = getSupabaseClient();
  if (!supabase?.auth || typeof supabase.auth.getSession !== 'function') {
    return null;
  }

  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user || null;
  } catch (_) {
    return null;
  }
}

/* =============================================================================
   03) GATE RESOLUTION
============================================================================= */
export async function resolveDeveloperModeGate(context) {
  const user = await resolveSupabaseUser();
  const capability = context?.registries?.developerCapabilities?.developerMode || {};
  const requirements = Array.isArray(context?.registries?.developerCapabilities?.requirements)
    ? context.registries.developerCapabilities.requirements
    : [];

  return {
    signedIn: !!user,
    userId: user?.id || '',
    email: user?.email || '',
    developerAuthorized: false,
    runtimeEnabled: capability.unsafeRuntimeEnabled === true,
    frontendSecretsAllowed: capability.frontendSecretsAllowed === true,
    browserRepositoryMutationAllowed: capability.browserRepositoryMutationAllowed === true,
    gateStatus: user ? 'developer_capability_backend_required' : 'authentication_required',
    requirements
  };
}

/* =============================================================================
   04) END OF FILE
============================================================================= */
