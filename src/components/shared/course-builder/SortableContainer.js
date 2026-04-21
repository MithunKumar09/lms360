/**
 * Sortable Container Component
 * 
 * Wrapper component for drag-and-drop functionality using @dnd-kit.
 * Provides sortable functionality for modules, chapters, and lessons.
 */

'use client';

import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Sortable Item Component
 * Wraps an item to make it sortable
 */
export const SortableItem = ({ id, children, disabled = false, showDragHandle = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      {showDragHandle && !disabled && (
        <div
          {...listeners}
          className="
            absolute left-2 top-1/2 -translate-y-1/2 z-10
            p-2 cursor-grab active:cursor-grabbing
            text-contentColor dark:text-contentColor-dark
            hover:text-primaryColor
            opacity-60 hover:opacity-100
            transition-opacity
          "
          title="Drag to reorder"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>
      )}
      <div className={showDragHandle ? 'pl-10' : ''}>{children}</div>
    </div>
  );
};

/**
 * Sortable Container Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.items - Array of items with id property
 * @param {Function} props.onReorder - Reorder handler (newOrder) => void
 * @param {React.ReactNode} props.children - Child components
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Disable drag-and-drop
 * @returns {JSX.Element} SortableContainer component
 */
const SortableContainer = ({
  items = [],
  onReorder,
  children,
  className = '',
  disabled = false,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(items, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const itemIds = items.map((item) => item.id || item);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={itemIds}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  );
};

export default SortableContainer;

