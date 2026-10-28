/* Shared pre-paint readiness gate. Consumers finish only after their initial data and media settle. */
(() => {
  if(window.NeuroartanPageLoading)return;
  const root=document.documentElement;
  root.dataset.pageLoading='true';
  const lock=()=>{const main=document.querySelector('main');if(main)main.inert=root.hasAttribute('data-page-loading');};
  const finish=()=>{clearTimeout(fallback);delete root.dataset.pageLoading;lock();};
  const start=()=>{clearTimeout(fallback);root.dataset.pageLoading='true';lock();};
  const fallback=setTimeout(finish,20000);
  const images=async scope=>Promise.allSettled([...scope.querySelectorAll('img:not([loading=lazy])')]
    .filter(image=>image.getAttribute('src')&&!image.closest('[hidden]'))
    .map(async image=>{
      if(new URL(image.currentSrc||image.src,location.href).pathname.endsWith('.svg')){
        if(!image.complete)await new Promise(resolve=>{image.addEventListener('load',resolve,{once:true});image.addEventListener('error',resolve,{once:true});});
      }else await image.decode();
    }));
  document.addEventListener('DOMContentLoaded',lock,{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)finish();});
  window.NeuroartanPageLoading={start,finish,images};
})();
