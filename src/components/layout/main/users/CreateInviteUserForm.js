"use client";

import { useCallback, useMemo, useState, useEffect, useRef, forwardRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { create } from "zustand";

// Helper function for conditional logging (only in development)
const debugLog = (...args) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args);
  }
};
import { 
  FiChevronLeft, 
  FiChevronRight, 
  FiSearch, 
  FiX, 
  FiCheck, 
  FiMail, 
  FiUser, 
  FiUsers, 
  FiBriefcase, 
  FiShield, 
  FiKey, 
  FiSend, 
  FiClock,
  FiImage,
  FiTag,
  FiCalendar,
  FiBook,
  FiLayers,
  FiHome
} from "react-icons/fi";
import {
  roleEnum,
  mfaMethodEnum,
  inviteDeliveryEnum,
  userCreateSchema,
  userInviteSchema,
} from "@/lib/validation/userSchemas.js";
import { useAvatarUpload } from "@/hooks/useAvatarUpload.js";
import { useToast } from "@/hooks/useToast.js";
import ToastContainer from "@/components/shared/errors/ToastContainer.js";

// Local Zustand store for form UI state
const useFormUIStore = create((set) => ({
  isLoading: false,
  loadingFields: {},
  setLoading: (field, loading) => set((state) => ({
    loadingFields: { ...state.loadingFields, [field]: loading },
    isLoading: Object.values({ ...state.loadingFields, [field]: loading }).some(Boolean),
  })),
  clearLoading: () => set({ isLoading: false, loadingFields: {} }),
}));

// Form Field Component
function FormField({ 
  label, 
  icon: Icon, 
  error, 
  children, 
  required = false,
  className = "",
  labelClassName = "",
  fieldName = "",
  touchedFields = {},
  submitCount = 0
}) {
  // Only show error after form has been submitted (not on blur or change)
  const shouldShowError = error && submitCount > 0;
  
  return (
    <div className={className}>
      <label className={`d-flex align-items-center gap-2 mb-2 fw-medium ${labelClassName}`} style={{ fontSize: '0.875rem' }}>
        {Icon && <Icon size={16} className="text-primary" style={{ flexShrink: 0 }} />}
        <span>{label}{required && <span className="text-danger ms-1">*</span>}</span>
      </label>
      {children}
      {shouldShowError && (
        <div className="d-flex align-items-center gap-1 mt-1">
          <FiX size={12} className="text-danger" />
          <p className="text-danger mb-0" style={{ fontSize: '0.75rem' }}>
            {error.message || error}
          </p>
        </div>
      )}
    </div>
  );
}

// Input Component
const IconInput = forwardRef(({ 
  icon: Icon, 
  error, 
  className = "", 
  containerClassName = "",
  showError = false,
  ...props 
}, ref) => {
  return (
    <div className={`position-relative ${containerClassName}`}>
      <input
        ref={ref}
        className={`form-control ${error && showError ? 'is-invalid border-danger' : ''} ${className}`}
        style={{
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
        }}
        {...props}
      />
    </div>
  );
});

IconInput.displayName = 'IconInput';

// Select Component
const IconSelect = forwardRef(({ 
  icon: Icon, 
  error, 
  className = "", 
  containerClassName = "",
  children,
  showError = false,
  ...props 
}, ref) => {
  return (
    <div className={`position-relative ${containerClassName}`}>
      <select
        ref={ref}
        className={`form-select ${error && showError ? 'is-invalid border-danger' : ''} ${className}`}
        style={{
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
          appearance: 'none',
        }}
        {...props}
      >
        {children}
      </select>
      <div 
        className="position-absolute"
        style={{
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          color: '#6c757d'
        }}
      >
        <FiChevronRight size={14} style={{ transform: 'rotate(90deg)' }} />
      </div>
    </div>
  );
});

IconSelect.displayName = 'IconSelect';

// Lightweight async select with proper error handling
function AsyncSelect({ value, onChange, fetchUrl, placeholder = "Search...", disabled, ariaLabel, multiple = false, autoLoadParams = null, onItemSelect = null, autoLoadOnFocus = false, enablePagination = false }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMorePages, setHasMorePages] = useState(false);
  const [pageSize] = useState(20); // Default page size for pagination
  const lastAutoLoadParamsRef = useRef(null); // Track last autoLoadParams to prevent duplicate calls
  const lastSearchTermRef = useRef(""); // Track last search term to reset pagination on new search

  const search = useCallback(async (term, additionalParams = {}, loadMore = false) => {
    // For subjects with cohort_id, allow empty search term to load all
    // For cohorts with autoLoadOnFocus, allow empty search term to load all
    const shouldSearch = term && term.trim().length > 0;
    const hasAutoLoadParams = autoLoadParams && Object.keys(autoLoadParams).length > 0;
    
    // Reset pagination if search term changed
    const searchTermChanged = term !== lastSearchTermRef.current;
    if (searchTermChanged && !loadMore) {
      lastSearchTermRef.current = term;
      setCurrentPage(1);
    }
    
    const pageToLoad = loadMore ? currentPage + 1 : 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [AsyncSelect] search called:', { 
        term, 
        shouldSearch, 
        hasAutoLoadParams, 
        autoLoadParams, 
        autoLoadOnFocus,
        fetchUrl,
        ariaLabel,
        loadMore,
        pageToLoad
      });
    }
    
    // If no search term and no auto-load params, clear items (unless autoLoadOnFocus is true)
    if (!shouldSearch && !hasAutoLoadParams && !autoLoadOnFocus && !loadMore) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AsyncSelect] Clearing items - no search term, no autoLoadParams, no autoLoadOnFocus');
      }
      setItems([]);
      setError(null);
      setTotalItems(0);
      setHasMorePages(false);
      return;
    }

    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const url = new URL(fetchUrl, window.location.origin);
      if (shouldSearch) {
        url.searchParams.set("q", term.trim());
      }
      url.searchParams.set("page", pageToLoad.toString());
      url.searchParams.set("pageSize", enablePagination ? pageSize.toString() : "100");
      
      // Add auto-load params (e.g., cohort_id for subjects)
      if (autoLoadParams) {
        Object.entries(autoLoadParams).forEach(([key, val]) => {
          if (val) url.searchParams.set(key, val);
        });
      }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AsyncSelect] Fetching URL:', url.toString());
      }
      
      // Add any additional params
      Object.entries(additionalParams).forEach(([key, val]) => {
        if (val) url.searchParams.set(key, val);
      });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const res = await fetch(url.toString(), { 
        method: "GET",
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const newItems = data.items || data || [];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AsyncSelect] Response received:', { 
          itemsCount: newItems.length, 
          total: data.total,
          page: pageToLoad,
          loadMore
        });
      }
      
      if (enablePagination) {
        setTotalItems(data.total || 0);
        const totalPages = Math.ceil((data.total || 0) / pageSize);
        setHasMorePages(pageToLoad < totalPages);
        
        if (loadMore) {
          // Append items when loading more
          setItems(prev => [...prev, ...newItems]);
        } else {
          // Replace items for new search
          setItems(newItems);
        }
        setCurrentPage(pageToLoad);
      } else {
        setItems(newItems);
      }
      setError(null);
    } catch (e) {
      // Handle abort (timeout or cancellation)
      if (e.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else if (e.message) {
        setError(e.message);
      } else {
        setError('Failed to load options. Please try again.');
      }
      if (!loadMore) {
        setItems([]);
      }
      
      // Log error for debugging (but don't throw to avoid unhandled rejection)
      if (process.env.NODE_ENV !== 'production') console.warn('[AsyncSelect] Search error:', e.message || e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchUrl, autoLoadParams, autoLoadOnFocus, enablePagination, pageSize, currentPage]);

  // Auto-load when autoLoadParams change (e.g., when cohort_id is selected)
  useEffect(() => {
    // Stringify autoLoadParams to compare values, not references
    const currentParamsKey = autoLoadParams ? JSON.stringify(autoLoadParams) : null;
    const lastParamsKey = lastAutoLoadParamsRef.current;
    
    // Only trigger if params actually changed
    if (currentParamsKey === lastParamsKey) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AsyncSelect] useEffect skipped - autoLoadParams unchanged:', { ariaLabel });
      }
      return;
    }
    
    lastAutoLoadParamsRef.current = currentParamsKey;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [AsyncSelect] useEffect triggered - autoLoadParams changed:', { 
        autoLoadParams, 
        hasParams: autoLoadParams && Object.keys(autoLoadParams).length > 0,
        ariaLabel,
        currentParamsKey
      });
    }
    
    if (autoLoadParams && Object.keys(autoLoadParams).length > 0) {
      // Auto-load all items when cohort is selected
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AsyncSelect] Calling search("", {}) to auto-load items');
      }
      search("", {}).catch(err => {
        if (process.env.NODE_ENV !== 'production') console.error('🔍 [AsyncSelect] Search error in useEffect:', err);
      });
      setHasLoaded(true);
    } else {
      // Clear items when auto-load params are removed
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [AsyncSelect] Clearing items - no autoLoadParams');
      }
      setItems([]);
      setHasLoaded(false);
      setCurrentPage(1);
      setTotalItems(0);
      setHasMorePages(false);
    }
  }, [autoLoadParams, search]); // Include search to ensure we use the latest version with updated autoLoadParams

  // Auto-load on focus if autoLoadOnFocus is true and hasn't loaded yet
  const handleFocus = useCallback(() => {
    if (autoLoadOnFocus && !hasLoaded && !loading && items.length === 0) {
      search("", {});
      setHasLoaded(true);
    }
  }, [autoLoadOnFocus, hasLoaded, loading, items.length, search]);

  // Load more handler for pagination
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMorePages) {
      search(q, {}, true);
    }
  }, [loadingMore, hasMorePages, q, search]);

  // Debounce with error handling
  const onInput = useMemo(() => {
    let t = null;
    return (e) => {
      const term = e.target.value;
      setQ(term);
      if (t) clearTimeout(t);
      
      // Wrap search call to handle any unhandled rejections
      t = setTimeout(() => {
        search(term).catch((err) => {
          // This should not happen as search handles errors internally,
          // but just in case, we catch it here
          if (process.env.NODE_ENV !== 'production') console.error('[AsyncSelect] Unhandled search error:', err);
          setError('An unexpected error occurred. Please try again.');
          setLoading(false);
        });
      }, 300);
    };
  }, [search]);

  return (
    <div className="w-full" style={{ position: 'relative' }}>
      <input
        type="text"
        className="form-control mb-2"
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={onInput}
        onFocus={handleFocus}
        disabled={disabled}
      />
      <div 
        className="border rounded p-2 max-h-40 overflow-auto bg-whiteColor dark:bg-whiteColor-dark"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="text-sm text-textColor/70 dark:text-textColor-dark/70">Loading...</div>
        ) : error ? (
          <div className="text-sm text-red-500 dark:text-red-400">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-textColor/70 dark:text-textColor-dark/70">
            {q.trim().length > 0 ? "No results" : "Type to search..."}
          </div>
        ) : (
          <>
            <ul className="space-y-1">
              {items.map((it) => (
                <li key={it.id}>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
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
                          // Call onItemSelect callback with full item if provided
                          if (onItemSelect) {
                            onItemSelect(it);
                          }
                        }
                      }}
                    />
                    <span className="text-sm">{it.label || it.title || it.name || it.email || it.code}</span>
                  </label>
                </li>
              ))}
            </ul>
            {enablePagination && hasMorePages && (
              <div className="mt-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore || disabled}
                  className="w-full text-sm text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      Loading...
                    </span>
                  ) : (
                    `Load More (${totalItems - items.length} remaining)`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Organization Select with Pagination - Only for superadmin organizations field
function OrganizationSelect({ value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const ITEMS_PER_PAGE = 5;

  // Fetch organizations with pagination
  const fetchOrganizations = useCallback(async (search = "", page = 1) => {
    if (disabled) return;

    setLoading(true);
    setError(null);
    
    try {
      const url = new URL("/api/search/orgs", window.location.origin);
      if (search.trim()) {
        url.searchParams.set("q", search.trim());
      }
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(ITEMS_PER_PAGE));
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const orgs = data.items || data || [];
      setItems(orgs);
      setTotal(data.total || orgs.length);
      setTotalPages(Math.max(1, Math.ceil((data.total || orgs.length) / ITEMS_PER_PAGE)));
      setCurrentPage(page);
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Request timeout. Please try again.');
      } else if (e.message) {
        setError(e.message);
      } else {
        setError('Failed to load organizations. Please try again.');
      }
      setItems([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  // Debounced search
  const debouncedSearch = useMemo(() => {
    let timeoutId = null;
    return (term) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setCurrentPage(1);
        fetchOrganizations(term, 1);
      }, 300);
    };
  }, [fetchOrganizations]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  }, [debouncedSearch]);

  // Load initial data when dropdown opens
  useEffect(() => {
    if (isOpen && !loading && items.length === 0) {
      fetchOrganizations(searchTerm, currentPage);
    }
  }, [isOpen, fetchOrganizations, searchTerm, currentPage, loading, items.length]);

  // Fetch selected organization details when value changes
  useEffect(() => {
    if (!value) {
      setSelectedOrg(null);
      return;
    }

    // Try to find in current items first
    const found = items.find(item => item.id === value);
    if (found) {
      setSelectedOrg(found);
      return;
    }

    // If not found in current items, check if we already have it
    setSelectedOrg(prev => {
      if (prev && prev.id === value) {
        return prev; // Already have the correct org
      }
      return prev; // Keep previous while we fetch
    });

    // Fetch the specific organization
    let cancelled = false;
    fetch(`/api/search/orgs?pageSize=100`, {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        const orgs = data.items || data || [];
        const org = orgs.find(item => item.id === value);
        if (org) {
          setSelectedOrg(org);
        } else {
          // Fallback: create a minimal org object with just the ID
          setSelectedOrg({ id: value, name: `Organization ${value.substring(0, 8)}...` });
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback on error
        setSelectedOrg({ id: value, name: `Organization ${value.substring(0, 8)}...` });
      });

    return () => {
      cancelled = true;
    };
  }, [value, items]);

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchOrganizations(searchTerm, newPage);
    }
  }, [searchTerm, totalPages, fetchOrganizations]);

  // Handle organization selection
  const handleSelect = useCallback((org) => {
    setSelectedOrg(org);
    onChange(org.id);
    setIsOpen(false);
    setSearchTerm("");
  }, [onChange]);

  // Handle clear selection
  const handleClear = useCallback((e) => {
    e.stopPropagation();
    setSelectedOrg(null);
    onChange(null);
    setSearchTerm("");
  }, [onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected Organization Display */}
      <div
        className={`form-control d-flex align-items-center justify-content-between cursor-pointer ${
          disabled ? 'opacity-50' : ''
        }`}
        style={{
          minHeight: '38px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
          {selectedOrg ? (
            <>
              <span className="text-truncate" style={{ maxWidth: 'calc(100% - 30px)' }}>
                {selectedOrg.name || selectedOrg.label || selectedOrg.title || 'Selected Organization'}
              </span>
              {!disabled && (
                <button
                  type="button"
                  className="btn btn-sm p-0 border-0 bg-transparent text-muted"
                  style={{ width: '20px', height: '20px', flexShrink: 0 }}
                  onClick={handleClear}
                  aria-label="Clear selection"
                >
                  <FiX size={14} />
                </button>
              )}
            </>
          ) : (
            <span className="text-muted">Select organization...</span>
          )}
        </div>
        <div className="text-muted" style={{ flexShrink: 0 }}>
          <FiChevronRight 
            size={16} 
            style={{ 
              transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }} 
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-lg"
          style={{
            top: 'calc(100% + 4px)',
            zIndex: 1050,
            maxHeight: '400px',
            animation: 'fadeIn 0.2s ease',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translateY(-10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {/* Search Input */}
          <div className="p-2 border-bottom">
            <div className="position-relative">
              <FiSearch 
                className="position-absolute"
                style={{ left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6c757d' }}
                size={16}
              />
              <input
                ref={searchInputRef}
                type="text"
                className="form-control form-control-sm ps-5"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={handleSearchChange}
                style={{ fontSize: '0.875rem' }}
              />
            </div>
          </div>

          {/* Results */}
          <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {loading ? (
              <div className="p-4 text-center text-muted">
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="mt-2 small">Loading organizations...</div>
              </div>
            ) : error ? (
              <div className="p-3 text-center text-danger small">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-4 text-center text-muted small">
                {searchTerm.trim() ? 'No organizations found' : 'Start typing to search...'}
              </div>
            ) : (
              <>
                <div className="list-group list-group-flush">
                  {items.map((org) => {
                    const isSelected = value === org.id;
                    return (
                      <button
                        key={org.id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${
                          isSelected ? 'active bg-primary text-white' : ''
                        }`}
                        style={{
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => handleSelect(org)}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="flex-grow-1 text-start">
                          <div className="fw-medium">
                            {org.name || org.label || org.title || 'Unnamed Organization'}
                          </div>
                          {org.code && (
                            <div className={`small ${isSelected ? 'text-white-50' : 'text-muted'}`}>
                              Code: {org.code}
                            </div>
                          )}
                        </div>
                        {isSelected && (
                          <FiCheck size={18} className="text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="border-top p-2 bg-light">
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="small text-muted">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={currentPage === 1 || loading}
                          onClick={() => handlePageChange(currentPage - 1)}
                          style={{ minWidth: '32px', padding: '4px 8px' }}
                        >
                          <FiChevronLeft size={14} />
                        </button>
                        <div className="small text-muted px-2">
                          Page {currentPage} of {totalPages}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={currentPage === totalPages || loading}
                          onClick={() => handlePageChange(currentPage + 1)}
                          style={{ minWidth: '32px', padding: '4px 8px' }}
                        >
                          <FiChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AvatarUploader({ register, setValue, errors }) {
  const { upload, uploading, progress, error } = useAvatarUpload();
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const setLoading = useFormUIStore((state) => state.setLoading);

  useEffect(() => {
    setLoading('avatar', uploading);
  }, [uploading, setLoading]);

  // Cleanup blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    
    // Revoke previous blob URL if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (!file) {
      setValue("avatar_url", undefined, { shouldValidate: false });
      setPreview(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Create preview URL
    const blobUrl = URL.createObjectURL(file);
    setPreviewUrl(blobUrl);
    setPreview(blobUrl);

    // Upload file
    try {
      const res = await upload(file);
      if (res?.url) {
        setValue("avatar_url", res.url, { shouldValidate: false });
        // Keep preview showing the uploaded URL if available
        // Otherwise keep the blob URL preview
      } else {
        setValue("avatar_url", undefined, { shouldValidate: false });
      }
    } catch (uploadError) {
      setValue("avatar_url", undefined, { shouldValidate: false });
      if (process.env.NODE_ENV !== 'production') console.error('Avatar upload error:', uploadError);
      // Keep preview even if upload fails, so user can see what they selected
    }
  };

  return (
    <FormField 
      label="Avatar" 
      icon={FiImage}
      error={errors.avatar_url || error}
      className="w-100"
    >
      <div className="d-flex flex-column gap-2">
        <div className="d-flex align-items-center gap-3">
          <div className="position-relative flex-grow-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="form-control form-control-sm"
              style={{ fontSize: '0.875rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && (
              <div className="position-absolute" style={{ right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                <div className="spinner-border spinner-border-sm text-primary" role="status" style={{ width: '16px', height: '16px' }}>
                  <span className="visually-hidden">Uploading...</span>
                </div>
              </div>
            )}
          </div>
          {uploading && <span className="text-muted small">{progress}%</span>}
        </div>
        {preview && (
          <div className="mt-2 d-flex align-items-center gap-2">
            <div className="position-relative">
              <img 
                src={preview} 
                alt="Avatar preview" 
                className="rounded-circle border" 
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  objectFit: 'cover',
                  display: 'block'
                }}
                onError={(e) => {
                  if (process.env.NODE_ENV !== 'production') console.error('Failed to load preview image');
                  e.target.style.display = 'none';
                }}
              />
              <span className="text-muted small ms-2">Preview</span>
            </div>
          </div>
        )}
        <input 
          type="hidden" 
          {...register("avatar_url", {
            validate: (value) => {
              if (!value || value.trim() === '') return true;
              try {
                new URL(value);
                return true;
              } catch {
                return "Please provide a valid URL";
              }
            }
          })} 
        />
        <p className="text-muted mb-0 small">Optional: Upload an image (max 2MB) or leave empty</p>
      </div>
    </FormField>
  );
}

export default function CreateInviteUserForm({ actorRole = "superadmin", onSuccess }) {
  const [mode, setMode] = useState("create"); // 'create' | 'invite'
  const schema = mode === "create" ? userCreateSchema : userInviteSchema;
  const isSubmittingRef = useRef(false);
  const { toasts, removeToast, success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  // Set when an invite was created but the email could not be delivered, so the admin can copy the link.
  const [inviteLink, setInviteLink] = useState(null);
  
  // Create a safe resolver wrapper that prevents unhandled errors
  const safeResolver = useCallback((values, context, options) => {
    try {
      // Only validate if we're actually submitting
      // With mode: "onSubmit", validation should only happen on submit
      // Check multiple indicators to ensure we're in a submit context
      const isSubmitContext = isSubmittingRef.current || 
                              context?.trigger === 'submit' ||
                              context?.shouldValidate === true;
      
      if (!isSubmitContext) {
        // Not a submit attempt - return values without validation errors
        // This prevents validation from running on change/blur
        return {
          values: values,
          errors: {},
        };
      }
      
      // Clean up the values before validation
      // Convert empty strings to undefined for optional fields
      const cleanedValues = { ...values };
      
      // Normalize and clean required fields
      // Email: Let Zod handle normalization (it has .trim().toLowerCase()) - just ensure it's a string
      const emailValue = cleanedValues.email;
      
      debugLog('🔍 [FORM DEBUG] Resolver - Original email value:', emailValue);
      debugLog('🔍 [FORM DEBUG] Resolver - Email type:', typeof emailValue);
      debugLog('🔍 [FORM DEBUG] Resolver - Email length:', emailValue?.length);
      
      // Ensure email is a string - Zod will handle trim, lowercase, and validation
      // Don't do normalization here since Zod already does .trim().toLowerCase()
      if (emailValue === undefined || emailValue === null) {
        cleanedValues.email = "";
        debugLog('🔍 [FORM DEBUG] Resolver - Email is undefined/null, setting to empty string');
      } else {
        // Convert to string and let Zod do the normalization
        const emailStr = String(emailValue);
        debugLog('🔍 [FORM DEBUG] Resolver - Email as string:', emailStr);
        debugLog('🔍 [FORM DEBUG] Resolver - Email charCodes:', emailStr.split('').map(c => c.charCodeAt(0)));
        
        // Just ensure it's a string - Zod's .trim().toLowerCase().email() will handle the rest
        cleanedValues.email = emailStr;
        debugLog('🔍 [FORM DEBUG] Resolver - Passing email to Zod (Zod will trim/lowercase):', emailStr);
      }
      
      // Role: normalize to match enum exactly (lowercase, trimmed)
      const roleValue = cleanedValues.role;
      if (roleValue !== undefined && roleValue !== null && roleValue !== '') {
        cleanedValues.role = String(roleValue).trim().toLowerCase();
        // Ensure it's a valid role - if not, default to student
        const validRoles = ['superadmin', 'admin', 'instructor', 'student', 'vendor', 'parent', 'alumni', 'mentor', 'brand', 'company'];
        if (!validRoles.includes(cleanedValues.role)) {
          cleanedValues.role = "student";
        }
      } else {
        // Set default role if not provided
        cleanedValues.role = "student";
      }
      
      // Password: normalize (trim only, keep case)
      if (mode === "create") {
        if (cleanedValues.temp_password !== undefined && cleanedValues.temp_password !== null) {
          if (typeof cleanedValues.temp_password === 'string') {
            cleanedValues.temp_password = cleanedValues.temp_password.trim();
          } else {
            cleanedValues.temp_password = String(cleanedValues.temp_password).trim();
          }
        } else {
          cleanedValues.temp_password = "";
        }
      }
      
      // Clean optional string fields
      if (cleanedValues.first_name === '') cleanedValues.first_name = undefined;
      if (cleanedValues.last_name === '') cleanedValues.last_name = undefined;
      if (cleanedValues.avatar_url === '') cleanedValues.avatar_url = undefined;
      if (cleanedValues.roll_no === '') cleanedValues.roll_no = undefined;
      if (cleanedValues.company_name === '') cleanedValues.company_name = undefined;
      if (cleanedValues.gstin === '') cleanedValues.gstin = undefined;
      
      // Clean role-specific optional fields
      if (cleanedValues.cohort_id === '' || cleanedValues.cohort_id === null) cleanedValues.cohort_id = undefined;
      if (cleanedValues.program_node_id === '' || cleanedValues.program_node_id === null) cleanedValues.program_node_id = undefined;
      if (cleanedValues.org_id === '' || cleanedValues.org_id === null) cleanedValues.org_id = undefined;
      
      // Clean arrays - ensure they're arrays, not empty strings
      if (cleanedValues.cohort_ids && !Array.isArray(cleanedValues.cohort_ids)) cleanedValues.cohort_ids = undefined;
      if (cleanedValues.offering_ids && !Array.isArray(cleanedValues.offering_ids)) cleanedValues.offering_ids = undefined;
      if (cleanedValues.linked_student_ids && !Array.isArray(cleanedValues.linked_student_ids)) cleanedValues.linked_student_ids = undefined;
      if (cleanedValues.subject_offering_ids && !Array.isArray(cleanedValues.subject_offering_ids)) cleanedValues.subject_offering_ids = undefined;
      
      // Clean up role-specific fields that don't apply to the selected role
      const selectedRole = cleanedValues.role;
      if (selectedRole && selectedRole !== 'student') {
        // Remove student-specific fields for non-student roles
        cleanedValues.cohort_id = undefined;
        cleanedValues.subject_offering_ids = undefined;
        cleanedValues.roll_no = undefined;
        cleanedValues.program_node_id = undefined;
      }
      
      debugLog('🔍 [FORM DEBUG] Resolver - Values being sent to Zod:', JSON.stringify(cleanedValues, null, 2));
      debugLog('🔍 [FORM DEBUG] Resolver - Email value for Zod:', cleanedValues.email);
      debugLog('🔍 [FORM DEBUG] Resolver - Email JSON:', JSON.stringify(cleanedValues.email));
      debugLog('🔍 [FORM DEBUG] Resolver - Email string representation:', String(cleanedValues.email));
      
      // Use zodResolver with error mapping
      const zodResolve = zodResolver(schema, {
        errorMap: (issue, ctx) => {
          debugLog('🔍 [FORM DEBUG] Resolver - Zod validation issue:', JSON.stringify(issue, null, 2));
          debugLog('🔍 [FORM DEBUG] Resolver - Issue path:', issue.path);
          debugLog('🔍 [FORM DEBUG] Resolver - Issue code:', issue.code);
          debugLog('🔍 [FORM DEBUG] Resolver - Issue message:', issue.message);
          debugLog('🔍 [FORM DEBUG] Resolver - Context:', ctx);
          
          // Check if email field has error
          if (issue.path && issue.path.length > 0 && issue.path[0] === 'email') {
            const emailValue = cleanedValues.email;
            debugLog('🔍 [FORM DEBUG] Resolver - Email field error, current email value:', emailValue);
            debugLog('🔍 [FORM DEBUG] Resolver - Email value type:', typeof emailValue);
            debugLog('🔍 [FORM DEBUG] Resolver - Email value length:', emailValue?.length);
            
            // Check if email is empty or undefined - show "required" message
            // This handles both empty string and undefined cases
            if (emailValue === undefined || emailValue === null || emailValue === '' || 
                (typeof emailValue === 'string' && emailValue.trim() === '')) {
              debugLog('🔍 [FORM DEBUG] Resolver - Email is empty/undefined, showing required message');
              return { message: 'Email is required' };
            }
            
            // For invalid format errors, show better message
            if ((issue.code === 'invalid_string' || issue.code === 'invalid_format') && issue.validation === 'email') {
              debugLog('🔍 [FORM DEBUG] Resolver - Email format invalid, showing format error');
              return { message: `Invalid email address: "${emailValue}"` };
            }
          }
          
          // Return user-friendly error messages for other email validation errors
          if ((issue.code === 'invalid_string' || issue.code === 'invalid_format') && issue.validation === 'email') {
            const emailValue = cleanedValues.email || '';
            // If email is empty, show required message
            if (!emailValue || emailValue.trim() === '') {
              return { message: 'Email is required' };
            }
            return { message: 'Please enter a valid email address' };
          }
          if (issue.code === 'too_small' && issue.type === 'string') {
            return { message: `Must be at least ${issue.minimum} characters` };
          }
          if (issue.code === 'custom') {
            return { message: issue.message || ctx.defaultError };
          }
          if (issue.code === 'invalid_enum_value' || issue.code === 'invalid_value') {
            return { message: `Please select a valid option` };
          }
          if (issue.code === 'invalid_type') {
            return { message: `Invalid input type` };
          }
          return { message: ctx.defaultError };
        },
      });
      
      // Call the resolver with cleaned values - it returns a promise
      const result = zodResolve(cleanedValues, context, options);
      
      // Wrap the promise to catch any errors
      if (result && typeof result.then === 'function') {
        return result.catch((error) => {
          // Catch any errors from the resolver - silently handle them
          // Errors are converted to form errors format and won't be thrown
          return handleResolverError(error);
        });
      }
      
      return result;
    } catch (error) {
      // Catch synchronous errors - silently handle them
      // Errors are converted to form errors format and won't be thrown
      return handleResolverError(error);
    }
    
    // Helper to convert errors to form errors format
    function handleResolverError(error) {
      // If it's a ZodError-like object, convert it
      if (error && (error.name === 'ZodError' || error.issues || error.errors)) {
        const issues = error.issues || error.errors || [];
        const fieldErrors = {};
        issues.forEach((issue) => {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : (issue.path || 'root');
          fieldErrors[path] = {
            type: issue.code || 'validation',
            message: issue.message || 'Validation error',
          };
        });
        return {
          values: {},
          errors: fieldErrors,
        };
      }
      
      // For other errors, return empty errors (don't throw)
      return {
        values: {},
        errors: {},
      };
    }
  }, [schema, mode]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, touchedFields, submitCount },
  } = useForm({
    resolver: safeResolver,
    defaultValues: {
      email: "",
      first_name: "",
      last_name: "",
      role: "student",
      mfa_required: false,
      mfa_method: "none",
      delivery: "invite_link",
      expiry_hours: 72,
      must_reset_password: true,
      avatar_url: undefined,
      temp_password: "",
    },
    mode: "onSubmit", // Only validate on submit, not on change or blur
    reValidateMode: "onSubmit", // Re-validate on submit only
    shouldFocusError: true,
    shouldUnregister: false,
    criteriaMode: "firstError", // Only show first error per field
    shouldUseNativeValidation: false, // Disable native browser validation
  });

  const role = watch("role");
  const cohortId = watch("cohort_id");
  const emailValue = watch("email"); // Watch email to see if it's being captured

  // Handle role changes - clear org_id for brand role
  useEffect(() => {
    if (role === "brand") {
      // Brand users must have org_id = null (global)
      setValue("org_id", null, { shouldValidate: false });
    }
  }, [role, setValue]);

  // Clear subjects when cohort changes (for student role only)
  useEffect(() => {
    if (role === "student") {
      setValue("subject_offering_ids", [], { shouldValidate: false });
    }
  }, [cohortId, role, setValue]);


  // Track available offerings for the selected cohort to validate client-side
  const [availableOfferings, setAvailableOfferings] = useState([]);
  const [cohortHasOfferings, setCohortHasOfferings] = useState(true);

  // Fetch available offerings when cohort changes
  useEffect(() => {
    if (role === "student" && cohortId) {
      // Fetch offerings for this cohort to validate selections
      const fetchOfferings = async () => {
        try {
          const url = new URL("/api/search/subjects", window.location.origin);
          url.searchParams.set("cohort_id", cohortId);
          url.searchParams.set("page", "1");
          url.searchParams.set("pageSize", "100");
          
          const res = await fetch(url.toString(), {
            method: "GET",
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (res.ok) {
            const data = await res.json();
            const offerings = data.items || [];
            setAvailableOfferings(offerings.map(item => item.id));
            setCohortHasOfferings(offerings.length > 0);
            
            // If cohort has no offerings, clear selected offerings
            if (offerings.length === 0) {
              setValue("subject_offering_ids", [], { shouldValidate: false });
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') console.warn('[Form] Failed to fetch offerings for validation:', error);
          setAvailableOfferings([]);
          setCohortHasOfferings(true); // Default to true to avoid blocking
        }
      };
      
      fetchOfferings();
    } else {
      setAvailableOfferings([]);
      setCohortHasOfferings(true);
    }
  }, [cohortId, role, setValue]);

  // Validate selected offerings belong to selected cohort
  const validateOfferings = useCallback((selectedOfferings) => {
    if (!cohortId || !selectedOfferings || selectedOfferings.length === 0) {
      return true;
    }
    
    if (availableOfferings.length > 0) {
      const invalidOfferings = selectedOfferings.filter(id => !availableOfferings.includes(id));
      if (invalidOfferings.length > 0) {
        setValue("subject_offering_ids", selectedOfferings.filter(id => availableOfferings.includes(id)), { shouldValidate: true });
        if (typeof window !== "undefined") {
          alert(`Some selected subjects do not belong to the selected cohort. They have been removed.`);
        }
        return false;
      }
    }
    
    return true;
  }, [cohortId, availableOfferings, setValue]);

  // Debug: Log email value changes
  useEffect(() => {
      debugLog('🔍 [FORM DEBUG] Email value changed:', emailValue);
      debugLog('🔍 [FORM DEBUG] Email value type:', typeof emailValue);
  }, [emailValue]);

  // Reset form when mode changes to prevent validation errors from previous mode
  useEffect(() => {
    reset({
      role: "student",
      mfa_required: false,
      mfa_method: "none",
      delivery: "invite_link",
      expiry_hours: 72,
      must_reset_password: true,
      avatar_url: undefined,
      temp_password: "",
      email: "",
      first_name: "",
      last_name: "",
      // Student-specific fields
      cohort_id: undefined,
      subject_offering_ids: [],
      roll_no: undefined,
      program_node_id: undefined,
      // Instructor-specific fields
      cohort_ids: undefined,
      offering_ids: undefined,
      // Parent-specific fields
      linked_student_ids: undefined,
      // Vendor-specific fields
      vendor_category: undefined,
      company_name: undefined,
      gstin: undefined,
      // Mentor/Alumni-specific fields (alumni maps to mentor)
      graduation_year: undefined,
    });
  }, [mode, reset]);

  const onSubmit = async (values) => {
      debugLog('🔍 [FORM DEBUG] ===== ONSUBMIT CALLED =====');
      debugLog('🔍 [FORM DEBUG] Mode:', mode);
      debugLog('🔍 [FORM DEBUG] Raw values:', JSON.stringify(values, null, 2));
    
    try {
      setInviteLink(null); // clear any previously surfaced invite link
      // Clean up the values before sending to API
      const cleanedValues = { ...values };
      
      debugLog('🔍 [FORM DEBUG] Starting value cleanup...');
      
      // Normalize required fields - use same logic as resolver
      if (cleanedValues.email !== undefined && cleanedValues.email !== null) {
        let emailStr = String(cleanedValues.email);
        emailStr = emailStr.replace(/\s+/g, ''); // Remove all whitespace
        emailStr = emailStr.trim().toLowerCase();
        emailStr = emailStr.replace(/[\x00-\x1F\x7F]/g, ''); // Remove non-printable chars
        emailStr = emailStr.replace(/^\.+|\.+$/g, ''); // Remove leading/trailing dots
        cleanedValues.email = emailStr;
      }
      if (cleanedValues.role && typeof cleanedValues.role === 'string') {
        cleanedValues.role = cleanedValues.role.trim().toLowerCase();
      }
      if (cleanedValues.temp_password && typeof cleanedValues.temp_password === 'string') {
        cleanedValues.temp_password = cleanedValues.temp_password.trim();
      }
      
      // Clean optional string fields - convert empty strings to undefined
      if (cleanedValues.first_name === '') cleanedValues.first_name = undefined;
      if (cleanedValues.last_name === '') cleanedValues.last_name = undefined;
      if (!cleanedValues.avatar_url || cleanedValues.avatar_url.trim() === '') {
        cleanedValues.avatar_url = undefined;
      }
      if (cleanedValues.roll_no === '') cleanedValues.roll_no = undefined;
      if (cleanedValues.company_name === '') cleanedValues.company_name = undefined;
      if (cleanedValues.gstin === '') cleanedValues.gstin = undefined;
      
      // Clean optional ID fields
      if (cleanedValues.cohort_id === '' || cleanedValues.cohort_id === null) cleanedValues.cohort_id = undefined;
      if (cleanedValues.program_node_id === '' || cleanedValues.program_node_id === null) cleanedValues.program_node_id = undefined;
      if (cleanedValues.org_id === '' || cleanedValues.org_id === null) cleanedValues.org_id = undefined;
      
      // Clean arrays - remove empty arrays
      if (Array.isArray(cleanedValues.cohort_ids) && cleanedValues.cohort_ids.length === 0) cleanedValues.cohort_ids = undefined;
      if (Array.isArray(cleanedValues.offering_ids) && cleanedValues.offering_ids.length === 0) cleanedValues.offering_ids = undefined;
      if (Array.isArray(cleanedValues.linked_student_ids) && cleanedValues.linked_student_ids.length === 0) cleanedValues.linked_student_ids = undefined;
      if (Array.isArray(cleanedValues.subject_offering_ids) && cleanedValues.subject_offering_ids.length === 0) cleanedValues.subject_offering_ids = undefined;

      debugLog('🔍 [FORM DEBUG] Cleaned values:', JSON.stringify(cleanedValues, null, 2));

      const url = mode === "create" ? "/api/users" : "/api/users/invite";
      debugLog('🔍 [FORM DEBUG] API URL:', url);
      debugLog('🔍 [FORM DEBUG] Making fetch request...');
      
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedValues),
        credentials: 'include',
      });

      debugLog('🔍 [FORM DEBUG] Response status:', res.status);
      debugLog('🔍 [FORM DEBUG] Response ok:', res.ok);
      
      const data = await res.json();
      debugLog('🔍 [FORM DEBUG] Response data:', JSON.stringify(data, null, 2));

      if (!res.ok) {
        // Build a user-friendly message: prefer the server's message, then the first validation
        // detail, then a code-based fallback. (Previously this surfaced the raw error CODE.)
        let msg = data?.message;
        if (!msg && Array.isArray(data?.details) && data.details.length > 0) {
          const first = data.details[0];
          const field = Array.isArray(first?.path) ? first.path.filter(Boolean).join('.') : first?.path;
          msg = field ? `${field}: ${first.message}` : (first?.message || 'Please check the highlighted fields and try again.');
        }
        if (!msg) {
          const CODE_FALLBACKS = {
            Unauthorized: 'Your session has expired. Please log in again.',
            Forbidden: 'You do not have permission to perform this action.',
            VALIDATION_ERROR: 'Please check the highlighted fields and try again.',
            RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again shortly.',
            SERVER_ERROR: 'Unable to complete the request at this time. Please try again.',
          };
          msg = CODE_FALLBACKS[data?.error] || 'Unable to complete the request at this time. Please try again.';
        }
        debugLog('🔍 [FORM DEBUG] Request failed, throwing error:', msg);
        const err = new Error(msg);
        err.code = data?.error;
        err.status = res.status;
        throw err;
      }

      // Success - show toast and call callback
      debugLog('🔍 [FORM DEBUG] Request successful!');

      if (mode === "create") {
        toastSuccess("User created successfully.");
        // Defer the close so the toast is visible before the modal (if any) unmounts.
        setTimeout(() => { if (onSuccess) onSuccess(); }, 1200);
      } else {
        // Invite mode: report the actual email-delivery outcome from the backend.
        const emailSent = data?.invite?.emailSent;
        if (emailSent === false) {
          // Invite was created but the email did not go out — surface the link so the
          // admin can share it manually. Keep the modal open (don't auto-close).
          toastWarning("Invitation created, but the email couldn't be sent. Copy the link below to share it manually.", 9000);
          if (data?.invite?.inviteUrl) setInviteLink(data.invite.inviteUrl);
        } else {
          toastSuccess("Invitation sent successfully.");
          setTimeout(() => { if (onSuccess) onSuccess(); }, 1200);
        }
      }
      debugLog('🔍 [FORM DEBUG] ===== ONSUBMIT COMPLETED SUCCESSFULLY =====');
    } catch (error) {
      debugLog('🔍 [FORM DEBUG] ===== ERROR IN ONSUBMIT =====');
      debugLog('🔍 [FORM DEBUG] Error:', error);
      debugLog('🔍 [FORM DEBUG] Error message:', error?.message);
      debugLog('🔍 [FORM DEBUG] Error stack:', error?.stack);
      // Show a toast for network/server errors.
      // Field-level validation errors are handled by react-hook-form and displayed inline.
      if (error.message && !error.errors) {
        if (error.code === 'VALIDATION_ERROR') {
          toastWarning(error.message);
        } else {
          toastError(error.message);
        }
      }
      // Re-throw to let react-hook-form handle validation errors
      throw error;
    }
  };

  const isSuperadmin = actorRole === "superadmin";
  const isAdmin = actorRole === "admin";
  const isInstructor = actorRole === "instructor";

  // Get available roles based on actor role
  const getAvailableRoles = () => {
    // Filter out 'alumni' from UI (backend still accepts it for backward compatibility)
    const allRoles = roleEnum.options.filter(r => r !== 'alumni');
    if (isInstructor) {
      // Instructor can only create students
      return allRoles.filter(r => r === 'student');
    } else if (isAdmin) {
      // Admin can create all roles except brand and superadmin
      return allRoles.filter(r => r !== 'brand' && r !== 'superadmin');
    } else if (isSuperadmin) {
      // Superadmin can create all roles
      return allRoles;
    }
    return allRoles; // Default fallback
  };

  const availableRoles = getAvailableRoles();

  // Get role display name (for UI labels)
  const getRoleDisplayName = (roleCode) => {
    const roleNames = {
      'alumni': 'Mentor', // Map alumni to Mentor in UI
      'mentor': 'Mentor',
      'superadmin': 'Superadmin',
      'admin': 'Admin',
      'instructor': 'Instructor',
      'student': 'Student',
      'vendor': 'Vendor',
      'parent': 'Parent',
      'brand': 'Brand',
    };
    return roleNames[roleCode] || roleCode.charAt(0).toUpperCase() + roleCode.slice(1);
  };

  // Wrapper to catch any unhandled errors during form submission
  const handleFormSubmit = useCallback(async (e) => {
      debugLog('🔍 [FORM DEBUG] ===== HANDLE FORM SUBMIT CALLED =====');
      debugLog('🔍 [FORM DEBUG] Event:', e);
      debugLog('🔍 [FORM DEBUG] Mode:', mode);
      debugLog('🔍 [FORM DEBUG] Is Submitting Ref:', isSubmittingRef.current);
    
    e?.preventDefault();
      debugLog('🔍 [FORM DEBUG] PreventDefault called');
    
    // Mark that we're submitting so resolver knows to validate
    isSubmittingRef.current = true;
      debugLog('🔍 [FORM DEBUG] Set isSubmittingRef.current = true');
    
    try {
      debugLog('🔍 [FORM DEBUG] Calling handleSubmit...');
      // handleSubmit will only call onSubmit if validation passes
      // If validation fails, it will set errors in formState and return
      const result = await handleSubmit(
        (values) => {
          debugLog('🔍 [FORM DEBUG] ===== VALIDATION PASSED =====');
          debugLog('🔍 [FORM DEBUG] Form values:', JSON.stringify(values, null, 2));
          debugLog('🔍 [FORM DEBUG] Calling onSubmit...');
          return onSubmit(values);
        },
        (validationErrors) => {
          debugLog('🔍 [FORM DEBUG] ===== VALIDATION FAILED =====');
          debugLog('🔍 [FORM DEBUG] Validation errors:', JSON.stringify(validationErrors, null, 2));
          debugLog('🔍 [FORM DEBUG] Errors count:', Object.keys(validationErrors).length);
          // Validation failed - errors are already set in formState
          // Don't throw, just return to prevent unhandled errors
          // Errors will be displayed in the form via formState.errors
        }
      )(e);
      debugLog('🔍 [FORM DEBUG] HandleSubmit result:', result);
      return result;
    } catch (error) {
      debugLog('🔍 [FORM DEBUG] ===== ERROR CAUGHT =====');
      debugLog('🔍 [FORM DEBUG] Error:', error);
      debugLog('🔍 [FORM DEBUG] Error name:', error?.name);
      debugLog('🔍 [FORM DEBUG] Error message:', error?.message);
      debugLog('🔍 [FORM DEBUG] Error stack:', error?.stack);
      // Catch any unexpected errors (network, server errors, etc.)
      // Validation errors are handled by react-hook-form and won't reach here
      if (error && error.name !== 'ZodError' && !error.errors) {
        if (process.env.NODE_ENV !== 'production') console.error('Form submission error:', error);
        if (typeof window !== "undefined") {
          // eslint-disable-next-line no-alert
          alert(`An unexpected error occurred: ${error.message || 'Please check the form and try again'}`);
        }
      }
      // Don't re-throw validation errors - they're handled by react-hook-form
    } finally {
      debugLog('🔍 [FORM DEBUG] In finally block, resetting isSubmittingRef');
      // Reset submission flag after validation completes
      setTimeout(() => {
        isSubmittingRef.current = false;
        debugLog('🔍 [FORM DEBUG] Reset isSubmittingRef.current = false');
      }, 100);
    }
      debugLog('🔍 [FORM DEBUG] ===== END HANDLE FORM SUBMIT =====');
  }, [handleSubmit, onSubmit, mode]);

  const isLoading = useFormUIStore((state) => state.isLoading);

  // Debug: Log form state changes
  useEffect(() => {
      debugLog('🔍 [FORM DEBUG] Form state changed - isSubmitting:', isSubmitting, 'submitCount:', submitCount, 'errors:', Object.keys(errors).length > 0 ? errors : 'none');
  }, [isSubmitting, submitCount, errors]);

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {inviteLink && (
        <div className="alert alert-warning d-flex flex-column gap-2 mb-4" role="alert">
          <div className="fw-semibold">Invitation created — email not sent</div>
          <div className="small">The invite was saved, but the email could not be delivered. Share this link with the invitee:</div>
          <div className="d-flex gap-2 align-items-center">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="form-control form-control-sm"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary text-nowrap"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(inviteLink);
                  toastSuccess("Invite link copied to clipboard.");
                }
              }}
            >
              Copy link
            </button>
          </div>
        </div>
      )}
      <form
      onSubmit={(e) => {
        debugLog('🔍 [FORM DEBUG] ===== FORM ONSUBMIT EVENT =====');
        debugLog('🔍 [FORM DEBUG] Native form submit event triggered');
        debugLog('🔍 [FORM DEBUG] Calling handleFormSubmit...');
        handleFormSubmit(e);
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      noValidate 
      style={{ padding: '0' }}
    >
      {/* Mode Toggle */}
      <div className="mb-4">
        <div className="d-inline-flex rounded border overflow-hidden shadow-sm">
          <button
            type="button"
            className={`d-flex align-items-center gap-2 px-4 py-2 text-sm fw-medium border-0 transition-all ${
              mode === "create" 
                ? "text-white" 
                : "bg-white text-muted hover-bg-light"
            }`}
            onClick={() => setMode("create")}
            disabled={isSubmitting || isLoading}
            style={{ 
              transition: 'all 0.2s ease',
              cursor: (isSubmitting || isLoading) ? 'not-allowed' : 'pointer',
              ...(mode === "create" && {
                backgroundColor: '#5F2DED', // Primary color for better visibility
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
              })
            }}
          >
            <FiUser size={16} />
            <span>Create</span>
          </button>
          <button
            type="button"
            className={`d-flex align-items-center gap-2 px-4 py-2 text-sm fw-medium border-0 border-start transition-all ${
              mode === "invite" 
                ? "text-white" 
                : "bg-white text-muted hover-bg-light"
            }`}
            onClick={() => setMode("invite")}
            disabled={isSubmitting || isLoading}
            style={{ 
              transition: 'all 0.2s ease',
              cursor: (isSubmitting || isLoading) ? 'not-allowed' : 'pointer',
              ...(mode === "invite" && {
                backgroundColor: '#5F2DED', // Primary color for better visibility
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15)'
              })
            }}
          >
            <FiSend size={16} />
            <span>Invite</span>
          </button>
        </div>
      </div>

      {/* Identity */}
      <div className="rounded-lg bg-white border shadow-sm p-4 mb-4" style={{ transition: 'all 0.2s ease' }}>
        <h3 className="d-flex align-items-center gap-2 fw-semibold mb-4" style={{ fontSize: '1.1rem', color: '#495057' }}>
          <FiUser size={20} className="text-primary" />
          <span>Identity</span>
        </h3>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <FormField 
              label="Email" 
              icon={FiMail} 
              error={errors.email} 
              required
              fieldName="email"
              touchedFields={touchedFields}
              submitCount={submitCount}
            >
              <IconInput
                icon={FiMail}
                type="email"
                placeholder="user@example.com"
                {...register("email", {
                  required: true,
                  validate: undefined, // Disable custom validation - let Zod handle it
                })}
                error={errors.email}
                showError={submitCount > 0}
                aria-invalid={!!errors.email && submitCount > 0}
              />
            </FormField>
          </div>
          <div className="col-12 col-md-6">
            <FormField label="First Name" icon={FiUser} error={errors.first_name}>
              <IconInput
                icon={FiUser}
                type="text"
                placeholder="First name"
                {...register("first_name")}
                error={errors.first_name}
              />
            </FormField>
          </div>
          <div className="col-12 col-md-6">
            <FormField label="Last Name" icon={FiUser} error={errors.last_name}>
              <IconInput
                icon={FiUser}
                type="text"
                placeholder="Last name"
                {...register("last_name")}
                error={errors.last_name}
              />
            </FormField>
          </div>
          <div className="col-12 col-md-6">
            <AvatarUploader register={register} setValue={setValue} errors={errors} />
          </div>
        </div>
      </div>

      {/* Role & Org */}
      <div className="rounded-lg bg-white border shadow-sm p-4 mb-4" style={{ transition: 'all 0.2s ease' }}>
        <h3 className="d-flex align-items-center gap-2 fw-semibold mb-4" style={{ fontSize: '1.1rem', color: '#495057' }}>
          <FiBriefcase size={20} className="text-primary" />
          <span>Role & Organization</span>
        </h3>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <FormField label="Role" icon={FiUsers} error={errors.role} required>
              <IconSelect
                icon={FiUsers}
                {...register("role")}
                error={errors.role}
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>
                    {getRoleDisplayName(r)}
                  </option>
                ))}
              </IconSelect>
            </FormField>
          </div>
          {/* Organization field - conditional display */}
          {isSuperadmin && role !== "brand" && (
            <div className="col-12 col-md-6">
              <FormField label="Organization" icon={FiBriefcase} error={errors.org_id}>
                <OrganizationSelect
                  value={watch("org_id") || null}
                  onChange={(v) => setValue("org_id", v || null, { shouldValidate: false })}
                  disabled={isSubmitting}
                />
                {role === "vendor" && (
                  <p className="text-muted mb-0 small mt-1">
                    <i className="icofont-info-circle me-1"></i>
                    Optional: Leave empty for global vendor access
                  </p>
                )}
              </FormField>
            </div>
          )}
          {/* Brand role info - no organization field needed */}
          {role === "brand" && (
            <div className="col-12 col-md-6">
              <div className="alert alert-info mb-0" style={{ fontSize: '0.875rem', padding: '0.75rem' }}>
                <i className="icofont-info-circle me-2"></i>
                <strong>Brand users are global</strong> - No organization assignment needed
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Scopes - Only for student, instructor, mentor (alumni), and vendor */}
      {/* Brand role does not need scope fields (global role) */}
      {/* Parent role does not need scope fields (students are linked separately) */}
      {(role === "student" || role === "instructor" || role === "mentor" || role === "alumni" || role === "vendor") && role !== "brand" && (
        <div className="rounded-lg bg-white border shadow-sm p-4 mb-4" style={{ transition: 'all 0.2s ease' }}>
          <h3 className="d-flex align-items-center gap-2 fw-semibold mb-4" style={{ fontSize: '1.1rem', color: '#495057' }}>
            <FiLayers size={20} className="text-primary" />
            <span>Role Scope</span>
          </h3>
          {role === "student" && (
            <div className="row g-3">
              {/* Cohort Selection - Required */}
              <div className="col-12">
                <FormField label="Cohort" icon={FiUsers} error={errors.cohort_id} required>
                  <AsyncSelect
                    value={watch("cohort_id") || null}
                    onChange={(v) => {
                      setValue("cohort_id", v || null, { shouldValidate: false });
                    }}
                    onItemSelect={(item) => {
                      // Auto-set program_node_id from selected cohort's program_node_id
                      if (item.program_node_id) {
                        setValue("program_node_id", item.program_node_id, { shouldValidate: false });
                      }
                    }}
                    fetchUrl="/api/search/cohorts"
                    placeholder="Search cohorts (e.g., P-ECBA-B-2025-27)..."
                    ariaLabel="cohorts"
                    disabled={isSubmitting}
                    autoLoadOnFocus={true}
                  />
                  {watch("cohort_id") && (
                    <p className="text-muted mb-0 small mt-2">
                      <i className="icofont-info-circle me-1"></i>
                      Program information will be automatically set from the selected cohort
                    </p>
                  )}
                </FormField>
              </div>
              
              {/* Subjects Selection - Required after cohort (if cohort has offerings) */}
              <div className="col-12">
                <FormField 
                  label="Subjects" 
                  icon={FiBook} 
                  error={errors.subject_offering_ids} 
                  required={!!watch("cohort_id") && cohortHasOfferings}
                >
                  <AsyncSelect
                    multiple
                    value={watch("subject_offering_ids") || []}
                    onChange={(v) => {
                      if (validateOfferings(v)) {
                        setValue("subject_offering_ids", v, { shouldValidate: false });
                      }
                    }}
                    fetchUrl="/api/search/subjects"
                    placeholder={
                      !watch("cohort_id") 
                        ? "Select a cohort first" 
                        : !cohortHasOfferings 
                        ? "No subjects available for this cohort" 
                        : "Select subjects (auto-loaded)..."
                    }
                    ariaLabel="subjects"
                    disabled={isSubmitting || !watch("cohort_id") || !cohortHasOfferings}
                    autoLoadParams={watch("cohort_id") ? { cohort_id: watch("cohort_id") } : null}
                  />
                  {!watch("cohort_id") ? (
                    <p className="text-muted mb-0 small mt-1">
                      <i className="icofont-info-circle me-1"></i>
                      Please select a cohort first to load available subjects
                    </p>
                  ) : !cohortHasOfferings ? (
                    <p className="text-warning mb-0 small mt-1">
                      <i className="icofont-warning me-1"></i>
                      This cohort has no subject offerings yet. You can create the student without subjects, or add subjects to the cohort first.
                    </p>
                  ) : (
                    <p className="text-muted mb-0 small mt-1">
                      <i className="icofont-info-circle me-1"></i>
                      Select one or more subjects for this student
                    </p>
                  )}
                </FormField>
              </div>
              
              {/* Roll No - Optional */}
              <div className="col-12 col-md-6">
                <FormField label="Roll No" icon={FiTag} error={errors.roll_no}>
                  <IconInput
                    icon={FiTag}
                    type="text"
                    placeholder="Optional - Enter student roll number"
                    {...register("roll_no")}
                    error={errors.roll_no}
                  />
                  <p className="text-muted mb-0 small mt-1">
                    <i className="icofont-info-circle me-1"></i>
                    Optional: Student&apos;s roll number or ID
                  </p>
                </FormField>
              </div>
            </div>
          )}
          {role === "instructor" && (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <FormField label="Cohorts" icon={FiUsers} error={errors.cohort_ids}>
                  <AsyncSelect
                    multiple
                    value={watch("cohort_ids") || []}
                    onChange={(v) => setValue("cohort_ids", v, { shouldValidate: false })}
                    fetchUrl="/api/search/cohorts"
                    placeholder="Search cohorts..."
                    ariaLabel="cohorts_multi"
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>
              <div className="col-12 col-md-6">
                <FormField label="Offerings" icon={FiBook} error={errors.offering_ids}>
                  <AsyncSelect
                    multiple
                    value={watch("offering_ids") || []}
                    onChange={(v) => setValue("offering_ids", v, { shouldValidate: false })}
                    fetchUrl="/api/search/offerings"
                    placeholder="Search offerings..."
                    ariaLabel="offerings_multi"
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>
            </div>
          )}
          {role === "vendor" && (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <FormField label="Vendor Category" icon={FiTag} error={errors.vendor_category} required>
                  <IconInput
                    icon={FiTag}
                    type="text"
                    placeholder="Vendor category"
                    {...register("vendor_category")}
                    error={errors.vendor_category}
                  />
                </FormField>
              </div>
              <div className="col-12 col-md-6">
                <FormField label="Company Name" icon={FiBriefcase} error={errors.company_name}>
                  <IconInput
                    icon={FiBriefcase}
                    type="text"
                    placeholder="Company name"
                    {...register("company_name")}
                    error={errors.company_name}
                  />
                </FormField>
              </div>
              <div className="col-12 col-md-6">
                <FormField label="GSTIN" icon={FiTag} error={errors.gstin}>
                  <IconInput
                    icon={FiTag}
                    type="text"
                    placeholder="GSTIN"
                    {...register("gstin")}
                    error={errors.gstin}
                  />
                </FormField>
              </div>
            </div>
          )}
          {/* Mentor role (formerly Alumni) */}
          {(role === "mentor" || role === "alumni") && (
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <FormField label="Graduation Year" icon={FiCalendar} error={errors.graduation_year} required>
                  <IconInput
                    icon={FiCalendar}
                    type="number"
                    placeholder="Graduation year"
                    {...register("graduation_year", { valueAsNumber: true })}
                    error={errors.graduation_year}
                  />
                </FormField>
              </div>
              <div className="col-12 col-md-6">
                <FormField label="Program Node" icon={FiLayers} error={errors.program_node_id}>
                  <AsyncSelect
                    value={watch("program_node_id") || null}
                    onChange={(v) => setValue("program_node_id", v || null)}
                    fetchUrl="/api/search/program-nodes"
                    placeholder="Search program nodes..."
                    ariaLabel="program_nodes_mentor"
                    disabled={isSubmitting}
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security */}
      <div className="rounded-lg bg-white border shadow-sm p-4 mb-4" style={{ transition: 'all 0.2s ease' }}>
        <h3 className="d-flex align-items-center gap-2 fw-semibold mb-4" style={{ fontSize: '1.1rem', color: '#495057' }}>
          <FiShield size={20} className="text-primary" />
          <span>Security</span>
        </h3>
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2 p-2 border rounded" style={{ minHeight: '38px' }}>
              <input 
                type="checkbox" 
                className="form-check-input" 
                style={{ marginTop: 0 }}
                {...register("mfa_required")} 
              />
              <label className="d-flex align-items-center gap-2 mb-0 cursor-pointer" style={{ cursor: 'pointer' }}>
                <FiShield size={16} className="text-primary" />
                <span style={{ fontSize: '0.875rem' }}>MFA required</span>
              </label>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <FormField label="MFA Method" icon={FiShield} error={errors.mfa_method}>
              <IconSelect
                icon={FiShield}
                {...register("mfa_method")}
                error={errors.mfa_method}
              >
                {mfaMethodEnum.options.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}
                  </option>
                ))}
              </IconSelect>
            </FormField>
          </div>
          {mode === "create" && (
            <div className="col-12 col-md-4">
              <div className="d-flex align-items-center gap-2 p-2 border rounded" style={{ minHeight: '38px' }}>
                <input 
                  type="checkbox" 
                  className="form-check-input" 
                  style={{ marginTop: 0 }}
                  defaultChecked 
                  {...register("must_reset_password")} 
                />
                <label className="d-flex align-items-center gap-2 mb-0 cursor-pointer" style={{ cursor: 'pointer' }}>
                  <FiKey size={16} className="text-primary" />
                  <span style={{ fontSize: '0.875rem' }}>Require password reset on first login</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delivery */}
      <div className="rounded-lg bg-white border shadow-sm p-4 mb-4" style={{ transition: 'all 0.2s ease' }}>
        <h3 className="d-flex align-items-center gap-2 fw-semibold mb-4" style={{ fontSize: '1.1rem', color: '#495057' }}>
          <FiSend size={20} className="text-primary" />
          <span>Delivery</span>
        </h3>
        {mode === "create" ? (
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <FormField 
                label="Temporary Password" 
                icon={FiKey} 
                error={errors.temp_password} 
                required
                fieldName="temp_password"
                touchedFields={touchedFields}
                submitCount={submitCount}
              >
                <IconInput
                  icon={FiKey}
                  type="password"
                  placeholder="Strong temporary password"
                  {...register("temp_password")}
                  error={errors.temp_password}
                  showError={submitCount > 0}
                  aria-invalid={!!errors.temp_password && submitCount > 0}
                />
                {(!errors.temp_password || submitCount === 0) && (
                  <p className="text-muted mb-0 small mt-1">
                    Required: min 8 chars, uppercase, lowercase, number, special character
                  </p>
                )}
              </FormField>
            </div>
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <FormField label="Invite Delivery" icon={FiSend} error={errors.delivery}>
                <IconSelect
                  icon={FiSend}
                  {...register("delivery")}
                  error={errors.delivery}
                >
                  {inviteDeliveryEnum.options.map((d) => (
                    <option key={d} value={d}>
                      {d.charAt(0).toUpperCase() + d.slice(1).replace(/_/g, ' ')}
                    </option>
                  ))}
                </IconSelect>
              </FormField>
            </div>
            <div className="col-12 col-md-6">
              <FormField label="Expiry (hours)" icon={FiClock} error={errors.expiry_hours}>
                <IconInput
                  icon={FiClock}
                  type="number"
                  min={1}
                  max={168}
                  defaultValue={72}
                  placeholder="72"
                  {...register("expiry_hours", { valueAsNumber: true })}
                  error={errors.expiry_hours}
                />
              </FormField>
            </div>
          </div>
        )}
      </div>

      <div className="d-flex align-items-center gap-3 pt-3 border-top">
        <button 
          type="submit" 
          className="btn btn-primary d-flex align-items-center gap-2" 
          disabled={isSubmitting}
          style={{ minWidth: '140px' }}
          onClick={(e) => {
            const formValues = watch();
            // Also check the actual DOM input value
            const emailInput = document.querySelector('input[type="email"][name="email"]') || 
                              document.querySelector('input[name="email"]');
            const domEmailValue = emailInput?.value;
            
            debugLog('🔍 [FORM DEBUG] ===== SUBMIT BUTTON CLICKED =====');
            debugLog('🔍 [FORM DEBUG] Mode:', mode);
            debugLog('🔍 [FORM DEBUG] Is Submitting:', isSubmitting);
            debugLog('🔍 [FORM DEBUG] Button disabled:', isSubmitting);
            debugLog('🔍 [FORM DEBUG] Current form values:', formValues);
            debugLog('🔍 [FORM DEBUG] Email value (from watch):', formValues.email);
            debugLog('🔍 [FORM DEBUG] Email value (from DOM):', domEmailValue);
            debugLog('🔍 [FORM DEBUG] Email input element:', emailInput);
            debugLog('🔍 [FORM DEBUG] Email type:', typeof formValues.email);
            debugLog('🔍 [FORM DEBUG] Email length:', formValues.email?.length);
            debugLog('🔍 [FORM DEBUG] Email trimmed:', formValues.email?.trim());
            debugLog('🔍 [FORM DEBUG] Current errors:', errors);
            debugLog('🔍 [FORM DEBUG] Submit count:', submitCount);
            debugLog('🔍 [FORM DEBUG] Event:', e);
            debugLog('🔍 [FORM DEBUG] ===== END BUTTON CLICK =====');
            
            // If DOM has value but form state doesn't, there's a sync issue
            if (domEmailValue && !formValues.email) {
              if (process.env.NODE_ENV !== 'production') console.error('🔍 [FORM DEBUG] ⚠️ MISMATCH: DOM has email value but form state does not!');
              if (process.env.NODE_ENV !== 'production') console.error('🔍 [FORM DEBUG] DOM email:', domEmailValue);
              if (process.env.NODE_ENV !== 'production') console.error('🔍 [FORM DEBUG] Form email:', formValues.email);
              // Try to manually set the value
              setValue("email", domEmailValue, { shouldValidate: false });
              debugLog('🔍 [FORM DEBUG] Manually set email value in form state');
            }
          }}
        >
          {isSubmitting ? (
            <>
              <div className="spinner-border spinner-border-sm" role="status" style={{ width: '14px', height: '14px' }}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              {mode === "create" ? <FiUser size={16} /> : <FiSend size={16} />}
              <span>{mode === "create" ? "Create User" : "Send Invite"}</span>
            </>
          )}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary d-flex align-items-center gap-2"
          disabled={isSubmitting}
          onClick={() => {
            reset({
              role: "student",
              mfa_required: false,
              mfa_method: "none",
              delivery: "invite_link",
              expiry_hours: 72,
              must_reset_password: true,
              avatar_url: undefined,
              temp_password: "",
              email: "",
              first_name: "",
              last_name: "",
              // Student-specific fields
              cohort_id: undefined,
              subject_offering_ids: [],
              roll_no: undefined,
              program_node_id: undefined,
              // Instructor-specific fields
              cohort_ids: undefined,
              offering_ids: undefined,
              // Parent-specific fields
              linked_student_ids: undefined,
              // Vendor-specific fields
              vendor_category: undefined,
              company_name: undefined,
              gstin: undefined,
              // Mentor/Alumni-specific fields (alumni maps to mentor)
              graduation_year: undefined,
            });
            const clearLoading = useFormUIStore.getState().clearLoading;
            clearLoading();
          }}
        >
          <FiX size={16} />
          <span>Reset</span>
        </button>
      </div>
    </form>
    </>
  );
}


