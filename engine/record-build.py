#!/usr/bin/env python3
"""Record patch/artifact hashes for an actual completed build in its scratch dir."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parents[1];work=Path(sys.argv[1]).resolve();work.relative_to(root/'work')
manifest={'status':'built','image':sys.argv[2],'sources':json.loads((work/'source-manifest.json').read_text()),'flags':{'engine':'--emscripten; EMCC_CFLAGS=-s USE_SDL=2','client':'CMAKE_BUILD_TYPE=Release; BUILD_SERVER=OFF','jobs':4},'artifacts':[]}
receipt=json.loads((work/'xash3d-fwgs/build/engine/client-array-cache.json').read_text())
expected=manifest['sources']['xash3d-fwgs']['generatedRuntime']
actual={name:hashlib.sha256((root/'engine/runtime'/name).read_bytes()).hexdigest() for name in expected['files']}
helper=(root/'engine/runtime/client-array-cache.mjs').read_text()
factory=helper[helper.index('export function createClientArrayCache(')+len('export '):].rstrip().encode()
index_helper=(root/'engine/runtime/client-index-cache.mjs').read_text()
index_factory=index_helper[index_helper.index('export function createClientIndexCache(')+len('export '):].rstrip().encode()
runtime=(work/'xash3d-fwgs/build/engine/xash.js').read_bytes()
if receipt['schemaVersion']!=1 or receipt['files']!=expected['files'] or actual!=expected['files'] or receipt['factorySha256']!=hashlib.sha256(factory).hexdigest() or receipt.get('indexFactorySha256')!=hashlib.sha256(index_factory).hexdigest() or runtime.count(index_factory)!=1 or runtime.count(factory)!=1 or receipt['runtimeAfterSha256']!=hashlib.sha256(runtime).hexdigest():
 raise SystemExit('Generated runtime receipt/source/artifact mismatch; build not recorded')
manifest['runtimeTransforms']={'clientArrayCache':receipt}
for name in ['xash3d-fwgs/build/engine/xash.js','xash3d-fwgs/build/engine/xash.wasm','xash3d-fwgs/build/filesystem/filesystem_stdio.wasm','xash3d-fwgs/build/ref/gl/libref_gles3compat.wasm','xash3d-fwgs/build/3rdparty/mainui/libmenu.wasm','cs16-client/build/cl_dll/client_emscripten_javascript.wasm','cs16-client/build/3rdparty/mainui_cpp/menu_emscripten_javascript.wasm']:
 file=work/name;manifest['artifacts'].append({'path':name,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(work/'build-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('manifest: '+str(work/'build-manifest.json'))
