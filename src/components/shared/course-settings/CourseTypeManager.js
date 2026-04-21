/**
 * Course Type Manager Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import CourseTypeForm from "./CourseTypeForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const CourseTypeManager = () => {
  const createAlert = useSweetAlert();
  const {
    courseTypes,
    loading,
    errors,
    fetchCourseTypes,
    createCourseType,
    updateCourseType,
    deleteCourseType,
    toggleCourseTypeStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track if cache was cleared
  const cacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.courseTypes);
  const prevCacheTimestampRef = useRef(cacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const cacheWasCleared = prevCacheTimestampRef.current !== null && cacheTimestamp === null;
    
    if (!hasFetchedRef.current || cacheWasCleared) {
      fetchCourseTypes();
      hasFetchedRef.current = true;
    }
    
    prevCacheTimestampRef.current = cacheTimestamp;
  }, [fetchCourseTypes, cacheTimestamp]);

  const handleCreate = async (data) => {
    try {
      await createCourseType(data);
      createAlert("success", "Course Type created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create course type");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateCourseType(editingItem.id, data);
      createAlert("success", "Course Type updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update course type");
    }
  };

  const handleDelete = async (id) => {
    const item = courseTypes.find((type) => type.id === id);
    if (item?.fixed === 1) {
      createAlert("error", "System default types cannot be deleted");
      return;
    }
    if (window.confirm("Are you sure you want to delete this course type?")) {
      try {
        await deleteCourseType(id);
        createAlert("success", "Course Type deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete course type");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleCourseTypeStatus(id);
      createAlert("success", "Course Type status updated");
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
      key: "fixed",
      label: "Type",
      render: (row) => (
        <span
          className={`
            px-2 py-1 rounded text-xs font-semibold
            ${row.fixed === 1
              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }
          `}
        >
          {row.fixed === 1 ? "System Default" : "Custom"}
        </span>
      ),
    },
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
          {editingItem ? "Edit Course Type" : "Add New Course Type"}
        </h3>
        <CourseTypeForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.courseTypes}
          errors={errors.courseTypes || {}}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Course Types
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
          data={courseTypes}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.courseTypes}
          emptyMessage="No course types found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default CourseTypeManager;

