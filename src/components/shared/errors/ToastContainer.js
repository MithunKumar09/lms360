/**
 * Toast Container Component
 * 
 * Container for displaying multiple toast notifications.
 */

'use client';

import ToastNotification from './ToastNotification.js';

const ToastContainer = ({ toasts, onRemove, position = 'top-right' }) => {
  return (
    <div className="fixed z-50 pointer-events-none" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            position={position}
            onClose={() => onRemove(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;

