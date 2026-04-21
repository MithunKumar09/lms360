"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { useAuthStore } from "@/store/index.js";
import { useOrganizations } from "@/hooks/api/useDropdownData.js";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import ThemeController from "@/components/shared/others/ThemeController";

export default function WorkshopsPage() {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    status: userRole ? '' : 'published', // Empty for authenticated users, published for public
    search: '',
    organization_id: '',
    creator_role: '',
    date_filter: '',
    mode: '',
  });

  // Fetch organizations for superadmin
  const { data: orgsData } = useOrganizations(
    { limit: 100, status: 'active' },
    { enabled: userRole === 'superadmin' }
  );
  const organizations = orgsData?.organizations || [];

  const { data: workshopsData, isLoading } = useQuery({
    queryKey: ['workshops', filters, userRole],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
      });
      
      // Add filters based on role
      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.status) {
        params.append('status', filters.status);
      } else if (!isAuthenticated) {
        // Public users: only published by default
        params.append('published_only', 'true');
      }
      if (filters.organization_id) {
        params.append('organization_id', filters.organization_id);
      }
      if (filters.creator_role) {
        params.append('creator_role', filters.creator_role);
      }
      if (filters.date_filter) {
        params.append('date_filter', filters.date_filter);
      }
      if (filters.mode) {
        params.append('mode', filters.mode);
      }
      
      const response = await apiClient.get(`/workshops?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch workshops');
      }
      return response.data;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const workshops = workshopsData?.workshops || [];
  const pagination = workshopsData?.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 };

  const WorkshopCard = ({ workshop }) => {
    const isUpcoming = new Date(workshop.start_date) > new Date();
    const isCurrent = new Date(workshop.start_date) <= new Date() && new Date(workshop.end_date) >= new Date();

    return (
      <Link href={`/workshop-details/${workshop.id}`}>
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-md overflow-hidden border-2 border-borderColor dark:border-borderColor-dark hover:shadow-lg transition-shadow cursor-pointer">
          {workshop.banner_url && (
            <div className="relative w-full h-48 overflow-hidden">
              <Image
                src={workshop.banner_url}
                alt={workshop.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-blackColor dark:text-whiteColor flex-1">
                {workshop.title}
              </h3>
              {isUpcoming && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 ml-2">
                  Upcoming
                </span>
              )}
              {isCurrent && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 ml-2">
                  Live
                </span>
              )}
            </div>
            {workshop.description && (
              <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
                {workshop.description}
              </p>
            )}
            <div className="space-y-1 text-xs text-contentColor dark:text-contentColor-dark">
              <p>
                <strong>Date:</strong> {format(new Date(workshop.start_date), 'PPP')} - {format(new Date(workshop.end_date), 'PPP')}
              </p>
              <p>
                <strong>Mode:</strong> {workshop.mode === 'online' ? 'Online' : workshop.mode === 'offline' ? 'Offline' : 'Hybrid'}
              </p>
              {workshop.is_free ? (
                <p className="text-green-600 dark:text-green-400 font-semibold">Free Workshop</p>
              ) : (
                <p>
                  <strong>Price:</strong> ₹{parseFloat(workshop.price || 0).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <PageWrapper>
      <main>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
          <div className="container mx-auto px-4">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-blackColor dark:text-whiteColor mb-2">Workshops</h1>
              <p className="text-contentColor dark:text-contentColor-dark">
                Discover upcoming and ongoing workshops
              </p>
            </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search workshops..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full max-w-md py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
            />
          </div>

          {/* Role-based filters */}
          <div className="flex flex-wrap gap-4">
            {/* Organization filter - Superadmin only */}
            {userRole === 'superadmin' && (
              <select
                value={filters.organization_id}
                onChange={(e) => setFilters({ ...filters, organization_id: e.target.value, page: 1 })}
                className="py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}

            {/* Creator role filter - Admin only */}
            {userRole === 'admin' && (
              <select
                value={filters.creator_role}
                onChange={(e) => setFilters({ ...filters, creator_role: e.target.value, page: 1 })}
                className="py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Creators</option>
                <option value="vendor">Vendor</option>
                <option value="mentor">Mentor</option>
              </select>
            )}

            {/* Status filter - All authenticated users */}
            {isAuthenticated && (
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                className="py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
              </select>
            )}

            {/* Mode filter - All authenticated users */}
            {isAuthenticated && (
              <select
                value={filters.mode}
                onChange={(e) => setFilters({ ...filters, mode: e.target.value, page: 1 })}
                className="py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Modes</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="live">Live</option>
              </select>
            )}

            {/* Date filter - Instructor, Student, Mentor, Vendor */}
            {(userRole === 'instructor' || userRole === 'student' || userRole === 'mentor' || userRole === 'vendor') && (
              <select
                value={filters.date_filter}
                onChange={(e) => setFilters({ ...filters, date_filter: e.target.value, page: 1 })}
                className="py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Dates</option>
                <option value="upcoming">Upcoming</option>
                <option value="current">Current</option>
                <option value="past">Past</option>
              </select>
            )}

            {/* Organization filter - Mentor/Vendor (if multiple orgs) */}
            {(userRole === 'mentor' || userRole === 'vendor') && (
              <select
                value={filters.organization_id}
                onChange={(e) => setFilters({ ...filters, organization_id: e.target.value, page: 1 })}
                className="py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
              >
                <option value="">All Organizations</option>
                {/* For mentors, they have single org, so this might not be needed, but keeping for consistency */}
                {/* For vendors, they can have multiple orgs - would need to fetch from /api/vendors/me */}
              </select>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-contentColor dark:text-contentColor-dark">Loading workshops...</p>
          </div>
        ) : workshops.length === 0 ? (
          <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
            <p className="text-contentColor dark:text-contentColor-dark">
              {filters.search ? 'No workshops found matching your search.' : 'No workshops available at the moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {workshops.map((workshop) => (
                <WorkshopCard key={workshop.id} workshop={workshop} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 text-sm font-semibold text-white bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
          </div>
        </div>
        <ThemeController />
      </main>
    </PageWrapper>
  );
}

