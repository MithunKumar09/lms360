/**
 * Testimonial Manager Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import TestimonialForm from "./TestimonialForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const TestimonialManager = () => {
  const createAlert = useSweetAlert();
  const {
    testimonials,
    loading,
    errors,
    fetchTestimonials,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    toggleTestimonialStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [courses] = useState([]); // TODO: Fetch courses if needed

  // Track if cache was cleared
  const cacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.testimonials);
  const prevCacheTimestampRef = useRef(cacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const cacheWasCleared = prevCacheTimestampRef.current !== null && cacheTimestamp === null;
    
    if (!hasFetchedRef.current || cacheWasCleared) {
      fetchTestimonials();
      hasFetchedRef.current = true;
    }
    
    prevCacheTimestampRef.current = cacheTimestamp;
  }, [fetchTestimonials, cacheTimestamp]);

  const handleCreate = async (data) => {
    try {
      await createTestimonial(data);
      createAlert("success", "Testimonial created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create testimonial");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateTestimonial(editingItem.id, data);
      createAlert("success", "Testimonial updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update testimonial");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this testimonial?")) {
      try {
        await deleteTestimonial(id);
        createAlert("success", "Testimonial deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete testimonial");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleTestimonialStatus(id);
      createAlert("success", "Testimonial status updated");
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

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`
              text-sm
              ${star <= rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}
            `}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const columns = [
    {
      key: "student_name",
      label: "Student",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.photo_url && (
            <img
              src={row.photo_url}
              alt={row.student_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          )}
          <span>{row.student_name}</span>
        </div>
      ),
    },
    {
      key: "course_id",
      label: "Course",
      render: (row) => row.course_id ? `Course ${row.course_id}` : "-",
    },
    {
      key: "rating",
      label: "Rating",
      render: (row) => renderStars(row.rating),
    },
    {
      key: "message",
      label: "Message",
      render: (row) => (
        <span className="truncate max-w-xs">
          {row.message || "-"}
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
          {row.status === 1 ? "Active" : "Hidden"}
        </span>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-4">
          {editingItem ? "Edit Testimonial" : "Add New Testimonial"}
        </h3>
        <TestimonialForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.testimonials}
          errors={errors.testimonials || {}}
          courses={courses}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Testimonials
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
          data={testimonials}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.testimonials}
          emptyMessage="No testimonials found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default TestimonialManager;

