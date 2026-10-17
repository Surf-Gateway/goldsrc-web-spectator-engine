// Pinned private index path only. No heap view is retained and no draw is changed.
export function createClientIndexCache({enabled=false,maxBytes=4*1024*1024,maxStores=22}={}){
  if(typeof enabled!=='boolean'||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>4*1024*1024||
    !Number.isSafeInteger(maxStores)||maxStores<1||maxStores>22)throw Error('Invalid private index cache bounds');
  const stores=new Map();let context=null,disposed=false,reuseEnabled=enabled;
  const stats={calls:0,requestedBytes:0,submittedCalls:0,submittedBytes:0,skippedCalls:0,skippedBytes:0,
    shadowBytes:0,peakShadowBytes:0,fallbacks:0,ownershipRefusals:0,contextResets:0,comparedBytes:0,copiedBytes:0,
    scanCalls:0,indicesScanned:0,integerLoopCalls:0,integerLoopIndices:0,originalScanCalls:0,originalScanIndices:0};
  const clear=()=>{stores.clear();stats.shadowBytes=0;context=null;stats.contextResets++;};
  const drop=buffer=>{const r=stores.get(buffer);if(r){stats.shadowBytes-=r.bytes.length;stores.delete(buffer);}};
  const length=source=>Number.isSafeInteger(source?.byteLength)&&source.byteLength>=0?source.byteLength:0;
  const send=(gl,buffer,source)=>{stats.submittedCalls++;stats.submittedBytes+=length(source);
    try{gl.bufferSubData(34963,0,source);}catch(error){drop(buffer);throw error;}};
  function same(record,source){
    const n=source.byteLength;if(n>record.initialized)return false;let at=0;
    if(source.byteOffset%4===0&&n>=4){
      const words=new Uint32Array(source.buffer,source.byteOffset,Math.floor(n/4));
      for(let i=0;i<words.length;i++)if(words[i]!==record.words[i]){stats.comparedBytes+=(i+1)*4;return false;}
      at=words.length*4;
    }
    for(;at<n;at++)if(source[at]!==record.bytes[at]){stats.comparedBytes+=at+1;return false;}
    stats.comparedBytes+=n;return true;
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
      if(ctx?.tempIndexBuffers?.[bucket]!==buffer){drop(buffer);stats.ownershipRefusals++;send(gl,buffer,source);return;}
      let record=stores.get(buffer);
      if(!record){
        const size=2**bucket;
        if(stores.size>=maxStores||size>maxBytes-stats.shadowBytes){stats.fallbacks++;send(gl,buffer,source);return;}
        try{
          const bytes=new Uint8Array(size);record={bytes,words:new Uint32Array(bytes.buffer,0,Math.floor(size/4)),initialized:0};
          stores.set(buffer,record);stats.shadowBytes+=size;stats.peakShadowBytes=Math.max(stats.peakShadowBytes,stats.shadowBytes);
        }catch{drop(buffer);stats.fallbacks++;send(gl,buffer,source);return;}
      }
      if(expectedBytes>record.bytes.length){drop(buffer);stats.fallbacks++;send(gl,buffer,source);return;}
      if(reuseEnabled&&same(record,source)){stats.skippedCalls++;stats.skippedBytes+=expectedBytes;return;}
      send(gl,buffer,source);
      try{record.bytes.set(source);record.initialized=Math.max(record.initialized,expectedBytes);stats.copiedBytes+=expectedBytes;}
      catch{drop(buffer);stats.fallbacks++;}
    },
    range(values,type,original){
      const count=values?.length??0;stats.scanCalls++;stats.indicesScanned+=count;
      const supported=(type===5121&&values instanceof Uint8Array)||(type===5123&&values instanceof Uint16Array)||(type===5125&&values instanceof Uint32Array);
      if(!enabled||!reuseEnabled||disposed||!supported||!(values.buffer instanceof ArrayBuffer)||count<1){
        stats.originalScanCalls++;stats.originalScanIndices+=count;return original();
      }
      // The SDK admits only unsigned integer arrays. Each element and max+1
      // is exactly representable as Number, including UINT32_MAX + 1.
      let maximum=values[0];
      for(let i=1;i<count;i++){const value=values[i];if(value>maximum)maximum=value;}
      stats.integerLoopCalls++;stats.integerLoopIndices+=count;return maximum+1;
    },
    setEnabled(value){if(typeof value!=='boolean')throw Error('Expected boolean index cache switch');if(value!==enabled){clear();enabled=value&&!disposed;reuseEnabled=enabled;}},
    setReuseEnabled(value){if(typeof value!=='boolean')throw Error('Expected boolean index reuse switch');reuseEnabled=value&&enabled&&!disposed;},
    resetContext(ctx){if(context===ctx)clear();},
    dispose(){if(disposed)return;disposed=true;enabled=reuseEnabled=false;clear();},
    snapshot:()=>({schemaVersion:1,enabled,reuseEnabled,disposed,maxBytes,maxStores,liveStores:stores.size,...stats})
  };
}
