---
layout: page
title: Photography
permalink: /gallery/
---

<div id="lightgallery" class="photo-gallery">
  {% for photo in site.data.gallery %}
    <a class="photo-gallery-item" href="{{ photo.url | relative_url }}" data-sub-html=".photo-caption">
      <img src="{{ photo.thumbnail_url | default: photo.url | relative_url }}" alt="{{ photo.caption }}" loading="lazy">
      {% if photo.caption %}
        <div class="photo-caption" style="display:none;">{{ photo.caption }}</div>
      {% endif %}
    </a>
  {% endfor %}
</div> 