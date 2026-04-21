/**
 * Transcription Editor Component
 * 
 * Real-time transcription display with manual editing capability.
 * Highlights active line during video playback.
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import TranscriptionLine from './TranscriptionLine';
import { getTranscriptionService, isTranscriptionAvailable } from '@/lib/transcription/transcriptionService';

const TranscriptionEditor = ({
  transcript = [],
  currentTime = 0,
  onTranscriptUpdate,
  onTimestampClick,
  language = 'en-US',
  readOnly = false,
  className = '',
}) => {
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const transcriptEndRef = useRef(null);
  const activeLineRef = useRef(null);
  const serviceRef = useRef(null);

  // Check availability on mount
  useEffect(() => {
    setIsAvailable(isTranscriptionAvailable());
  }, []);

  // Initialize service
  useEffect(() => {
    if (isAvailable && !serviceRef.current) {
      serviceRef.current = getTranscriptionService();
      const initialized = serviceRef.current.initialize(language);
      if (!initialized) {
        console.error('Failed to initialize transcription service');
        setIsAvailable(false);
      }
    }
  }, [isAvailable, language]);

  // Sync component state with service state
  useEffect(() => {
    if (!serviceRef.current) return;
    
    const checkServiceState = () => {
      if (serviceRef.current) {
        const serviceIsTranscribing = serviceRef.current.isTranscribing;
        setIsTranscribing((prev) => {
          if (prev !== serviceIsTranscribing) {
            return serviceIsTranscribing;
          }
          return prev;
        });
      }
    };
    
    // Check state periodically (in case service state changes externally)
    const interval = setInterval(checkServiceState, 500);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Update transcript lines from prop
  useEffect(() => {
    if (transcript && transcript.length > 0) {
      // Parse transcript if it's a string
      if (typeof transcript === 'string') {
        // Split by lines or sentences
        const lines = transcript
          .split(/\n|\. |! |\? /)
          .filter((line) => line.trim())
          .map((text, index) => ({
            id: `line-${index}`,
            text: text.trim(),
            timestamp: (index * 5), // Approximate timestamps
            isFinal: true,
          }));
        setTranscriptLines(lines);
      } else if (Array.isArray(transcript)) {
        setTranscriptLines(transcript);
      }
    } else {
      setTranscriptLines([]);
    }
  }, [transcript]);

  // Scroll to active line
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  // Handle transcript update from service
  const handleTranscriptUpdate = useCallback(
    (finalTranscript, interim) => {
      setTranscriptLines(finalTranscript);
      setInterimText(interim);
      
      if (onTranscriptUpdate) {
        const fullText = finalTranscript
          .map((item) => item.text)
          .join(' ');
        onTranscriptUpdate(fullText, finalTranscript);
      }

      // Auto-scroll to bottom
      if (transcriptEndRef.current) {
        transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [onTranscriptUpdate]
  );

  // Handle error
  const handleError = useCallback((error) => {
    console.error('Transcription error:', error);
    setIsTranscribing(false);
    // Don't show alerts for permission-related errors - browser handles those
    // Only log errors for debugging
    if (error === 'aborted') {
      // User stopped or browser stopped - this is normal
      console.log('Transcription aborted');
    } else if (error === 'no-speech') {
      // No speech detected - might restart automatically
      console.log('No speech detected');
    } else {
      console.error('Transcription error:', error);
    }
  }, []);

  // Start transcription
  const handleStartTranscription = async (e) => {
    // Prevent any default behavior
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Check if already transcribing
    if (isTranscribing) {
      console.log('Already transcribing');
      return;
    }

    // Ensure service is initialized
    if (!serviceRef.current) {
      if (!isAvailable) {
        // Don't show alert - just log and return
        console.warn('Speech recognition is not available in your browser');
        return;
      }
      serviceRef.current = getTranscriptionService();
      const initialized = serviceRef.current.initialize(language);
      if (!initialized) {
        console.error('Failed to initialize transcription service');
        return;
      }
    }

    // Check if service is already transcribing
    if (serviceRef.current.isTranscribing) {
      console.log('Service is already transcribing');
      setIsTranscribing(true);
      return;
    }

    try {
      // Request microphone permission - browser will show native permission dialog
      // Don't catch permission errors here - let browser handle the prompt
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // This will trigger browser's native permission dialog
          await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('Microphone permission granted');
        } catch (permError) {
          // Browser's native dialog was shown and user denied or error occurred
          // Don't show custom alert - browser already handled it
          console.log('Microphone permission:', permError.name);
          setIsTranscribing(false);
          return;
        }
      }

      console.log('Starting transcription...');
      
      // Start transcription
      serviceRef.current.start(handleTranscriptUpdate, handleError);
      
      // Set state optimistically - it will be synced by the useEffect
      setIsTranscribing(true);
      
      // Verify transcription started after a short delay
      setTimeout(() => {
        if (serviceRef.current) {
          if (serviceRef.current.isTranscribing) {
            console.log('Transcription started successfully');
          } else {
            console.warn('Transcription did not start - service state:', serviceRef.current.isTranscribing);
            setIsTranscribing(false);
          }
        }
      }, 300);
    } catch (error) {
      console.error('Error starting transcription:', error);
      setIsTranscribing(false);
      // Don't show alert - let browser handle errors naturally
    }
  };

  // Stop transcription
  const handleStopTranscription = () => {
    if (serviceRef.current && isTranscribing) {
      serviceRef.current.stop();
      setIsTranscribing(false);
      setInterimText('');
    }
  };

  // Clear transcript
  const handleClear = () => {
    if (serviceRef.current) {
      serviceRef.current.clear();
    }
    setTranscriptLines([]);
    setInterimText('');
    if (onTranscriptUpdate) {
      onTranscriptUpdate('', []);
    }
  };

  // Find active line based on current time
  const getActiveLineIndex = () => {
    if (transcriptLines.length === 0) {
      return -1;
    }

    for (let i = transcriptLines.length - 1; i >= 0; i--) {
      if (transcriptLines[i].timestamp <= currentTime) {
        return i;
      }
    }
    return 0;
  };

  const activeLineIndex = getActiveLineIndex();

  // Handle manual edit
  const handleEditLine = (lineId, newText) => {
    const updatedLines = transcriptLines.map((line) =>
      line.id === lineId ? { ...line, text: newText } : line
    );
    setTranscriptLines(updatedLines);

    if (onTranscriptUpdate) {
      const fullText = updatedLines.map((item) => item.text).join(' ');
      onTranscriptUpdate(fullText, updatedLines);
    }
  };

  return (
    <div className={`bg-whiteColor dark:bg-whiteColor-dark rounded-md ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-borderColor dark:border-borderColor-dark flex items-center justify-between">
        <h4 className="font-semibold text-headingColor dark:text-headingColor-dark">
          Transcript
        </h4>
        {!readOnly && isAvailable && (
          <div className="flex items-center gap-2">
            {!isTranscribing ? (
              <button
                type="button"
                onClick={handleStartTranscription}
                className="
                  px-3 py-1.5 text-sm
                  bg-primaryColor text-whiteColor
                  hover:bg-secondaryColor
                  rounded-md
                  transition-colors
                  flex items-center gap-2
                "
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                Start Transcription
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopTranscription}
                className="
                  px-3 py-1.5 text-sm
                  bg-red-600 text-whiteColor
                  hover:bg-red-700
                  rounded-md
                  transition-colors
                  flex items-center gap-2
                "
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                    clipRule="evenodd"
                  />
                </svg>
                Stop
              </button>
            )}
            {transcriptLines.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="
                  px-3 py-1.5 text-sm
                  bg-whiteColor dark:bg-whiteColor-dark
                  border border-borderColor dark:border-borderColor-dark
                  text-contentColor dark:text-contentColor-dark
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  rounded-md
                  transition-colors
                "
              >
                Clear
              </button>
            )}
          </div>
        )}
        {!isAvailable && (
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            Transcription not available in this browser
          </p>
        )}
      </div>

      {/* Transcript Content */}
      <div
        className="
          max-h-96 overflow-y-auto
          p-4
          space-y-1
        "
      >
        {transcriptLines.length === 0 && !interimText && (
          <div className="text-center py-8 text-contentColor dark:text-contentColor-dark">
            <p className="mb-2">No transcript yet</p>
            {!readOnly && isAvailable && (
              <p className="text-sm opacity-70">
                Click &quot;Start Transcription&quot; to begin
              </p>
            )}
          </div>
        )}

        {transcriptLines.map((line, index) => {
          const isActive = index === activeLineIndex;
          return (
            <div
              key={line.id}
              ref={isActive ? activeLineRef : null}
            >
              <TranscriptionLine
                id={line.id}
                text={line.text}
                timestamp={line.timestamp}
                isActive={isActive}
                onClick={onTimestampClick}
              />
            </div>
          );
        })}

        {/* Interim text */}
        {interimText && (
          <TranscriptionLine
            id="interim"
            text={interimText}
            timestamp={currentTime}
            isInterim={true}
          />
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Status */}
      {isTranscribing && (
        <div className="px-4 py-2 border-t border-borderColor dark:border-borderColor-dark bg-primaryColor/10 dark:bg-primaryColor/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primaryColor rounded-full animate-pulse"></div>
            <span className="text-xs text-contentColor dark:text-contentColor-dark">
              Transcribing...
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptionEditor;

