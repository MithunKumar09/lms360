/**
 * CohortFilter Component
 * 
 * Multi-level checkbox selection for filtering courses by cohorts.
 * Supports: Program Nodes, Classes, Subjects, Streams, Academic Years, Sections
 * 
 * Features:
 * - Cascade filtering (selecting upper level filters next level)
 * - Multiple selection at all levels
 * - Fetches matching courses via API
 * - Displays selected cohorts summary
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

const CohortFilter = ({ 
  orgId = null,
  instructorId = null, // Filter cohorts/subjects by instructor
  onCohortChange,
  onCoursesChange,
  disabled = false 
}) => {
  const user = useAuthStore((state) => state.user);
  const finalOrgId = orgId || user?.orgId;
  
  // Use refs to store callbacks to avoid infinite loops
  const onCohortChangeRef = useRef(onCohortChange);
  const onCoursesChangeRef = useRef(onCoursesChange);
  
  // Update refs when callbacks change
  useEffect(() => {
    onCohortChangeRef.current = onCohortChange;
  }, [onCohortChange]);
  
  useEffect(() => {
    onCoursesChangeRef.current = onCoursesChange;
  }, [onCoursesChange]);

  // Selected values
  const [selectedProgramNodes, setSelectedProgramNodes] = useState([]);
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedStreams, setSelectedStreams] = useState([]);
  const [selectedAcademicYears, setSelectedAcademicYears] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);

  // Filtered options (based on selections)
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [filteredStreams, setFilteredStreams] = useState([]);
  const [filteredAcademicYears, setFilteredAcademicYears] = useState([]);
  const [filteredSections, setFilteredSections] = useState([]);

  // Loading states
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  // Fetch program nodes
  const { data: programNodesData } = useQuery({
    queryKey: ['program-nodes', finalOrgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId: finalOrgId,
        status: 'active',
        limit: '1000',
      });
      const response = await apiClient.get(`/program-nodes?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch program nodes');
      }
      return response.nodes || [];
    },
    enabled: !!finalOrgId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch academic sessions
  const { data: academicSessionsData } = useQuery({
    queryKey: ['academic-sessions', finalOrgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId: finalOrgId,
        limit: '100',
      });
      const response = await apiClient.get(`/academic-sessions?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch academic sessions');
      }
      return response.sessions || [];
    },
    enabled: !!finalOrgId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch sections
  const { data: sectionsData } = useQuery({
    queryKey: ['sections', finalOrgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId: finalOrgId,
        limit: '100',
      });
      const response = await apiClient.get(`/sections?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sections');
      }
      return response.sections || [];
    },
    enabled: !!finalOrgId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch subjects - filtered by instructor and selected cohorts if provided
  // When instructor is selected: Only show subjects assigned to that instructor
  // When no instructor: Show all subjects (filtered by cohorts if selected)
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects', finalOrgId, instructorId, selectedClasses],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId: finalOrgId,
        limit: '1000',
      });
      // IMPORTANT: When instructor is selected, ONLY show subjects for that instructor
      // When no instructor, show all subjects in the organization
      if (instructorId) {
        params.append('instructorIds', instructorId);
      }
      // Add classIds filter if cohorts are selected (further filters subjects by cohorts)
      if (selectedClasses.length > 0) {
        params.append('classIds', selectedClasses.join(','));
      }
      const response = await apiClient.get(`/subjects?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch subjects');
      }
      return response.subjects || [];
    },
    enabled: !!finalOrgId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch classes (cohorts) - filtered by instructor if provided
  const { data: classesData } = useQuery({
    queryKey: ['classes', finalOrgId, instructorId, selectedProgramNodes, selectedAcademicYears, selectedSections],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId: finalOrgId,
        status: 'published',
        limit: '1000',
      });
      // Add instructor filter if provided
      if (instructorId) {
        params.append('instructorIds', instructorId);
      }
      const response = await apiClient.get(`/classes?${params}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch classes');
      }
      return response.classes || [];
    },
    enabled: !!finalOrgId,
    staleTime: 5 * 60 * 1000,
  });

  // Filter classes based on selected program nodes, academic years, and sections
  useEffect(() => {
    if (!classesData) {
      setFilteredClasses([]);
      return;
    }

    let filtered = classesData;

    // Filter by program nodes
    if (selectedProgramNodes.length > 0) {
      filtered = filtered.filter((cls) =>
        selectedProgramNodes.includes(cls.programNode?.id)
      );
    }

    // Filter by academic years
    if (selectedAcademicYears.length > 0) {
      filtered = filtered.filter((cls) =>
        selectedAcademicYears.includes(cls.session?.id)
      );
    }

    // Filter by sections
    if (selectedSections.length > 0) {
      filtered = filtered.filter((cls) =>
        selectedSections.includes(cls.section?.id)
      );
    }

    setFilteredClasses(filtered);
  }, [classesData, selectedProgramNodes, selectedAcademicYears, selectedSections]);

  // Filter subjects based on selected classes
  // Note: Subjects are already filtered by API when classIds are provided
  // This effect just sets the filtered subjects from the API response
  useEffect(() => {
    // Subjects are already filtered by the API based on selectedClasses
    // So we can directly use the subjectsData
    setFilteredSubjects(subjectsData || []);
  }, [subjectsData]);

  // Filter streams (program nodes with node_type='stream')
  useEffect(() => {
    if (!programNodesData) {
      setFilteredStreams([]);
      return;
    }

    const streams = programNodesData.filter(
      (node) => node.node_type === 'stream'
    );
    setFilteredStreams(streams);
  }, [programNodesData]);

  // Filter academic years based on selected streams
  useEffect(() => {
    if (!academicSessionsData) {
      setFilteredAcademicYears([]);
      return;
    }

    // If streams are selected, we might want to filter sessions
    // For now, show all sessions
    setFilteredAcademicYears(academicSessionsData);
  }, [academicSessionsData, selectedStreams]);

  // Filter sections based on selected academic years
  useEffect(() => {
    if (!sectionsData) {
      setFilteredSections([]);
      return;
    }

    setFilteredSections(sectionsData);
  }, [sectionsData, selectedAcademicYears]);

  // Fetch matching courses when selections change
  useEffect(() => {
    const fetchCourses = async () => {
      // Only fetch if we have at least one selection
      const hasSelection =
        selectedProgramNodes.length > 0 ||
        selectedClasses.length > 0 ||
        selectedSubjects.length > 0 ||
        selectedStreams.length > 0 ||
        selectedAcademicYears.length > 0 ||
        selectedSections.length > 0;

      if (!hasSelection || !finalOrgId) {
        if (onCoursesChangeRef.current) {
          onCoursesChangeRef.current([]);
        }
        return;
      }

      setIsLoadingCourses(true);
      try {
        const params = new URLSearchParams();
        
        if (selectedProgramNodes.length > 0) {
          selectedProgramNodes.forEach((id) => {
            params.append('programNodeIds[]', id);
          });
        }
        if (selectedClasses.length > 0) {
          selectedClasses.forEach((id) => {
            params.append('classIds[]', id);
          });
        }
        if (selectedSubjects.length > 0) {
          selectedSubjects.forEach((id) => {
            params.append('subjectIds[]', id);
          });
        }
        if (selectedStreams.length > 0) {
          selectedStreams.forEach((id) => {
            params.append('streamIds[]', id);
          });
        }
        if (selectedAcademicYears.length > 0) {
          selectedAcademicYears.forEach((id) => {
            params.append('academicYearIds[]', id);
          });
        }
        if (selectedSections.length > 0) {
          selectedSections.forEach((id) => {
            params.append('sectionIds[]', id);
          });
        }

        const response = await apiClient.get(`/cohorts/filter-courses?${params.toString()}`);
        if (response.success && onCoursesChangeRef.current) {
          onCoursesChangeRef.current(response.courses || []);
        }
      } catch (error) {
        console.error('Error fetching filtered courses:', error);
      } finally {
        setIsLoadingCourses(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchCourses, 500);
    return () => clearTimeout(timeoutId);
  }, [
    selectedProgramNodes,
    selectedClasses,
    selectedSubjects,
    selectedStreams,
    selectedAcademicYears,
    selectedSections,
    finalOrgId,
    // Removed onCoursesChange from dependencies - using ref instead
  ]);

  // Calculate selected cohort IDs
  useEffect(() => {
    const cohortIds = [
      ...selectedClasses,
      // Add other cohort-related IDs if needed
    ];
    if (onCohortChangeRef.current) {
      onCohortChangeRef.current(cohortIds);
    }
  }, [selectedClasses]);
  // Removed onCohortChange from dependencies - using ref instead

  // Toggle selection helper - uses functional form to avoid stale closures
  const toggleSelection = (id, setSelectedArray) => {
    setSelectedArray((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Checkbox component
  const CheckboxGroup = ({ title, items, selected, onToggle, itemLabel, itemValue, disabled: groupDisabled = false }) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-3">
          {title}
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto border-2 border-borderColor dark:border-borderColor-dark rounded-md p-3">
          {items.map((item) => {
            const id = itemValue(item);
            const label = itemLabel(item);
            const isChecked = selected.includes(id);
            
            return (
              <label
                key={id}
                className={`flex items-center space-x-2 p-2 rounded ${
                  groupDisabled 
                    ? 'cursor-not-allowed opacity-50' 
                    : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                style={{ userSelect: 'none' }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (!groupDisabled) {
                      e.stopPropagation();
                      onToggle(id);
                    }
                  }}
                  disabled={groupDisabled}
                  className="w-4 h-4 text-primaryColor bg-gray-100 border-gray-300 rounded focus:ring-primaryColor cursor-pointer"
                />
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  {label}
                </span>
              </label>
            );
          })}
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {selected.length} selected
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
          Filter Courses by Cohorts
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select cohorts to filter available courses. Multiple selections allowed at each level.
          {instructorId && (
            <span className="block mt-1 text-xs text-primaryColor">
              Showing cohorts/subjects for the selected instructor.
            </span>
          )}
        </p>
      </div>

      {/* Program Nodes */}
      <CheckboxGroup
        title="Program Nodes"
        items={programNodesData || []}
        selected={selectedProgramNodes}
        onToggle={(id) => toggleSelection(id, setSelectedProgramNodes)}
        itemLabel={(item) => `${item.code} - ${item.title}`}
        itemValue={(item) => item.id}
        disabled={disabled}
      />

      {/* Streams (Program Nodes with node_type='stream') */}
      <CheckboxGroup
        title="Streams"
        items={filteredStreams}
        selected={selectedStreams}
        onToggle={(id) => toggleSelection(id, setSelectedStreams)}
        itemLabel={(item) => `${item.code} - ${item.title}`}
        itemValue={(item) => item.id}
        disabled={disabled}
      />

      {/* Academic Years (Sessions) */}
      <CheckboxGroup
        title="Academic Years"
        items={filteredAcademicYears}
        selected={selectedAcademicYears}
        onToggle={(id) => toggleSelection(id, setSelectedAcademicYears)}
        itemLabel={(item) => item.code || item.name}
        itemValue={(item) => item.id}
        disabled={disabled}
      />

      {/* Sections */}
      <CheckboxGroup
        title="Sections"
        items={filteredSections}
        selected={selectedSections}
        onToggle={(id) => toggleSelection(id, setSelectedSections)}
        itemLabel={(item) => item.label}
        itemValue={(item) => item.id}
        disabled={disabled}
      />

      {/* Classes (Cohorts) */}
      <CheckboxGroup
        title="Classes (Cohorts)"
        items={filteredClasses}
        selected={selectedClasses}
        onToggle={(id) => toggleSelection(id, setSelectedClasses)}
        itemLabel={(item) => item.code || item.cohort_code || `Class ${item.id.substring(0, 8)}`}
        itemValue={(item) => item.id}
        disabled={disabled}
      />

      {/* Subjects */}
      <CheckboxGroup
        title="Subjects"
        items={filteredSubjects}
        selected={selectedSubjects}
        onToggle={(id) => toggleSelection(id, setSelectedSubjects)}
        itemLabel={(item) => `${item.code} - ${item.title}`}
        itemValue={(item) => item.id}
        disabled={disabled}
      />

      {/* Loading indicator */}
      {isLoadingCourses && (
        <div className="text-sm text-gray-500">
          Loading matching courses...
        </div>
      )}

      {/* Selected cohorts summary */}
      {(selectedProgramNodes.length > 0 ||
        selectedClasses.length > 0 ||
        selectedSubjects.length > 0 ||
        selectedStreams.length > 0 ||
        selectedAcademicYears.length > 0 ||
        selectedSections.length > 0) && (
        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
          <h4 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
            Selected Filters:
          </h4>
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {selectedProgramNodes.length > 0 && (
              <p>Program Nodes: {selectedProgramNodes.length}</p>
            )}
            {selectedStreams.length > 0 && (
              <p>Streams: {selectedStreams.length}</p>
            )}
            {selectedAcademicYears.length > 0 && (
              <p>Academic Years: {selectedAcademicYears.length}</p>
            )}
            {selectedSections.length > 0 && (
              <p>Sections: {selectedSections.length}</p>
            )}
            {selectedClasses.length > 0 && (
              <p>Classes: {selectedClasses.length}</p>
            )}
            {selectedSubjects.length > 0 && (
              <p>Subjects: {selectedSubjects.length}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CohortFilter;

