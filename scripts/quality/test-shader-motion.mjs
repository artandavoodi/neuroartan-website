import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const callbacks=new Map();let serial=0;
const motion={matches:true,addEventListener(){},removeEventListener(){}};
const window={matchMedia:()=>motion,requestAnimationFrame:fn=>{callbacks.set(++serial,fn);return serial;},cancelAnimationFrame:id=>callbacks.delete(id)};
vm.runInNewContext(readFileSync(new URL('../../docs/assets/js/layers/website/ui/effects/shader-core.js',import.meta.url),'utf8'),{window,Element:class{},HTMLCanvasElement:class{},document:{hidden:false}});
const core=new window.NeuroShaderCore();
core.gl={};core.program={};core.startTime=100;const frames=[];core.drawFrame=time=>frames.push(time);
core.start();assert.equal(callbacks.size,1);
const [id,frame]=callbacks.entries().next().value;callbacks.delete(id);frame(500);
assert.deepEqual(frames,[100]);assert.equal(callbacks.size,0,'Reduced motion draws once, without a continuous loop');
motion.matches=false;core.boundMotionChange();assert.equal(callbacks.size,1);
motion.matches=true;core.boundMotionChange();assert.equal(callbacks.size,0);
core.stop();motion.matches=false;core.boundMotionChange();assert.equal(callbacks.size,0,'Stopped effects must not restart');
console.log('PASS: shader respects reduced motion and stopped lifecycle.');
// The shared not-found canvas must obey the same one-frame reduced-motion contract.
{
 const frames=new Map();let serial=0,draws=0;const listeners={};
 const context=new Proxy({clearRect(){draws++;},createRadialGradient(){return {addColorStop(){}};}},{get(target,key){return target[key]||(()=>{});}});
 const canvas={style:{},getContext:()=>context};
 const root={dataset:{},style:{},classList:{add(){}},querySelector:selector=>selector.includes('canvas')?canvas:null,getBoundingClientRect:()=>({width:800,height:600,left:0,top:0}),addEventListener(){}};
 vm.runInNewContext(readFileSync(new URL('../../docs/assets/js/layers/website/ui/effects/404-hero-shader.js',import.meta.url),'utf8'),{
  document:{querySelector:()=>root},window:{matchMedia:()=>({matches:true}),devicePixelRatio:1,addEventListener:(name,fn)=>{listeners[name]=fn;}},performance:{now:()=>100},
  requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id)
 });
 assert.equal(frames.size,1);const [id,render]=frames.entries().next().value;frames.delete(id);render(100);
 assert.equal(draws,1);assert.equal(frames.size,0,'Not-found canvas must not continuously repaint a static reduced-motion frame');
 listeners.resize();assert.equal(frames.size,1);const [resizeId,resize]=frames.entries().next().value;frames.delete(resizeId);resize();assert.equal(draws,2);assert.equal(frames.size,0);
 console.log('PASS: not-found canvas draws once and redraws only after resize in reduced motion.');
}
