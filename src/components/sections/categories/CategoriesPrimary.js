"use client";
import CategoriesGrid from "@/components/shared/categories/CategoriesGrid";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

const CategoriesPrimary = () => {
  // Fetch categories from API
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ['course-categories'],
    queryFn: async () => {
      const response = await apiClient.get('/courses/filters');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch categories');
      }
      return response.categories || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  if (error) {
    console.error('Error fetching categories:', error);
  }

  return (
    <section className="py-30px md:py-50px lg:py-70px">
      <div className="container">
        <CategoriesGrid categories={categories} isLoading={isLoading} />
      </div>
    </section>
  );
};

export default CategoriesPrimary;

