"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import { useAuthStore } from "@/store/index.js";
import useSweetAlert from "@/hooks/useSweetAlert";
import Image from "next/image";
import { format } from "date-fns";

export default function VendorManageWorkshopsMain() {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [searchTerm, setSearchTerm] = useState("");

  // Fetch vendor's workshops
  const { data: workshopsData, isLoading } = useQuery({
    queryKey: ['vendor-workshops', userId],
    queryFn: async () => {
      const response = await apiClient.get(`/workshops?created_by=${userId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshops');
      }
      return response.data;
    },
    enabled: isAuthenticated && !!userId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const workshops = Array.isArray(workshopsData?.workshops) ? workshopsData.workshops : [];

  // Delete mutation
  const deleteWorkshopMutation = useMutation({
    mutationFn: async (workshopId) => {
      const response = await apiClient.delete(`/workshops/${workshopId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete workshop');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-workshops'] });
      createAlert('success', 'Workshop deleted successfully!');
    },
    onError: (error) => {
      console.error('Delete workshop error:', error);
      createAlert('error', error.message || 'Failed to delete workshop');
    },
  });

  // Categorize workshops
  const categorizedWorkshops = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const current = [];
    const past = [];

    if (Array.isArray(workshops)) {
      workshops
        .filter(workshop => workshop && typeof workshop === 'object' && workshop.id && workshop.start_date && workshop.end_date)
        .forEach((workshop) => {
          const startDate = new Date(workshop.start_date);
          const endDate = new Date(workshop.end_date);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return; // Skip invalid dates
          }

          if (endDate < now) {
            past.push(workshop);
          } else if (startDate <= now && endDate >= now) {
            current.push(workshop);
          } else {
            upcoming.push(workshop);
          }
        });
    }

    return { upcoming, current, past };
  }, [workshops]);

  // Filter by search term
  const filterWorkshops = (workshopList) => {
    if (!Array.isArray(workshopList)) return [];
    if (!searchTerm) return workshopList;
    const search = searchTerm.toLowerCase();
    return workshopList.filter(
      (workshop) =>
        workshop && typeof workshop === 'object' &&
        (workshop.title?.toLowerCase().includes(search) ||
        workshop.description?.toLowerCase().includes(search))
    );
  };

  const handleDelete = async (workshopId, workshopTitle) => {
    if (!confirm(`Are you sure you want to delete "${workshopTitle}"?`)) {
      return;
    }
    await deleteWorkshopMutation.mutateAsync(workshopId);
  };

  const handleDuplicate = (workshop) => {
    router.push(`/dashboards/vendor-add-workshop?duplicate=${workshop.id}`);
  };

  const WorkshopCard = ({ workshop }) => {
    if (!workshop || typeof workshop !== 'object' || !workshop.id) {
      return null;
    }
    
    return (
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow">
        {workshop.banner_url && (
          <div className="relative w-full h-48 overflow-hidden">
            <Image
              src={workshop.banner_url}
              alt={workshop.title || 'Workshop'}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor flex-1">
              {workshop.title || 'Untitled Workshop'}
            </h3>
            <span
              className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                workshop.status === 'published'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : workshop.status === 'draft'
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  : workshop.status === 'cancelled'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}
            >
              {workshop.status || 'unknown'}
            </span>
          </div>
          {workshop.description && (
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
              {workshop.description}
            </p>
          )}
          <div className="space-y-1 text-xs text-contentColor dark:text-contentColor-dark mb-3">
            {workshop.start_date && (
              <p>
                <strong>Start:</strong> {format(new Date(workshop.start_date), 'PPP p')}
              </p>
            )}
            {workshop.end_date && (
              <p>
                <strong>End:</strong> {format(new Date(workshop.end_date), 'PPP p')}
              </p>
            )}
            {workshop.mode && (
              <p>
                <strong>Mode:</strong> {workshop.mode}
              </p>
            )}
            {workshop.is_free ? (
              <p className="text-green-600 dark:text-green-400 font-semibold">Free</p>
            ) : (
              <p>
                <strong>Price:</strong> ₹{parseFloat(typeof workshop.price === 'number' ? workshop.price : 0).toLocaleString('en-IN')}
              </p>
            )}
            {typeof workshop.capacity === 'number' && (
              <p>
                <strong>Capacity:</strong> {workshop.capacity}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => router.push(`/dashboards/vendor-workshop-registrations/${workshop.id}`)}
              className="px-3 py-1 text-xs font-semibold text-green-600 bg-green-50 rounded-md hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30 transition-colors"
            >
              View Registrations
            </button>
            <button
              onClick={() => router.push(`/dashboards/vendor-edit-workshop/${workshop.id}`)}
              className="px-3 py-1 text-xs font-semibold text-primaryColor bg-primaryColor/10 rounded-md hover:bg-primaryColor/20 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => router.push(`/workshop-details/${workshop.id}`)}
              className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
            >
              View
            </button>
            <button
              onClick={() => handleDuplicate(workshop)}
              className="px-3 py-1 text-xs font-semibold text-purple-600 bg-purple-50 rounded-md hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 transition-colors"
            >
              Duplicate
            </button>
            <button
              onClick={() => handleDelete(workshop.id, workshop.title || 'Workshop')}
              disabled={deleteWorkshopMutation.isPending}
              className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const WorkshopSection = ({ title, workshops: sectionWorkshops, emptyMessage }) => {
    const filtered = filterWorkshops(sectionWorkshops);
    if (!Array.isArray(filtered) || filtered.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blackColor dark:text-whiteColor mb-4">
          {title} ({filtered.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered
            .filter(workshop => workshop && typeof workshop === 'object' && workshop.id)
            .map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-contentColor dark:text-contentColor-dark">Loading workshops...</p>
      </div>
    );
  }

  const allFiltered = filterWorkshops(workshops);
  const hasNoResults = allFiltered.length === 0;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div>
              <h1 className="h3 mb-2 fw-bold text-dark">Manage Workshops</h1>
              <p className="text-muted mb-0 small">
                View and manage your workshops
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboards/vendor-add-workshop')}
              className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              + Add Workshop
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search workshops..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
        />
      </div>

      {/* Empty State */}
      {hasNoResults && (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            {searchTerm ? 'No workshops found matching your search.' : 'No workshops found. Create your first workshop!'}
          </p>
        </div>
      )}

      {/* Workshop Sections */}
      {!hasNoResults && (
        <>
          <WorkshopSection
            title="Current Workshops"
            workshops={categorizedWorkshops.current}
            emptyMessage="No current workshops"
          />
          <WorkshopSection
            title="Upcoming Workshops"
            workshops={categorizedWorkshops.upcoming}
            emptyMessage="No upcoming workshops"
          />
          <WorkshopSection
            title="Past Workshops"
            workshops={categorizedWorkshops.past}
            emptyMessage="No past workshops"
          />
        </>
      )}
    </div>
  );
}

