/**
 * Chapter Builder Component
 * 
 * Component for creating and editing chapters within modules.
 * Chapters contain lessons.
 */

'use client';

import React, { useState, useEffect } from 'react';
import LessonBuilder from './LessonBuilder';
import SortableContainer, { SortableItem } from './SortableContainer';
import { useCourseStore } from '@/store/index.js';

const ChapterBuilder = ({
  moduleId,
  chapter,
  moduleIndex = 0,
  chapterIndex = 0,
  onUpdate,
  onDelete,
  className = '',
}) => {
  const { addLesson, updateLesson, deleteLesson, reorderLessons } = useCourseStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: chapter?.title || '',
    description: chapter?.description || '',
  });

  // Update form data when chapter changes
  useEffect(() => {
    if (chapter) {
      setFormData({
        title: chapter.title || '',
        description: chapter.description || '',
      });
    }
  }, [chapter]);

  // Handle field change
  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Update chapter in store
    if (onUpdate) {
      onUpdate({
        ...chapter,
        ...newFormData,
      });
    }
  };

  // Handle add lesson
  const handleAddLesson = () => {
    const lessonId = addLesson(moduleId, chapter.id, 'video');
    if (lessonId) {
      setIsExpanded(true); // Expand to show new lesson
    }
  };

  // Handle update lesson
  const handleUpdateLesson = (lessonId, lessonData) => {
    updateLesson(moduleId, chapter.id, lessonId, lessonData);
  };

  // Handle delete lesson
  const handleDeleteLesson = (lessonId) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      deleteLesson(moduleId, chapter.id, lessonId);
    }
  };

  // Handle delete chapter
  const handleDelete = () => {
    if (chapter.lessons && chapter.lessons.length > 0) {
      if (!window.confirm(`This chapter contains ${chapter.lessons.length} lesson(s). Are you sure you want to delete it?`)) {
        return;
      }
    }
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div 
      className={`border border-borderColor dark:border-borderColor-dark rounded-md mb-4 ${className}`}
      data-module-index={moduleIndex}
      data-chapter-index={chapterIndex}
    >
      {/* Chapter Header */}
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
            <h3 className="font-semibold text-headingColor dark:text-headingColor-dark truncate">
              {formData.title || 'Untitled Chapter'}
            </h3>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              {chapter.lessons?.length || 0} lesson(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddLesson();
            }}
            className="
              px-3 py-1.5 text-sm
              bg-primaryColor text-whiteColor
              hover:bg-secondaryColor
              rounded-md
              transition-colors
            "
            title="Add lesson"
          >
            + Lesson
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            className="
              p-2
              text-red-600 dark:text-red-400
              hover:bg-red-50 dark:hover:bg-red-900/20
              rounded-md
              transition-colors
            "
            title="Delete chapter"
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
      </div>

      {/* Chapter Content */}
      {isExpanded && (
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark space-y-4">
          {/* Title */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
              Chapter Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter chapter title"
              data-module-index={moduleIndex}
              data-chapter-index={chapterIndex}
              data-field="chapter-title"
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
              placeholder="Enter chapter description"
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

          {/* Lessons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-headingColor dark:text-headingColor-dark">
                Lessons ({chapter.lessons?.length || 0})
              </label>
            </div>
            {chapter.lessons && chapter.lessons.length > 0 ? (
              <SortableContainer
                items={chapter.lessons}
                onReorder={(newOrder) => {
                  const lessonIds = newOrder.map((l) => l.id);
                  reorderLessons(moduleId, chapter.id, lessonIds);
                }}
                className="space-y-3"
              >
                {chapter.lessons.map((lesson, lessonIndex) => (
                  <SortableItem key={lesson.id} id={lesson.id}>
                    <LessonBuilder
                      moduleId={moduleId}
                      chapterId={chapter.id}
                      lesson={lesson}
                      moduleIndex={moduleIndex}
                      chapterIndex={chapterIndex}
                      lessonIndex={lessonIndex}
                      onUpdate={(lessonData) => handleUpdateLesson(lesson.id, lessonData)}
                      onDelete={() => handleDeleteLesson(lesson.id)}
                    />
                  </SortableItem>
                ))}
              </SortableContainer>
            ) : (
                <div className="text-center py-8 text-contentColor dark:text-contentColor-dark border-2 border-dashed border-borderColor dark:border-borderColor-dark rounded-md">
                  <p className="mb-2">No lessons yet</p>
                  <button
                    type="button"
                    onClick={handleAddLesson}
                    className="
                      px-4 py-2
                      bg-primaryColor text-whiteColor
                      hover:bg-secondaryColor
                      rounded-md
                      transition-colors
                    "
                  >
                    Add First Lesson
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterBuilder;

