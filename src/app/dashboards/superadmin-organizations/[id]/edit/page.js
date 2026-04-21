'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import OrganizationFormMain from "@/components/layout/main/organizations/OrganizationFormMain";
import DashboardContainer from "@/components/shared/containers/DashboardContainer";
import ThemeController from "@/components/shared/others/ThemeController";
import DsahboardWrapper from "@/components/shared/wrappers/DsahboardWrapper";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import AuthGuard from "@/components/shared/guards/AuthGuard";
import useSweetAlert from "@/hooks/useSweetAlert";

const EditOrganization = () => {
  const params = useParams();
  const router = useRouter();
  const createAlert = useSweetAlert();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      const controller = new AbortController();
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/organizations/${params.id}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load organization');
        }

        // Transform organization data for form
        const orgData = {
          ...data.organization,
          brand_assets: (data.brandAssets || []).map((asset) => ({
            key_name: asset.key_name,
            url: asset.url,
            variant: asset.variant || 'default',
          })),
        };

        setOrganization(orgData);
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError(err.message || 'Failed to load organization');
        // Use alert without re-triggering effect by navigation here.
        createAlert('error', err.message || 'Failed to load organization');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrganization();
    }
    // Only depend on id to avoid refetch loops from unstable dependencies
  }, [params.id]);

  if (loading) {
    return (
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <div className="py-100px">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mb-20px"></div>
                    <p className="text-contentColor dark:text-contentColor-dark">Loading organization...</p>
                  </div>
                </div>
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    );
  }

  if (error || !organization) {
    return (
      <AuthGuard allowedRoles="superadmin" requireMfa={true}>
        <PageWrapper>
          <main>
            <DsahboardWrapper>
              <DashboardContainer>
                <div className="py-100px">
                  <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-20px">{error || 'Organization not found'}</p>
                    <button
                      onClick={() => router.push('/dashboards/superadmin-organizations')}
                      className="px-25px py-10px text-size-15 text-whiteColor bg-primaryColor border border-primaryColor rounded hover:bg-primaryColor/90 transition-colors"
                    >
                      Back to Organizations
                    </button>
                  </div>
                </div>
              </DashboardContainer>
            </DsahboardWrapper>
            <ThemeController />
          </main>
        </PageWrapper>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard allowedRoles="superadmin" requireMfa={true}>
      <PageWrapper>
        <main>
          <DsahboardWrapper>
            <DashboardContainer>
              <OrganizationFormMain organization={organization} />
            </DashboardContainer>
          </DsahboardWrapper>
          <ThemeController />
        </main>
      </PageWrapper>
    </AuthGuard>
  );
};

export default EditOrganization;

