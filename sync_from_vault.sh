#!/bin/bash
set -euo pipefail

# =================== Obsidian → Website Sync ===================
# Canonical public website source is pulled from the private Obsidian vault.
# Current synced branch: Publications only.
# Canonical website architecture rule: generated pages must mount the same
# shared runtime fragment system as the rest of the website. No page-specific
# institutional-menu duplication is allowed inside generated publication output.
# Website outputs: content_sync/publications/, pages/publications/, publications/, sitemap.xml block

 # Canonical local staging root now lives under /Users/artan/Documents/Neuroartan
PUBLICATIONS_VAULT_DEFAULT="$HOME/Documents/Neuroartan/I/06 - Communication/04 - Publications"
VAULT="${PUBLICATIONS_VAULT_PATH:-$PUBLICATIONS_VAULT_DEFAULT}"
SITE_ROOT="${NEUROARTAN_SITE_ROOT:-$HOME/Documents/Neuroartan/website}"
CONTENT_SYNC_ROOT="$SITE_ROOT/content_sync"
DEST_CANON="$CONTENT_SYNC_ROOT"
PUB_INDEX="$SITE_ROOT/pages/publications/index.html"
SITE_BASE="${NEUROARTAN_SITE_BASE_URL:-https://neuroartan.com}"

ESSAYS_SRC="$VAULT/01 - Essays/01 - Records"
NOTES_SRC="$VAULT/02 - Notes/01 - Records"
RESEARCH_SRC="$VAULT/03 - Research/01 - Records"
VISUAL_SRC="$VAULT/04 - Visual/01 - Records"

DEST_ESSAYS="$CONTENT_SYNC_ROOT/publications/essays"
DEST_NOTES="$CONTENT_SYNC_ROOT/publications/notes"
DEST_RESEARCH="$CONTENT_SYNC_ROOT/publications/research"
DEST_VISUAL="$CONTENT_SYNC_ROOT/publications/visual"

if [[ ! -d "$VAULT" ]]; then
  echo "[ERROR] Vault source path not found: $VAULT" >&2
  echo "[HINT] Set PUBLICATIONS_VAULT_PATH to the live publications root before running this sync." >&2
  exit 1
fi

if [[ ! -d "$SITE_ROOT" ]]; then
  echo "[ERROR] Website root path not found: $SITE_ROOT" >&2
  exit 1
fi

for src_dir in "$ESSAYS_SRC" "$NOTES_SRC" "$RESEARCH_SRC" "$VISUAL_SRC"; do
  if [[ ! -d "$src_dir" ]]; then
    echo "[ERROR] Publication source path not found: $src_dir" >&2
    exit 1
  fi
done

mkdir -p "$DEST_CANON" "$DEST_ESSAYS" "$DEST_NOTES" "$DEST_RESEARCH" "$DEST_VISUAL"

# 1) Mirror Obsidian published content from canonical publication records
sync_publication_bucket() {
  local src_dir="$1"
  local dest_dir="$2"

  mkdir -p "$dest_dir"

  rsync -av --delete \
    --exclude ".DO_NOT_EDIT" \
    --exclude "DO_NOT_EDIT" \
    --exclude "Do Not Edit" \
    --exclude "README.md" \
    --exclude ".gitkeep" \
    "$src_dir"/ "$dest_dir"/
}

sync_publication_bucket "$ESSAYS_SRC" "$DEST_ESSAYS"
sync_publication_bucket "$NOTES_SRC" "$DEST_NOTES"
sync_publication_bucket "$RESEARCH_SRC" "$DEST_RESEARCH"
sync_publication_bucket "$VISUAL_SRC" "$DEST_VISUAL"

#
# 2) Rebuild Publications index from flattened website publication buckets
mkdir -p "$(dirname "$PUB_INDEX")"

MD_FILES=()
while IFS= read -r f; do
  MD_FILES+=("$f")
done < <(
  cd "$DEST_CANON" 2>/dev/null || exit 0
  find publications/essays publications/notes publications/research publications/visual -type f -name "*.md" 2>/dev/null | LC_ALL=C sort
)

extract_yaml_field() {
  local file="$1"
  local field="$2"
  awk -v key="$field:" '
    BEGIN { in_yaml=0 }
    /^---$/ { in_yaml = !in_yaml; next }
    in_yaml && index($0, key)==1 {
      sub(key"[ ]*", "")
      gsub(/^"|"$/, "")
      print
      exit
    }
  ' "$DEST_CANON/$file"
}

normalize_bool() {
  local value="${1:-}"
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]' | xargs)"
  printf '%s' "$value"
}

require_document_id() {
  local rel="$1"
  local document_id_val

  document_id_val="$(extract_yaml_field "$rel" "document_id" | xargs)"

  if [[ -z "$document_id_val" ]]; then
    echo "[ERROR] Missing required document_id in publishable source: $DEST_CANON/$rel" >&2
    exit 1
  fi

  printf '%s' "$document_id_val"
}

is_publishable_publication() {
  local rel="$1"
  local type_val published_val visibility_val approval_val status_val

  type_val="$(extract_yaml_field "$rel" "type" | tr '[:upper:]' '[:lower:]' | xargs)"
  published_val="$(normalize_bool "$(extract_yaml_field "$rel" "published")")"
  visibility_val="$(extract_yaml_field "$rel" "visibility" | tr '[:upper:]' '[:lower:]' | xargs)"
  approval_val="$(extract_yaml_field "$rel" "approval_status" | tr '[:upper:]' '[:lower:]' | xargs)"
  status_val="$(extract_yaml_field "$rel" "status" | tr '[:upper:]' '[:lower:]' | xargs)"

  [[ "$type_val" == "publication" ]] || return 1

  if [[ "$published_val" == "false" || "$published_val" == "no" || "$published_val" == "0" ]]; then
    return 1
  fi

  if [[ "$visibility_val" == "private" || "$visibility_val" == "internal" || "$visibility_val" == "restricted" || "$visibility_val" == "confidential" ]]; then
    return 1
  fi

  if [[ "$approval_val" == "draft" || "$approval_val" == "archived" ]]; then
    return 1
  fi

  if [[ "$status_val" == "draft" || "$status_val" == "archived" ]]; then
    return 1
  fi

  return 0
}

slugify_fallback() {
  # Lowercase, spaces/underscores → hyphen, drop non-url-safe chars, collapse hyphens
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[ _]+/-/g; s/[^a-z0-9-]+//g; s/-+/-/g; s/^-|-$//g'
}

escape_html() {
  local value="${1:-}"
  value="${value//&/&amp;}"
  value="${value//</&lt;}"
  value="${value//>/&gt;}"
  value="${value//\"/&quot;}"
  value="${value//\'/&#39;}"
  printf '%s' "$value"
}

escape_attr() {
  escape_html "$1"
}

escape_json_string() {
  local value="${1:-}"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/ }"
  value="${value//$'\r'/ }"
  printf '%s' "$value"
}

LIST_ITEMS=""

for rel in "${MD_FILES[@]}"; do
  if ! is_publishable_publication "$rel"; then
    continue
  fi

  title_val="$(extract_yaml_field "$rel" "title")"
  if [[ -z "$title_val" ]]; then
    continue
  fi
  document_id_val="$(require_document_id "$rel")"

  slug_val="$(extract_yaml_field "$rel" "slug")"
  if [[ -z "$slug_val" ]]; then
    base_name="$(basename "$rel")"
    base_name="${base_name%.md}"
    slug_val="$(slugify_fallback "$base_name")"
  fi

  href="/publications/${slug_val}/"

  LIST_ITEMS+="      <li class=\"publication-item\">\n"
  LIST_ITEMS+="        <a class=\"publication-link\" href=\"$href\">\n"
  LIST_ITEMS+="          <span class=\"publication-item-title\">$title_val</span>\n"
  LIST_ITEMS+="        </a>\n"
  LIST_ITEMS+="      </li>\n"
done

if [[ -z "$LIST_ITEMS" ]]; then
  LIST_ITEMS="      <li class=\"publication-item publication-item--empty\"><span class=\"publication-empty\" data-i18n-key=\"publications.empty\">No items yet.</span></li>\n"
fi

START_MARK="<!-- PUBLIST:START -->"
END_MARK="<!-- PUBLIST:END -->"

if [[ -f "$PUB_INDEX" ]]; then
  tmp_out="$(mktemp)"
  tmp_list="$(mktemp)"
  printf "%b" "$LIST_ITEMS" > "$tmp_list"

  awk -v START_MARK="$START_MARK" \
      -v END_MARK="$END_MARK" \
      -v LIST_FILE="$tmp_list" '
    BEGIN { inblock=0 }
    {
      if (index($0, START_MARK)) {
        print $0
        while ((getline l < LIST_FILE) > 0) print l
        close(LIST_FILE)
        inblock=1
        next
      }
      if (inblock) {
        if (index($0, END_MARK)) {
          print $0
          inblock=0
        }
        next
      }
      print $0
    }
  ' "$PUB_INDEX" > "$tmp_out"

  mv "$tmp_out" "$PUB_INDEX"
  rm -f "$tmp_list"
fi

# 2b) Build static publication pages + sitemap block (SEO-friendly)
# Output: /publications/<slug>/index.html built from flattened content_sync publication buckets
PUB_PAGES_DIR="$SITE_ROOT/publications"
SITEMAP_FILE="$SITE_ROOT/sitemap.xml"

# Simple, dependency-free markdown → HTML (headings, paragraphs, bullet lists, blockquotes, code fences)
md_to_html() {
  awk '
    function esc(s){ gsub(/&/,"&amp;",s); gsub(/</,"&lt;",s); gsub(/>/,"&gt;",s); return s }
    function apply_code(s,   out) {
      out = ""
      while (match(s, /`[^`]+`/)) {
        out = out substr(s, 1, RSTART - 1) "<code>" substr(s, RSTART + 1, RLENGTH - 2) "</code>"
        s = substr(s, RSTART + RLENGTH)
      }
      return out s
    }
    function apply_bold(s,   out) {
      out = ""
      while (match(s, /\*\*[^*]+\*\*/)) {
        out = out substr(s, 1, RSTART - 1) "<strong>" substr(s, RSTART + 2, RLENGTH - 4) "</strong>"
        s = substr(s, RSTART + RLENGTH)
      }
      return out s
    }
    function apply_italic(s,   out) {
      out = ""
      while (match(s, /\*[^*]+\*/)) {
        out = out substr(s, 1, RSTART - 1) "<em>" substr(s, RSTART + 1, RLENGTH - 2) "</em>"
        s = substr(s, RSTART + RLENGTH)
      }
      return out s
    }
    function inline(s){ s=esc(s); s=apply_code(s); s=apply_bold(s); s=apply_italic(s); return s }
    BEGIN{ in_list=0; in_code=0; in_quote=0 }
    /^```/ {
      if(in_code){ print "</code></pre>"; in_code=0 } else { print "<pre><code>"; in_code=1 }
      next
    }
    {
      if(in_code){ print esc($0); next }
    }
    /^> / {
      if(!in_quote){ print "<blockquote>"; in_quote=1 }
      line=$0; sub(/^> /,"",line)
      print "<p>" inline(line) "</p>"
      next
    }
    !/^> / {
      if(in_quote){ print "</blockquote>"; in_quote=0 }
    }
    /^\s*$/ {
      if(in_list){ print "</ul>"; in_list=0 }
      next
    }
    /^- / {
      if(!in_list){ print "<ul>"; in_list=1 }
      line=$0; sub(/^- /,"",line)
      print "<li>" inline(line) "</li>"
      next
    }
    /^###### /{ if(in_list){ print "</ul>"; in_list=0 } line=$0; sub(/^###### /,"",line); print "<h6>" inline(line) "</h6>"; next }
    /^##### / { if(in_list){ print "</ul>"; in_list=0 } line=$0; sub(/^##### /,"",line); print "<h5>" inline(line) "</h5>"; next }
    /^#### /  { if(in_list){ print "</ul>"; in_list=0 } line=$0; sub(/^#### /,"",line); print "<h4>" inline(line) "</h4>"; next }
    /^### /   { if(in_list){ print "</ul>"; in_list=0 } line=$0; sub(/^### /,"",line); print "<h3>" inline(line) "</h3>"; next }
    /^## /    { if(in_list){ print "</ul>"; in_list=0 } line=$0; sub(/^## /,"",line); print "<h2>" inline(line) "</h2>"; next }
    /^# /     { if(in_list){ print "</ul>"; in_list=0 } line=$0; sub(/^# /,"",line);  print "<h1>" inline(line) "</h1>"; next }
    {
      if(in_list){ print "</ul>"; in_list=0 }
      print "<p>" inline($0) "</p>"
    }
    END{
      if(in_list) print "</ul>"
      if(in_quote) print "</blockquote>"
      if(in_code) print "</code></pre>"
    }
  '
}

extract_body_without_yaml() {
  awk '
    BEGIN{ in_yaml=0; started=0 }
    /^---$/ {
      if(!started){ in_yaml=1; started=1; next }
      if(in_yaml){ in_yaml=0; next }
    }
    { if(!in_yaml) print }
  ' "$1"
}

sanitize_publication_markdown() {
  local file="$1"
  local title="$2"
  local subtitle="$3"

  awk -v title="$title" -v subtitle="$subtitle" '
    function trim(s) { sub(/^[[:space:]]+/, "", s); sub(/[[:space:]]+$/, "", s); return s }
    BEGIN {
      in_yaml = 0
      started_yaml = 0
      skip_tail = 0
      removed_h1 = 0
      removed_h2 = 0
      clean_title = trim(title)
      clean_subtitle = trim(subtitle)
    }
    /^---[[:space:]]*$/ {
      if (!started_yaml) {
        in_yaml = 1
        started_yaml = 1
        next
      }
      if (in_yaml) {
        in_yaml = 0
        next
      }
    }
    {
      if (in_yaml || skip_tail) next

      line = $0
      stripped = trim(line)

      if (stripped == "## Change Log" || stripped == "## Document Control & Validation" || stripped == "END OF DOCUMENT") {
        skip_tail = 1
        next
      }

      if (stripped == "---") next

      if (!removed_h1 && clean_title != "" && stripped == "# " clean_title) {
        removed_h1 = 1
        next
      }

      if (!removed_h2 && clean_subtitle != "" && stripped == "## " clean_subtitle) {
        removed_h2 = 1
        next
      }

      print line
    }
  ' "$file"
}



mkdir -p "$PUB_PAGES_DIR"

# Build pages and collect sitemap URLs
SITEMAP_URLS=""

#
# Build static pages from the synchronized canonical website buckets
for rel in "${MD_FILES[@]}"; do
  if ! is_publishable_publication "$rel"; then
    continue
  fi

  title_val="$(extract_yaml_field "$rel" "title")"
  subtitle_val="$(extract_yaml_field "$rel" "subtitle")"
  slug_val="$(extract_yaml_field "$rel" "slug")"
  document_id_val="$(require_document_id "$rel")"
  effective_date_val="$(extract_yaml_field "$rel" "effective_date")"
  last_updated_val="$(extract_yaml_field "$rel" "last_updated")"

  title_html="$(escape_html "$title_val")"
  subtitle_html="$(escape_html "$subtitle_val")"
  title_attr="$(escape_attr "$title_val")"
  subtitle_attr="$(escape_attr "$subtitle_val")"
  title_json="$(escape_json_string "$title_val")"
  subtitle_json="$(escape_json_string "$subtitle_val")"
  document_id_attr="$(escape_attr "$document_id_val")"
  document_id_html="$(escape_html "$document_id_val")"
  effective_date_attr="$(escape_attr "$effective_date_val")"
  last_updated_attr="$(escape_attr "$last_updated_val")"

  # Required fields
  [[ -n "$title_val" ]] || continue

  if [[ -z "$slug_val" ]]; then
    # Fallback to filename if slug not set
    base_name="$(basename "$rel")"
    base_name="${base_name%.md}"
    slug_val="$(slugify_fallback "$base_name")"
  fi

  out_dir="$PUB_PAGES_DIR/$slug_val"
  out_file="$out_dir/index.html"
  mkdir -p "$out_dir"

  src_file="$DEST_CANON/$rel"
  body_md="$(mktemp)"
  body_html="$(mktemp)"
  sanitize_publication_markdown "$src_file" "$title_val" "$subtitle_val" > "$body_md"
  md_to_html < "$body_md" > "$body_html"

  # Relative paths from /publications/<slug>/index.html → site root
  ASSET_PREFIX="../../"

  cat > "$out_file" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title_attr} • Neuroartan</title>
  <meta name="description" content="${subtitle_attr:-Publication from Neuroartan institutional writing, research, and publications.}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <meta name="theme-color" content="#0a0a0a">

  <link rel="icon" type="image/png" sizes="16x16" href="/assets/icons/favicon-16x16.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/icons/favicon.svg">

  <link rel="stylesheet" href="${ASSET_PREFIX}assets/css/core/style.css">
  <link rel="stylesheet" href="${ASSET_PREFIX}assets/css/components/components.css">
  <link rel="stylesheet" href="${ASSET_PREFIX}assets/css/navigation/menu.css">
  <link rel="stylesheet" href="${ASSET_PREFIX}assets/css/overlays/country-overlay.css">
  <link rel="stylesheet" href="${ASSET_PREFIX}assets/css/layout/publication.css">

  <link rel="canonical" href="${SITE_BASE}/publications/${slug_val}/">

  <meta property="og:title" content="${title_attr} • Neuroartan">
  <meta property="og:description" content="${subtitle_attr:-Publication from Neuroartan institutional writing, research, and publications.}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${SITE_BASE}/publications/${slug_val}/">
  <meta property="og:site_name" content="Neuroartan">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title_attr} • Neuroartan">
  <meta name="twitter:description" content="${subtitle_attr:-Publication from Neuroartan institutional writing, research, and publications.}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${title_json}",
    "description": "${subtitle_json:-Publication from Neuroartan institutional writing, research, and publications.}",
    "mainEntityOfPage": "${SITE_BASE}/publications/${slug_val}/",
    "identifier": "${document_id_attr}",
    "dateModified": "${last_updated_attr}",
    "publisher": {
      "@type": "Organization",
      "name": "Neuroartan",
      "url": "https://neuroartan.com"
    }
  }
  </script>
</head>

<body class="site-body">

  <!-- source_document_id: ${document_id_html} -->

  <div class="custom-cursor"></div>

  <header id="header-controls" class="site-header">
    <button id="menu-button" aria-label="Open menu">
      <span class="line line-top"></span>
      <span class="line line-bottom"></span>
    </button>
  </header>

  <!-- =================== Menu Mount =================== -->
  <div id="menu-mount"></div>

  <main class="publication-main home-inner home-rail" id="publication" data-document-id="${document_id_attr}" data-effective-date="${effective_date_attr}" data-last-updated="${last_updated_attr}">
    <h1 class="publication-heading">${title_html}</h1>
EOF

  if [[ -n "$subtitle_val" ]]; then
    printf "    <p class=\"publication-sub\">%s</p>\n" "$subtitle_html" >> "$out_file"
  fi

  cat >> "$out_file" <<EOF
    <div class="publication-body">
EOF

  cat "$body_html" >> "$out_file"

  cat >> "$out_file" <<EOF
    </div>
  </main>

  <!-- =================== Footer Mount =================== -->
  <div id="footer-mount"></div>

  <!-- =================== Country Overlay Mount =================== -->
  <div id="country-overlay-mount"></div>

  <script src="${ASSET_PREFIX}assets/js/system/ia.js" defer></script>
  <script src="${ASSET_PREFIX}assets/js/ui/darkmode.js" defer></script>
  <script src="${ASSET_PREFIX}assets/js/i18n/countries.js" defer></script>
  <script src="${ASSET_PREFIX}assets/js/i18n/translation.js" defer></script>
  <script src="${ASSET_PREFIX}assets/js/i18n/country-language.js" defer></script>
  <script src="${ASSET_PREFIX}assets/js/navigation/menu.js" defer></script>
  <script src="${ASSET_PREFIX}assets/js/core/main.js" defer></script>

</body>
</html>
EOF

  rm -f "$body_md" "$body_html"

  SITEMAP_URLS+="  <url><loc>${SITE_BASE}/publications/${slug_val}/</loc></url>\n"

done

# Maintain sitemap block if sitemap.xml exists
SITEMAP_START="<!-- PUBS:START -->"
SITEMAP_END="<!-- PUBS:END -->"
if [[ -f "$SITEMAP_FILE" ]]; then
  tmp_sm="$(mktemp)"
  awk -v START="$SITEMAP_START" -v END_MARK="$SITEMAP_END" -v URLS="$SITEMAP_URLS" '
    BEGIN{inblock=0}
    {
      if(index($0, START)){
        print $0
        printf "%b", URLS
        inblock=1
        next
      }
      if(inblock){
        if(index($0, END_MARK)){ print $0; inblock=0 }
        next
      }
      print $0
    }
  ' "$SITEMAP_FILE" > "$tmp_sm"
  mv "$tmp_sm" "$SITEMAP_FILE"
fi

# 2c) Publication traceability rule
# Every publishable source must preserve document_id into the final destination file.
# Current implementation stamps hidden traceability into generated publication HTML via:
# - HTML comment source_document_id
# - data-document-id on the publication root
# - JSON-LD identifier

# 3) Commit and push (PUBLICATIONS ONLY — preserves shared runtime fragments and homepage/UI modules)
cd "$SITE_ROOT"

# Stage only Obsidian-driven outputs
# (Prevents overwriting homepage layout/CSS/JS/collections work)
git add content_sync/
git add pages/publications/
git add publications/
[[ -f "$SITEMAP_FILE" ]] && git add sitemap.xml

if ! git diff --cached --quiet; then
  git commit -m "Auto sync: Obsidian → Website (publications only)"
  git push origin main
  printf "\n[OK] Synced publications safely.\n"
else
  printf "\n[OK] No publication changes detected.\n"
fi