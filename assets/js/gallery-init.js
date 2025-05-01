function initLightGallery() {
  const galleryElement = document.getElementById('lightgallery');
  // Check if the element exists and hasn't already been initialized
  if (galleryElement && !galleryElement.hasAttribute('lg-uid')) {
    // Temporarily removed options to debug SyntaxError
    lightGallery(galleryElement);
    /* 
      lightGallery(galleryElement, {
        plugins: [lgThumbnail],
        licenseKey: 'YOUR_LICENSE_KEY', // Optional, if you have a commercial license
        speed: 500,
        thumbnail: true,
        selector: '.photo-gallery-item' // Target the links we created
        // Add other configuration options here if needed
      });
      */
  }
}

// Initialize on initial page load
document.addEventListener('DOMContentLoaded', initLightGallery);

// Re-initialize after Hydejack dynamic page loads
const pushStateElement = document.getElementById('_pushState');
if (pushStateElement) {
  pushStateElement.addEventListener('hy-push-state-after', initLightGallery);
} 