/**
 * Program Type Manager Component
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useCourseSettingsStore } from "@/store/index.js";
import ProgramTypeForm from "./ProgramTypeForm";
import SettingsTable from "./SettingsTable";
import useSweetAlert from "@/hooks/useSweetAlert";

const ProgramTypeManager = () => {
  const createAlert = useSweetAlert();
  const {
    programTypes,
    loading,
    errors,
    fetchProgramTypes,
    createProgramType,
    updateProgramType,
    deleteProgramType,
    toggleProgramTypeStatus,
  } = useCourseSettingsStore();

  const [editingItem, setEditingItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Track if cache was cleared
  const cacheTimestamp = useCourseSettingsStore((state) => state.cacheTimestamp?.programTypes);
  const prevCacheTimestampRef = useRef(cacheTimestamp);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    const cacheWasCleared = prevCacheTimestampRef.current !== null && cacheTimestamp === null;
    
    if (!hasFetchedRef.current || cacheWasCleared) {
      fetchProgramTypes();
      hasFetchedRef.current = true;
    }
    
    prevCacheTimestampRef.current = cacheTimestamp;
  }, [fetchProgramTypes, cacheTimestamp]);

  const handleCreate = async (data) => {
    try {
      await createProgramType(data);
      createAlert("success", "Program Type created successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to create program type");
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateProgramType(editingItem.id, data);
      createAlert("success", "Program Type updated successfully");
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      createAlert("error", error.message || "Failed to update program type");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this program type?")) {
      try {
        await deleteProgramType(id);
        createAlert("success", "Program Type deleted successfully");
      } catch (error) {
        createAlert("error", error.message || "Failed to delete program type");
      }
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleProgramTypeStatus(id);
      createAlert("success", "Program Type status updated");
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
      key: "icon",
      label: "Icon",
      render: (row) => row.icon ? (
        <span className="text-lg">{row.icon}</span>
      ) : "-",
    },
    {
      key: "color",
      label: "Color",
      render: (row) => row.color ? (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded border border-borderColor dark:border-borderColor-dark"
            style={{ backgroundColor: row.color }}
          />
          <span className="text-xs">{row.color}</span>
        </div>
      ) : "-",
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
          {editingItem ? "Edit Program Type" : "Add New Program Type"}
        </h3>
        <ProgramTypeForm
          initialData={editingItem}
          onSubmit={editingItem ? handleUpdate : handleCreate}
          onCancel={showForm ? handleCancel : null}
          loading={loading.programTypes}
          errors={errors.programTypes || {}}
        />
      </div>

      {/* Table Panel */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark">
            Program Types
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
          data={programTypes}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          loading={loading.programTypes}
          emptyMessage="No program types found"
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          showPagination={true}
        />
      </div>
    </div>
  );
};

export default ProgramTypeManager;

