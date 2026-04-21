/**
 * Course Access Control Main Component
 * 
 * Superadmin only - Controls admin read/write permissions
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import ToggleSwitch from "@/components/shared/course-settings/ToggleSwitch";
import ButtonPrimary from "@/components/shared/buttons/ButtonPrimary";
import useSweetAlert from "@/hooks/useSweetAlert";

const CourseAccessControlMain = () => {
  const createAlert = useSweetAlert();
  
  // Hooks must be called unconditionally - call at top level
  const storeState = useCourseSettingsStore();
  
  // Safety check: ensure store state is valid and extract values safely
  const accessControl = (storeState?.accessControl && 
    typeof storeState.accessControl === 'object' && 
    !(storeState.accessControl instanceof Error) &&
    storeState.accessControl.constructor === Object)
    ? storeState.accessControl
    : {};
  
  const loading = (storeState?.loading && 
    typeof storeState.loading === 'object' && 
    !(storeState.loading instanceof Error) &&
    storeState.loading.constructor === Object)
    ? storeState.loading
    : { accessControl: false };
  
  const errors = (storeState?.errors && 
    typeof storeState.errors === 'object' && 
    !(storeState.errors instanceof Error) &&
    storeState.errors.constructor === Object)
    ? storeState.errors
    : { accessControl: null };
  
  const fetchAccessControl = (storeState?.fetchAccessControl && typeof storeState.fetchAccessControl === 'function')
    ? storeState.fetchAccessControl
    : (async () => {});
  
  const updateAccessControl = (storeState?.updateAccessControl && typeof storeState.updateAccessControl === 'function')
    ? storeState.updateAccessControl
    : (async () => {});

  // Initialize with default settings
  const getDefaultSettings = () => {
    const defaultSettings = {};
    const features = ['categories', 'subcategories', 'types', 'program_types', 'levels', 'skills', 'testimonials'];
    features.forEach((feature) => {
      defaultSettings[feature] = {
        read_access: false,
        write_access: false,
      };
    });
    return defaultSettings;
  };

  const [settings, setSettings] = useState(getDefaultSettings());
  const [saving, setSaving] = useState(false);
  const hasLoadedRef = useRef(false);

  // Load access control only once on mount
  useEffect(() => {
    // Prevent multiple calls
    if (hasLoadedRef.current) return;
    
    const loadAccessControl = async () => {
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      
      try {
        if (typeof fetchAccessControl === 'function') {
          await fetchAccessControl();
        }
      } catch (error) {
        // Error is handled by the store
        console.error('Failed to load access control:', error);
        hasLoadedRef.current = false; // Allow retry on error
      }
    };
    
    loadAccessControl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // Safety check: ensure accessControl is a valid object and not an Error
    try {
      if (
        accessControl && 
        typeof accessControl === 'object' && 
        !(accessControl instanceof Error) &&
        !accessControl.stack && // Error objects have stack property
        accessControl.constructor === Object && // Ensure it's a plain object
        Object.keys(accessControl).length > 0
      ) {
        // Validate that all values are objects with read_access and write_access
        const isValid = Object.values(accessControl).every(
          (val) => 
            val && 
            typeof val === 'object' && 
            typeof val.read_access === 'boolean' &&
            typeof val.write_access === 'boolean'
        );
        
        if (isValid) {
          setSettings(accessControl);
        } else {
          setSettings(getDefaultSettings());
        }
      } else {
        setSettings(getDefaultSettings());
      }
    } catch (error) {
      console.error('Error setting access control settings:', error);
      setSettings(getDefaultSettings());
    }
  }, [accessControl]);

  const handleToggle = (feature, type) => {
    setSettings((prev) => {
      // Safety check: ensure prev is a valid object
      if (!prev || typeof prev !== 'object' || prev instanceof Error) {
        const defaultSettings = getDefaultSettings();
        return {
          ...defaultSettings,
          [feature]: {
            ...defaultSettings[feature],
            [`${type}_access`]: !defaultSettings[feature][`${type}_access`],
          },
        };
      }
      
      const currentFeature = prev[feature] || {
        read_access: false,
        write_access: false,
      };
      
      return {
        ...prev,
        [feature]: {
          read_access: currentFeature.read_access || false,
          write_access: currentFeature.write_access || false,
          [`${type}_access`]: !currentFeature[`${type}_access`],
        },
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAccessControl(settings);
      createAlert("success", "Access control settings updated successfully");
      
      // Note: Cache is automatically cleared in the store's updateAccessControl function
      // This will trigger refetch in all manager components that watch cache timestamps
    } catch (error) {
      createAlert("error", error.message || "Failed to update access control");
    } finally {
      setSaving(false);
    }
  };

  const features = [
    { key: "categories", label: "Course Categories" },
    { key: "subcategories", label: "Subcategories" },
    { key: "types", label: "Course Types" },
    { key: "program_types", label: "Program Types" },
    { key: "levels", label: "Course Levels" },
    { key: "skills", label: "Course Skills" },
    { key: "testimonials", label: "Testimonials" },
  ];

  // Safety check: ensure loading.accessControl is a boolean
  const isLoading = typeof loading?.accessControl === 'boolean' ? loading.accessControl : false;
  
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <span className="text-contentColor dark:text-contentColor-dark">Loading...</span>
      </div>
    );
  }

  // Final safety check before render
  try {
    // Ensure all values are safe for rendering
    if (settings && typeof settings !== 'object') {
      setSettings(getDefaultSettings());
    }
  } catch (e) {
    console.error('Error in safety check:', e);
    // Reset to defaults if there's any issue
    if (typeof setSettings === 'function') {
      setSettings(getDefaultSettings());
    }
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Heading */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark">
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
          Course Access Control
        </h2>
        <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
          Control admin read/write permissions for course settings features
        </p>
      </div>

      {/* Access Control Table */}
      <div className="overflow-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-lightGrey5 dark:bg-whiteColor-dark border-b-2 border-borderColor dark:border-borderColor-dark">
              <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
                Feature
              </th>
              <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
                Read Access
              </th>
              <th className="px-5 py-3 font-semibold text-blackColor dark:text-blackColor-dark">
                Write Access
              </th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature, idx) => {
              // Safety check: ensure settings is a valid object
              const safeSettings = settings && typeof settings === 'object' && !(settings instanceof Error)
                ? settings
                : {};
              
              const featureSettings = safeSettings[feature.key] || {
                read_access: false,
                write_access: false,
              };
              
              // Ensure featureSettings has the required properties
              const readAccess = typeof featureSettings.read_access === 'boolean' 
                ? featureSettings.read_access 
                : false;
              const writeAccess = typeof featureSettings.write_access === 'boolean' 
                ? featureSettings.write_access 
                : false;
              
              return (
                <tr
                  key={feature.key}
                  className={`
                    leading-1.8 md:leading-1.8
                    ${idx % 2 === 0
                      ? "bg-whiteColor dark:bg-whiteColor-dark"
                      : "bg-lightGrey5 dark:bg-whiteColor-dark"
                    }
                  `}
                >
                  <td className="px-5 py-3 text-blackColor dark:text-blackColor-dark">
                    {feature.label}
                  </td>
                  <td className="px-5 py-3">
                    <ToggleSwitch
                      checked={readAccess}
                      onChange={() => handleToggle(feature.key, "read")}
                      disabled={saving}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <ToggleSwitch
                      checked={writeAccess}
                      onChange={() => handleToggle(feature.key, "write")}
                      disabled={saving || !readAccess}
                    />
                    {!readAccess && (
                      <p className="text-xs text-gray-500 mt-1">
                        Enable read access first
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <ButtonPrimary type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </ButtonPrimary>
      </div>

      {(() => {
        try {
          const errorValue = errors?.accessControl;
          if (!errorValue) return null;
          
          // Safely extract error message
          let errorMessage = 'An error occurred';
          if (typeof errorValue === 'string') {
            errorMessage = errorValue;
          } else if (errorValue && typeof errorValue === 'object') {
            if (errorValue.message && typeof errorValue.message === 'string') {
              errorMessage = errorValue.message;
            } else {
              errorMessage = String(errorValue);
            }
          } else {
            errorMessage = String(errorValue);
          }
          
          return (
            <div className="mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
              {errorMessage}
            </div>
          );
        } catch (e) {
          console.error('Error rendering error message:', e);
          return null;
        }
      })()}
    </div>
  );
};

export default CourseAccessControlMain;

