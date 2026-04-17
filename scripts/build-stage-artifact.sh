#!/usr/bin/env bash
set -euo pipefail

ARTIFACTS_DIR="${1:-out/artifacts}"
OUTPUT_DIR="${2:-out/keet-desktop-stage}"
PACKAGE_JSON_PATH="${PACKAGE_JSON_PATH:-package.json}"
CHANNEL="${CHANNEL:?CHANNEL is required}"
BUILD_VERSION="${BUILD_VERSION:-}"
UPGRADE_KEY="${UPGRADE_KEY:-}"

case "$CHANNEL" in
nightly) PRODUCT_NAME="Keet-Nightly" ;;
internal) PRODUCT_NAME="Keet-Internal" ;;
production) PRODUCT_NAME="Keet" ;;
*)
  echo "Unsupported CHANNEL: $CHANNEL" >&2
  exit 1
  ;;
esac

TMP_DIR="$(mktemp -d)"
MOUNT_DIR="$TMP_DIR/mount"
MOUNT_DIR_X64="$TMP_DIR/mount-x64"
NORMALIZED_DIR="$TMP_DIR/normalized"
PACKAGE_OUT="$TMP_DIR/package.json"

cleanup() {
  if mount | grep -q "on $MOUNT_DIR "; then
    hdiutil detach "$MOUNT_DIR" -quiet || true
  fi
  if mount | grep -q "on $MOUNT_DIR_X64 "; then
    hdiutil detach "$MOUNT_DIR_X64" -quiet || true
  fi
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT

mkdir -p "$NORMALIZED_DIR/darwin-arm64" "$NORMALIZED_DIR/darwin-x64" "$MOUNT_DIR" "$MOUNT_DIR_X64"
rm -rf "$OUTPUT_DIR"

LINUX_X64="$(find "$ARTIFACTS_DIR" -type f -name '*.AppImage' ! -name '*arm64*' | sort | head -n 1)"
LINUX_ARM64="$(find "$ARTIFACTS_DIR" -type f -name '*arm64*.AppImage' | sort | head -n 1)"
MAC_ARM64_DMG="$(find "$ARTIFACTS_DIR" -type f -name '*.dmg' ! -name '*x64*' | sort | head -n 1)"
MAC_X64_DMG="$(find "$ARTIFACTS_DIR" -type f -name '*x64*.dmg' | sort | head -n 1)"
WINDOWS_MSIX="$(find "$ARTIFACTS_DIR" -type f -name '*.msix' | sort | head -n 1)"

[ -n "$LINUX_X64" ] || {
  echo "Missing linux x64 AppImage in $ARTIFACTS_DIR" >&2
  exit 1
}
[ -n "$LINUX_ARM64" ] || {
  echo "Missing linux arm64 AppImage in $ARTIFACTS_DIR" >&2
  exit 1
}
[ -n "$MAC_ARM64_DMG" ] || {
  echo "Missing macOS arm64 dmg in $ARTIFACTS_DIR" >&2
  exit 1
}
[ -n "$MAC_X64_DMG" ] || {
  echo "Missing macOS x64 dmg in $ARTIFACTS_DIR" >&2
  exit 1
}
[ -n "$WINDOWS_MSIX" ] || {
  echo "Missing Windows msix in $ARTIFACTS_DIR" >&2
  exit 1
}

cp "$LINUX_X64" "$NORMALIZED_DIR/$PRODUCT_NAME.AppImage"
mkdir -p "$NORMALIZED_DIR/linux-arm64"
cp "$LINUX_ARM64" "$NORMALIZED_DIR/linux-arm64/$PRODUCT_NAME.AppImage"
cp "$WINDOWS_MSIX" "$NORMALIZED_DIR/$PRODUCT_NAME.msix"

hdiutil attach -nobrowse -readonly -mountpoint "$MOUNT_DIR" "$MAC_ARM64_DMG" -quiet
MAC_APP="$(find "$MOUNT_DIR" -maxdepth 1 -type d -name '*.app' | sort | head -n 1)"
[ -n "$MAC_APP" ] || {
  echo "Missing .app inside $MAC_ARM64_DMG" >&2
  exit 1
}
cp -R "$MAC_APP" "$NORMALIZED_DIR/darwin-arm64/$PRODUCT_NAME.app"
hdiutil detach "$MOUNT_DIR" -quiet

hdiutil attach -nobrowse -readonly -mountpoint "$MOUNT_DIR_X64" "$MAC_X64_DMG" -quiet
MAC_X64_APP="$(find "$MOUNT_DIR_X64" -maxdepth 1 -type d -name '*.app' | sort | head -n 1)"
[ -n "$MAC_X64_APP" ] || {
  echo "Missing .app inside $MAC_X64_DMG" >&2
  exit 1
}
cp -R "$MAC_X64_APP" "$NORMALIZED_DIR/darwin-x64/$PRODUCT_NAME.app"
hdiutil detach "$MOUNT_DIR_X64" -quiet

cp "$PACKAGE_JSON_PATH" "$PACKAGE_OUT"
npm pkg set --prefix "$TMP_DIR" "productName=$PRODUCT_NAME" >/dev/null
if [ -n "$BUILD_VERSION" ]; then
  npm pkg set --prefix "$TMP_DIR" "version=$BUILD_VERSION" >/dev/null
fi

chmod +x "$NORMALIZED_DIR/$PRODUCT_NAME.AppImage"
chmod +x "$NORMALIZED_DIR/linux-arm64/$PRODUCT_NAME.AppImage"

npx --yes "pear-build@latest" \
  --package "$PACKAGE_OUT" \
  --target "$OUTPUT_DIR" \
  --darwin-arm64-app "$NORMALIZED_DIR/darwin-arm64/$PRODUCT_NAME.app" \
  --darwin-x64-app "$NORMALIZED_DIR/darwin-x64/$PRODUCT_NAME.app" \
  --linux-arm64-app "$NORMALIZED_DIR/linux-arm64/$PRODUCT_NAME.AppImage" \
  --linux-x64-app "$NORMALIZED_DIR/$PRODUCT_NAME.AppImage" \
  --win32-x64-app "$NORMALIZED_DIR/$PRODUCT_NAME.msix"
