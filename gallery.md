---
layout: page
title: Photography
permalink: /gallery/
---

<div id="lightgallery" class="photo-gallery">
  {% for photo in site.data.gallery %}
    <a class="photo-gallery-item" 
       href="{{ photo.url | relative_url }}" 
       data-sub-html="{% if photo.caption %}.photo-caption{% endif %}"
       data-src="{{ photo.url | relative_url }}"
       data-responsive="{{ photo.url | relative_url }} 1200, {{ photo.thumbnail_url | default: photo.url | relative_url }} 400">
      <img src="{{ photo.thumbnail_url | default: photo.url | relative_url }}" 
           alt="{% if photo.caption %}{{ photo.caption }}{% else %}Photography image{% endif %}" 
           loading="lazy"
           decoding="async"
           width="400"
           height="200">
      {% if photo.caption %}
        <div class="photo-caption" style="display:none;">{{ photo.caption }}</div>
      {% endif %}
    </a>
  {% endfor %}
</div>

<script>
// Add loading states and error handling for better UX
document.addEventListener('DOMContentLoaded', function() {
  const images = document.querySelectorAll('.photo-gallery img');
  
  images.forEach(img => {
    // Add loading class initially
    img.parentElement.classList.add('loading');
    
    // Remove loading class when image loads
    img.addEventListener('load', function() {
      this.parentElement.classList.remove('loading');
    });
    
    // Handle image load errors
    img.addEventListener('error', function() {
      this.parentElement.classList.remove('loading');
      this.alt = 'Image failed to load';
      console.warn('Failed to load image:', this.src);
    });
  });
});
</script> 