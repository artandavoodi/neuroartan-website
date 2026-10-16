// Progressive topic navigation only. Legal text is present in the initial HTML.
function initializeLegalTopics(){
  document.querySelectorAll('[data-legal-page]').forEach(page=>{
    const navigation=page.querySelector('.legal-page-topics');
    const sections=[...page.querySelectorAll('.legal-page-section')];
    if(!navigation||!sections.length)return;
    const links=[...navigation.querySelectorAll('a')];
    const activate=()=>{
      const current=sections.find(section=>`#${section.id}`===location.hash)||sections[0];
      links.forEach(link=>{
        const active=link.hash===`#${current.id}`;
        link.setAttribute('aria-selected',String(active));
        link.tabIndex=active?0:-1;
      });
      sections.forEach(section=>{section.hidden=section!==current;});
    };
    navigation.setAttribute('role','tablist');
    links.forEach(link=>{
      const section=sections.find(s=>`#${s.id}`===link.hash);
      link.id=`tab-${section.id}`;
      link.setAttribute('role','tab');
      link.setAttribute('aria-controls',section.id);
      section.setAttribute('role','tabpanel');
      section.setAttribute('aria-labelledby',link.id);
    });
    navigation.addEventListener('keydown',event=>{
      const current=links.indexOf(document.activeElement);
      if(current<0)return;
      let next=current;
      if(event.key==='ArrowRight')next=(current+1)%links.length;
      else if(event.key==='ArrowLeft')next=(current+links.length-1)%links.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=links.length-1;
      else return;
      event.preventDefault();links[next].focus();links[next].click();
    });
    window.addEventListener('hashchange',activate);
    activate();
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initializeLegalTopics,{once:true});
else initializeLegalTopics();
