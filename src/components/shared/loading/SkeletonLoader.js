/**
 * Skeleton Loader Component
 * 
 * Skeleton loaders for form fields and content areas.
 */

'use client';

const SkeletonLoader = ({ type = 'text', variant = 'text', rows = 1, columns = 1, className = '' }) => {
  const baseClasses =
    'animate-pulse bg-gray-200 dark:bg-gray-700 rounded';

  // Table variant - renders proper <tr> elements for table rows
  if (type === 'table' || variant === 'table') {
    return (
      <>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex} className="border-top">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <td key={colIndex} className={`py-3 ${className}`}>
                <div className={`${baseClasses} h-4 w-full`}></div>
              </td>
            ))}
          </tr>
        ))}
      </>
    );
  }

  if (type === 'text') {
    return (
      <div
        className={`${baseClasses} h-4 w-full ${className}`}
        aria-label="Loading..."
      ></div>
    );
  }

  if (type === 'input') {
    return (
      <div
        className={`${baseClasses} h-10 w-full ${className}`}
        aria-label="Loading input..."
      ></div>
    );
  }

  if (type === 'textarea') {
    return (
      <div
        className={`${baseClasses} h-24 w-full ${className}`}
        aria-label="Loading textarea..."
      ></div>
    );
  }

  if (type === 'button') {
    return (
      <div
        className={`${baseClasses} h-10 w-24 ${className}`}
        aria-label="Loading button..."
      ></div>
    );
  }

  if (type === 'card') {
    return (
      <div
        className={`${baseClasses} h-48 w-full ${className}`}
        aria-label="Loading card..."
      ></div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      aria-label="Loading..."
    ></div>
  );
};

export default SkeletonLoader;
