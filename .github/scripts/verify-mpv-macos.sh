#!/usr/bin/env bash
set -euo pipefail

root="${1:?expected the native addon Release directory or Electron output directory}"
if [[ -f "$root/mpv_addon.node" ]]; then
  addon_dir="$root"
else
  addon_dir="$(find "$root" -type f -path '*/app.asar.unpacked/node_modules/electron-mpv-video/native/mpv-addon/build/Release/mpv_addon.node' -print -quit)"
  addon_dir="${addon_dir%/mpv_addon.node}"
fi

if [[ -z "$addon_dir" || ! -f "$addon_dir/mpv_addon.node" || ! -f "$addon_dir/libmpv.dylib" ]]; then
  echo 'Missing packaged libmpv or native addon' >&2
  exit 1
fi

checked=0
while IFS= read -r -d '' binary; do
  checked=$((checked + 1))
  while IFS= read -r dependency; do
    case "$dependency" in
      /usr/lib/*|/System/Library/*) ;;
      @loader_path/*)
        if [[ ! -e "$(dirname "$binary")/${dependency#@loader_path/}" ]]; then
          echo "Missing $dependency referenced by $binary" >&2
          exit 1
        fi
        ;;
      *)
        echo "Non-portable library reference $dependency in $binary" >&2
        exit 1
        ;;
    esac
  done < <(otool -L "$binary" | tail -n +2 | awk '{print $1}')
done < <(find "$addon_dir" -maxdepth 1 -type f \( -name '*.dylib' -o -name '*.node' \) -print0)

if [[ "$checked" -lt 2 ]]; then
  echo "Expected native addon and libmpv in $addon_dir" >&2
  exit 1
fi

echo "Checked $checked packaged native libraries in $addon_dir"
