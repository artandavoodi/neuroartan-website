// Shared rail behaviour; each platform retains its layout, icons and storage owner.
export function bindMagneticNavigation({root,shell,rail,resize,toggle,onState,readWidth,saveWidth,maximumToken,minimumToken,widthProperty,chevronProperty}){
 const tokenLength=name=>{const measure=document.createElement('span');measure.style.cssText='position:absolute;visibility:hidden;pointer-events:none;height:0;width:var('+name+')';root.append(measure);const width=measure.getBoundingClientRect().width;measure.remove();return width;};
 const maximum=tokenLength(maximumToken),minimum=tokenLength(minimumToken),step=tokenLength('--spacing-md');
 const compact=tokenLength('--control-height-md')+2*tokenLength('--spacing-lg');
 if(!(maximum>=minimum&&minimum>compact&&step>0))throw Error('Invalid navigation sizing tokens');
 const closeAt=minimum-step*2,openAt=minimum-step;
 const setState=closed=>{onState(closed);resize.setAttribute('aria-valuenow',String(closed?compact:parseFloat(shell.style.getPropertyValue(widthProperty))));};
 const setWidth=value=>{const width=Math.round(Math.max(minimum,Math.min(maximum,value)));shell.style.setProperty(widthProperty,width+'px');shell.style.setProperty(chevronProperty,String(Math.max(0,Math.min(1,(width-minimum)/(step*4)))));resize.setAttribute('aria-valuenow',String(width));saveWidth(width);};
 const saved=Number(readWidth(maximum));setWidth(Number.isFinite(saved)?saved:maximum);
 resize.setAttribute('aria-valuemin',String(compact));resize.setAttribute('aria-valuemax',String(maximum));
 if(shell.dataset.rail==='closed')resize.setAttribute('aria-valuenow',String(compact));
 const dragWidth=width=>{const closed=width<(shell.dataset.rail==='closed'?openAt:closeAt);setState(closed);if(!closed)setWidth(width);};
 resize.addEventListener('pointerdown',event=>{
  if(event.button!==0||!matchMedia('(min-width:1025px) and (pointer:fine)').matches)return;
  event.preventDefault();resize.setPointerCapture(event.pointerId);
  const start=event.clientX,width=rail.getBoundingClientRect().width;
  const move=next=>dragWidth(width+next.clientX-start);
  const finish=()=>{resize.removeEventListener('pointermove',move);resize.removeEventListener('pointerup',finish);resize.removeEventListener('pointercancel',finish);resize.removeEventListener('lostpointercapture',finish);};
  resize.addEventListener('pointermove',move);resize.addEventListener('pointerup',finish);resize.addEventListener('pointercancel',finish);resize.addEventListener('lostpointercapture',finish);
 });
 resize.addEventListener('keydown',event=>{let width=rail.getBoundingClientRect().width;if(event.key==='ArrowLeft')width=shell.dataset.rail==='open'&&width<=minimum?compact:width-step;else if(event.key==='ArrowRight')width=shell.dataset.rail==='closed'?minimum:width+step;else if(event.key==='Home')width=compact;else if(event.key==='End')width=maximum;else return;event.preventDefault();dragWidth(width);});
 toggle.addEventListener('click',()=>setState(shell.dataset.rail==='open'));
}
