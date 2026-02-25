#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
PKG="$ROOT/package.json"

[ -f "$PKG" ] || { echo "package.json not found in $ROOT"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "jq is required"; exit 1; }

# Detect architecture dynamically
UNAME_ARCH=$(uname -m)
case "$UNAME_ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $UNAME_ARCH"; exit 1 ;;
esac

APP_BUILDER="$(node -e "
  const path = require('path')
  const pkg = require.resolve('app-builder-bin/package.json')
  console.log(path.join(path.dirname(pkg), 'linux', process.argv[1], 'app-builder'))
" "$ARCH")"

APP_NAME=$(jq -r '.productName // .name' "$PKG")
VERSION=$(jq -r '.version' "$PKG")
DESCRIPTION=$(jq -r '.description // ""' "$PKG")

echo "→ App: $APP_NAME"
echo "→ Version: $VERSION"
echo "→ Description: $DESCRIPTION"

APP_DIR="$ROOT/out/${APP_NAME}-linux-${ARCH}"
STAGE_DIR="$ROOT/out/make/__appImage-${ARCH}"
OUTPUT="$ROOT/out/make/${APP_NAME}-${VERSION}-${ARCH}.AppImage"

echo "→ Using app dir: $APP_DIR"

# use icons in build-assets and fallback to app-builder-lib icons for missing icons
ICON_SIZES=(16 32 48 64 128 256)
ICONS=()
ASSETS_DIR="$ROOT/build-assets"
DEFAULT_ICON_BASE="$ROOT/node_modules/app-builder-lib/templates/icons/electron-linux"

for SIZE in "${ICON_SIZES[@]}"; do
  CUSTOM_ICON="$ASSETS_DIR/${SIZE}x${SIZE}.png"
  if [ -f "$CUSTOM_ICON" ]; then
    ICONS+=("{\"file\":\"$CUSTOM_ICON\",\"size\":$SIZE}")
  else
    DEFAULT_ICON="$DEFAULT_ICON_BASE/${SIZE}x${SIZE}.png"
    ICONS+=("{\"file\":\"$DEFAULT_ICON\",\"size\":$SIZE}")
  fi
done

ICON_JSON="[ $(IFS=,; echo "${ICONS[*]}") ]"

# Clean stage dir
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"

DESKTOP_ENTRY=$(cat <<EOF
[Desktop Entry]
Name=${APP_NAME}
Exec=${APP_NAME}
Terminal=false
Type=Application
Icon=${APP_NAME}
StartupWMClass=undefined
X-AppImage-Version=${VERSION}
Comment=${DESCRIPTION}
Categories=Utility
EOF
)

MIME_TYPES=$(jq -r '
  (.build?.protocols // .protocols // []) 
  | map(.schemes[]) 
  | map("x-scheme-handler/" + ascii_downcase) 
  | join(";")
' "$PKG")

if [ -n "$MIME_TYPES" ]; then
  DESKTOP_ENTRY="${DESKTOP_ENTRY}"$'\n'"MimeType=${MIME_TYPES}"
fi

CONFIG_JSON=$(jq -n \
  --arg name "$APP_NAME" \
  --arg desktop "$DESKTOP_ENTRY" \
  --argjson icons "$ICON_JSON" \
  '{
    productName: $name,
    productFilename: $name,
    desktopEntry: $desktop,
    executableName: $name,
    icons: $icons,
    fileAssociations: []
  }'
)

CUSTOM_APPRUN="$ROOT/scripts/linux/AppRun"

if [ -f "$CUSTOM_APPRUN" ]; then
  echo "→ Using custom AppRun $CUSTOM_APPRUN"
  cp "$CUSTOM_APPRUN" "$STAGE_DIR/AppRun"
  chmod +x "$STAGE_DIR/AppRun"
fi

echo "→ Running app-builder with the following command:"
echo "$APP_BUILDER appimage --stage $STAGE_DIR --arch $ARCH --output $OUTPUT --app $APP_DIR --configuration '$CONFIG_JSON'"

"$APP_BUILDER" appimage \
  --stage "$STAGE_DIR" \
  --arch "$ARCH" \
  --output "$OUTPUT" \
  --app "$APP_DIR" \
  --configuration "$CONFIG_JSON"

echo ""
echo "→ AppImage built at: $OUTPUT"
