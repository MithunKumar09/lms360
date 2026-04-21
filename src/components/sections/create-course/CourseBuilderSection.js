/**
 * Course Builder Section Component
 * 
 * Main component for building course structure (modules, chapters, lessons).
 * Integrates with course store for state management.
 */

'use client';

import React from 'react';
import ModuleBuilder from '@/components/shared/course-builder/ModuleBuilder';
import SortableContainer, { SortableItem } from '@/components/shared/course-builder/SortableContainer';
import { useCourseStore } from '@/store/index.js';

const CourseBuilderSection = ({ className = '' }) => {
  const { courseData, addModule, updateModule, deleteModule, reorderModules } = useCourseStore();

  // Handle add module
  const handleAddModule = () => {
    addModule();
  };

  // Handle update module
  const handleUpdateModule = (moduleId, moduleData) => {
    updateModule(moduleId, moduleData);
  };

  // Handle delete module
  const handleDeleteModule = (moduleId) => {
    if (window.confirm('Are you sure you want to delete this module and all its content?')) {
      deleteModule(moduleId);
    }
  };

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-headingColor dark:text-headingColor-dark mb-2">
          Course Structure
        </h3>
        <p className="text-sm text-contentColor dark:text-contentColor-dark">
          Build your course by adding modules, chapters, and lessons. Drag to reorder.
        </p>
      </div>

      {/* Modules List */}
      {courseData.modules && courseData.modules.length > 0 ? (
        <SortableContainer
          items={courseData.modules}
          onReorder={(newOrder) => {
            const moduleIds = newOrder.map((m) => m.id);
            reorderModules(moduleIds);
          }}
          className="space-y-5"
        >
          {courseData.modules.map((module, moduleIndex) => (
            <SortableItem key={module.id} id={module.id}>
              <ModuleBuilder
                module={module}
                moduleIndex={moduleIndex}
                onUpdate={(moduleData) => handleUpdateModule(module.id, moduleData)}
                onDelete={() => handleDeleteModule(module.id)}
              />
            </SortableItem>
          ))}
        </SortableContainer>
      ) : (
          <div className="text-center py-16 text-contentColor dark:text-contentColor-dark border-2 border-dashed border-borderColor dark:border-borderColor-dark rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-contentColor dark:text-contentColor-dark opacity-50 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <p className="mb-4 text-lg font-semibold">No modules yet</p>
            <p className="mb-6 text-sm opacity-80">
              Start building your course by adding your first module
            </p>
            <button
              type="button"
              onClick={handleAddModule}
              className="
                px-6 py-3
                bg-primaryColor text-whiteColor
                hover:bg-secondaryColor
                rounded-md
                transition-colors
                font-semibold
                text-base
              "
            >
              Add First Module
            </button>
          </div>
        )}

      {/* Add Module Button (when modules exist) */}
      {courseData.modules && courseData.modules.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleAddModule}
            className="
              w-full px-6 py-3
              bg-whiteColor dark:bg-whiteColor-dark
              border-2 border-dashed border-primaryColor
              text-primaryColor
              hover:bg-primaryColor hover:text-whiteColor
              rounded-md
              transition-colors
              font-semibold
              text-base
            "
          >
            + Add Another Module
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseBuilderSection;

