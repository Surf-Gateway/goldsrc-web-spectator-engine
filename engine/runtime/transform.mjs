import {createClientArrayCache} from './client-array-cache.mjs';
import {createClientIndexCache} from './client-index-cache.mjs';

export const cacheFactorySource=createClientArrayCache.toString();
export const indexFactorySource=createClientIndexCache.toString();

// These exact sites belong to the pinned SDK's private temporary pool. Refuse
// SDK drift instead of applying a broad replacement to ordinary engine writes.
export function prepareClientArrayRuntime(source){
  if(source.includes('sgClientArrays')||source.includes('sgClientIndices'))throw Error('Runtime already contains private array cache');
  const injected=`var sgClientArrays=(${cacheFactorySource})({enabled:Module["sgClientArrayCacheEnabled"]===true});`+
    'Module["sgClientArrayCache"]=sgClientArrays;'+
    'Module["canvas"]?.addEventListener("webglcontextlost",()=>sgClientArrays.dispose(),{once:true});'+
    'globalThis.addEventListener?.("pagehide",()=>sgClientArrays.dispose(),{once:true});'+
    `var sgClientIndices=(${indexFactorySource})({enabled:Module["sgClientIndexCacheEnabled"]===true});`+
    'Module["sgClientIndexCache"]=sgClientIndices;'+
    'Module["canvas"]?.addEventListener("webglcontextlost",()=>sgClientIndices.dispose(),{once:true});'+
    'globalThis.addEventListener?.("pagehide",()=>sgClientIndices.dispose(),{once:true});'+
    // Per-frame temporary buffer rings: a power of two from 64 to 8192, else original pools.
    'var sgTempRing=n=>Number.isInteger(n)&&n>=64&&n<=8192&&(n&(n-1))===0?n:0;'+
    'var sgVertexRing=sgTempRing(Module["sgTempVertexRing"]),sgIndexRing=sgTempRing(Module["sgTempIndexRing"]);'+
    'Module["sgTempRings"]={vertex:sgVertexRing,index:sgIndexRing,indexFallbacks:0};var GL={';
  const edits=[
    ['var GL={',injected],
    ['GLctx.bufferSubData(34962,0,HEAPU8.subarray(cb.ptr,cb.ptr+size));',
     'sgClientArrays.upload(GL.currentContext,GLctx,buf,HEAPU8.subarray(cb.ptr,cb.ptr+size),size,GL.log2ceilLookup(size));'],
    ['GLctx.bufferSubData(34963,0,HEAPU8.subarray(indices,indices+size));',
     'sgClientIndices.upload(GL.currentContext,GLctx,buf,HEAPU8.subarray(indices,indices+size),size,GL.log2ceilLookup(size));'],
    ['vertexes=new arrayClass(HEAPU8.buffer,indices,count).reduce((max,current)=>Math.max(max,current))+1;',
     'var sgIndexValues=new arrayClass(HEAPU8.buffer,indices,count);vertexes=sgClientIndices.range(sgIndexValues,type,()=>sgIndexValues.reduce((max,current)=>Math.max(max,current))+1);'],
    ['generateTempBuffers:(quads,context)=>{','generateTempBuffers:(quads,context)=>{sgClientArrays.resetContext(context);sgClientIndices.resetContext(context);'+
     'context.sgIndexRings1=context.sgIndexRings2=undefined;context.sgIndexCounters=[];'],
    // Without rings every original statement runs. With rings, no temporary buffer
    // is rewritten after an earlier draw in the same frame used it.
    ['numTempVertexBuffersPerSize:64','numTempVertexBuffersPerSize:sgVertexRing||64'],
    ['var vbo=ringbuffer[nextFreeBufferIndex];if(vbo){return vbo}var prevVBO=GLctx.getParameter(34964);',
     'var vbo=ringbuffer[nextFreeBufferIndex];if(vbo){return vbo}var prevVBO=sgVertexRing?GL.buffers[GLctx.currentArrayBufferBinding]??null:GLctx.getParameter(34964);'],
    ['getTempIndexBuffer:sizeBytes=>{var idx=GL.log2ceilLookup(sizeBytes);var ibo=GL.currentContext.tempIndexBuffers[idx];if(ibo){return ibo}',
     'getTempIndexBuffer:sizeBytes=>{var idx=GL.log2ceilLookup(sizeBytes);'+
     'if(sgIndexRing){var sgCtx=GL.currentContext,sgBuffers=(sgCtx.sgIndexRings1??=[])[idx]??=[],sgNext=(sgCtx.sgIndexCounters??=[])[idx]|0;'+
     'if(sgNext<sgIndexRing){sgCtx.sgIndexCounters[idx]=sgNext+1;if(!sgBuffers[sgNext]){sgBuffers[sgNext]=GLctx.createBuffer();'+
     'GLctx.bindBuffer(34963,sgBuffers[sgNext]);GLctx.bufferData(34963,1<<idx,35048)}return sgBuffers[sgNext]}Module["sgTempRings"].indexFallbacks++}'+
     'var ibo=GL.currentContext.tempIndexBuffers[idx];if(ibo){return ibo}'],
    // Render resolution: SDL sizes a high-DPI canvas by this ratio. A viewer-
    // supplied function chooses the scale; otherwise the browser ratio is used.
    ['var _emscripten_get_device_pixel_ratio=()=>devicePixelRatio;',
     'var _emscripten_get_device_pixel_ratio=()=>{var sgScale=typeof Module["sgRenderScale"]=="function"?Module["sgRenderScale"]():NaN;'+
     'return Number.isFinite(sgScale)&&sgScale>=0.25&&sgScale<=4?sgScale:devicePixelRatio};'],
    ['newRenderingFrameStarted:()=>{if(!GL.currentContext){return}',
     'newRenderingFrameStarted:()=>{if(!GL.currentContext){return}if(sgIndexRing){var sgCtx=GL.currentContext,sgSwap=sgCtx.sgIndexRings1;'+
     'sgCtx.sgIndexRings1=sgCtx.sgIndexRings2;sgCtx.sgIndexRings2=sgSwap;sgCtx.sgIndexCounters=[]}'],
    ['deleteContext:contextHandle=>{','deleteContext:contextHandle=>{sgClientArrays.resetContext(GL.contexts[contextHandle]);sgClientIndices.resetContext(GL.contexts[contextHandle]);']
  ];
  for(const [marker,replacement] of edits){
    if(source.split(marker).length!==2)throw Error('Pinned private-array runtime marker is not unique: '+marker);
    source=source.replace(marker,replacement);
  }
  return source;
}
