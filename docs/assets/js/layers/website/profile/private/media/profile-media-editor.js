/* Neuroartan account adapter; editor behavior is shared across brand pillars. */
import {getProfileRuntimeState,subscribeProfileRuntime} from '../shell/profile-runtime.js';
import * as profileSave from '../../../system/profile/profile-save.js';
import {registerProfileMediaEditorTarget,refreshProfileMediaEditor} from '../../../ui/profile-media-editor.js';
export {registerProfileMediaEditorTarget} from '../../../ui/profile-media-editor.js';

const saveScope=profileSave.savePublicProfileScope||profileSave.saveProfileScope||profileSave.savePrivateProfileScope;
function authenticatedState(){
  const state=getProfileRuntimeState();
  if(state.viewerState!=='authenticated'||!state.user)throw Error('Sign in before editing profile images');
  return state;
}
registerProfileMediaEditorTarget('profile',{
  getCurrentImageUrl({kind}){
    const state=getProfileRuntimeState();
    return kind==='cover'?(state.coverDisplayUrl||state.coverUrl||state.defaultCoverUrl||''):(state.avatarDisplayUrl||state.avatarUrl||state.defaultAvatarUrl||'');
  },
  async save({file,kind}){
    const state=authenticatedState();
    await saveScope({scope:'media',values:kind==='cover'?{cover_file:file}:{avatar_file:file},existingProfile:state.profile,user:state.user});
  },
  async reset({kind}){
    const state=authenticatedState(),profile=state.profile||{};
    const values=kind==='cover'?{cover_url:'',cover_storage_path:'',profile_image_storage_bucket:'',public_feature_flags:(Array.isArray(profile.public_feature_flags)?profile.public_feature_flags:[]).filter(entry=>!['profile_cover_url','profile_cover_storage_path'].includes(String(entry?.key||entry?.name||'').trim()))}:{avatar_state:'empty',avatar_url:'',photo_url:'',public_avatar_url:'',avatar_storage_path:'',profile_image_storage_bucket:''};
    await saveScope({scope:'media',values,existingProfile:profile,user:state.user});
  }
});
subscribeProfileRuntime(refreshProfileMediaEditor);
