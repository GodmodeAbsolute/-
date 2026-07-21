/**
 * Функция предпросмотра выбранного файла с телефона/устройства
 * @param {Event} event - Событие выбора файла
 * @param {string} targetId - ID элемента, куда подставить изображение ('profile-avatar' или 'profile-banner')
 */
function previewImage(event, targetId) {
  const file = event.target.files[0];
  if (!file) return;

  // Создаём локальный URL из выбранного с телефона файла
  const imageURL = URL.createObjectURL(file);
  const targetElement = document.getElementById(targetId);

  if (!targetElement) return;

  if (targetElement.tagName === 'IMG') {
    // Если меняем аватарку (тег <img>)
    targetElement.src = imageURL;
  } else {
    // Если меняем баннер (фоновый div)
    targetElement.style.backgroundImage = `url('${imageURL}')`;
  }
}