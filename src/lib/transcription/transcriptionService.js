/**
 * Transcription Service
 * 
 * Handles real-time speech-to-text transcription using Web Speech API.
 * Provides transcription management, timestamp synchronization, and manual editing.
 */

/**
 * Transcription Service Class
 */
class TranscriptionService {
  constructor() {
    this.recognition = null;
    this.isTranscribing = false;
    this.transcript = [];
    this.onTranscriptUpdate = null;
    this.onError = null;
    this.startTime = null;
    this.currentTimestamp = 0;
  }

  /**
   * Initialize Web Speech API recognition
   * @param {string} language - Language code (e.g., 'en-US', 'es-ES')
   * @returns {boolean} Whether recognition is available
   */
  initialize(language = 'en-US') {
    if (typeof window === 'undefined') {
      return false;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser');
      return false;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    this.recognition.maxAlternatives = 1;

    // Event handlers
    this.recognition.onstart = () => {
      this.isTranscribing = true;
      this.startTime = Date.now();
    };

    this.recognition.onresult = (event) => {
      const currentTranscript = [];
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;

        if (isFinal) {
          const timestamp = this.getCurrentTimestamp();
          currentTranscript.push({
            text: transcript,
            timestamp,
            isFinal: true,
            id: `transcript-${Date.now()}-${i}`,
          });
        } else {
          interimTranscript += transcript;
        }
      }

      if (currentTranscript.length > 0) {
        this.transcript = [...this.transcript, ...currentTranscript];
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate([...this.transcript], interimTranscript);
        }
      } else if (interimTranscript) {
        if (this.onTranscriptUpdate) {
          this.onTranscriptUpdate([...this.transcript], interimTranscript);
        }
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isTranscribing = false;
      
      // Handle specific error types
      if (event.error === 'no-speech') {
        // No speech detected - might restart automatically
        console.log('No speech detected, will retry...');
        // Don't call onError for no-speech as it might restart
        return;
      } else if (event.error === 'aborted') {
        // User or system aborted - normal
        console.log('Transcription aborted');
        if (this.onError) {
          this.onError('aborted');
        }
        return;
      } else if (event.error === 'audio-capture') {
        // No microphone found
        console.error('No microphone found');
        if (this.onError) {
          this.onError('audio-capture');
        }
        return;
      } else if (event.error === 'not-allowed') {
        // Permission denied
        console.error('Microphone permission denied');
        if (this.onError) {
          this.onError('not-allowed');
        }
        return;
      }
      
      // For other errors, call the error handler
      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('Transcription ended');
      const wasTranscribing = this.isTranscribing;
      this.isTranscribing = false;
      
      // If it ended immediately after starting, there might be an issue
      if (wasTranscribing && this.startTime) {
        const duration = (Date.now() - this.startTime) / 1000;
        if (duration < 1) {
          console.warn('Transcription ended immediately after starting (duration:', duration, 's)');
          // Log but don't show error - browser handles permissions
        }
      }
      
      // Notify callback that transcription ended
      if (this.onTranscriptUpdate) {
        // Keep the transcript but mark as stopped
        this.onTranscriptUpdate([...this.transcript], '');
      }
    };

    return true;
  }

  /**
   * Get current timestamp relative to start
   * @returns {number} Timestamp in seconds
   */
  getCurrentTimestamp() {
    if (!this.startTime) {
      return 0;
    }
    return (Date.now() - this.startTime) / 1000;
  }

  /**
   * Start transcription
   * @param {Function} onUpdate - Callback for transcript updates
   * @param {Function} onError - Callback for errors
   */
  start(onUpdate, onError) {
    if (!this.recognition) {
      const initialized = this.initialize();
      if (!initialized) {
        if (onError) {
          onError('Speech recognition not available');
        }
        return;
      }
    }

    if (this.isTranscribing) {
      console.log('Already transcribing, skipping start');
      return;
    }

    this.onTranscriptUpdate = onUpdate;
    this.onError = onError;
    this.transcript = [];
    this.startTime = Date.now();

    try {
      // Check if recognition is already running (some browsers don't throw error)
      if (this.recognition && this.recognition.state) {
        if (this.recognition.state === 'listening' || this.recognition.state === 'starting') {
          console.log('Recognition already in progress');
          return;
        }
      }
      
      this.recognition.start();
      // Note: isTranscribing will be set to true in onstart event
    } catch (error) {
      console.error('Error starting recognition:', error);
      this.isTranscribing = false;
      
      // Handle specific error cases
      if (error.name === 'InvalidStateError' || error.message?.includes('already started')) {
        // Recognition already running - this is okay, just update state
        console.log('Recognition already started, updating state');
        this.isTranscribing = true;
        return;
      }
      
      if (onError) {
        onError(error.message || 'Failed to start transcription');
      }
    }
  }

  /**
   * Stop transcription
   */
  stop() {
    if (this.recognition && this.isTranscribing) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    this.isTranscribing = false;
  }

  /**
   * Pause transcription
   */
  pause() {
    if (this.recognition && this.isTranscribing) {
      this.recognition.stop();
    }
  }

  /**
   * Resume transcription
   */
  resume() {
    if (this.recognition && !this.isTranscribing) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Error resuming recognition:', error);
      }
    }
  }

  /**
   * Clear transcript
   */
  clear() {
    this.transcript = [];
    this.startTime = null;
    this.currentTimestamp = 0;
  }

  /**
   * Get full transcript text
   * @returns {string} Full transcript
   */
  getFullTranscript() {
    return this.transcript
      .filter((item) => item.isFinal)
      .map((item) => item.text)
      .join(' ');
  }

  /**
   * Get transcript with timestamps
   * @returns {Array} Transcript array with timestamps
   */
  getTranscriptWithTimestamps() {
    return this.transcript.filter((item) => item.isFinal);
  }

  /**
   * Check if Web Speech API is available
   * @returns {boolean} Whether API is available
   */
  static isAvailable() {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(
      window.SpeechRecognition || window.webkitSpeechRecognition
    );
  }

  /**
   * Get supported languages
   * @returns {Array} Array of language codes
   */
  static getSupportedLanguages() {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'ar-SA', name: 'Arabic' },
      { code: 'hi-IN', name: 'Hindi' },
      { code: 'ru-RU', name: 'Russian' },
    ];
  }
}

// Create singleton instance
let transcriptionServiceInstance = null;

/**
 * Get transcription service instance
 * @returns {TranscriptionService} Service instance
 */
export const getTranscriptionService = () => {
  if (!transcriptionServiceInstance) {
    transcriptionServiceInstance = new TranscriptionService();
  }
  return transcriptionServiceInstance;
};

/**
 * Check if transcription is available
 * @returns {boolean} Whether transcription is available
 */
export const isTranscriptionAvailable = () => {
  return TranscriptionService.isAvailable();
};

/**
 * Get supported languages
 * @returns {Array} Supported languages
 */
export const getSupportedLanguages = () => {
  return TranscriptionService.getSupportedLanguages();
};

export default TranscriptionService;

