/**
 * Category Manager Component
 * 
 * Manages categories with form and table
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import CategoryForm from "./CategoryForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const CategoryManager = () => {
  const createAlert = useSweetAlert();
  const {
    categories,
    loading,
    errors,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track if cache was cleared (null timestamp means cache was cleared)
  const cacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.categories);
  const prevCacheTimestampRef = useRef(cacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch if:
    // 1. First mount (hasFetchedRef.current is false)
    // 2. Cache was cleared (timestamp changed from a value to null)
    const cacheWasCleared = prevCacheTimestampRef.current !== null && cacheTimestamp === null;
    
    if (!hasFetchedRef.current || cacheWasCleared) {
      fetchCategories();
      hasFetchedRef.current = true;
    }
    
    // Update ref for next comparison
    prevCacheTimestampRef.current = cacheTimestamp;
  }, [fetchCategories, cacheTimestamp]); // Only refetch when cache is actually cleared

  const handleCreate = async (data) => {
    try {
      await createCategory(data);
      createAlert("success", "Category created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create category");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateCategory(editingItem.id, data);
      createAlert("success", "Category updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update category");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await deleteCategory(id);
        createAlert("success", "Category deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete category");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleCategoryStatus(id);
      createAlert("success", "Category status updated");
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
      key: "description",
      label: "Description",
      render: (row) => (
        <span className="truncate max-w-xs">
          {row.description || "-"}
        </span>
      ),
    },
    {
      key: "thumbnail_url",
      label: "Thumbnail",
      render: (row) =>
        row.thumbnail_url ? (
          <img
            src={row.thumbnail_url}
            alt={row.name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          "-"
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
          {editingItem ? "Edit Category" : "Add New Category"}
        </h3>
        <CategoryForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.categories}
          errors={errors.categories || {}}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Categories
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
          data={categories}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.categories}
          emptyMessage="No categories found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default CategoryManager;

