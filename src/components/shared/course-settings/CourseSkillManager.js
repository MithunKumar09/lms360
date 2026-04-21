/**
 * Course Skill Manager Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import CourseSkillForm from "./CourseSkillForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const CourseSkillManager = () => {
  const createAlert = useSweetAlert();
  const {
    courseSkills,
    categories,
    subcategories,
    loading,
    errors,
    fetchCourseSkills,
    fetchCategories,
    fetchSubcategories,
    createCourseSkill,
    updateCourseSkill,
    deleteCourseSkill,
    toggleCourseSkillStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track if cache was cleared
  const categoriesCacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.categories);
  const subcategoriesCacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.subcategories);
  const courseSkillsCacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.courseSkills);
  const prevCategoriesCacheRef = useRef(categoriesCacheTimestamp);
  const prevSubcategoriesCacheRef = useRef(subcategoriesCacheTimestamp);
  const prevCourseSkillsCacheRef = useRef(courseSkillsCacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const categoriesCacheCleared = prevCategoriesCacheRef.current !== null && categoriesCacheTimestamp === null;
    const subcategoriesCacheCleared = prevSubcategoriesCacheRef.current !== null && subcategoriesCacheTimestamp === null;
    const courseSkillsCacheCleared = prevCourseSkillsCacheRef.current !== null && courseSkillsCacheTimestamp === null;
    
    if (!hasFetchedRef.current || categoriesCacheCleared || subcategoriesCacheCleared || courseSkillsCacheCleared) {
      fetchCategories();
      fetchSubcategories();
      fetchCourseSkills();
      hasFetchedRef.current = true;
    }
    
    prevCategoriesCacheRef.current = categoriesCacheTimestamp;
    prevSubcategoriesCacheRef.current = subcategoriesCacheTimestamp;
    prevCourseSkillsCacheRef.current = courseSkillsCacheTimestamp;
  }, [fetchCategories, fetchSubcategories, fetchCourseSkills, categoriesCacheTimestamp, subcategoriesCacheTimestamp, courseSkillsCacheTimestamp]);

  const handleCreate = async (data) => {
    try {
      await createCourseSkill(data);
      createAlert("success", "Course Skill created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create course skill");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateCourseSkill(editingItem.id, data);
      createAlert("success", "Course Skill updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update course skill");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this course skill?")) {
      try {
        await deleteCourseSkill(id);
        createAlert("success", "Course Skill deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete course skill");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleCourseSkillStatus(id);
      createAlert("success", "Course Skill status updated");
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
    if (!categoryId) return "-";
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "-";
  };

  const getSubcategoryName = (subcategoryId) => {
    if (!subcategoryId) return "-";
    const subcategory = subcategories.find((sub) => sub.id === subcategoryId);
    return subcategory ? subcategory.name : "-";
  };

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "category_id",
      label: "Category",
      render: (row) => getCategoryName(row.category_id),
    },
    {
      key: "subcategory_id",
      label: "SubCategory",
      render: (row) => getSubcategoryName(row.subcategory_id),
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
          {editingItem ? "Edit Course Skill" : "Add New Course Skill"}
        </h3>
        <CourseSkillForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.courseSkills}
          errors={errors.courseSkills || {}}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Course Skills
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
          data={courseSkills}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.courseSkills}
          emptyMessage="No course skills found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default CourseSkillManager;

