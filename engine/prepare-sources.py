#!/usr/bin/env python3
"""Prepare content-addressed scratch sources; never reset an existing checkout."""
from pathlib import Path
import hashlib, json, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
PINS={'xash3d-fwgs':('https://github.com/FWGS/xash3d-fwgs.git','d1f529fe125f608dbfee00a279f715a859955334',['0001-play-hldemo.patch','0004-demo-no-timeout-warning.patch','0005-hide-demo-debug-overlay.patch','0006-browser-telemetry-bridge.patch','0007-goldsrc-hltv-status.patch','0008-hltv-world-players.patch','0009-player-display-clock.patch','0010-observed-player-mask.patch','0012-web-stream-input.patch','0013-hltv-motion-discontinuity.patch','0014-studio-bodypart-offsets.patch','0015-gl2-buffer-ownership.patch','0016-static-lightmap-batch.patch','0017-static-lightmap-opaque-policy.patch','0018-studio-texture-residency.patch','0019-studio-cache-prefix.patch','0020-studio-mesh-frustum.patch','0021-studio-source-compression.patch','0022-studio-mesh-arrays.patch','0023-studio-restored-source-peak.patch','0024-studio-source-sharing.patch','0025-studio-clip-cache.patch','0026-studio-encode-reuse.patch','0027-studio-client-state-scope.patch','0028-gl2-alpha-reference-reuse.patch','0029-opaque-base-surface-batch.patch','0030-web-stream-console.patch','0031-gl2-vector-reuse.patch','0032-studio-constant-lighting.patch','0033-owned-indexed-palette.patch','0034-studio-gpu-sharing.patch','0035-gl2-vertex-invariance.patch','0036-active-player-availability.patch','0037-wait-for-first-person-view.patch','0039-wasm-wide-inflate.patch','0040-studio-mesh-pvs.patch','0042-upload-error-transaction.patch','0043-web-capability-queries.patch','0044-exact-rgba-mips.patch','0045-zero-local-light-vertices.patch','0046-exact-coordinate-validation.patch','0047-selective-bounds-membership.patch','0048-studio-background-realize.patch','0049-studio-texture-budget.patch','0050-studio-reduced-texture-storage.patch','0051-goldsrc-sky-names.patch','0052-sparse-submodel-hull-nodes.patch','0053-browser-map-brightness.patch','0054-player-demo-camera.patch','0055-demo-checksum-and-command-isolation.patch','0056-recorded-playback-controls.patch','0057-recorded-client-data.patch','0058-recorded-effects.patch','0059-larger-recorded-demos.patch','0060-optional-viewer-effects.patch','0061-world-only-model-precache.patch','0062-cutoff-static-entities.patch']),
'cs16-client':('https://github.com/Velaron/cs16-client.git','08a2f2df22eb190d7d4017279ea519427e2abed7',['0002-select-spectator-target.patch','0003-corner-player-name.patch','0011-reject-unobserved-targets.patch','0038-select-available-first-person-view.patch','0041-compact-chat-bridge.patch'])}
def run(*args,cwd=None):return subprocess.check_output(args,cwd=cwd,stderr=sys.stderr)
identity={name:{'pin':pin,'patches':{p:hashlib.sha256((ROOT/'engine/patches'/p).read_bytes()).hexdigest() for p in patches}} for name,(_,pin,patches) in PINS.items()}
identity['xash3d-fwgs']['generatedRuntime']={'schemaVersion':1,'files':{
 name:hashlib.sha256((ROOT/'engine/runtime'/name).read_bytes()).hexdigest()
 for name in ['client-array-cache.mjs','client-index-cache.mjs','transform.mjs','install.mjs']}}
fingerprint=hashlib.sha256(json.dumps(identity,sort_keys=True).encode()).hexdigest()[:24]
work=ROOT/'work/engine-build'/fingerprint;work.mkdir(parents=True,exist_ok=True)
runtime=work/'runtime';runtime.mkdir(exist_ok=True)
for name,expected in identity['xash3d-fwgs']['generatedRuntime']['files'].items():
 data=(ROOT/'engine/runtime'/name).read_bytes();dest=runtime/name
 if hashlib.sha256(data).hexdigest()!=expected:raise SystemExit('Runtime inputs changed during preparation')
 if dest.exists():
  if dest.is_symlink() or hashlib.sha256(dest.read_bytes()).hexdigest()!=expected:raise SystemExit(f'{dest}: unexpected runtime input changes; preserve and inspect them')
 else:dest.write_bytes(data)
for name,(url,pin,patches) in PINS.items():
 dest=work/name;marker=work/(name+'.prepared.json')
 if marker.exists():
  saved=json.loads(marker.read_text());actual=hashlib.sha256(run('git','diff','--binary','HEAD',cwd=dest)).hexdigest()
  if run('git','rev-parse','HEAD',cwd=dest).decode().strip()!=pin or saved['diffSha256']!=actual:raise SystemExit(f'{dest}: unexpected source changes; preserve and inspect them before rebuilding')
  alternates=dest/'.git/objects/info/alternates'
  if alternates.exists():
   run('git','repack','-a','-d',cwd=dest);alternates.unlink();run('git','fsck','--no-dangling',cwd=dest)
  run('git','remote','set-url','origin',url,cwd=dest)
  continue
 if dest.exists():raise SystemExit(f'{dest}: incomplete preparation; preserve/inspect this directory before retrying')
 cache=ROOT/'work/t04'/name
 if cache.exists() and subprocess.run(['git','-C',str(cache),'cat-file','-e',pin+'^{commit}'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0:
  run('git','clone','--no-hardlinks','--no-checkout',str(cache),str(dest))
 else:
  run('git','init',str(dest));run('git','remote','add','origin',url,cwd=dest);run('git','fetch','--depth','1','origin',pin,cwd=dest)
 run('git','checkout','--detach',pin,cwd=dest)
 run('git','remote','set-url','origin',url,cwd=dest)
 run('git','submodule','update','--init','--recursive',cwd=dest)
 for patch in patches:run('git','apply','--check',str(ROOT/'engine/patches'/patch),cwd=dest);run('git','apply','--intent-to-add',str(ROOT/'engine/patches'/patch),cwd=dest)
 marker.write_text(json.dumps({'source':identity[name],'diffSha256':hashlib.sha256(run('git','diff','--binary','HEAD',cwd=dest)).hexdigest()},indent=2)+'\n')
(work/'source-manifest.json').write_text(json.dumps(identity,indent=2)+'\n')
print(work)
