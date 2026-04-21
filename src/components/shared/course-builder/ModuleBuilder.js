/**
 * Module Builder Component
 * 
 * Component for creating and editing modules.
 * Modules contain chapters, which contain lessons.
 */

'use client';

import React, { useState, useEffect } from 'react';
import ChapterBuilder from './ChapterBuilder';
import SortableContainer, { SortableItem } from './SortableContainer';
import { useCourseStore } from '@/store/index.js';

const ModuleBuilder = ({
  module,
  moduleIndex = 0,
  onUpdate,
  onDelete,
  className = '',
}) => {
  const { addChapter, updateChapter, deleteChapter, reorderChapters } = useCourseStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: module?.title || '',
    description: module?.description || '',
  });

  // Update form data when module changes
  useEffect(() => {
    if (module) {
      setFormData({
        title: module.title || '',
        description: module.description || '',
      });
    }
  }, [module]);

  // Handle field change
  const handleChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Update module in store
    if (onUpdate) {
      onUpdate({
        ...module,
        ...newFormData,
      });
    }
  };

  // Handle add chapter
  const handleAddChapter = () => {
    const chapterId = addChapter(module.id);
    if (chapterId) {
      setIsExpanded(true); // Expand to show new chapter
    }
  };

  // Handle update chapter
  const handleUpdateChapter = (chapterId, chapterData) => {
    updateChapter(module.id, chapterId, chapterData);
  };

  // Handle delete chapter
  const handleDeleteChapter = (chapterId) => {
    if (window.confirm('Are you sure you want to delete this chapter and all its lessons?')) {
      deleteChapter(module.id, chapterId);
    }
  };

  // Handle delete module
  const handleDelete = () => {
    const totalChapters = module.chapters?.length || 0;
    const totalLessons = module.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 0;
    
    if (totalChapters > 0 || totalLessons > 0) {
      if (!window.confirm(
        `This module contains ${totalChapters} chapter(s) and ${totalLessons} lesson(s). ` +
        `Are you sure you want to delete it?`
      )) {
        return;
      }
    }
    if (onDelete) {
      onDelete();
    }
  };

  // Calculate total lessons in module
  const totalLessons = module.chapters?.reduce(
    (sum, chapter) => sum + (chapter.lessons?.length || 0),
    0
  ) || 0;

  return (
    <div 
      className={`border-2 border-borderColor dark:border-borderColor-dark rounded-lg mb-5 ${className}`}
      data-module-index={moduleIndex}
    >
      {/* Module Header */}
      <div
        className="
          px-5 py-4
          bg-whiteColor dark:bg-whiteColor-dark
          border-b-2 border-borderColor dark:border-borderColor-dark
          flex items-center justify-between
          cursor-pointer
          hover:bg-gray-50 dark:hover:bg-gray-800
          transition-colors
          rounded-t-lg
        "
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0">
            <svg
              className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
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
            <h2 className="text-lg font-bold text-headingColor dark:text-headingColor-dark truncate">
              {formData.title || 'Untitled Module'}
            </h2>
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              {module.chapters?.length || 0} chapter(s) • {totalLessons} lesson(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAddChapter();
            }}
            className="
              px-4 py-2 text-sm font-semibold
              bg-primaryColor text-whiteColor
              hover:bg-secondaryColor
              rounded-md
              transition-colors
            "
            title="Add chapter"
          >
            + Chapter
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
            title="Delete module"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Module Content */}
      {isExpanded && (
        <div className="p-5 bg-whiteColor dark:bg-whiteColor-dark space-y-4 rounded-b-lg">
          {/* Title */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark">
              Module Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Enter module title"
              data-module-index={moduleIndex}
              data-field="module-title"
              className="
                w-full px-4 py-2.5
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
              placeholder="Enter module description"
              rows={3}
              className="
                w-full px-4 py-2.5
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

          {/* Chapters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-headingColor dark:text-headingColor-dark">
                Chapters ({module.chapters?.length || 0})
              </label>
            </div>
            {module.chapters && module.chapters.length > 0 ? (
              <SortableContainer
                items={module.chapters}
                onReorder={(newOrder) => {
                  const chapterIds = newOrder.map((ch) => ch.id);
                  reorderChapters(module.id, chapterIds);
                }}
                className="space-y-4"
              >
                {module.chapters.map((chapter, chapterIndex) => (
                  <SortableItem key={chapter.id} id={chapter.id}>
                    <ChapterBuilder
                      moduleId={module.id}
                      chapter={chapter}
                      moduleIndex={moduleIndex}
                      chapterIndex={chapterIndex}
                      onUpdate={(chapterData) => handleUpdateChapter(chapter.id, chapterData)}
                      onDelete={() => handleDeleteChapter(chapter.id)}
                    />
                  </SortableItem>
                ))}
              </SortableContainer>
            ) : (
                <div className="text-center py-12 text-contentColor dark:text-contentColor-dark border-2 border-dashed border-borderColor dark:border-borderColor-dark rounded-md">
                  <p className="mb-3">No chapters yet</p>
                  <button
                    type="button"
                    onClick={handleAddChapter}
                    className="
                      px-6 py-2.5
                      bg-primaryColor text-whiteColor
                      hover:bg-secondaryColor
                      rounded-md
                      transition-colors
                      font-semibold
                    "
                  >
                    Add First Chapter
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleBuilder;

