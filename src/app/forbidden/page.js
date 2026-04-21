/**
 * Forbidden Page
 * 
 * 403 Forbidden page for unauthorized access attempts.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import PageWrapper from '@/components/shared/wrappers/PageWrapper';
import ThemeController from '@/components/shared/others/ThemeController';

export const metadata = {
  title: 'Access Forbidden | EduRock',
  description: 'You do not have permission to access this page',
};

export default async function ForbiddenPage({ searchParams }) {
  // Get error message from URL parameters
  const errorParam = searchParams?.error || '';
  
  // Determine message based on error type
  let title = 'Access Forbidden';
  let message = 'You do not have permission to access this page.';
  let subMessage = 'If you believe this is an error, please contact support.';
  
  if (errorParam.includes('Superadmin')) {
    title = 'Superadmin Access Required';
    message = 'This page is restricted to superadmin users only.';
    subMessage = 'You need superadmin privileges to access this dashboard. Please contact your system administrator if you believe you should have access.';
  } else if (errorParam.includes('Access denied')) {
    title = 'Access Denied';
    message = 'Your request to access this page has been denied.';
    subMessage = 'This may be due to insufficient permissions or security restrictions.';
  }

  return (
    <PageWrapper>
      <main>
        <section className="relative py-100px">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <div className="mb-50px">
                <h1 className="text-6xl md:text-8xl font-bold text-primaryColor mb-25px">
                  403
                </h1>
                <h2 className="text-size-32 md:text-size-40 font-bold text-blackColor dark:text-blackColor-dark mb-15px">
                  {title}
                </h2>
                <p className="text-size-18 text-contentColor dark:text-contentColor-dark mb-25px">
                  {message}
                </p>
                <p className="text-size-15 text-contentColor dark:text-contentColor-dark opacity-70 mb-50px">
                  {subMessage}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-15px justify-center">
                <Link
                  href="/"
                  className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded group dark:hover:text-whiteColor dark:hover:bg-whiteColor-dark"
                >
                  Go to Homepage
                </Link>
                <Link
                  href="/login"
                  className="text-size-15 text-primaryColor bg-whiteColor px-25px py-10px border border-primaryColor hover:text-whiteColor hover:bg-primaryColor inline-block rounded group"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </div>
        </section>
        <ThemeController />
      </main>
    </PageWrapper>
  );
}


