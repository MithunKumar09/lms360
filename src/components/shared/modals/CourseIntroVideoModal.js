"use client";

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * Course Intro Video Modal Component
 * 
 * A professional modal for playing course intro videos.
 * Supports YouTube (iframe) and uploaded MP4 videos.
 * 
 * Features:
 * - 16:9 medium size container
 * - Blur and dark/moody background
 * - YouTube detection and iframe embedding
 * - MP4 video player support
 * - Professional design with smooth animations
 */
const CourseIntroVideoModal = ({ isOpen, onClose, videoUrl }) => {
  // Detect if video is YouTube
  const isYouTube = useCallback((url) => {
    if (!url) return false;
    return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i.test(url);
  }, []);

  // Extract YouTube video ID
  const getYouTubeId = useCallback((url) => {
    if (!url) return null;
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !videoUrl) return null;

  const youtubeId = isYouTube(videoUrl) ? getYouTubeId(videoUrl) : null;
  const isYtVideo = !!youtubeId;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Blur and dark overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Modal container - 16:9 medium size */}
      <div
        className="relative z-10 w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
          aria-label="Close modal"
        >
          <i className="icofont-close text-xl"></i>
        </button>

        {/* Video container */}
        <div className="w-full h-full flex items-center justify-center">
          {isYtVideo ? (
            // YouTube iframe
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title="Course Intro Video"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          ) : (
            // MP4 video player
            <video
              controls
              autoPlay
              className="w-full h-full object-contain"
              style={{ maxHeight: '100%' }}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      </div>
    </div>
  );

  // Render modal using portal
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default CourseIntroVideoModal;

