"use client";

import React from "react";
import { useMentorMaterials } from "@/hooks/api/useMentorMaterials";
import MaterialCard from "./MaterialCard";

/**
 * MaterialList Component
 * 
 * Displays a list of materials with filtering options.
 * 
 * @param {Object} props
 * @param {Object} props.filters - Filter parameters (cohort_id, student_id, category, etc.)
 * @param {Function} props.onMaterialClick - Handler for material click
 * @param {Function} props.onMaterialEdit - Handler for material edit (optional)
 * @param {Function} props.onMaterialDelete - Handler for material delete (optional)
 */
export default function MaterialList({
  filters = {},
  onMaterialClick,
  onMaterialEdit,
  onMaterialDelete,
}) {
  const { data, isLoading, error } = useMentorMaterials({
    filters,
    enabled: true,
  });

  const materials = data?.materials || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-contentColor dark:text-contentColor-dark">Loading materials...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading materials: {error.message}</p>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
        <i className="icofont-file-alt text-4xl text-contentColor dark:text-contentColor-dark opacity-50 mb-2"></i>
        <p className="text-contentColor dark:text-contentColor-dark">No materials found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
          onClick={onMaterialClick ? () => onMaterialClick(material) : undefined}
          onEdit={onMaterialEdit ? () => onMaterialEdit(material) : undefined}
          onDelete={onMaterialDelete ? () => onMaterialDelete(material) : undefined}
        />
      ))}
    </div>
  );
}
