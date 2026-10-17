#!/bin/sh
# Build isolated sources identified by pins and patch hashes. Repeated runs
# reuse exactly those patched sources without resetting anyone's edits.
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
image=docker.io/emscripten/emsdk@sha256:f8a157011b8fa61bdaab875bb1f0f08695229dffe086448d14b53538cae16bd3
if ! command -v podman >/dev/null && ! command -v docker >/dev/null; then
  echo "podman or docker is required" >&2
  exit 1
fi
runner=$(command -v podman || command -v docker)
if ! "$runner" image inspect "$image" >/dev/null 2>&1; then "$runner" pull "$image"; fi
work=$(python3 "$root/engine/prepare-sources.py")
"$runner" run --rm --memory=2g --memory-swap=2g --cpus=2 --pids-limit=128 -v "$work/xash3d-fwgs:/xash3d-fwgs:Z" \
  -v "$work/runtime:/spectator-runtime:ro,Z" -w /xash3d-fwgs \
  -e EMCC_CFLAGS="-s USE_SDL=2" "$image" \
  timeout --signal=TERM --kill-after=10s 600s bash -lc 'set -e; emconfigure ./waf configure --emscripten -j4; emmake ./waf build -j4; node /spectator-runtime/install.mjs build/engine/xash.js'
"$runner" run --rm --memory=2g --memory-swap=2g --cpus=2 --pids-limit=128 -v "$work/cs16-client:/cs:Z" -w /cs "$image" \
  timeout --signal=TERM --kill-after=10s 600s bash -lc 'set -e; emcmake cmake -S . -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SERVER=OFF; cmake --build build --config Release -j4'
python3 "$root/engine/record-build.py" "$work" "$image"
if [ "$#" -gt 0 ]; then
  python3 "$root/engine/stage-harness.py" --build-root "$work" "$@"
fi
printf 'build directory: %s\n' "$work"
printf 'stage a recording with: python3 engine/stage-harness.py --build-root "%s" --demo <local-demo>\n' "$work"
