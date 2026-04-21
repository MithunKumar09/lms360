'use client';

import React, { useState, useEffect, useRef } from 'react';

const VideoPlayer = ({ videoUrl, onProgress, onDuration, onPlay, onPause }) => {
  const [showOverlay, setShowOverlay] = useState(true);
  const [iframeUrl, setIframeUrl] = useState('');
  const iframeRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Convert YouTube URL to embed format
  useEffect(() => {
    if (!videoUrl) return;

    let embedUrl = videoUrl;
    
    // Handle YouTube URLs
    if (videoUrl.includes('youtube.com/watch')) {
      const videoId = videoUrl.split('v=')[1]?.split('&')[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
      }
    } else if (videoUrl.includes('youtu.be/')) {
      const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
      }
    } else if (videoUrl.includes('youtube.com/embed')) {
      embedUrl = videoUrl.includes('?') ? `${videoUrl}&enablejsapi=1` : `${videoUrl}?enablejsapi=1`;
    }

    setIframeUrl(embedUrl);
  }, [videoUrl]);

  const handlePlay = () => {
    setShowOverlay(false);
    if (onPlay) onPlay();

    // Start tracking progress (approximate, since we can't directly access YouTube player API without react-player)
    if (onProgress) {
      progressIntervalRef.current = setInterval(() => {
        // Approximate progress tracking - increment by 1 second
        // In a real implementation, you'd use YouTube IFrame API
        if (onProgress) {
          onProgress({
            playedSeconds: Date.now() / 1000, // Approximate
            played: 0,
            loadedSeconds: 0,
            loaded: 0
          });
        }
      }, 1000);
    }
  };

  const handleOverlayClick = () => {
    handlePlay();
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  if (!videoUrl || !iframeUrl) {
    return (
      <div className="aspect-[16/9] bg-gray-900 flex items-center justify-center">
        <p className="text-white">No video available</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] bg-black">
      {/* Video iframe */}
      <div className="absolute inset-0">
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          allowFullScreen
          allow="autoplay; encrypted-media"
          className="w-full h-full"
          style={{ pointerEvents: showOverlay ? 'none' : 'auto' }}
        />
      </div>

      {/* Overlay with Play Button and Mask */}
      {showOverlay && (
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10 cursor-pointer"
          onClick={handleOverlayClick}
        >
          {/* Play Button */}
          <div className="bg-white/20 backdrop-blur-md rounded-full p-8 hover:bg-white/30 transition-all hover:scale-110">
            <svg
              className="w-20 h-20 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          
          {/* Mask Layer - prevents interaction with iframe */}
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

