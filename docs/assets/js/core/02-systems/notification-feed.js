export function notificationTone(status){
 if(['approved','succeeded','success','published'].includes(status))return 'success';
 if(['failed','rejected','error'].includes(status))return 'error';
 if(['pending','interrupted','cancelled','warning'].includes(status))return 'warning';
 return 'info';
}
// Presentation only: owners supply authenticated records and persist acknowledgements.
export function renderNotificationFeed(root,{items,history=false,onHistory,onRead,onOpen}){
 const tabs=document.createElement('nav');tabs.className='system-notification-tabs';tabs.setAttribute('aria-label','Notification views');
 for(const [label,value] of [['Unread',false],['History',true]]){const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(history===value));button.addEventListener('click',()=>onHistory(value));tabs.append(button);}
 root.replaceChildren(tabs);
 const visible=items.filter(item=>history?item.read:!item.read);
 if(!visible.length){const empty=document.createElement('p');empty.textContent=history?'No read notifications yet.':"You're all caught up.";root.append(empty);}
 for(const item of visible){
  const row=document.createElement('article'),dot=document.createElement('span'),copy=document.createElement('div'),title=document.createElement('strong');
  row.className='system-notification-row';row.dataset.notificationTone=notificationTone(item.status);dot.className='system-notification-dot';dot.setAttribute('aria-hidden','true');copy.className='system-notification-copy';title.textContent=item.title;copy.append(title);
  if(item.message){const message=document.createElement('p');message.textContent=item.message;copy.append(message);}
  if(item.createdAt){const date=new Date(item.createdAt);if(Number.isFinite(date.getTime())){const time=document.createElement('time');time.dateTime=item.createdAt;time.textContent=date.toLocaleString();copy.append(time);}}
  if(onOpen){const open=document.createElement('button');open.type='button';open.className='system-notification-open';open.textContent=item.openLabel||'View details';open.addEventListener('click',()=>onOpen(item));copy.append(open);}
  row.append(dot,copy);
  if(!item.read){const read=document.createElement('button');read.type='button';read.className='system-notification-read';read.setAttribute('aria-label','Mark as read');read.title='Mark as read';read.addEventListener('click',async()=>{read.disabled=true;try{await onRead(item);}catch{read.disabled=false;read.setAttribute('aria-label','Try marking as read again');const error=document.createElement('p');error.setAttribute('role','status');error.textContent='Could not mark this notification as read. Please try again.';copy.append(error);}});row.append(read);}
  root.append(row);
 }
}
