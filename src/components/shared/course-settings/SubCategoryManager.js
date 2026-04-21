/**
 * SubCategory Manager Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import SubCategoryForm from "./SubCategoryForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const SubCategoryManager = () => {
  const createAlert = useSweetAlert();
  const {
    subcategories,
    categories,
    loading,
    errors,
    fetchSubcategories,
    fetchCategories,
    createSubcategory,
    updateSubcategory,
    deleteSubcategory,
    toggleSubcategoryStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track if cache was cleared
  const categoriesCacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.categories);
  const subcategoriesCacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.subcategories);
  const prevCategoriesCacheRef = useRef(categoriesCacheTimestamp);
  const prevSubcategoriesCacheRef = useRef(subcategoriesCacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const categoriesCacheCleared = prevCategoriesCacheRef.current !== null && categoriesCacheTimestamp === null;
    const subcategoriesCacheCleared = prevSubcategoriesCacheRef.current !== null && subcategoriesCacheTimestamp === null;
    
    if (!hasFetchedRef.current || categoriesCacheCleared || subcategoriesCacheCleared) {
      fetchCategories();
      fetchSubcategories();
      hasFetchedRef.current = true;
    }
    
    prevCategoriesCacheRef.current = categoriesCacheTimestamp;
    prevSubcategoriesCacheRef.current = subcategoriesCacheTimestamp;
  }, [fetchCategories, fetchSubcategories, categoriesCacheTimestamp, subcategoriesCacheTimestamp]);

  const handleCreate = async (data) => {
    try {
      await createSubcategory(data);
      createAlert("success", "SubCategory created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create subcategory");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateSubcategory(editingItem.id, data);
      createAlert("success", "SubCategory updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update subcategory");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this subcategory?")) {
      try {
        await deleteSubcategory(id);
        createAlert("success", "SubCategory deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete subcategory");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleSubcategoryStatus(id);
      createAlert("success", "SubCategory status updated");
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

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "-";
  };

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "category_id",
      label: "Parent Category",
      render: (row) => getCategoryName(row.category_id),
    },
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
          {editingItem ? "Edit SubCategory" : "Add New SubCategory"}
        </h3>
        <SubCategoryForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.subcategories}
          errors={errors.subcategories || {}}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            SubCategories
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
          data={subcategories}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.subcategories}
          emptyMessage="No subcategories found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default SubCategoryManager;

