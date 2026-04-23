#!/bin/sh

FLAGS="--no-sandbox --disable-gpu"

if [ -n "$WAYLAND_DISPLAY" ] || [ "$XDG_SESSION_TYPE" = "wayland" ]; then
  FLAGS="$FLAGS --enable-features=UseOzonePlatform --ozone-platform=wayland"
fi

exec /app/lib/${FLATPAK_ID}/HelloPear $FLAGS "$@"
