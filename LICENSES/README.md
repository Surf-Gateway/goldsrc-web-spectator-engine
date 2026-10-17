# Licences of the engine files visitors download

The browser spectator serves an engine built by
[`engine/build-pinned.sh`](../engine/build-pinned.sh): Xash3D FWGS and cs16-client at
the pinned commits in [`engine/prepare-sources.py`](../engine/prepare-sources.py),
with the patches in [`engine/patches/`](../engine/patches/), compiled to WebAssembly
in the pinned Emscripten image. These are the licences of what that build
contains. The texts here are verbatim copies from the pinned sources, the
build image and the upstream projects.

| Component | Licence | Text |
|---|---|---|
| Xash3D FWGS engine, renderer and filesystem, with our patches | GNU GPL v3 or later | [GPL-3.0.txt](GPL-3.0.txt) |
| cs16-client (Counter-Strike client), with our patches | GNU GPL v2 or later, with an exception for linking with Valve's Half-Life engine and mods | [cs16-client-LICENSE.txt](cs16-client-LICENSE.txt), [GPL-2.0.txt](GPL-2.0.txt) |
| Half-Life 1 SDK code inside cs16-client | Valve's Half-Life 1 SDK licence (distribution only free of charge) | [HL1-SDK-LICENSE.txt](HL1-SDK-LICENSE.txt) |
| mainui menus (engine and cs16-client) | GNU GPL v2 or later | [GPL-2.0.txt](GPL-2.0.txt) |
| MiniUTL (in mainui) | BSD 3-clause | [third-party/miniutl-LICENSE.txt](third-party/miniutl-LICENSE.txt) |
| Opus, opusfile | BSD 3-clause | [third-party/opus-COPYING.txt](third-party/opus-COPYING.txt), [third-party/opusfile-COPYING.txt](third-party/opusfile-COPYING.txt) |
| libogg, libvorbis | BSD 3-clause | [third-party/libogg-COPYING.txt](third-party/libogg-COPYING.txt), [third-party/vorbis-COPYING.txt](third-party/vorbis-COPYING.txt) |
| bzip2 | bzip2 licence (BSD-style) | [third-party/bzip2-COPYING.txt](third-party/bzip2-COPYING.txt) |
| libbacktrace | BSD 3-clause | [third-party/libbacktrace-LICENSE.txt](third-party/libbacktrace-LICENSE.txt) |
| MultiEmulator | MIT | [third-party/MultiEmulator-LICENSE.txt](third-party/MultiEmulator-LICENSE.txt) |
| SDL 2.32.0 (Emscripten port) | zlib | [third-party/SDL2-LICENSE.txt](third-party/SDL2-LICENSE.txt) |
| Emscripten 4.0.11 runtime | MIT or University of Illinois/NCSA | [third-party/emscripten-LICENSE.txt](third-party/emscripten-LICENSE.txt) |

Counter-Strike and Half-Life are trademarks of Valve Corporation. Their game
content is not part of these sources and is not covered by these licences.
