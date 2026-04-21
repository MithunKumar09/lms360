/**
 * DropdownWishlist Component
 * 
 * Displays wishlist dropdown in navigation header.
 * Shows wishlist count and recent items.
 */

"use client";
import Image from "next/image";
import DropdownWrapperSecondary from "@/components/shared/wrappers/DropdownWrapperSecondary";
import DropdownContainerSecondary from "@/components/shared/containers/DropdownContainerSecondary";
import Link from "next/link";
import useIsTrue from "@/hooks/useIsTrue";
import { useWishlist } from "@/hooks/api/useWishlist";
import { useWishlistStore } from "@/store/index.js";
import { useAuthStore } from "@/store/index.js";
import { useRemoveFromWishlist } from "@/hooks/api/useWishlist";
import { useRouter } from "next/navigation";

const DropdownWishlist = ({ isHeaderTop }) => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  // Fetch wishlist
  const { data: wishlistData, isLoading } = useWishlist({
    enabled: isAuthenticated,
  });

  // Get wishlist items from Zustand store
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistCount = useWishlistStore((state) => state.getCount());

  // Use API data if available, otherwise use Zustand store
  const items = wishlistData?.items || wishlistItems || [];
  
  // Remove from wishlist mutation
  const removeFromWishlist = useRemoveFromWishlist();

  // Get role-based wishlist URL
  const getWishlistUrl = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'superadmin') return '/dashboards/superadmin-wishlist';
    if (role === 'admin') return '/dashboards/admin-wishlist';
    if (role === 'instructor') return '/dashboards/instructor-wishlist';
    if (role === 'student') return '/dashboards/student-wishlist';
    return '/dashboards/student-wishlist'; // Default
  };

  const isHome4 = useIsTrue("/home-4");
  const isHome4Dark = useIsTrue("/home-4-dark");
  const isHome5 = useIsTrue("/home-5");
  const isHome5Dark = useIsTrue("/home-5-dark");

  // Show only recent 3 items in dropdown
  const recentItems = items.slice(0, 3);

  return (
    <>
      <div
        className={`relative ${
          isHeaderTop
            ? "block"
            : isHome4 || isHome4Dark || isHome5 || isHome5Dark
            ? "block lg:hidden"
            : "block"
        }`}
      >
        <Link href={getWishlistUrl()} className="inline-block">
          <i className="icofont-heart-alt text-2xl text-blackColor group-hover:text-primaryColor transition-all duration-300 dark:text-blackColor-dark leading-none inline-block"></i>
        </Link>
        {wishlistCount > 0 && (
          <span
            className={`${
              wishlistCount < 10 ? "px-1 py-[2px]" : "px-3px pb-1 pt-3px"
            } absolute -top-1 2xl:-top-[5px] -right-[10px] lg:right-3/4 2xl:-right-[10px] text-[10px] font-medium text-white dark:text-whiteColor-dark bg-primaryColor leading-1 rounded-full z-50 block`}
          >
            {wishlistCount}
          </span>
        )}
      </div>
      <DropdownWrapperSecondary isHeaderTop={isHeaderTop}>
        <DropdownContainerSecondary>
          <ul className="flex flex-col max-h-68 gap-y-5 pb-5 mb-30px border-b border-borderColor dark:border-borderColor-dark overflow-y-auto">
            {!isAuthenticated ? (
              <div className="min-h-14 flex items-center justify-center text-center">
                <p className="text-contentColor dark:text-contentColor-dark font-semibold opacity-55">
                  Please login to view wishlist
                </p>
              </div>
            ) : isLoading ? (
              <div className="min-h-14 flex items-center justify-center text-center">
                <p className="text-contentColor dark:text-contentColor-dark font-semibold opacity-55">
                  Loading...
                </p>
              </div>
            ) : !items || items.length === 0 ? (
              <div className="min-h-14 flex items-center justify-center text-center">
                <p className="text-contentColor dark:text-contentColor-dark font-semibold opacity-55">
                  Your wishlist is empty
                </p>
              </div>
            ) : (
              recentItems.map((item, idx) => {
                const courseId = item.id || item.courseId;
                let imageUrl = item.thumbnailUrl || item.image || null;
                const title = item.title || "Course";
                
                // Check if URL is a video file - Next.js Image doesn't support videos with blur
                const isVideoUrl = imageUrl && (
                  imageUrl.endsWith('.mp4') || 
                  imageUrl.endsWith('.webm') || 
                  imageUrl.endsWith('.mov') ||
                  imageUrl.includes('/video/')
                );
                
                // Use placeholder image if it's a video or no image
                if (isVideoUrl || !imageUrl) {
                  imageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ECourse Image%3C/text%3E%3C/svg%3E";
                }
                
                return (
                  <li
                    key={courseId || idx}
                    className="relative flex gap-x-15px items-center"
                  >
                    <Link href={`/course-details-3?courseId=${courseId}`} className="flex-shrink-0">
                      <Image
                        priority={false}
                        placeholder={isVideoUrl ? undefined : "blur"}
                        blurDataURL={isVideoUrl ? undefined : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='225'%3E%3Crect fill='%23e5e7eb' width='400' height='225'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='24' dy='10.5' font-weight='bold' x='50%25' y='50%25' text-anchor='middle'%3ECourse Image%3C/text%3E%3C/svg%3E"}
                        src={imageUrl}
                        alt={title}
                        width={80}
                        height={60}
                        className="w-20 h-15 object-cover rounded transition-transform duration-300 hover:scale-105"
                      />
                    </Link>
                    <div className="flex-1 min-w-0 pr-8">
                      <Link
                        href={`/course-details-3?courseId=${courseId}`}
                        className="text-sm text-darkblack hover:text-primaryColor leading-5 block pb-2 capitalize dark:text-darkblack-dark dark:hover:text-primaryColor truncate transition-colors"
                      >
                        {title.length > 25 ? title.slice(0, 25) + "..." : title}
                      </Link>
                      {!item.isFree && item.price != null && (
                        <p className="text-sm text-darkblack leading-5 block pb-5px dark:text-darkblack-dark">
                          <span className="text-primaryColor font-semibold">
                            ${typeof item.price === 'number' ? item.price.toFixed(2) : parseFloat(item.price || 0).toFixed(2)}
                          </span>
                        </p>
                      )}
                      {item.isFree && (
                        <p className="text-sm text-greencolor leading-5 block pb-5px font-semibold">
                          Free
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => removeFromWishlist.mutate(courseId)}
                      disabled={removeFromWishlist.isPending}
                      className="absolute block top-1 right-1 text-base text-contentColor leading-1 hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor disabled:opacity-50 transition-colors duration-200 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <i className="icofont-close-line"></i>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {/* View all button */}
          {isAuthenticated && items && items.length > 0 && (
            <div className="flex flex-col gap-y-5">
              <Link
                href={getWishlistUrl()}
                className="text-sm text-primaryColor hover:text-secondaryColor text-center py-10px font-semibold"
              >
                View All Wishlist ({items.length})
              </Link>
            </div>
          )}
        </DropdownContainerSecondary>
      </DropdownWrapperSecondary>
    </>
  );
};

export default DropdownWishlist;

