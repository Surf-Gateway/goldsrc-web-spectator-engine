// Candidate for the pinned private temporary-attribute upload site only.
// It is not a general WebGL buffer-write cache. No heap view is retained.
export function createClientArrayCache({enabled=false,maxBytes=32*1024*1024,maxStores=2048}={}) {
  if(typeof enabled!=='boolean'||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>32*1024*1024||
    !Number.isSafeInteger(maxStores)||maxStores<1||maxStores>2048)throw Error('Invalid private array cache bounds');
  const stores=new Map();let context=null,disposed=false,reuseEnabled=enabled;
  const stats={calls:0,requestedBytes:0,submittedCalls:0,submittedBytes:0,skippedCalls:0,skippedBytes:0,
    shadowBytes:0,peakShadowBytes:0,fallbacks:0,ownershipRefusals:0,contextResets:0,comparedBytes:0,copiedBytes:0};
  const clear=()=>{stores.clear();stats.shadowBytes=0;context=null;stats.contextResets++;};
  const drop=buffer=>{const r=stores.get(buffer);if(r){stats.shadowBytes-=r.bytes.length;stores.delete(buffer);}};
  const length=source=>Number.isSafeInteger(source?.byteLength)&&source.byteLength>=0?source.byteLength:0;
  const send=(gl,buffer,source)=>{stats.submittedCalls++;stats.submittedBytes+=length(source);
    try{gl.bufferSubData(34962,0,source);}catch(error){drop(buffer);throw error;}};
  function same(record,source){
    const n=source.byteLength;if(n>record.initialized)return false;
    // Integer words preserve NaN encodings, signed zero and every attribute byte.
    let at=0;
    if(source.byteOffset%4===0 && n>=4){
      const words=new Uint32Array(source.buffer,source.byteOffset,Math.floor(n/4));
      for(let i=0;i<words.length;i++)if(words[i]!==record.words[i]){stats.comparedBytes+=(i+1)*4;return false;}
      at=words.length*4;
    }
    for(;at<n;at++)if(source[at]!==record.bytes[at]){stats.comparedBytes+=at+1;return false;}
    stats.comparedBytes+=n;
    return true;
  }
  return {
    upload(ctx,gl,buffer,source,expectedBytes,bucket){
      stats.calls++;stats.requestedBytes+=length(source);
      if(!enabled||disposed){send(gl,buffer,source);return;}
      if(context!==ctx){clear();context=ctx;}
      if(!buffer||typeof buffer!=='object'||!(source instanceof Uint8Array)||!(source.buffer instanceof ArrayBuffer)||
        !Number.isSafeInteger(expectedBytes)||expectedBytes<1||source.byteLength!==expectedBytes||
        !Number.isInteger(bucket)||bucket<0||bucket>21||expectedBytes>2**bucket){
        drop(buffer);stats.fallbacks++;send(gl,buffer,source);return;
      }
      let record=stores.get(buffer);
      if(!record){
        if(!ctx?.tempVertexBuffers1?.[bucket]?.includes(buffer)&&!ctx?.tempVertexBuffers2?.[bucket]?.includes(buffer)){
          stats.ownershipRefusals++;send(gl,buffer,source);return;
        }
        const size=2**bucket;
        if(stores.size>=maxStores||size>maxBytes-stats.shadowBytes){stats.fallbacks++;send(gl,buffer,source);return;}
        try{
          const bytes=new Uint8Array(size);record={bytes,words:new Uint32Array(bytes.buffer,0,Math.floor(size/4)),initialized:0};
          stores.set(buffer,record);stats.shadowBytes+=size;stats.peakShadowBytes=Math.max(stats.peakShadowBytes,stats.shadowBytes);
        }catch{drop(buffer);stats.fallbacks++;send(gl,buffer,source);return;}
      }
      if(expectedBytes>record.bytes.length){drop(buffer);stats.fallbacks++;send(gl,buffer,source);return;}
      if(reuseEnabled&&same(record,source)){stats.skippedCalls++;stats.skippedBytes+=source.byteLength;return;}
      // GPU call exceptions invalidate history; copy commits only after success.
      send(gl,buffer,source);
      try{record.bytes.set(source);record.initialized=Math.max(record.initialized,source.byteLength);stats.copiedBytes+=source.byteLength;}
      catch{drop(buffer);stats.fallbacks++;}
    },
    setEnabled(value){if(typeof value!=='boolean')throw Error('Expected boolean cache switch');if(value!==enabled){clear();enabled=value&&!disposed;reuseEnabled=enabled;}},
    // Native parity records original writes while retaining exact warm history.
    setReuseEnabled(value){if(typeof value!=='boolean')throw Error('Expected boolean reuse switch');reuseEnabled=value&&enabled&&!disposed;},
    resetContext(ctx){if(context===ctx)clear();},
    dispose(){if(disposed)return;disposed=true;enabled=reuseEnabled=false;clear();},
    snapshot:()=>({schemaVersion:1,enabled,reuseEnabled,disposed,maxBytes,maxStores,liveStores:stores.size,...stats})
  };
}
