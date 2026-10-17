// Runs after linking inside the pinned SDK. No assets or native WASM are edited.
import {readFile,writeFile,rename,lstat,mkdtemp,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {cacheFactorySource,indexFactorySource,prepareClientArrayRuntime} from './transform.mjs';

if(process.argv.length!==3)throw Error('Usage: install.mjs <build/engine/xash.js>');
const runtime=path.resolve(process.argv[2]),parent=path.dirname(runtime);
if(path.basename(runtime)!=='xash.js'||path.basename(parent)!=='engine'||
  path.basename(path.dirname(parent))!=='build'||!(await lstat(runtime)).isFile())
  throw Error('Requires the regular linked build/engine/xash.js');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={};
for(const name of ['client-array-cache.mjs','client-index-cache.mjs','transform.mjs','install.mjs'])
  files[name]=hash(await readFile(new URL(name,import.meta.url)));
const source=await readFile(runtime,'utf8'),receiptPath=path.join(parent,'client-array-cache.json');
if(source.includes('sgClientArrays')){
  const prior=JSON.parse(await readFile(receiptPath,'utf8'));
  if(prior.schemaVersion!==1||prior.runtimeAfterSha256!==hash(source)||
    prior.factorySha256!==hash(cacheFactorySource)||prior.indexFactorySha256!==hash(indexFactorySource)||JSON.stringify(prior.files)!==JSON.stringify(files))
    throw Error('Existing private-array runtime/receipt does not match this installer');
  console.log('Verified existing private-array runtime transform');
}else{
  const prepared=prepareClientArrayRuntime(source);
  const receipt={schemaVersion:1,files,factorySha256:hash(cacheFactorySource),indexFactorySha256:hash(indexFactorySource),
    runtimeBeforeSha256:hash(source),runtimeAfterSha256:hash(prepared),
    scope:'Private temporary attribute/index prefix uploads and exact unsigned maximum scanning; bounded CPU shadows; optional per-frame temporary buffer rings; independent explicit Module opt-ins.'};
  const temporary=await mkdtemp(path.join(parent,'.runtime-prepare-'));
  try{
    await writeFile(path.join(temporary,'xash.js'),prepared);
    await writeFile(path.join(temporary,'client-array-cache.json'),JSON.stringify(receipt,null,2)+'\n');
    await rename(path.join(temporary,'xash.js'),runtime);
    await rename(path.join(temporary,'client-array-cache.json'),receiptPath);
  }finally{await rm(temporary,{recursive:true,force:true});}
  console.log('Installed verified private-array runtime transform');
}
