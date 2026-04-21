"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";

/**
 * MaterialCard Component
 * 
 * Displays a single material card with basic information.
 * 
 * @param {Object} props
 * @param {Object} props.material - Material object
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onEdit - Edit handler (optional)
 * @param {Function} props.onDelete - Delete handler (optional)
 */
export default function MaterialCard({ material, onClick, onEdit, onDelete }) {
  const categoryIcons = {
    document: 'icofont-file-pdf',
    video: 'icofont-film',
    link: 'icofont-link',
    other: 'icofont-file-alt',
  };

  const categoryColors = {
    document: 'text-red-600 dark:text-red-400',
    video: 'text-purple-600 dark:text-purple-400',
    link: 'text-blue-600 dark:text-blue-400',
    other: 'text-gray-600 dark:text-gray-400',
  };

  const getMaterialUrl = () => {
    return material.fileUrl || material.externalUrl || '#';
  };

  const isExternalLink = !!material.externalUrl;

  return (
    <div
      className={`p-4 bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0">
            <i className={`${categoryIcons[material.category] || categoryIcons.other} text-2xl ${categoryColors[material.category] || categoryColors.other}`}></i>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-1 truncate">
              {material.title}
            </h3>
            {material.description && (
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-2 line-clamp-2">
                {material.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-contentColor dark:text-contentColor-dark flex-wrap">
              {material.category && (
                <span className="capitalize">{material.category}</span>
              )}
              <span>•</span>
              <span>
                {material.createdAt
                  ? formatDistanceToNow(new Date(material.createdAt), { addSuffix: true })
                  : ''}
              </span>
              {material.student && (
                <>
                  <span>•</span>
                  <span>
                    {material.student.firstName || material.student.first_name}{' '}
                    {material.student.lastName || material.student.last_name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions & Link */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <a
            href={getMaterialUrl()}
            target={isExternalLink ? '_blank' : '_self'}
            rel="noopener noreferrer"
            className="p-2 text-primaryColor hover:bg-primaryColor/10 rounded transition-colors"
            aria-label="View material"
          >
            <i className="icofont-external-link"></i>
          </a>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-primaryColor hover:bg-primaryColor/10 rounded transition-colors"
              aria-label="Edit material"
            >
              <i className="icofont-edit"></i>
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
              aria-label="Delete material"
            >
              <i className="icofont-trash"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
