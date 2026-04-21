import Image from "next/image";
import Link from "next/link";
import React from "react";
import PopupVideo from "../popup/PopupVideo";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/index.js";
import { useDeleteBlog } from "@/hooks/api/useBlogsMutations";
import useSweetAlert from "@/hooks/useSweetAlert";
import { useQueryClient } from '@tanstack/react-query';

const BlogPrimary = ({ blog, idx, onEdit }) => {
  const { title, image, author, desc, id, slug, date, month, blogData } = blog;
  const blogUrl = slug ? `/blogs/${slug}` : `/blogs/${id}`;
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role || null;
  const isAdmin = userRole === 'admin' || userRole === 'orgadmin';
  const deleteBlog = useDeleteBlog();
  const createAlert = useSweetAlert();
  
  // Handle edit
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEdit && blogData) {
      onEdit(blogData);
    } else if (blogData) {
      router.push(`/blogs?action=edit&edit=${blogData.id}`);
    }
  };
  
  // Handle delete
  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!blogData) return;
    
    const confirmed = await createAlert(
      'warning',
      `Are you sure you want to delete "${blogData.title}"?`,
      'This action cannot be undone.',
      true
    );

    if (confirmed) {
      try {
        await deleteBlog.mutateAsync(blogData.id);
        // Invalidate blog queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['blogs'] });
      } catch (error) {
        // Error is handled by mutation hook
      }
    }
  };
  
  return (
    <div className="group shadow-blog2" data-aos="fade-up">
      {/* blog thumbnail  */}
      <div className="overflow-hidden relative">
        {typeof image === 'string' && image.startsWith('http') ? (
          <img
            src={image}
            alt={title}
            className="w-full"
          />
        ) : (
          <Image src={image} alt={title} className="w-full" placeholder="blur" width={800} height={450} />
        )}
        <div className="text-size-22 leading-6 font-semibold text-white px-15px py-5px md:px-6 md:py-2 bg-primaryColor rounded text-center absolute top-5 right-5">
          <h3>
            {date} <br />
            {month}
          </h3>
        </div>

        {idx === 1 ? (
          <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center z-10">
            {" "}
            <PopupVideo />
          </div>
        ) : (
          ""
        )}
      </div>
      {/* blog content  */}
      <div className="pt-26px pb-5 px-30px">
        <h3 className="text-2xl md:text-size-32 lg:text-size-28 2xl:text-size-34 leading-34px md:leading-10 2xl:leading-13.5 font-bold text-blackColor2 hover:text-primaryColor dark:text-blackColor2-dark dark:hover:text-primaryColor">
          <Link href={blogUrl}>{title}</Link>
        </h3>
        <div className="mb-14px pb-19px border-b border-borderColor dark:border-borderColor-dark">
          <ul className="flex flex-wrap items-center gap-x-15px">
            <li>
              <Link
                href={blogUrl}
                className="text-contentColor text-sm hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor"
              >
                <i className="icofont-business-man-alt-2"></i> {author?.name || 'Admin'}
              </Link>
            </li>
            <li>
              <Link
                href={blogUrl}
                className="text-contentColor text-sm hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor"
              >
                <i className="icofont-speech-comments"></i> 0 Comments
              </Link>
            </li>
            <li>
              <Link
                href={blogUrl}
                className="text-contentColor text-sm hover:text-primaryColor dark:text-contentColor-dark dark:hover:text-primaryColor"
              >
                <i className="icofont-eraser-alt"></i> Association
              </Link>
            </li>
          </ul>
        </div>
        <p className="text-base text-contentColor dark:text-contentColor-dark mb-15px !leading-30px">
          {desc}
        </p>
        <div className="flex justify-between items-center">
          <div>
            <Link
              href={blogUrl}
              className="uppercase text-primaryColor hover:text-secondaryColor "
            >
              READ MORE <i className="icofont-double-right"></i>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {/* Admin Actions */}
            {isAdmin && blogData && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEdit}
                  className="text-primaryColor hover:text-primaryColor/80 transition-colors"
                  title="Edit Blog"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteBlog.isPending}
                  className="text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                  title="Delete Blog"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            )}
            <div className="text-primaryColor hover:text-secondaryColor space-y-1">
              <Link href="#">
                <i className="icofont-share bg-whitegrey1 dark:bg-whitegrey1-dark hover:text-whiteColor hover:bg-primaryColor w-8 h-7 leading-7 text-center inline-block rounded transition-all duration-300"></i>
              </Link>{" "}
              <Link href="#">
                <i className="icofont-heart bg-whitegrey1 dark:bg-whitegrey1-dark hover:text-whiteColor hover:bg-primaryColor w-8 h-7 leading-7 text-center inline-block rounded transition-all duration-300"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPrimary;
