// Shared composer and short-profile character progress.
export function syncCharacterCounter(field,counter,limit){
 if(!field||!counter)return;
 const count=field.value.length;
 field.maxLength=limit;
 const state=count>limit?'over':count>=limit*0.8?'warning':'ready';
 counter.dataset.characterState=state;
 counter.dataset.profilePostCharacterState=state;
 const circle=counter.querySelector('[data-character-progress],.profile-posts__counter-circle-progress');
 if(circle)circle.style.strokeDashoffset=String(100-Math.min(count/limit*100,100));
 counter.setAttribute('aria-label',count+' of '+limit+' characters');
 return {count,state};
}
