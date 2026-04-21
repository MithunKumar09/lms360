'use client';

import React, { useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

/**
 * RichTextEditor Component
 * 
 * A professional rich text editor component using React Quill.
 * Supports all standard formatting options including:
 * - Text formatting (bold, italic, underline, strikethrough)
 * - Headers (H1-H6)
 * - Lists (ordered, unordered)
 * - Links and images
 * - Text alignment
 * - Code blocks
 * - Text color and background color
 * - Clean formatting
 * 
 * @param {string} value - The HTML content value
 * @param {function} onChange - Callback when content changes (receives HTML string)
 * @param {string} placeholder - Placeholder text
 * @param {boolean} error - Whether to show error styling
 * @param {string} className - Additional CSS classes
 */
const RichTextEditor = React.forwardRef(({ 
  value = '', 
  onChange, 
  placeholder = 'Start typing...',
  error = false,
  className = ''
}, ref) => {
  const quillRef = useRef(null);

  // Configure the toolbar with all formatting options
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'script': 'sub'}, { 'script': 'super' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        [{ 'align': [] }],
        ['link', 'image', 'video'],
        ['blockquote', 'code-block'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false,
    },
  }), []);

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background',
    'align', 'direction',
    'code-block', 'script'
  ];

  // Handle content change
  const handleChange = (content) => {
    if (onChange) {
      onChange(content);
    }
  };

  return (
    <div className={`rich-text-editor-wrapper ${className}`}>
      <style jsx global>{`
        .rich-text-editor-wrapper .quill {
          background: white;
        }
        .dark .rich-text-editor-wrapper .quill {
          background: #1a1a1a;
        }
        .rich-text-editor-wrapper .ql-container {
          font-size: 14px;
          font-family: inherit;
          border-bottom-left-radius: 6px;
          border-bottom-right-radius: 6px;
          min-height: 200px;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 200px;
          color: inherit;
        }
        .dark .rich-text-editor-wrapper .ql-editor {
          color: #e5e5e5;
        }
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 6px;
          border-top-right-radius: 6px;
          border-bottom: 1px solid #ccc;
        }
        .dark .rich-text-editor-wrapper .ql-toolbar {
          background: #2a2a2a;
          border-color: #444;
        }
        .dark .rich-text-editor-wrapper .ql-stroke {
          stroke: #e5e5e5;
        }
        .dark .rich-text-editor-wrapper .ql-fill {
          fill: #e5e5e5;
        }
        .dark .rich-text-editor-wrapper .ql-picker-label {
          color: #e5e5e5;
        }
        .rich-text-editor-wrapper .ql-toolbar .ql-formats {
          margin-right: 8px;
        }
        ${error ? `
          .rich-text-editor-wrapper .ql-container,
          .rich-text-editor-wrapper .ql-toolbar {
            border-color: #ef4444 !important;
          }
        ` : ''}
      `}</style>
      <ReactQuill
        ref={ref || quillRef}
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        style={{
          border: error ? '2px solid #ef4444' : '2px solid #e5e7eb',
          borderRadius: '6px',
        }}
      />
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

