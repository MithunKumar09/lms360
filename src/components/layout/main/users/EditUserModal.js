"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { useSearchCohorts } from "@/hooks/api/useSearchCohorts.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert.js";
import { 
  FiX, 
  FiUsers, 
  FiBook, 
  FiUser, 
  FiSave,
  FiLoader,
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiSearch
} from "react-icons/fi";
import apiClient from "@/lib/api/client.js";
import { useQueryClient } from "@tanstack/react-query";

// AsyncSelect component (reused from CreateInviteUserForm)
function AsyncSelect({ value, onChange, fetchUrl, placeholder = "Search...", disabled, ariaLabel, multiple = false, autoLoadParams = null, onItemSelect = null, autoLoadOnFocus = false, orgId: propOrgId = null }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const loadedUrlRef = useRef(null); // Track which URL we've loaded to prevent infinite loops
  
  // Check if this is a cohorts search endpoint - use React Query for caching
  const isCohortsSearch = fetchUrl?.includes('/search/cohorts') || fetchUrl?.includes('/api/search/cohorts');
  const user = useAuthStore((state) => state.user);
  // Use propOrgId if provided (for superadmin editing other users), otherwise use session user's orgId
  const userOrgId = propOrgId || user?.orgId;
  
  // Memoize autoLoadParams to prevent unnecessary re-renders
  const stableAutoLoadParams = useMemo(() => {
    if (!autoLoadParams || Object.keys(autoLoadParams).length === 0) return null;
    return autoLoadParams;
  }, [JSON.stringify(autoLoadParams)]);
  
  // Use React Query for cohorts search to prevent infinite requests
  // Only enable once when autoLoadOnFocus is true or when we have params
  const shouldEnableQuery = useMemo(() => {
    if (!isCohortsSearch || !userOrgId) return false;
    return autoLoadOnFocus || !!stableAutoLoadParams;
  }, [isCohortsSearch, userOrgId, autoLoadOnFocus, stableAutoLoadParams]);
  
  // Stable query params - only include q if it's not empty
  // IMPORTANT: Don't include q in initial load to prevent query key changes
  const queryParams = useMemo(() => {
    const params = {
      orgId: userOrgId,
      page: 1,
      pageSize: 100,
    };
    // Only add q if it's not empty (for search functionality)
    // Don't check hasLoaded here - it causes infinite loops
    if (q && q.trim()) {
      params.q = q.trim();
    }
    // Add autoLoadParams if they exist
    if (stableAutoLoadParams) {
      Object.assign(params, stableAutoLoadParams);
    }
    return params;
  }, [userOrgId, q, stableAutoLoadParams]); // Removed hasLoaded to prevent infinite loop
  
  const cohortsQuery = useSearchCohorts(queryParams, {
    enabled: shouldEnableQuery,
  });
  
  // Sync React Query data to local state for cohorts - use ref to prevent infinite loops
  const prevDataRef = useRef(null);
  useEffect(() => {
    if (!isCohortsSearch) return;
    
    // Only update if data actually changed
    if (cohortsQuery.data && cohortsQuery.data !== prevDataRef.current) {
      prevDataRef.current = cohortsQuery.data;
      setItems(cohortsQuery.data.items || []);
      setError(null);
      if (cohortsQuery.data.items && cohortsQuery.data.items.length > 0) {
        setHasLoaded(true);
      }
    }
    
    // Update loading state only when it changes
    const isLoading = cohortsQuery.isLoading || cohortsQuery.isFetching;
    setLoading(prev => {
      if (prev !== isLoading) return isLoading;
      return prev;
    });
    
    // Update error state
    if (cohortsQuery.error) {
      setError(cohortsQuery.error.message || 'Failed to load cohorts');
      setLoading(false);
    } else if (cohortsQuery.data && error) {
      setError(null);
    }
  }, [isCohortsSearch, cohortsQuery.data, cohortsQuery.isLoading, cohortsQuery.isFetching, cohortsQuery.error, error]);

  const search = useCallback(async (term, additionalParams = {}) => {
    // For cohorts search, React Query handles the fetching
    // Just update the search term to trigger React Query refetch
    if (isCohortsSearch) {
      setQ(term || '');
      return;
    }
    
    const shouldSearch = term && term.trim().length > 0;
    const hasAutoLoadParams = autoLoadParams && Object.keys(autoLoadParams).length > 0;
    
    // Don't fetch if no search term, no autoLoadParams, and not autoLoadOnFocus
    // OR if autoLoadOnFocus is true but we don't have required params (like cohort_id for subjects)
    if (!shouldSearch && !hasAutoLoadParams && !autoLoadOnFocus) {
      setItems([]);
      setError(null);
      return;
    }
    
    // If autoLoadOnFocus is true, allow fetch even without autoLoadParams
    // This is needed for endpoints like /api/search/cohorts that don't require params
    // Only block if we have a specific endpoint that requires params (like /api/search/subjects needs cohort_id)
    const requiresParams = fetchUrl.includes('/search/subjects'); // Only subjects endpoint requires cohort_id
    if (requiresParams && !hasAutoLoadParams && !shouldSearch) {
      // Subjects endpoint requires cohort_id - don't fetch without it
      setItems([]);
      setError(null);
      return;
    }
    
    // For other endpoints (like cohorts), allow fetch when autoLoadOnFocus is true

    setLoading(true);
    setError(null);
    
    console.log('[AsyncSelect] Starting fetch:', {
      fetchUrl,
      term: term || '(empty)',
      autoLoadOnFocus,
      hasAutoLoadParams,
      autoLoadParams
    });
    
    try {
      const url = new URL(fetchUrl, window.location.origin);
      if (shouldSearch) {
        url.searchParams.set("q", term.trim());
      }
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "100");
      
      if (autoLoadParams) {
        Object.entries(autoLoadParams).forEach(([key, val]) => {
          if (val) url.searchParams.set(key, val);
        });
      }
      
      Object.entries(additionalParams).forEach(([key, val]) => {
        if (val) url.searchParams.set(key, val);
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(url.toString(), { 
        method: "GET",
        signal: controller.signal,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('[AsyncSelect] Response data:', { 
        url: url.toString(), 
        hasItems: !!data.items, 
        hasClasses: !!data.classes,
        itemsCount: data.items?.length || 0,
        classesCount: data.classes?.length || 0,
        dataKeys: Object.keys(data),
        success: data.success
      });
      
      // Handle both 'items' and 'classes' response formats
      // API returns { success: true, classes: [...] } for /api/classes
      // Other APIs might return { items: [...] }
      const itemsArray = data.classes || data.items || (Array.isArray(data) ? data : []);
      setItems(Array.isArray(itemsArray) ? itemsArray : []);
      setError(null);
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else if (e.message) {
        setError(e.message);
      } else {
        setError('Failed to load options. Please try again.');
      }
      setItems([]);
      console.warn('[AsyncSelect] Search error:', e.message || e);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, autoLoadParams, autoLoadOnFocus, isCohortsSearch]);

  // For cohorts, React Query handles loading - no need for manual useEffect
  // For other endpoints, use the original logic
  useEffect(() => {
    // Skip if using React Query for cohorts
    if (isCohortsSearch) {
      return;
    }
    
    // Create a stable key for this fetch configuration
    const fetchKey = `${fetchUrl}|${JSON.stringify(autoLoadParams)}|${autoLoadOnFocus}`;
    
    // If we've already loaded for this exact configuration, don't load again
    if (loadedUrlRef.current === fetchKey) {
      return;
    }
    
    // Reset hasLoaded if fetchUrl or params changed (new endpoint/configuration)
    if (loadedUrlRef.current !== null && loadedUrlRef.current !== fetchKey) {
      setHasLoaded(false);
      setItems([]); // Clear items when URL/params change
    }
    
    const hasAutoLoadParams = autoLoadParams && Object.keys(autoLoadParams).length > 0;
    
    // Only trigger fetch once when conditions are met
    if (hasAutoLoadParams && !hasLoaded) {
      // Has required params - load immediately (only once)
      loadedUrlRef.current = fetchKey; // Mark as loading BEFORE calling search
      search("", {}).then(() => {
        setHasLoaded(true);
      }).catch(() => {
        // On error, reset so we can retry
        loadedUrlRef.current = null;
      });
    } else if (autoLoadOnFocus && !hasLoaded && !hasAutoLoadParams) {
      // autoLoadOnFocus is true but no required params
      // Load items when component mounts (only once)
      loadedUrlRef.current = fetchKey; // Mark as loading BEFORE calling search
      search("", {}).then(() => {
        setHasLoaded(true);
      }).catch(() => {
        // On error, reset so we can retry
        loadedUrlRef.current = null;
      });
    } else if (!hasAutoLoadParams && !autoLoadOnFocus) {
      // No auto-load conditions - clear items and reset
      setItems([]);
      loadedUrlRef.current = null;
      setHasLoaded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUrl, autoLoadParams, autoLoadOnFocus, isCohortsSearch]); // Removed hasLoaded to prevent infinite loop

  const selectedItems = useMemo(() => {
    if (multiple && Array.isArray(value)) {
      return items.filter(it => value.includes(it.id));
    } else if (!multiple && value) {
      const found = items.find(it => it.id === value);
      if (found) return [found];
      // If value exists but not in items yet, return empty (will show placeholder)
      return [];
    }
    return [];
  }, [items, value, multiple]);

  return (
    <div className="position-relative">
      <div 
        className={`form-control d-flex align-items-center justify-content-between ${disabled ? 'bg-light' : 'cursor-pointer'}`}
        style={{ minHeight: '38px', cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="d-flex flex-wrap gap-1 flex-grow-1">
          {multiple && Array.isArray(value) && value.length > 0 ? (
            selectedItems.map(item => (
              <span key={item.id} className="badge bg-primary me-1">
                {item.label || item.title || item.name || item.email || item.code}
              </span>
            ))
          ) : !multiple && value ? (
            <span>{selectedItems[0]?.label || selectedItems[0]?.title || selectedItems[0]?.name || selectedItems[0]?.email || selectedItems[0]?.code || 'Select...'}</span>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <FiChevronDown size={16} className="text-muted" />
      </div>
      
      {isOpen && !disabled && (
        <div 
          className="position-absolute w-100 bg-white border rounded shadow-lg mt-1"
          style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}
        >
          <div className="p-2 border-bottom">
            <div className="position-relative">
              <FiSearch size={16} className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" />
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Search..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  search(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          {loading ? (
            <div className="p-3 text-center">
              <FiLoader size={20} className="spinner-border spinner-border-sm text-primary" />
            </div>
          ) : error ? (
            <div className="p-3 text-danger small">
              <FiAlertCircle size={14} className="me-1" />
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="p-3 text-muted small text-center">No options found</div>
          ) : (
            <ul className="list-unstyled mb-0" style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {items.map((it) => (
                <li key={it.id} className="border-bottom">
                  <label className="d-flex align-items-center gap-2 p-2 cursor-pointer hover-bg-light" style={{ cursor: 'pointer' }}>
                    <input
                      type={multiple ? "checkbox" : "radio"}
                      name={ariaLabel}
                      checked={multiple ? (Array.isArray(value) && value.includes(it.id)) : value === it.id}
                      onChange={() => {
                        if (multiple) {
                          const arr = Array.isArray(value) ? value.slice() : [];
                          const idx = arr.indexOf(it.id);
                          if (idx === -1) arr.push(it.id);
                          else arr.splice(idx, 1);
                          onChange(arr);
                        } else {
                          onChange(it.id);
                          if (onItemSelect) onItemSelect(it);
                          setIsOpen(false);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="small">{it.label || it.title || it.name || it.email || it.code}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      {isOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 999 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

// Form Field Component
function FormField({ label, icon: Icon, error, children, required = false, className = "" }) {
  const handleFieldClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      className={className}
      onClick={handleFieldClick}
      onMouseDown={handleFieldClick}
      onTouchStart={handleFieldClick}
    >
      <label className="d-flex align-items-center gap-2 mb-2 fw-medium" style={{ fontSize: '0.875rem' }}>
        {Icon && <Icon size={16} className="text-primary" style={{ flexShrink: 0 }} />}
        <span>{label}{required && <span className="text-danger ms-1">*</span>}</span>
      </label>
      {children}
      {error && (
        <div className="d-flex align-items-center gap-1 mt-1">
          <FiX size={12} className="text-danger" />
          <p className="text-danger mb-0" style={{ fontSize: '0.75rem' }}>{error.message || error}</p>
        </div>
      )}
    </div>
  );
}

export default function EditUserModal({ user, isOpen, onClose, actorRole }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(null);
  const [selectedInstructorIds, setSelectedInstructorIds] = useState([]);
  const [availableOfferings, setAvailableOfferings] = useState([]);
  const [cohortHasOfferings, setCohortHasOfferings] = useState(true);
  const [userOrgId, setUserOrgId] = useState(null);
  const showAlert = useSweetAlert();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
      defaultValues: {
      cohort_ids: [], // For students: multiple cohorts (changed from cohort_id)
      subject_offering_ids: [],
      roll_no: '',
      program_node_id: null,
      offering_ids: [],
      linked_student_ids: [],
      parent_ids: [],
      instructor_ids: [], // For students: assigned instructors (can be multiple)
    }
  });

  const cohortIds = watch("cohort_ids") || []; // For both students and instructors: multiple cohorts
  const subjectOfferingIds = watch("subject_offering_ids");
  
  // For instructors: use first selected cohort to filter subjects
  // If multiple cohorts selected, use the first one for filtering
  const instructorCohortId = cohortIds.length > 0 ? cohortIds[0] : null;

  // Fetch user's current assignments
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserData();
    }
  }, [isOpen, user?.id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/users/${user.id}`);
      
      console.log('📋 [EDIT MODAL] Full API response:', response);
      
      // apiClient.get spreads the response data, so structure is:
      // { success: true, user: {...}, roles: [...], links: {...}, ... }
      const userData = response.user;
      const roles = response.roles || [];
      const links = response.links || {};
      
      console.log('📋 [EDIT MODAL] Extracted data:', { 
        hasUser: !!userData,
        userEmail: userData?.email,
        rolesCount: roles.length, 
        roles: roles.map(r => ({ code: r.code || r, title: r.title || r })),
        linksKeys: Object.keys(links),
        studentLinks: links?.student?.length || 0,
        instructorLinks: links?.instructor?.length || 0,
        parentLinks: links?.parent?.length || 0,
        parentStudents: links?.parent_students?.length || 0,
        studentSubjects: links?.student_subjects?.length || 0
      });
      
      if (userData) {
        // Combine user data with roles and links
        const combinedUserData = {
          ...userData,
          roles: roles,
          links: links
        };
        setUserData(combinedUserData);
        
        // Get user roles - check both code and direct string match
        const isStudent = roles.some(r => {
          const code = r.code || r;
          return code === 'student' || code === 'orgstudent';
        });
        const isInstructor = roles.some(r => {
          const code = r.code || r;
          return code === 'instructor' || code === 'orginstructor';
        });
        const isParent = roles.some(r => {
          const code = r.code || r;
          return code === 'parent';
        });
        
        console.log('📋 [EDIT MODAL] User roles detected:', { 
          isStudent, 
          isInstructor, 
          isParent, 
          roles: roles.map(r => ({ code: r.code || r, title: r.title || r }))
        });

        // Store org_id for filtering
        const orgId = roles.find(r => r.org_id)?.org_id || userData?.org_id || null;
        setUserOrgId(orgId);
        console.log('📋 [EDIT MODAL] Setting userOrgId:', orgId, 'from roles:', roles.map(r => ({ code: r.code, org_id: r.org_id })));
        
        // Load student data
        if (isStudent && links?.student?.[0]) {
          const studentLink = links.student[0];
          console.log('📋 [EDIT MODAL] Loading student data:', studentLink);
          // For students, use cohort_ids array (can have multiple cohorts)
          const studentCohortIds = links?.student?.map(link => link.cohort_id).filter(Boolean) || [];
          if (studentLink.cohort_id) {
            // If only one cohort, still use array format
            setValue("cohort_ids", studentCohortIds.length > 0 ? studentCohortIds : [studentLink.cohort_id]);
          } else {
            setValue("cohort_ids", []);
          }
          setValue("roll_no", studentLink.roll_no || '');
          setValue("program_node_id", studentLink.program_node_id || null);
          
          // Set assigned instructor(s) if available
          // Priority: 1. links.assigned_instructors (from user_metadata), 2. links.assigned_instructor_id, 3. studentLink.assigned_instructors
          if (links?.assigned_instructors && Array.isArray(links.assigned_instructors) && links.assigned_instructors.length > 0) {
            // Use explicitly assigned instructors from metadata (highest priority)
            const instructorIds = links.assigned_instructors.map(inst => inst.instructor_id || inst.id).filter(Boolean);
            setSelectedInstructorIds(instructorIds);
            setValue("instructor_ids", instructorIds);
            console.log('📋 [EDIT MODAL] Setting assigned instructors from metadata:', instructorIds);
          } else if (links?.assigned_instructor_id) {
            // Fallback to single assigned instructor
            const instructorId = links.assigned_instructor_id;
            setSelectedInstructorIds([instructorId]);
            setValue("instructor_ids", [instructorId]);
            console.log('📋 [EDIT MODAL] Setting assigned instructor (fallback):', instructorId);
          } else if (studentLink.assigned_instructors?.length > 0) {
            // Last fallback: inferred from cohort/subject relationships
            const instructorIds = studentLink.assigned_instructors.map(inst => inst.instructor_id || inst.id).filter(Boolean);
            setSelectedInstructorIds(instructorIds);
            setValue("instructor_ids", instructorIds);
            console.log('📋 [EDIT MODAL] Setting assigned instructors from studentLink (inferred):', instructorIds);
          }
          
          // Set current subject offerings if available
          if (links?.student_subjects && links.student_subjects.length > 0) {
            const currentOfferings = links.student_subjects
              .map(subj => subj.subject_offering_id)
              .filter(Boolean);
            console.log('📋 [EDIT MODAL] Setting subject offerings from student_subjects:', currentOfferings);
            setValue("subject_offering_ids", currentOfferings);
          } else if (studentLink.subject_offerings && studentLink.subject_offerings.length > 0) {
            const currentOfferings = studentLink.subject_offerings
              .map(subj => subj.subject_offering_id)
              .filter(Boolean);
            console.log('📋 [EDIT MODAL] Setting subject offerings from studentLink:', currentOfferings);
            setValue("subject_offering_ids", currentOfferings);
          }
          
          // Fetch subject offerings for the first selected cohort (if any)
          if (studentCohortIds.length > 0) {
            fetchSubjectOfferings(studentCohortIds[0]);
          }
        }

        // Load instructor data
        if (isInstructor && links?.instructor) {
          const instructorLinks = links.instructor;
          console.log('📋 [EDIT MODAL] Loading instructor data:', instructorLinks);
          const cohortIds = [...new Set(instructorLinks.map(link => link.cohort_id).filter(Boolean))];
          const offeringIds = [...new Set(instructorLinks.map(link => link.subject_offering_id).filter(Boolean))];
          setValue("cohort_ids", cohortIds);
          setValue("offering_ids", offeringIds);
        }

        // Load parent data
        if (isParent && links?.parent) {
          const parentLinks = links.parent;
          console.log('📋 [EDIT MODAL] Loading parent data:', parentLinks);
          const studentIds = parentLinks.map(link => link.student_user_id).filter(Boolean);
          setValue("linked_student_ids", studentIds);
        }

        // Load parent links for students
        if (isStudent && links?.parent_students) {
          const parentIds = links.parent_students.map(link => link.parent_user_id).filter(Boolean);
          console.log('📋 [EDIT MODAL] Loading parent_students data:', parentIds);
          setValue("parent_ids", parentIds);
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch subject offerings when cohort changes (for students) - use first cohort if multiple selected
  useEffect(() => {
    if (cohortIds.length > 0) {
      fetchSubjectOfferings(cohortIds[0]);
    } else {
      setAvailableOfferings([]);
      setCohortHasOfferings(true);
      setValue("subject_offering_ids", []);
    }
  }, [cohortIds]);
  
  // Clear subject offerings when instructor cohorts change
  useEffect(() => {
    // Check if user is instructor by role (don't use isInstructor variable as it's defined later)
    const userIsInstructor = user?.role === 'instructor' || user?.role === 'orginstructor';
    if (userIsInstructor) {
      // When cohorts change, clear subject offerings selection
      // The AsyncSelect will automatically reload based on the new cohort_id
      if (cohortIds.length === 0) {
        setValue("offering_ids", []);
      }
    }
  }, [cohortIds, user?.role, setValue]);

  const fetchSubjectOfferings = async (cohortId) => {
    try {
      const response = await fetch(`/api/search/subjects?cohort_id=${cohortId}&page=1&pageSize=100`, {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        setAvailableOfferings(data.items.map(item => item.id));
        setCohortHasOfferings(true);
      } else {
        setAvailableOfferings([]);
        setCohortHasOfferings(false);
      }
    } catch (err) {
      console.error('Error fetching subject offerings:', err);
      setAvailableOfferings([]);
      setCohortHasOfferings(false);
    }
  };

  // Filter cohorts by instructor(s) and organization
  // When instructors are selected, only show cohorts assigned to those instructors
  const cohortFetchUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('status', 'published');
    
    // If instructors are selected, filter cohorts by their assignments
    // If no instructors selected, show all cohorts in the organization
    if (selectedInstructorIds && selectedInstructorIds.length > 0) {
      // Pass instructor IDs as comma-separated string
      params.set('instructorIds', selectedInstructorIds.join(','));
    }
    
    if (userOrgId) {
      params.set('orgId', userOrgId);
    }
    
    const url = `/api/classes?${params.toString()}`;
    console.log('📋 [EDIT MODAL] Cohort fetch URL:', url, 'selectedInstructorIds:', selectedInstructorIds);
    return url;
  }, [selectedInstructorIds, userOrgId]);
  
  // For instructors: fetch ALL cohorts in the organization (not just assigned ones)
  // Use the SAME endpoint as CreateInviteUserForm: /api/search/cohorts
  // This ensures consistency and avoids duplication
  const instructorCohortFetchUrl = useMemo(() => {
    // Use /api/search/cohorts - same as create/invite user form
    // For superadmin, include orgId in URL; for admin/instructor, it's filtered by session
    const url = userOrgId ? `/api/search/cohorts?orgId=${userOrgId}` : '/api/search/cohorts';
    console.log('📋 [EDIT MODAL] Instructor cohort fetch URL (same as create/invite form):', url, 'userOrgId:', userOrgId);
    return url;
  }, [userOrgId]);

  const onSubmit = async (data) => {
    try {
      console.log('📝 [EDIT MODAL] ===== FORM SUBMISSION STARTED =====');
      console.log('📝 [EDIT MODAL] User ID:', user?.id);
      console.log('📝 [EDIT MODAL] Form Data:', JSON.stringify(data, null, 2));
      
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Clean up data
      const payload = {};
      
      // For students: use cohort_ids array (multiple cohorts supported)
      if (data.cohort_ids && Array.isArray(data.cohort_ids) && data.cohort_ids.length > 0) {
        payload.cohort_ids = data.cohort_ids;
        console.log('📝 [EDIT MODAL] Added cohort_ids to payload:', payload.cohort_ids);
      }
      if (data.subject_offering_ids && Array.isArray(data.subject_offering_ids) && data.subject_offering_ids.length > 0) {
        payload.subject_offering_ids = data.subject_offering_ids;
        console.log('📝 [EDIT MODAL] Added subject_offering_ids to payload:', payload.subject_offering_ids);
      }
      if (data.roll_no) {
        payload.roll_no = data.roll_no;
        console.log('📝 [EDIT MODAL] Added roll_no to payload:', payload.roll_no);
      }
      if (data.program_node_id) {
        payload.program_node_id = data.program_node_id;
        console.log('📝 [EDIT MODAL] Added program_node_id to payload:', payload.program_node_id);
      }
      
      // Handle multiple instructor IDs for students
      if (data.instructor_ids && Array.isArray(data.instructor_ids) && data.instructor_ids.length > 0) {
        payload.instructor_ids = data.instructor_ids;
        console.log('📝 [EDIT MODAL] Added instructor_ids to payload:', payload.instructor_ids);
      }
      
      // For instructors: cohort_ids and offering_ids
      if (data.cohort_ids && Array.isArray(data.cohort_ids) && data.cohort_ids.length > 0) {
        payload.cohort_ids = data.cohort_ids;
      }
      if (data.offering_ids && Array.isArray(data.offering_ids) && data.offering_ids.length > 0) {
        payload.offering_ids = data.offering_ids;
      }
      
      // For parents: linked_student_ids
      if (data.linked_student_ids && Array.isArray(data.linked_student_ids) && data.linked_student_ids.length > 0) {
        payload.linked_student_ids = data.linked_student_ids;
      }
      // For students: parent_ids
      if (data.parent_ids && Array.isArray(data.parent_ids) && data.parent_ids.length > 0) {
        payload.parent_ids = data.parent_ids;
      }

      console.log('📝 [EDIT MODAL] Final payload being sent:', JSON.stringify(payload, null, 2));
      console.log('📝 [EDIT MODAL] Sending PATCH request to:', `/users/${user.id}/update-assignments`);

      const response = await apiClient.patch(`/users/${user.id}/update-assignments`, payload);
      
      console.log('📝 [EDIT MODAL] Response received:', JSON.stringify(response, null, 2));

      if (response.success) {
        console.log('📝 [EDIT MODAL] ✅ Update successful');
        setSuccess(true);
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['user', user.id] });
        
        // Show success toast notification
        showAlert('success', 'User assignments updated successfully!');
        
        // Wait a bit longer to show success message before closing
        setTimeout(() => {
          console.log('📝 [EDIT MODAL] Closing modal after success');
          onClose();
          setSuccess(false);
        }, 2000);
      } else {
        console.error('📝 [EDIT MODAL] ❌ Update failed:', response.error);
        setError(response.error || 'Failed to update user assignments');
      }
    } catch (err) {
      console.error('📝 [EDIT MODAL] ❌ ===== ERROR =====');
      console.error('📝 [EDIT MODAL] ❌ Error message:', err.message);
      console.error('📝 [EDIT MODAL] ❌ Error stack:', err.stack);
      console.error('📝 [EDIT MODAL] ❌ Full error:', err);
      setError(err.message || 'Failed to update user assignments');
    } finally {
      setLoading(false);
      console.log('📝 [EDIT MODAL] ===== FORM SUBMISSION COMPLETED =====');
    }
  };

  // Extract roles and links from userData
  // Fallback to user prop if userData not loaded yet
  const roles = userData?.roles || [];
  const links = userData?.links || {};
  
  // Check roles from multiple sources for reliability
  const userRole = user?.role || userData?.role || '';
  const roleCodes = roles.map(r => r.code || r);
  
  const isStudent = roleCodes.some(code => code === 'student' || code === 'orgstudent') 
    || userRole === 'student' || userRole === 'orgstudent';
  
  const isInstructor = roleCodes.some(code => code === 'instructor' || code === 'orginstructor')
    || userRole === 'instructor' || userRole === 'orginstructor';
  
  const isParent = roleCodes.some(code => code === 'parent')
    || userRole === 'parent';

  // Prevent any clicks inside modal from bubbling to backdrop
  const handleModalContentClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  // Prevent modal from closing when clicking backdrop or interacting with form
  const handleBackdropClick = useCallback((e) => {
    // Only close if clicking directly on the backdrop div itself
    // Check if the click target is the backdrop container (not any child)
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  }, [loading, onClose]);

  // Prevent mousedown events from closing modal - be very strict
  const handleBackdropMouseDown = useCallback((e) => {
    // Only allow backdrop click if clicking directly on backdrop, not any child
    const isDirectBackdropClick = e.target === e.currentTarget;
    if (!isDirectBackdropClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  // Handle clicks on form elements - prevent all propagation
  const handleFormElementClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Handle all input/select/button interactions - prevent backdrop clicks
  const handleInputInteraction = useCallback((e) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  console.log('📋 [EDIT MODAL] Render check:', { 
    hasUserData: !!userData,
    userRole,
    roles: roleCodes, 
    isStudent, 
    isInstructor, 
    isParent,
    hasStudentLinks: !!links?.student,
    hasInstructorLinks: !!links?.instructor,
    hasParentLinks: !!links?.parent,
    hasParentStudents: !!links?.parent_students
  });

  return (
    <div 
      className="modal fade show d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={handleBackdropClick}
      onMouseDown={handleBackdropMouseDown}
    >
      <div 
        className="modal-dialog modal-lg modal-dialog-scrollable"
        onClick={handleModalContentClick}
        onMouseDown={handleModalContentClick}
        onTouchStart={handleModalContentClick}
      >
        <div 
          className="modal-content border-0 shadow-lg"
          onClick={handleModalContentClick}
          onMouseDown={handleModalContentClick}
          onTouchStart={handleModalContentClick}
        >
          <div className="modal-header border-bottom bg-primary text-white">
            <h5 className="modal-title d-flex align-items-center gap-2">
              <FiUsers size={20} />
              Edit User Assignments
            </h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
              aria-label="Close"
            />
          </div>
          
          <div 
            className="modal-body p-4"
            onClick={handleModalContentClick}
            onMouseDown={handleModalContentClick}
            onTouchStart={handleModalContentClick}
          >
            {loading && !userData ? (
              <div className="text-center py-5">
                <FiLoader size={32} className="spinner-border spinner-border-lg text-primary" />
                <p className="mt-3 text-muted">Loading user data...</p>
              </div>
            ) : error && !userData ? (
              <div className="alert alert-danger d-flex align-items-center gap-2">
                <FiAlertCircle size={20} />
                <span>{error}</span>
              </div>
            ) : (
              <form 
                onSubmit={handleSubmit(onSubmit)}
                onClick={handleFormElementClick}
                onMouseDown={handleFormElementClick}
                onTouchStart={handleFormElementClick}
              >
                <div 
                  className="mb-4"
                  onClick={handleInputInteraction}
                  onMouseDown={handleInputInteraction}
                >
                  <h6 className="fw-bold text-dark mb-3">User Information</h6>
                  <div className="row g-3">
                    <div className="col-md-6" onClick={handleInputInteraction} onMouseDown={handleInputInteraction}>
                      <label className="form-label small text-muted">Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={userData?.first_name && userData?.last_name 
                          ? `${userData.first_name} ${userData.last_name}` 
                          : userData?.email || user?.email || ''} 
                        disabled
                        onClick={handleInputInteraction}
                        onMouseDown={handleInputInteraction}
                      />
                    </div>
                    <div className="col-md-6" onClick={handleInputInteraction} onMouseDown={handleInputInteraction}>
                      <label className="form-label small text-muted">Email</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={userData?.email || user?.email || ''} 
                        disabled
                        onClick={handleInputInteraction}
                        onMouseDown={handleInputInteraction}
                      />
                    </div>
                    <div className="col-md-6" onClick={handleInputInteraction} onMouseDown={handleInputInteraction}>
                      <label className="form-label small text-muted">Role</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={roles.map(r => r.title || r.code).join(', ') || user?.role || ''} 
                        disabled
                        onClick={handleInputInteraction}
                        onMouseDown={handleInputInteraction}
                      />
                    </div>
                    <div className="col-md-6" onClick={handleInputInteraction} onMouseDown={handleInputInteraction}>
                      <label className="form-label small text-muted">Organization</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={userData?.org_label || user?.org_label || ''} 
                        disabled
                        onClick={handleInputInteraction}
                        onMouseDown={handleInputInteraction}
                      />
                    </div>
                  </div>
                </div>

                {/* Debug Info - Remove in production */}
                {process.env.NODE_ENV !== 'production' && (
                  <div className="alert alert-info small mb-3">
                    <strong>Debug:</strong> User Role={userRole}, isStudent={String(isStudent)}, isInstructor={String(isInstructor)}, isParent={String(isParent)}, 
                    Roles={JSON.stringify(roleCodes)}, HasUserData={String(!!userData)}, UserPropRole={user?.role}
                  </div>
                )}

                {/* Student Assignments - Always show for students */}
                {(isStudent || user?.role === 'student' || user?.role === 'orgstudent') && (
                  <div 
                    className="mb-4 border-top pt-4"
                    onClick={handleInputInteraction}
                    onMouseDown={handleInputInteraction}
                  >
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <FiBook size={18} />
                      Student Assignments
                    </h6>
                    
                    <div 
                      className="row g-3"
                      onClick={handleInputInteraction}
                      onMouseDown={handleInputInteraction}
                    >
                      <div className="col-12">
                        <FormField label="Instructor(s)" icon={FiUser} className="mb-3">
                          <AsyncSelect
                            value={selectedInstructorIds || []}
                            onChange={(instructorIds) => {
                              const ids = Array.isArray(instructorIds) ? instructorIds : (instructorIds ? [instructorIds] : []);
                              setSelectedInstructorIds(ids);
                              setValue("instructor_ids", ids);
                              // Clear cohort selection when instructor changes
                              setValue("cohort_ids", []);
                              setValue("subject_offering_ids", []);
                            }}
                            fetchUrl={userOrgId ? `/api/users?roles=instructor,orginstructor&orgId=${userOrgId}` : '/api/users?roles=instructor,orginstructor'}
                            placeholder="Select instructor(s) to filter cohorts..."
                            ariaLabel="instructors"
                            multiple={true}
                            autoLoadOnFocus={true}
                          />
                          <small className="text-muted d-block mt-1">
                            Select one or more instructors to filter available cohorts. Only cohorts assigned to the selected instructors will be shown.
                          </small>
                        </FormField>
                      </div>

                      <div className="col-12">
                        <FormField label="Cohort(s)" icon={FiUsers} required error={errors.cohort_ids}>
                          <AsyncSelect
                            value={watch("cohort_ids") || []}
                            onChange={(v) => {
                              const ids = Array.isArray(v) ? v : (v ? [v] : []);
                              setValue("cohort_ids", ids);
                              // Clear subject offerings when cohorts change
                              setValue("subject_offering_ids", []);
                              // Fetch subject offerings for the first selected cohort
                              if (ids.length > 0) {
                                fetchSubjectOfferings(ids[0]);
                              } else {
                                setAvailableOfferings([]);
                                setCohortHasOfferings(true);
                              }
                            }}
                            fetchUrl={cohortFetchUrl}
                            placeholder="Select cohort(s)..."
                            ariaLabel="cohorts"
                            multiple={true}
                            autoLoadOnFocus={selectedInstructorIds && selectedInstructorIds.length > 0}
                            orgId={userOrgId}
                            onItemSelect={(item) => {
                              if (item.program_node_id) {
                                setValue("program_node_id", item.program_node_id);
                              }
                            }}
                          />
                          <small className="text-muted d-block mt-1">
                            Select one or more cohorts assigned to the selected instructor(s)
                          </small>
                        </FormField>
                      </div>

                      {cohortIds.length > 0 && (
                        <>
                          <div className="col-12">
                            <FormField 
                              label="Subject Offerings" 
                              icon={FiBook} 
                              required={cohortHasOfferings}
                              error={errors.subject_offering_ids}
                            >
                              <AsyncSelect
                                value={subjectOfferingIds || []}
                                onChange={(v) => setValue("subject_offering_ids", v)}
                                fetchUrl="/api/search/subjects"
                                placeholder="Select subjects..."
                                ariaLabel="subjects"
                                multiple={true}
                                autoLoadParams={cohortIds.length > 0 ? { cohort_id: cohortIds[0] } : null}
                                autoLoadOnFocus={false}
                                disabled={cohortIds.length === 0 || !cohortHasOfferings}
                              />
                              {!cohortHasOfferings && (
                                <small className="text-warning d-block mt-1">
                                  <FiAlertCircle size={14} className="me-1" />
                                  This cohort has no subject offerings available.
                                </small>
                              )}
                            </FormField>
                          </div>

                          <div className="col-md-6">
                            <FormField label="Roll Number" icon={FiUser}>
                              <input
                                type="text"
                                className="form-control"
                                {...register("roll_no")}
                                placeholder="Optional"
                              />
                            </FormField>
                          </div>
                        </>
                      )}

                      <div className="col-12">
                        <FormField label="Parent(s)" icon={FiUser}>
                          <AsyncSelect
                            value={watch("parent_ids") || []}
                            onChange={(v) => setValue("parent_ids", v)}
                            fetchUrl="/api/users?role=parent"
                            placeholder="Select parent(s)..."
                            ariaLabel="parents"
                            multiple={true}
                            autoLoadOnFocus={true}
                          />
                          <small className="text-muted d-block mt-1">
                            Select one or more parent accounts to link to this student
                          </small>
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* Instructor Assignments - Always show for instructors */}
                {(isInstructor || user?.role === 'instructor' || user?.role === 'orginstructor') && (
                  <div 
                    className="mb-4 border-top pt-4"
                    onClick={handleInputInteraction}
                    onMouseDown={handleInputInteraction}
                  >
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <FiUsers size={18} />
                      Instructor Assignments
                    </h6>
                    
                    <div 
                      className="row g-3"
                      onClick={handleInputInteraction}
                      onMouseDown={handleInputInteraction}
                    >
                      <div className="col-12">
                        <FormField label="Cohorts" icon={FiUsers}>
                          <AsyncSelect
                            value={watch("cohort_ids") || []}
                            onChange={(v) => setValue("cohort_ids", v)}
                            fetchUrl={instructorCohortFetchUrl}
                            placeholder="Select cohorts from your organization..."
                            ariaLabel="cohorts"
                            multiple={true}
                            autoLoadOnFocus={true}
                            orgId={userOrgId}
                          />
                          <small className="text-muted d-block mt-1">
                            Select one or more cohorts from your organization
                          </small>
                        </FormField>
                      </div>

                      <div className="col-12">
                        <FormField label="Subject Offerings" icon={FiBook}>
                          <AsyncSelect
                            value={watch("offering_ids") || []}
                            onChange={(v) => setValue("offering_ids", v)}
                            fetchUrl="/api/search/subjects"
                            placeholder={instructorCohortId ? "Select subject offerings..." : "Select cohorts first, then select subject offerings..."}
                            ariaLabel="offerings"
                            multiple={true}
                            autoLoadParams={instructorCohortId ? { cohort_id: instructorCohortId } : null}
                            autoLoadOnFocus={false}
                            disabled={!instructorCohortId}
                          />
                          <small className="text-muted d-block mt-1">
                            {instructorCohortId 
                              ? `Showing subject offerings for selected cohort(s). ${cohortIds.length > 1 ? `Note: Only showing subjects from the first selected cohort.` : ''}`
                              : "Note: Subject offerings are linked to cohorts. Select cohorts first, then subject offerings will be available."
                            }
                          </small>
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parent Assignments - Always show for parents */}
                {(isParent || user?.role === 'parent') && (
                  <div className="mb-4 border-top pt-4">
                    <h6 className="fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                      <FiUser size={18} />
                      Parent Assignments
                    </h6>
                    
                    <div className="row g-3">
                      <div className="col-12">
                        <FormField label="Linked Students" icon={FiUsers}>
                          <AsyncSelect
                            value={watch("linked_student_ids") || []}
                            onChange={(v) => setValue("linked_student_ids", v)}
                            fetchUrl="/api/users?role=student"
                            placeholder="Select students..."
                            ariaLabel="students"
                            multiple={true}
                            autoLoadOnFocus={true}
                          />
                          <small className="text-muted d-block mt-1">
                            Select one or more student accounts to link to this parent
                          </small>
                        </FormField>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
                    <FiAlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="alert alert-success d-flex align-items-center gap-2 mb-3">
                    <FiCheckCircle size={18} />
                    <span>User assignments updated successfully!</span>
                  </div>
                )}

                <div className="modal-footer border-top pt-3 mt-4">
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <FiLoader size={16} className="spinner-border spinner-border-sm" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <FiSave size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

