#!/usr/bin/env bash
# background: the npm package stages libmpv itself; collect and relink its Homebrew
# dependencies beside it, where the addon and packaged app can load them
# Refer to https://www.npmjs.com/package/electron-mpv-video for mac build requirements
set -euo pipefail

addon_dir="${1:?expected the native addon Release directory}"
test -f "$addon_dir/mpv_addon.node"
test -f "$addon_dir/libmpv.dylib"

dylibbundler -b -x "$addon_dir/libmpv.dylib" -d "$addon_dir" -p '@loader_path/' -of

bash "$(dirname "$0")/verify-mpv-macos.sh" "$addon_dir"
