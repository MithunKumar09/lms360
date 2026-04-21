/**
 * Course Level Manager Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import CourseLevelForm from "./CourseLevelForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const CourseLevelManager = () => {
  const createAlert = useSweetAlert();
  const {
    courseLevels,
    loading,
    errors,
    fetchCourseLevels,
    createCourseLevel,
    updateCourseLevel,
    deleteCourseLevel,
    toggleCourseLevelStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track if cache was cleared
  const cacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.courseLevels);
  const prevCacheTimestampRef = useRef(cacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const cacheWasCleared = prevCacheTimestampRef.current !== null && cacheTimestamp === null;
    
    if (!hasFetchedRef.current || cacheWasCleared) {
      fetchCourseLevels();
      hasFetchedRef.current = true;
    }
    
    prevCacheTimestampRef.current = cacheTimestamp;
  }, [fetchCourseLevels, cacheTimestamp]);

  const handleCreate = async (data) => {
    try {
      await createCourseLevel(data);
      createAlert("success", "Course Level created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create course level");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateCourseLevel(editingItem.id, data);
      createAlert("success", "Course Level updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update course level");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course level?")) {
      try {
        await deleteCourseLevel(id);
        createAlert("success", "Course Level deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete course level");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleCourseLevelStatus(id);
      createAlert("success", "Course Level status updated");
    } catch (error) {
      createAlert("error", error.message || "Failed to update status");
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`
            px-2 py-1 rounded text-xs font-semibold
            ${row.status === 1
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }
          `}
        >
          {row.status === 1 ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
          {editingItem ? "Edit Course Level" : "Add New Course Level"}
        </h3>
        <CourseLevelForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.courseLevels}
          errors={errors.courseLevels || {}}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Course Levels
          </h3>
          {!showForm && (
            <button
              onClick={() => {
                setEditingItem(null);
                setShowForm(true);
              }}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-primaryColor text-whiteColor hover:bg-primaryColor/90"
            >
              Add New
            </button>
          )}
        </div>
        <SettingsTable
          data={courseLevels}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.courseLevels}
          emptyMessage="No course levels found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default CourseLevelManager;

