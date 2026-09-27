import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=readFileSync(new URL('../../docs/assets/js/layers/website/motion/logo-animation.js',import.meta.url),'utf8');
async function run({blocked=false,image='loaded',reduced=false}={}) {
  const nodes=[];
  const timers=new Map();
  let now=0, serial=0, enteredEvents=0;
  const schedule=(fn,delay=0)=>{const id=++serial;timers.set(id,{fn,time:now+delay});return id;};
  class Element {
    constructor(tag='div') {this.tagName=tag.toUpperCase();this.style={};this.attrs={};this.events={};this.children=[];this.complete=image==='loaded';const classes=new Set();this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:v=>classes.has(v)};nodes.push(this);}
    setAttribute(k,v){this.attrs[k]=v;}
    getAttribute(k){return this.attrs[k]??null;}
    hasAttribute(k){return k in this.attrs;}
    removeAttribute(k){delete this.attrs[k];}
    addEventListener(k,fn){(this.events[k]??=new Set()).add(fn);if(k==='error'&&image==='error')schedule(()=>fn(),1);}
    removeEventListener(k,fn){this.events[k]?.delete(fn);}
    appendChild(el){el.parentNode=this;this.children.push(el);}
    removeChild(el){this.children=this.children.filter(x=>x!==el);el.parentNode=null;}
    cloneNode(){return new Element(this.tagName);}
    decode(){return image==='stalled'?new Promise(()=>{}):Promise.resolve();}
  }
  const body=new Element();body.classList.add('home-page');
  const root=new Element();
  const query=selector=>selector==='#stage-video-mask'?nodes.find(n=>n.id==='stage-video-mask'&&n.parentNode):null;
  const store={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const window={scrollY:0,scrollTo(){},addEventListener(){},removeEventListener(){},dispatchEvent(e){if(e.type==='neuroartan:entered')enteredEvents++;},matchMedia:()=>({matches:reduced}),setTimeout:schedule,clearTimeout:id=>timers.delete(id),getComputedStyle:()=>({position:'static',display:'block'})};
  for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{get(){if(blocked)throw new Error('Storage denied');return store;}});
  const document={body,documentElement:root,readyState:'complete',querySelector:query,createElement:tag=>new Element(tag),addEventListener(){}};
  vm.runInNewContext(source,{window,document,HTMLAnchorElement:Element,requestAnimationFrame:fn=>schedule(fn,16),setTimeout:schedule,clearTimeout:id=>timers.delete(id),Event});
  for(let i=0;i<150;i++) {
    await Promise.resolve();
    if(timers.size){const [id,t]=[...timers].sort((a,b)=>a[1].time-b[1].time)[0];timers.delete(id);now=t.time;t.fn();}
  }
  assert(body.classList.contains('site-entered'),'Homepage must become visible');
  assert(!body.classList.contains('intro-loading'),'Intro must finish');
  assert.notEqual(body.style.position,'fixed','Scroll must unlock');
  assert(enteredEvents>0,'Deferred homepage systems must receive the entered event');
}
for(const options of [{},{blocked:true},{image:'error'},{image:'stalled'},{blocked:true,image:'stalled'},{blocked:true,reduced:true}])await run(options);
console.log('PASS: homepage startup survives failed/stalled logo requests and denied storage.');
