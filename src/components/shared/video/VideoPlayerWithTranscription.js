/**
 * Video Player with Transcription Component
 * 
 * Video player component with integrated real-time transcription.
 * Supports YouTube, Vimeo, and direct video URLs.
 * Syncs transcription with video playback and highlights active lines.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import TranscriptionEditor from '@/components/shared/transcription/TranscriptionEditor';
import { normalizeVideoUrl, extractYouTubeId, extractVimeoId } from '@/lib/course/transformers';
import { VIDEO_URL_TYPES } from '@/lib/course/constants';

const VideoPlayerWithTranscription = ({
  videoUrl,
  transcript = '',
  onTranscriptUpdate,
  language = 'en-US',
  readOnly = false,
  className = '',
}) => {
  const [videoData, setVideoData] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptData, setTranscriptData] = useState([]);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // Normalize video URL
  useEffect(() => {
    if (videoUrl) {
      const normalized = normalizeVideoUrl(videoUrl);
      setVideoData(normalized);
    }
  }, [videoUrl]);

  // Parse transcript
  useEffect(() => {
    if (transcript) {
      if (typeof transcript === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(transcript);
          if (Array.isArray(parsed)) {
            setTranscriptData(parsed);
          } else {
            // Split by lines
            const lines = transcript
              .split(/\n/)
              .filter((line) => line.trim())
              .map((text, index) => ({
                id: `line-${index}`,
                text: text.trim(),
                timestamp: index * 5, // Approximate
                isFinal: true,
              }));
            setTranscriptData(lines);
          }
        } catch {
          // Not JSON, treat as plain text
          const lines = transcript
            .split(/\n/)
            .filter((line) => line.trim())
            .map((text, index) => ({
              id: `line-${index}`,
              text: text.trim(),
              timestamp: index * 5,
              isFinal: true,
            }));
          setTranscriptData(lines);
        }
      } else if (Array.isArray(transcript)) {
        setTranscriptData(transcript);
      }
    } else {
      setTranscriptData([]);
    }
  }, [transcript]);

  // Handle time updates for direct video
  useEffect(() => {
    if (videoRef.current && videoData?.type === VIDEO_URL_TYPES.DIRECT) {
      const video = videoRef.current;

      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [videoData]);

  // Handle timestamp click - seek to time
  const handleTimestampClick = (timestamp) => {
    if (videoData?.type === VIDEO_URL_TYPES.DIRECT && videoRef.current) {
      videoRef.current.currentTime = timestamp;
    } else if (videoData?.type === VIDEO_URL_TYPES.YOUTUBE && iframeRef.current) {
      // YouTube API would be needed for seeking
      // For now, we'll just log
      console.log('Seek to:', timestamp);
    } else if (videoData?.type === VIDEO_URL_TYPES.VIMEO && iframeRef.current) {
      // Vimeo API would be needed for seeking
      console.log('Seek to:', timestamp);
    }
  };

  // Handle transcript update
  const handleTranscriptUpdate = (fullText, transcriptArray) => {
    setTranscriptData(transcriptArray || []);
    if (onTranscriptUpdate) {
      onTranscriptUpdate(fullText, transcriptArray);
    }
  };

  if (!videoUrl || !videoData) {
    return (
      <div className={`p-8 text-center text-contentColor dark:text-contentColor-dark ${className}`}>
        <p>No video URL provided</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        {videoData.type === VIDEO_URL_TYPES.YOUTUBE && (
          <div className="aspect-[16/9]">
            <iframe
              ref={iframeRef}
              src={videoData.embedUrl}
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              className="w-full h-full"
              title="YouTube Video"
            />
          </div>
        )}

        {videoData.type === VIDEO_URL_TYPES.VIMEO && (
          <div className="aspect-[16/9]">
            <iframe
              ref={iframeRef}
              src={videoData.embedUrl}
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
              className="w-full h-full"
              title="Vimeo Video"
            />
          </div>
        )}

        {videoData.type === VIDEO_URL_TYPES.DIRECT && (
          <div className="aspect-[16/9]">
            <video
              ref={videoRef}
              src={videoData.url}
              controls
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {/* Video Info Overlay */}
        <div className="absolute top-0 left-0 w-full px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center justify-between text-white text-sm">
            <span className="font-semibold">Video Lesson</span>
            {videoData.type && (
              <span className="text-xs opacity-80 capitalize">
                {videoData.type}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transcription Editor */}
      <TranscriptionEditor
        transcript={transcriptData}
        currentTime={currentTime}
        onTranscriptUpdate={handleTranscriptUpdate}
        onTimestampClick={handleTimestampClick}
        language={language}
        readOnly={readOnly}
      />
    </div>
  );
};

export default VideoPlayerWithTranscription;

