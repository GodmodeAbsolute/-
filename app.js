// Функция переключения вкладок
function switchTab(event, tabId) {
  // 1. Снимаем класс 'active' со всех кнопок навигации
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // 2. Скрываем все блоки контента
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  // 3. Активируем нажатую кнопку и выбранную вкладку
  event.currentTarget.classList.add('active');
  const selectedTab = document.getElementById(tabId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
}

// Показ / скрытие панели загрузки фото
function toggleUploadPanel() {
  const panel = document.getElementById('upload-panel');
  if (panel) {
    panel.classList.toggle('active');
  }
}

// Загрузка фото с устройства
function previewImage(event, targetId) {
  const file = event.target.files[0];
  if (!file) return;

  const imageURL = URL.createObjectURL(file);
  const targetElement = document.getElementById(targetId);

  if (!targetElement) return;

  if (targetElement.tagName === 'IMG') {
    targetElement.src = imageURL;
  } else {
    targetElement.style.backgroundImage = `url('${imageURL}')`;
  }
}