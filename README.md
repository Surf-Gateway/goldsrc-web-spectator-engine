# Surf Gateway spectator engine

Source for the engine files that the [Surf Gateway](https://speedrun.eu/)
browser spectator serves to its visitors: [Xash3D FWGS](https://github.com/FWGS/xash3d-fwgs)
and [cs16-client](https://github.com/Velaron/cs16-client), patched for live
HLTV spectating in the browser and compiled to WebAssembly.

Each engine build that goes live is tagged `build-<id>`; the spectator's
licences page links to the tag of the build it serves. This is build
`9863f0f2d678570e85564fa6`.

## Contents

- `engine/prepare-sources.py`: the upstream commits (d1f529fe125f of
  Xash3D FWGS, 08a2f2df22eb of cs16-client) and the patches applied to each.
- `engine/patches/`: our 60 patches.
- `engine/runtime/`: small transforms applied to the generated `xash.js`.
- `engine/build-pinned.sh`, `engine/record-build.py`: the build.
- `engine/build-manifest.json`: patch and runtime hashes of this build and
  the SHA-256 of every file it produced (the files visitors download).
- `LICENSES/`: licences of everything those files contain (see its README).

## Building

Requires git, Python 3 and podman or docker.

```sh
engine/build-pinned.sh
```

This fetches the upstream sources at the pinned commits, applies the patches,
builds in the pinned Emscripten image
(`docker.io/emscripten/emsdk@sha256:f8a157011b8fa61bdaab875bb1f0f08695229dffe086448d14b53538cae16bd3`)
and writes `work/engine-build/9863f0f2d678570e85564fa6/build-manifest.json`. The directory
name is derived from the pins and patch hashes, so the same sources always
build into the same directory. cs16-client embeds its build date, so its
client file differs by a few bytes from a build made on another day.

## Licences

Xash3D FWGS and our patches to it are under the GNU GPL v3 or later;
cs16-client and our patches to it under the GNU GPL v2 or later with its
exception for Valve's Half-Life engine, and it contains Half-Life 1 SDK code
under Valve's licence (distribution free of charge only). Bundled libraries
keep their own licences; see `LICENSES/README.md`.

Counter-Strike and Half-Life are trademarks of Valve Corporation. No game
content is included here. This project is not affiliated with Valve.
