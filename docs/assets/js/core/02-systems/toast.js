let message,hideTimer,clearTimer;
// One non-modal success message; validation errors stay beside their fields.
export function showSaveConfirmation(text='Changes saved.'){
  if(!message?.isConnected){
    message=document.createElement('p');
    message.className='system-save-confirmation';
    message.setAttribute('role','status');
    message.setAttribute('aria-live','polite');
    message.setAttribute('aria-atomic','true');
    (document.querySelector('footer')||document.body).append(message);
  }
  clearTimeout(hideTimer);clearTimeout(clearTimer);
  message.textContent=text;message.dataset.visible='true';
  hideTimer=setTimeout(()=>{
    message.dataset.visible='false';
    clearTimer=setTimeout(()=>{message.textContent='';},1000);
  },4000);
}
