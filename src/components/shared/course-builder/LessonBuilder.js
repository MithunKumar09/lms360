/**
 * Lesson Builder Component
 * 
 * Component for creating and editing lessons within chapters.
 * Supports different lesson types: Video, Text, Quiz, Assignment, Material
 */

'use client';

import React, { useState, useEffect } from 'react';
import LessonTypeSelector from './LessonTypeSelector';
import VideoPlayerWithTranscription from '@/components/shared/video/VideoPlayerWithTranscription';
import MediaUpload from '@/components/shared/forms/MediaUpload';
import { LESSON_TYPES } from '@/lib/course/constants';
import { useCourseStore } from '@/store/index.js';

const LessonBuilder = ({
  moduleId,
  chapterId,
  lesson,
  moduleIndex = 0,
  chapterIndex = 0,
  lessonIndex = 0,
  onUpdate,
  onDelete,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    type: lesson?.type || LESSON_TYPES.VIDEO,
    videoUrl: lesson?.videoUrl || '',
    content: lesson?.content || '',
    duration: lesson?.duration || 0,
    transcript: lesson?.transcript || '',
    materialUrl: lesson?.materialUrl || '',
  });

  // Update form data when lesson changes
  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title || '',
        description: lesson.description || '',
        type: lesson.type || LESSON_TYPES.VIDEO,
        videoUrl: lesson.videoUrl || '',
        content: lesson.content || '',
        duration: lesson.duration || 0,
        transcript: lesson.transcript || '',
        materialUrl: lesson.materialUrl || '',
      });
    }
  }, [lesson]);

  // Handle field change
  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Update lesson in store
    if (onUpdate) {
      onUpdate({
        ...lesson,
        ...newFormData,
      });
    }
  };

  // Handle delete
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      if (onDelete) {
        onDelete();
      }
    }
  };

  return (
    <div className={`border border-borderColor dark:border-borderColor-dark rounded-md mb-3 ${className}`}>
      {/* Lesson Header */}
      <div
        className="
          px-4 py-3
          bg-whiteColor dark:bg-whiteColor-dark
          border-b border-borderColor dark:border-borderColor-dark
          flex items-center justify-between
          cursor-pointer
          hover:bg-gray-50 dark:hover:bg-gray-800
          transition-colors
        "
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-headingColor dark:text-headingColor-dark truncate">
              {formData.title || 'Untitled Lesson'}
            </h4>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              {formData.type} {formData.duration > 0 && `• ${formData.duration} min`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="
            ml-2 p-2
            text-red-600 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            rounded-md
            transition-colors
          "
          title="Delete lesson"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Lesson Content */}
      {isExpanded && (
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark space-y-4">
          {/* Lesson Type */}
          <LessonTypeSelector
            value={formData.type}
            onChange={(value) => handleChange('type', value)}
            label="Lesson Type"
          />

          {/* Title */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
              Lesson Title *
            </label>
            <input
              type="text"
              value={formData.title}
              data-module-index={moduleIndex}
              data-chapter-index={chapterIndex}
              data-lesson-index={lessonIndex}
              data-field="lesson-title"
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter lesson title"
              className="
                w-full px-4 py-2
                bg-whiteColor dark:bg-whiteColor-dark
                border-2 border-borderColor dark:border-borderColor-dark
                rounded-md
                text-contentColor dark:text-contentColor-dark
                placeholder:text-placeholder placeholder:opacity-80
                focus:outline-none focus:ring-2 focus:ring-primaryColor
              "
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter lesson description"
              rows={3}
              className="
                w-full px-4 py-2
                bg-whiteColor dark:bg-whiteColor-dark
                border-2 border-borderColor dark:border-borderColor-dark
                rounded-md
                text-contentColor dark:text-contentColor-dark
                placeholder:text-placeholder placeholder:opacity-80
                focus:outline-none focus:ring-2 focus:ring-primaryColor
                resize-y
              "
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => handleChange('duration', parseFloat(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className="
                w-full px-4 py-2
                bg-whiteColor dark:bg-whiteColor-dark
                border-2 border-borderColor dark:border-borderColor-dark
                rounded-md
                text-contentColor dark:text-contentColor-dark
                placeholder:text-placeholder placeholder:opacity-80
                focus:outline-none focus:ring-2 focus:ring-primaryColor
              "
            />
          </div>

          {/* Type-specific fields */}
          {formData.type === LESSON_TYPES.VIDEO && (
            <>
              <div>
                <MediaUpload
                  value={formData.videoUrl || ''}
                  onChange={(url) => handleChange('videoUrl', url)}
                  label="Video URL *"
                  placeholder="https://www.youtube.com/watch?v=... or upload video file"
                  mediaType="video"
                  accept="video/*"
                  showPreview={false}
                />
              </div>

              {/* Video Player with Transcription */}
              {formData.videoUrl && (
                <div className="mt-4">
                  <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
                    Video Preview & Transcription
                  </label>
                  <VideoPlayerWithTranscription
                    videoUrl={formData.videoUrl}
                    transcript={formData.transcript}
                    onTranscriptUpdate={(fullText, transcriptArray) => {
                      handleChange('transcript', fullText);
                    }}
                    language="en-US"
                    readOnly={false}
                  />
                </div>
              )}
            </>
          )}

          {formData.type === LESSON_TYPES.TEXT && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => handleChange('content', e.target.value)}
                placeholder="Enter lesson content"
                rows={10}
                className="
                  w-full px-4 py-2
                  bg-whiteColor dark:bg-whiteColor-dark
                  border-2 border-borderColor dark:border-borderColor-dark
                  rounded-md
                  text-contentColor dark:text-contentColor-dark
                  placeholder:text-placeholder placeholder:opacity-80
                  focus:outline-none focus:ring-2 focus:ring-primaryColor
                  resize-y
                "
              />
            </div>
          )}

          {formData.type === LESSON_TYPES.QUIZ && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
                Quiz ID
              </label>
              <input
                type="text"
                value={formData.quizId || ''}
                onChange={(e) => handleChange('quizId', e.target.value)}
                placeholder="Enter quiz ID"
                className="
                  w-full px-4 py-2
                  bg-whiteColor dark:bg-whiteColor-dark
                  border-2 border-borderColor dark:border-borderColor-dark
                  rounded-md
                  text-contentColor dark:text-contentColor-dark
                  placeholder:text-placeholder placeholder:opacity-80
                  focus:outline-none focus:ring-2 focus:ring-primaryColor
                "
              />
              <p className="mt-1 text-xs text-contentColor dark:text-contentColor-dark">
                Link to an existing quiz
              </p>
            </div>
          )}

          {formData.type === LESSON_TYPES.ASSIGNMENT && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
                Assignment ID
              </label>
              <input
                type="text"
                value={formData.assignmentId || ''}
                onChange={(e) => handleChange('assignmentId', e.target.value)}
                placeholder="Enter assignment ID"
                className="
                  w-full px-4 py-2
                  bg-whiteColor dark:bg-whiteColor-dark
                  border-2 border-borderColor dark:border-borderColor-dark
                  rounded-md
                  text-contentColor dark:text-contentColor-dark
                  placeholder:text-placeholder placeholder:opacity-80
                  focus:outline-none focus:ring-2 focus:ring-primaryColor
                "
              />
              <p className="mt-1 text-xs text-contentColor dark:text-contentColor-dark">
                Link to an existing assignment
              </p>
            </div>
          )}

          {formData.type === LESSON_TYPES.MATERIAL && (
            <div>
              <MediaUpload
                value={formData.materialUrl || ''}
                onChange={(url) => handleChange('materialUrl', url)}
                label="Material URL"
                placeholder="https://... or upload PDF/document file"
                mediaType="file"
                accept=".pdf,.doc,.docx,.txt,.rtf"
                showPreview={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonBuilder;

