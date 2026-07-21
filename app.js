function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.add('hidden');
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeTab = document.getElementById(`tab-${tabName}`);
  if (activeTab) {
    activeTab.classList.remove('hidden');
  }

  const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }
}

function saveSettings() {
  const firstName = document.getElementById('editFirstName').value;
  const lastName = document.getElementById('editLastName').value;
  const age = document.getElementById('editAge').value;
  const city = document.getElementById('editCity').value;
  const bio = document.getElementById('editBio').value;
  const avatarUrl = document.getElementById('editAvatarUrl').value;
  const coverUrl = document.getElementById('editCoverUrl').value;

  document.getElementById('profileFullName').innerText = `${firstName} ${lastName}`;
  document.getElementById('headerName').innerText = firstName;
  document.getElementById('profileAge').innerText = age;
  document.getElementById('profileCity').innerText = city;
  document.getElementById('profileBio').innerText = bio;

  if (avatarUrl) {
    document.getElementById('profileAvatar').src = avatarUrl;
    document.getElementById('headerAvatar').src = avatarUrl;
  }
  if (coverUrl) {
    document.getElementById('profileCover').src = coverUrl;
  }

  alert('Профиль успешно обновлен!');
  showTab('profile');
}

function setTheme(brandColor, hoverColor) {
  document.documentElement.style.setProperty('--brand-color', brandColor);
  document.documentElement.style.setProperty('--brand-hover-color', hoverColor);
}

function addPost(target) {
  const inputId = target === 'profile' ? 'profilePostInput' : 'globalPostInput';
  const feedId = target === 'profile' ? 'profileFeed' : 'globalFeed';
  
  const input = document.getElementById(inputId);
  const text = input.value.trim();

  if (!text) return;

  const authorName = document.getElementById('profileFullName').innerText;
  const avatarSrc = document.getElementById('profileAvatar').src;

  const postHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
      <div class="flex items-center gap-3">
        <img src="${avatarSrc}" class="w-10 h-10 rounded-full object-cover">
        <div>
          <h4 class="font-bold text-sm text-white">${authorName}</h4>
          <span class="text-[10px] text-slate-500">Только что</span>
        </div>
      </div>
      <p class="text-sm text-slate-200 leading-relaxed">${text}</p>
      <div class="border-t border-slate-800/60 pt-2 flex gap-4 text-xs text-slate-400">
        <button onclick="this.classList.toggle('text-red-500')" class="hover:text-red-500 transition">❤️ 0</button>
        <button class="hover:text-slate-200 transition">💬 Комментировать</button>
      </div>
    </div>
  `;

  document.getElementById(feedId).insertAdjacentHTML('afterbegin', postHTML);
  input.value = '';
}