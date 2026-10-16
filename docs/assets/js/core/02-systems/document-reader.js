// Shared Docs-style outline enhancement. Reading never depends on hidden panels.
export function bindDocumentReaders(root=document){
  root.querySelectorAll('[data-document-reader]').forEach(page=>{
    if(page.dataset.readerBound)return;
    page.dataset.readerBound='true';
    const links=[...page.querySelectorAll('.document-reader__toc a')];
    const sections=links.map(link=>page.querySelector(link.hash)).filter(Boolean);
    const compact=matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)');
    page.querySelectorAll('[data-reader-disclosure]').forEach(group=>{group.open=!compact.matches;});
    let frame=0;
    const update=()=>{
      frame=0;
      const threshold=Math.max(innerHeight*0.22,120);
      const active=sections.reduce((current,section)=>section.getBoundingClientRect().top<=threshold?section:current,sections[0]);
      links.forEach(link=>link.setAttribute('aria-current',String(link.hash===`#${active?.id}`)));
    };
    const observe=()=>{if(!frame)frame=requestAnimationFrame(update);};
    addEventListener('scroll',observe,{passive:true});
    update();
  });
}
