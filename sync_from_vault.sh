#!/bin/bash
set -euo pipefail

# ==================================================
# SECTION: LEGACY SCRIPT DEPRECATION NOTICE
# ==================================================
# This script is intentionally retained as a legacy boundary marker.
# It is no longer part of the canonical Neuroartan publication workflow.
#
# PTW governance now separates:
# 1. private Vault authoring and governance,
# 2. PTW-approved export/materialization,
# 3. public website staging/commit/push.
#
# As a result, direct Vault → Website sync execution must not be triggered
# from this website-local legacy script.
# ==================================================

# ==================================================
# SECTION: DEPRECATION GUARD
# ==================================================
printf "\n[ERROR] sync_from_vault.sh is deprecated and disabled.\n" >&2
printf "[RULE] PTW-governed export/materialization must be handled upstream through the approved procedure layer.\n" >&2
printf "[RULE] Website push must be executed downstream through the canonical UPDATE SITE procedure after PTW-approved website output already exists.\n\n" >&2
exit 1