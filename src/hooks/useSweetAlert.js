"use client";

import Swal from "sweetalert2";

const useSweetAlert = () => {
  const createAlert = (typeOrOptions, message) => {
    // Support both formats: createAlert({ icon, title, text }) or createAlert(type, message)
    if (typeof typeOrOptions === 'object' && typeOrOptions !== null) {
      // Object format: { icon, title, text, ... }
      const options = typeOrOptions;
      
      // If it's a confirmation dialog (has showCancelButton), use regular Swal
      if (options.showCancelButton || options.showDenyButton) {
        return Swal.fire({
          ...options,
          customClass: "z-xxxl",
        });
      }
      
      // Otherwise, use toast format
      const Toast = Swal.mixin({
        toast: true,
        position: "bottom-start",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        },
      });
      
      // For toast, combine title and text into title
      const toastTitle = options.text 
        ? `${options.title || ''}${options.title && options.text ? ': ' : ''}${options.text}`
        : options.title || '';
      
      return Toast.fire({
        customClass: "z-xxxl",
        icon: options.icon || 'info',
        title: toastTitle,
      });
    } else {
      // Legacy format: createAlert(type, message)
      const Toast = Swal.mixin({
        toast: true,
        position: "bottom-start",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.onmouseenter = Swal.stopTimer;
          toast.onmouseleave = Swal.resumeTimer;
        },
      });
      return Toast.fire({
        customClass: "z-xxxl",
        icon: typeOrOptions,
        title: message,
      });
    }
  };
  return createAlert;
};

export default useSweetAlert;
