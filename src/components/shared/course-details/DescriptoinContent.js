'use client';

import React, { useMemo } from "react";

const DescriptoinContent = ({ aboutCourse }) => {
  // Remove video/iframe elements from the HTML content
  const sanitizedContent = useMemo(() => {
    if (!aboutCourse || aboutCourse.trim() === '') {
      return null;
    }

    // Only sanitize on client side
    if (typeof window === 'undefined') {
      // On server side, use regex to remove video/iframe tags
      let sanitized = aboutCourse;
      // Remove video, iframe, embed, and object tags
      sanitized = sanitized.replace(/<video[^>]*>.*?<\/video>/gi, '');
      sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
      sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
      sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
      return sanitized;
    }

    // On client side, use DOM manipulation for more accurate parsing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = aboutCourse;

    // Remove all video and iframe elements
    const videos = tempDiv.querySelectorAll('video, iframe, embed, object');
    videos.forEach(el => el.remove());

    // Also remove any elements that might contain intro video URLs
    // (e.g., links or divs with video URLs in data attributes)
    const allElements = tempDiv.querySelectorAll('*');
    allElements.forEach(el => {
      // Check data attributes for video URLs
      Array.from(el.attributes).forEach(attr => {
        if (attr.value && (
          attr.value.includes('youtube.com') ||
          attr.value.includes('youtu.be') ||
          attr.value.includes('vimeo.com') ||
          attr.value.includes('.mp4') ||
          attr.value.includes('.m4v') ||
          attr.value.includes('introVideoUrl') ||
          attr.value.includes('intro_video_url')
        )) {
          // Remove the attribute or the element if it's a video-related element
          if (el.tagName === 'VIDEO' || el.tagName === 'IFRAME' || el.tagName === 'EMBED' || el.tagName === 'OBJECT') {
            el.remove();
          }
        }
      });
    });

    return tempDiv.innerHTML;
  }, [aboutCourse]);

  // If no content after sanitization, show placeholder
  if (!sanitizedContent || sanitizedContent.trim() === '') {
    return (
      <div>
        <p className="text-lg text-contentColor dark:text-contentColor-dark mb-5 !leading-30px">
          --
        </p>
      </div>
    );
  }

  return (
    <div className="course-description-content" data-aos="fade-up">
      <div
        className="rich-text-content"
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  );
};

export default DescriptoinContent;
