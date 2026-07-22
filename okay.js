const SUPABASE_URL='https://byniblcezicrvyyqbafc.supabase.co';
const SUPABASE_KEY='sb_publishable_exBhK1ZwxY3uSoErm0jVFA_gR97KaAy';
const sb=supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null,currentPage='feed',currentChatId=null,chatChannel=null,typingChannel=null;
let theme=localStorage.getItem('godmode_theme')||'default';
let darkMode=localStorage.getItem('godmode_dark')==='true';
let mediaRecorder=null,audioChunks=[],isRecording=false;
let pendingPostImage=null,replyToMessage=null,editingMessage=null;
let userTheme={accent_color:'#6366f1',border_radius:'16px',font_family:'system',text_size:'medium',density:'comfortable',animations_enabled:true};

// Применяем тёмный режим
if(darkMode)document.body.classList.add('dark');
// Применяем тему
if(theme!=='default')document.body.classList.add(`theme-${theme}`);
applyUserTheme();

// ==================== УТИЛИТЫ ====================
function toast(m,type='info'){
    const t=document.getElementById('toast');
    t.textContent=m;t.style.display='block';
    t.style.background=type==='error'?'#ef4444':type==='success'?'#10b981':'#1a1a1a';
    clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',2500);
}
function timeAgo(d){const s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return'сейчас';if(s<3600)return Math.floor(s/60)+' мин';if(s<86400)return Math.floor(s/3600)+' ч';if(s<604800)return Math.floor(s/86400)+' дн';return new Date(d).toLocaleDateString('ru-RU');}
function formatTime(d){return new Date(d).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});}
function formatDate(d){const now=new Date();const date=new Date(d);if(date.toDateString()===now.toDateString())return'Сегодня';const yesterday=new Date(now);yesterday.setDate(yesterday.getDate()-1);if(date.toDateString()===yesterday.toDateString())return'Вчера';return date.toLocaleDateString('ru-RU',{day:'numeric',month:'long'});}
function getInitials(n){return(n||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);}
function avHtml(u){if(u?.avatar_url)return`<img src="${escapeHTML(u.avatar_url)}" alt="">`;return escapeHTML(getInitials(u?.full_name||'?'));}
function escapeHTML(str){const div=document.createElement('div');div.textContent=str||'';return div.innerHTML;}
function randAvatar(){return'https://i.pravatar.cc/150?img='+Math.floor(Math.random()*70);}
function generateId(){return'id_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);}

function applyUserTheme(){
    const root=document.documentElement;
    if(userTheme.accent_color)root.style.setProperty('--primary',userTheme.accent_color);
    if(userTheme.border_radius)root.style.setProperty('--radius',userTheme.border_radius);
    if(userTheme.font_family){
        const fonts={system:'-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif',mono:'"SF Mono","Fira Code",monospace',rounded:'"SF Pro Rounded","Nunito",sans-serif',serif:'"Georgia","Times New Roman",serif',display:'"Clash Display","Inter",sans-serif'};
        root.style.setProperty('--font',fonts[userTheme.font_family]||fonts.system);
    }
    const sizes={small:'0.85rem',medium:'0.95rem',large:'1.05rem'};
    if(userTheme.text_size)root.style.setProperty('--text-size',sizes[userTheme.text_size]||sizes.medium);
}

// ==================== АВТОРИЗАЦИЯ ====================
function renderLogin(err){
    let h='<div class="screen-center"><div class="logo-icon">💠</div><div class="logo-text">Godmode</div>';
    if(err)h+=`<div class="error-box">${escapeHTML(err)}</div>`;
    h+='<input id="loginEmail" type="email" placeholder="Email" autocomplete="email"><input id="loginPass" type="password" placeholder="Пароль" autocomplete="current-password"><button class="full" id="btnLogin">Войти</button><p style="color:var(--text-secondary);">Нет аккаунта? <span class="link-text" id="linkRegister">Регистрация</span></p></div>';
    document.getElementById('app').innerHTML=h;
    document.getElementById('btnLogin').onclick=doLogin;
    document.getElementById('linkRegister').onclick=renderRegister;
}

function renderRegister(err){
    let h='<div class="screen-center"><div class="logo-icon">💠</div><div class="logo-text">Godmode</div>';
    if(err)h+=`<div class="error-box">${escapeHTML(err)}</div>`;
    h+='<input id="regName" placeholder="Полное имя"><input id="regUser" placeholder="Юзернейм"><input id="regEmail" type="email" placeholder="Email"><input id="regPass" type="password" placeholder="Пароль (мин 6)"><button class="full" id="btnRegister">Зарегистрироваться</button><p style="color:var(--text-secondary);">Уже есть аккаунт? <span class="link-text" id="linkLogin">Войти</span></p></div>';
    document.getElementById('app').innerHTML=h;
    document.getElementById('btnRegister').onclick=doRegister;
    document.getElementById('linkLogin').onclick=renderLogin;
}

async function doLogin(){
    const email=document.getElementById('loginEmail').value.trim();
    const pass=document.getElementById('loginPass').value;
    if(!email||!pass)return renderLogin('Заполните все поля');
    const{data,error}=await sb.auth.signInWithPassword({email,password:pass});
    if(error)return renderLogin(error.message);
    currentUser=data.user;
    await loadProfile();
    await loadUserTheme();
    showMainApp();
}

async function doRegister(){
    const name=document.getElementById('regName').value.trim();
    const username=document.getElementById('regUser').value.trim();
    const email=document.getElementById('regEmail').value.trim();
    const pass=document.getElementById('regPass').value;
    if(!name||!username||!email||!pass)return renderRegister('Заполните все поля');
    if(pass.length<6)return renderRegister('Пароль минимум 6 символов');
    const{data,error}=await sb.auth.signUp({email,password:pass});
    if(error){if(error.message.includes('already'))return renderLogin('Этот email уже зарегистрирован. Войдите.');return renderRegister(error.message);}
    await sb.from('users').insert({id:data.user.id,email,username,full_name:name,avatar_url:randAvatar()});
    await sb.from('user_settings').insert({user_id:data.user.id});
    await sb.from('user_themes').insert({user_id:data.user.id});
    currentUser=data.user;
    currentUser.profile={id:data.user.id,email,username,full_name:name,is_owner:false,verified:false,avatar_url:randAvatar(),banner_url:'',bio:'',city:'',status:'online'};
    showMainApp();
}

async function loadProfile(){
    const{data}=await sb.from('users').select('*').eq('id',currentUser.id).single();
    if(data){currentUser.profile=data;updateUserStatus('online');}
}

async function loadUserTheme(){
    const{data}=await sb.from('user_themes').select('*').eq('user_id',currentUser.id).single();
    if(data){userTheme=data;applyUserTheme();}
}

async function updateUserStatus(status){
    await sb.from('users').update({status,last_seen:new Date().toISOString()}).eq('id',currentUser.id);
    if(currentUser.profile)currentUser.profile.status=status;
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================
function showMainApp(){
    if(chatChannel){sb.removeChannel(chatChannel);chatChannel=null;}
    if(typingChannel){sb.removeChannel(typingChannel);typingChannel=null;}
    let h='<div class="header"><div class="header-logo">💠 Godmode</div>';
    if(currentUser.profile?.is_owner)h+='<span class="owner-chip"><i class="fas fa-crown"></i> OWNER</span>';
    h+='</div><div class="content" id="mainContent"></div><div class="bottom-nav" id="bottomNav">';
    h+='<button class="nav-item active" data-page="feed"><i class="fas fa-house"></i>Лента</button>';
    h+='<button class="nav-item" data-page="friends"><i class="fas fa-users"></i>Друзья</button>';
    h+='<button class="nav-item" data-page="groups"><i class="fas fa-people-group"></i>Группы</button>';
    h+='<button class="nav-item" data-page="chats"><i class="fas fa-message"></i>Чаты</button>';
    h+='<button class="nav-item" data-page="profile"><i class="fas fa-circle-user"></i>Профиль</button>';
    h+='</div>';
    document.getElementById('app').innerHTML=h;
    document.getElementById('bottomNav').onclick=(e)=>{const btn=e.target.closest('.nav-item');if(btn)nav(btn.dataset.page);};
    document.getElementById('mainContent').addEventListener('click',globalClickHandler);
    document.getElementById('mainContent').addEventListener('contextmenu',globalContextMenu);
    document.getElementById('mainContent').addEventListener('touchstart',globalTouchStart);
    document.getElementById('mainContent').addEventListener('touchend',globalTouchEnd);
    nav('feed');
}

function nav(page){
    if(chatChannel){sb.removeChannel(chatChannel);chatChannel=null;}
    if(typingChannel){sb.removeChannel(typingChannel);typingChannel=null;}
    currentPage=page;currentChatId=null;
    document.querySelectorAll('#bottomNav .nav-item').forEach(n=>n.classList.remove('active'));
    const t=document.querySelector(`#bottomNav .nav-item[data-page="${page}"]`);
    if(t)t.classList.add('active');
    switch(page){
        case'feed':loadFeed();break;
        case'profile':loadProfile().then(loadProfilePage);break;
        case'friends':loadFriends();break;
        case'groups':loadGroups();break;
        case'chats':loadChats();break;
        case'settings':loadSettings();break;
        case'editProfile':loadEditProfile();break;
        case'moderation':loadModeration();break;
        case'channels':loadChannels();break;
        case'music':loadMusic();break;
        case'verify':loadVerify();break;
        case'themes':loadThemes();break;
    }
}

// ==================== ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ====================
let longPressTimer=null;
function globalTouchStart(e){const t=e.target.closest('.msg');if(t){longPressTimer=setTimeout(()=>showMessageMenu(t,e),500);}}
function globalTouchEnd(){clearTimeout(longPressTimer);}
function globalContextMenu(e){e.preventDefault();}

function globalClickHandler(e){
    const t=e.target;
    if(t.closest('[data-uid]')){viewUserProfile(t.closest('[data-uid]').dataset.uid);return;}
    if(t.closest('[data-del]')){deletePost(t.closest('[data-del]').dataset.del);return;}
    if(t.closest('[data-like]')){likePost(t.closest('[data-like]').dataset.like);return;}
    if(t.closest('[data-comm]')){toggleComments(t.closest('[data-comm]').dataset.comm);return;}
    if(t.closest('[data-repost]')){repostPost(t.closest('[data-repost]').dataset.repost);return;}
    if(t.closest('[data-addcomm]')){addComment(t.closest('[data-addcomm]').dataset.addcomm);return;}
    if(t.closest('[data-uuid]')){viewUserProfile(t.closest('[data-uuid]').dataset.uuid);return;}
    if(t.closest('[data-fid]')){e.stopPropagation();toggleFriend(t.closest('[data-fid]').dataset.fid);return;}
    if(t.closest('[data-cid]')){openChat(t.closest('[data-cid]').dataset.cid);return;}
    if(t.closest('[data-app]')){approveVerification(t.closest('[data-app]').dataset.app,t.closest('[data-app]').dataset.uid);return;}
    if(t.closest('[data-rej]')){rejectVerification(t.closest('[data-rej]').dataset.rej);return;}
    if(t.closest('[data-react]')){addReaction(t.closest('[data-react]').dataset.react,t.closest('[data-react]').dataset.mid);return;}
    if(t.closest('[data-reply]')){replyToMsg(t.closest('[data-reply]').dataset.reply);return;}
    if(t.closest('[data-edit]')){editMsg(t.closest('[data-edit]').dataset.edit);return;}
    if(t.closest('[data-delmsg]')){deleteMsg(t.closest('[data-delmsg]').dataset.delmsg);return;}
    if(t.closest('[data-save]')){savePost(t.closest('[data-save]').dataset.save);return;}
}

// ==================== ЛЕНТА ====================
async function loadFeed(){
    const{data:posts}=await sb.from('posts').select('*, users!posts_user_id_fkey(*)').order('created_at',{ascending:false}).limit(30);
    let h=`<div class="card"><textarea id="postText" placeholder="Что у вас нового?" rows="2" style="border:none;padding:4px 0;background:transparent;resize:none;width:100%;"></textarea><div id="postPreview"></div><div style="display:flex;gap:8px;margin-top:8px;"><button class="secondary small" id="btnAddImage"><i class="fas fa-image"></i> Фото</button><button class="secondary small" id="btnDraft"><i class="fas fa-bookmark"></i> Черновик</button><button class="full" id="btnCreatePost"><i class="fas fa-paper-plane"></i> Опубликовать</button></div><input type="file" id="postImageInput" accept="image/*" style="display:none;"></div>`;
    if(posts)posts.forEach(p=>{
        const u=p.users||{};
        h+=`<div class="card fade-in"><div class="post-header" data-uid="${p.user_id}"><div class="avatar">${avHtml(u)}</div><div style="flex:1;"><strong>${escapeHTML(u.full_name||'?')}</strong>${u.verified?' <i class="fas fa-circle-check badge-verify"></i>':''}${u.is_owner?' <span class="owner-chip"><i class="fas fa-crown"></i> OWNER</span>':''}<div style="font-size:0.75rem;color:var(--text-tertiary);">${timeAgo(p.created_at)}</div></div>${p.user_id===currentUser.id?`<button class="ghost icon-only" data-del="${p.id}"><i class="fas fa-trash" style="color:var(--danger);"></i></button>`:`<button class="ghost icon-only" data-save="${p.id}"><i class="far fa-bookmark" style="color:var(--text-tertiary);"></i></button>`}</div><p style="white-space:pre-wrap;font-size:var(--text-size);">${escapeHTML(p.text||'')}</p>${p.image_url?`<img src="${escapeHTML(p.image_url)}" class="post-image" alt="фото">`:''}<div class="post-actions"><span data-like="${p.id}"><i class="far fa-heart"></i> ${p.likes_count||0}</span><span data-comm="${p.id}"><i class="far fa-message"></i> ${p.comments_count||0}</span><span data-repost="${p.id}"><i class="fas fa-arrow-right-arrow-left"></i> ${p.reposts_count||0}</span></div><div class="comment-box" id="comments-${p.id}" style="display:none;"><div id="cl-${p.id}"></div><div class="comment-input-row"><input id="ci-${p.id}" placeholder="Комментарий..."><button class="ghost icon-only" data-addcomm="${p.id}"><i class="fas fa-paper-plane" style="color:var(--primary);"></i></button></div></div></div>`;
    });
    if(!posts||posts.length===0)h+='<div class="card"><p style="text-align:center;color:var(--text-tertiary);">Нет постов. Будьте первым!</p></div>';
    document.getElementById('mainContent').innerHTML=h;
    document.getElementById('btnCreatePost').onclick=createPost;
    document.getElementById('btnAddImage').onclick=()=>document.getElementById('postImageInput').click();
    document.getElementById('btnDraft').onclick=saveDraft;
    document.getElementById('postImageInput').onchange=function(){
        const file=this.files[0];if(!file)return;
        const reader=new FileReader();
        reader.onload=function(e){pendingPostImage=e.target.result;document.getElementById('postPreview').innerHTML=`<img src="${e.target.result}" class="post-preview-img">`;};
        reader.readAsDataURL(file);
    };
}

async function createPost(){
    const text=document.getElementById('postText')?.value.trim();
    if(!text&&!pendingPostImage)return toast('Напишите текст или добавьте фото','error');
    let imageUrl=null;
    if(pendingPostImage){
        const blob=await(await fetch(pendingPostImage)).blob();
        const path=`post-images/${currentUser.id}/${Date.now()}.jpg`;
        await sb.storage.from('post-images').upload(path,blob);
        imageUrl=sb.storage.from('post-images').getPublicUrl(path).data.publicUrl;
    }
    await sb.from('posts').insert({user_id:currentUser.id,text:text||'',image_url:imageUrl});
    pendingPostImage=null;toast('✅ Опубликовано!','success');loadFeed();
}

async function saveDraft(){
    const text=document.getElementById('postText')?.value.trim();
    if(!text&&!pendingPostImage)return toast('Нечего сохранять','error');
    await sb.from('post_drafts').insert({user_id:currentUser.id,text:text||'',image_url:pendingPostImage});
    document.getElementById('postText').value='';
    document.getElementById('postPreview').innerHTML='';
    pendingPostImage=null;
    toast('✅ Черновик сохранён!','success');
}

async function deletePost(id){if(!confirm('Удалить пост?'))return;await sb.from('posts').delete().eq('id',id);toast('Удалён','success');loadFeed();}
async function likePost(id){const{data:ex}=await sb.from('likes').select('*').eq('user_id',currentUser.id).eq('post_id',id).single();if(ex){await sb.from('likes').delete().eq('user_id',currentUser.id).eq('post_id',id);await sb.rpc('decrement_likes',{post_id:id});}else{await sb.from('likes').insert({user_id:currentUser.id,post_id:id});await sb.rpc('increment_likes',{post_id:id});}refreshPostLikes(id);}
async function repostPost(id){const{data:o}=await sb.from('posts').select('*').eq('id',id).single();if(!o)return;await sb.from('posts').insert({user_id:currentUser.id,text:o.text,image_url:o.image_url,reposted_from:id});await sb.rpc('increment_reposts',{post_id:id});toast('🔄 Репост!','success');loadFeed();}
async function savePost(id){await sb.from('saved_posts').upsert({user_id:currentUser.id,post_id:id});toast('🔖 Сохранено!','success');}

async function refreshPostLikes(id){
    const{data:post}=await sb.from('posts').select('likes_count').eq('id',id).single();
    if(post){const span=document.querySelector(`[data-like="${id}"]`);if(span)span.innerHTML=`<i class="far fa-heart"></i> ${post.likes_count||0}`;}
}

async function toggleComments(pid){
    const el=document.getElementById('comments-'+pid);if(!el)return;
    if(el.style.display==='block'){el.style.display='none';return;}
    el.style.display='block';
    const{data:c}=await sb.from('comments').select('*, users!comments_user_id_fkey(*)').eq('post_id',pid).order('created_at',{ascending:true});
    document.getElementById('cl-'+pid).innerHTML=(c||[]).map(x=>`<div class="comment"><div class="avatar avatar-sm">${avHtml(x.users)}</div><div><strong>${escapeHTML(x.users?.full_name||'?')}</strong>${x.users?.verified?' <i class="fas fa-circle-check badge-verify"></i>':''}<br>${escapeHTML(x.text)}</div></div>`).join('')||'<p style="font-size:0.8rem;color:var(--text-tertiary);">Нет комментариев</p>';
}

async function addComment(pid){
    const input=document.getElementById('ci-'+pid);if(!input||!input.value.trim())return;
    await sb.from('comments').insert({user_id:currentUser.id,post_id:pid,text:input.value.trim()});
    await sb.rpc('increment_comments',{post_id:pid});
    input.value='';toggleComments(pid);setTimeout(()=>toggleComments(pid),50);
}

// ==================== ПРОФИЛЬ ====================
function loadProfilePage(){
    const p=currentUser.profile||{};
    const statusClass=p.status==='online'?'':p.status==='recently'?'recently':'offline';
    const statusText=p.status==='online'?'В сети':p.status==='recently'?'Был(а) недавно':'Был(а) давно';
    let h=`<div class="card" style="padding:0;overflow:hidden;"><img src="${escapeHTML(p.banner_url||'https://picsum.photos/480/160')}" class="profile-banner" alt="banner"><div style="padding:0 16px;position:relative;"><div style="position:relative;display:inline-block;"><div class="avatar avatar-lg">${avHtml(p)}<span class="online-dot ${statusClass}"></span></div></div></div><div style="padding:12px 16px 16px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><h2>${escapeHTML(p.full_name||'?')}</h2>${p.verified?'<i class="fas fa-circle-check badge-verify"></i>':''}${p.is_owner?'<span class="owner-chip"><i class="fas fa-crown"></i> OWNER</span>':''}</div><p style="color:var(--text-secondary);">@${escapeHTML(p.username||'')}</p><p style="font-size:0.8rem;color:var(--text-tertiary);">${statusText}</p>${p.bio?`<p style="margin:4px 0;">${escapeHTML(p.bio)}</p>`:''}${p.city?`<p style="font-size:0.85rem;color:var(--text-tertiary);"><i class="fas fa-map-pin"></i> ${escapeHTML(p.city)}</p>`:''}<div style="display:flex;gap:20px;margin:12px 0;"><div><strong>0</strong><br><span style="font-size:0.7rem;color:var(--text-tertiary);">постов</span></div><div><strong>0</strong><br><span style="font-size:0.7rem;color:var(--text-tertiary);">друзей</span></div><div><strong>0</strong><br><span style="font-size:0.7rem;color:var(--text-tertiary);">подписчиков</span></div></div><button class="secondary full" onclick="nav('editProfile')"><i class="fas fa-pen"></i> Редактировать</button><button class="secondary full" onclick="nav('themes')" style="margin-top:6px;"><i class="fas fa-palette"></i> Оформление</button><button class="danger full" id="btnLogout" style="margin-top:6px;"><i class="fas fa-right-from-bracket"></i> Выйти</button></div></div>`;
    document.getElementById('mainContent').innerHTML=h;
    document.getElementById('btnLogout').onclick=doLogout;
}

function loadEditProfile(){
    const p=currentUser.profile||{};
    let h='<h2>✏️ Редактирование</h2><div class="card">';
    h+=`<div style="display:flex;gap:12px;margin-bottom:12px;"><button class="secondary small" onclick="changeAvatar()"><i class="fas fa-camera"></i> Аватар</button><button class="secondary small" onclick="changeBanner()"><i class="fas fa-image"></i> Баннер</button></div>`;
    h+=`<input id="editName" value="${escapeHTML(p.full_name||'')}" placeholder="Имя" style="margin-bottom:8px;">`;
    h+=`<input id="editUsername" value="${escapeHTML(p.username||'')}" placeholder="Юзернейм" style="margin-bottom:8px;">`;
    h+=`<input id="editBio" value="${escapeHTML(p.bio||'')}" placeholder="О себе" style="margin-bottom:8px;">`;
    h+=`<input id="editCity" value="${escapeHTML(p.city||'')}" placeholder="Город" style="margin-bottom:8px;">`;
    h+=`<input id="editWebsite" value="${escapeHTML(p.website||'')}" placeholder="Сайт" style="margin-bottom:8px;">`;
    h+='<button class="full" id="btnSaveProfile"><i class="fas fa-check"></i> Сохранить</button>';
    h+='<button class="secondary full" onclick="nav(\'profile\')" style="margin-top:8px;">← Назад</button></div>';
    document.getElementById('mainContent').innerHTML=h;
    document.getElementById('btnSaveProfile').onclick=saveProfile;
}

async function saveProfile(){
    const updates={
        full_name:document.getElementById('editName').value.trim(),
        username:document.getElementById('editUsername').value.trim(),
        bio:document.getElementById('editBio').value.trim(),
        city:document.getElementById('editCity').value.trim(),
        website:document.getElementById('editWebsite').value.trim()
    };
    await sb.from('users').update(updates).eq('id',currentUser.id);
    Object.assign(currentUser.profile,updates);
    toast('✅ Профиль обновлён!','success');nav('profile');
}

async function uploadFile(bucket,file){
    const path=`${currentUser.id}/${Date.now()}.jpg`;
    await sb.storage.from(bucket).upload(path,file,{upsert:true});
    return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function changeAvatar(){
    const input=document.createElement('input');input.type='file';input.accept='image/*';
    input.onchange=async function(){const f=input.files[0];if(!f)return;const url=await uploadFile('avatars',f);if(url){await sb.from('users').update({avatar_url:url}).eq('id',currentUser.id);currentUser.profile.avatar_url=url;toast('✅ Аватар обновлён!','success');nav('editProfile');}};
    input.click();
}

function changeBanner(){
    const input=document.createElement('input');input.type='file';input.accept='image/*';
    input.onchange=async function(){const f=input.files[0];if(!f)return;const url=await uploadFile('banners',f);if(url){await sb.from('users').update({banner_url:url}).eq('id',currentUser.id);currentUser.profile.banner_url=url;toast('✅ Баннер обновлён!','success');nav('editProfile');}};
    input.click();
}

// ==================== ТЕМЫ ====================
function loadThemes(){
    const themes=['default','ocean','sunset','forest','neon','midnight','gold','rose','cyan','violet','amber','teal','indigo'];
    const themeNames={default:'🟣 Стандарт',ocean:'🔵 Океан',sunset:'🟠 Закат',forest:'🟢 Лес',neon:'🟣 Неон',midnight:'🌑 Полночь',gold:'🟡 Золото',rose:'🔴 Роза',cyan:'🩵 Циан',violet:'💜 Фиалка',amber:'🟠 Янтарь',teal:'🩶 Бирюза',indigo:'💙 Индиго'};
    let h='<h2>🎨 Оформление</h2>';
    h+='<div class="card"><h3>Тема</h3><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;">';
    themes.forEach(t=>{
        h+=`<button class="secondary small ${theme===t?'active':''}" onclick="setTheme('${t}')" style="justify-content:flex-start;">${themeNames[t]}</button>`;
    });
    h+='</div></div>';
    h+=`<div class="card"><h3>Тёмный режим</h3><div class="settings-item" id="toggleDark"><span>Включить</span><div class="toggle ${darkMode?'active':''}" id="darkSwitch"></div></div></div>`;
    h+=`<div class="card"><h3>Акцентный цвет</h3><input type="color" id="accentColor" value="${userTheme.accent_color||'#6366f1'}" onchange="updateAccentColor(this.value)"></div>`;
    h+=`<div class="card"><h3>Радиус скругления</h3><select id="borderRadius" onchange="updateBorderRadius(this.value)"><option value="8px" ${userTheme.border_radius==='8px'?'selected':''}>Острые (8px)</option><option value="16px" ${userTheme.border_radius==='16px'?'selected':''}>Средние (16px)</option><option value="24px" ${userTheme.border_radius==='24px'?'selected':''}>Круглые (24px)</option></select></div>`;
    h+=`<div class="card"><h3>Размер текста</h3><select id="textSize" onchange="updateTextSize(this.value)"><option value="small" ${userTheme.text_size==='small'?'selected':''}>Мелкий</option><option value="medium" ${userTheme.text_size==='medium'?'selected':''}>Средний</option><option value="large" ${userTheme.text_size==='large'?'selected':''}>Крупный</option></select></div>`;
    h+='<button class="secondary full" onclick="nav(\'profile\')" style="margin-top:8px;">← Назад</button>';
    document.getElementById('mainContent').innerHTML=h;
    document.getElementById('toggleDark').onclick=toggleDarkMode;
}

function setTheme(t){
    document.body.classList.remove(...Array.from(document.body.classList).filter(c=>c.startsWith('theme-')));
    if(t!=='default')document.body.classList.add(`theme-${t}`);
    theme=t;userTheme.theme_name=t;
    localStorage.setItem('godmode_theme',t);
    sb.from('user_themes').upsert({user_id:currentUser.id,theme_name:t});
    loadThemes();
}

function toggleDarkMode(){
    darkMode=!darkMode;
    document.body.classList.toggle('dark',darkMode);
    localStorage.setItem('godmode_dark',darkMode);
    sb.from('user_themes').upsert({user_id:currentUser.id,dark_mode:darkMode});
    loadThemes();
}

function updateAccentColor(color){
    document.documentElement.style.setProperty('--primary',color);
    userTheme.accent_color=color;
    sb.from('user_themes').upsert({user_id:currentUser.id,accent_color:color});
}

function updateBorderRadius(val){
    document.documentElement.style.setProperty('--radius',val);
    userTheme.border_radius=val;
    sb.from('user_themes').upsert({user_id:currentUser.id,border_radius:val});
}

function updateTextSize(val){
    const sizes={small:'0.85rem',medium:'0.95rem',large:'1.05rem'};
    document.documentElement.style.setProperty('--text-size',sizes[val]);
    userTheme.text_size=val;
    sb.from('user_themes').upsert({user_id:currentUser.id,text_size:val});
}

// ==================== ВЫХОД ====================
async function doLogout(){
    await updateUserStatus('offline');
    if(chatChannel)sb.removeChannel(chatChannel);
    if(typingChannel)sb.removeChannel(typingChannel);
    await sb.auth.signOut();
    currentUser=null;
    renderLogin();
}

// ==================== ЗАПУСК ====================
(async()=>{
    const{data}=await sb.auth.getSession();
    if(data.session){currentUser=data.session.user;await loadProfile();await loadUserTheme();showMainApp();}
    else renderLogin();
})();