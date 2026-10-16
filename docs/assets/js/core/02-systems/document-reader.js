// Shared Docs-style outline enhancement. Reading never depends on hidden panels.
export function bindDocumentReaders(root=document){
  root.querySelectorAll('[data-document-reader]').forEach(page=>{
    if(page.dataset.readerBound)return;
    page.dataset.readerBound='true';
    const summary=page.querySelector('.document-reader__toc summary');
    if(summary){
      const label=document.createElement('span');
      label.textContent=summary.textContent;
      summary.replaceChildren(label);
      const focus=document.createElement('button');
      focus.type='button';
      focus.className='document-reader__focus';
      focus.setAttribute('aria-label','Hide navigation for focused reading');
      focus.setAttribute('aria-pressed','false');
      const icon=document.createElement('img');
      icon.className='document-reader__focus-icon ui-icon-theme-aware';
      icon.src='/registry/icons/public/assets/core/identity/access/visibility-off.svg';
      icon.alt='';
      icon.setAttribute('aria-hidden','true');
      focus.append(icon);
      focus.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        const active=page.dataset.readerFocus!=='true';
        page.dataset.readerFocus=String(active);
        focus.setAttribute('aria-pressed',String(active));
        focus.setAttribute('aria-label',active?'Show reading navigation':'Hide navigation for focused reading');
        icon.src=active?'/registry/icons/public/assets/core/identity/access/visibility-on.svg':'/registry/icons/public/assets/core/identity/access/visibility-off.svg';
      });
      summary.append(focus);
    }
    const links=[...page.querySelectorAll('.document-reader__toc a')];
    const sections=links.map(link=>page.querySelector(link.hash)).filter(Boolean);
    const compact=matchMedia('(max-width: 1024px), (hover: none), (pointer: coarse)');
    const disclosures=[...page.querySelectorAll('[data-reader-disclosure]')];
    const resetDisclosures=()=>disclosures.forEach(group=>{group.open=!compact.matches;});
    resetDisclosures();
    compact.addEventListener('change',resetDisclosures);
    addEventListener('pageshow',resetDisclosures);
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
