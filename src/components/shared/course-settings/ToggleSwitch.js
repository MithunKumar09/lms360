/**
 * Toggle Switch Component
 * 
 * A toggle switch for active/inactive status
 */

"use client";

const ToggleSwitch = ({ checked, onChange, disabled = false, label = "" }) => {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-sm text-contentColor dark:text-contentColor-dark">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${checked ? 'bg-primaryColor' : 'bg-gray-300 dark:bg-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
};

export default ToggleSwitch;

