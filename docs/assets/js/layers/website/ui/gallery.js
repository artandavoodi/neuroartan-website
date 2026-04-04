// --- Gallery.js: all behavior and animations ---
// Future-proof setup: works for any number of images in the gallery

document.addEventListener('DOMContentLoaded', () => {

    const galleryItems = document.querySelectorAll('.gallery-item img');

    galleryItems.forEach(img => {
        // Hover effect handled in CSS, optional JS log
        img.addEventListener('mouseenter', () => {
            img.style.cursor = 'pointer';
        });

        // Click effect: open fullscreen/lightbox placeholder
        img.addEventListener('click', () => {
            openLightbox(img);
        });
    });

    // Lightbox function: currently demo placeholder
    function openLightbox(img) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.95)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 9999;
        overlay.style.cursor = 'zoom-out';

        // Create fullscreen image
        const fullscreenImg = document.createElement('img');
        fullscreenImg.src = img.src;
        fullscreenImg.alt = img.alt;
        fullscreenImg.style.maxWidth = '95%';
        fullscreenImg.style.maxHeight = '95%';
        fullscreenImg.style.borderRadius = '12px';
        fullscreenImg.style.boxShadow = '0 8px 32px rgba(255,255,255,0.5)';

        overlay.appendChild(fullscreenImg);
        document.body.appendChild(overlay);

        // Click to close
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }

});