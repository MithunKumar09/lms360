"use client";

import { useBlog } from '@/hooks/api/useBlog';
import Image from "next/image";
import Link from "next/link";
import { extractYouTubeId } from '@/lib/course/transformers';

import BlogsSidebar from "@/components/shared/blogs/BlogsSidebar";
import CommentFome from "@/components/shared/forms/CommentFome";

import BlogSocials2 from "@/components/shared/blog-details/BlogSocials2";
import BlogTags2 from "@/components/shared/blog-details/BlogTags2";
import ClientComment from "@/components/shared/blog-details/ClientComment";
import BlogTagsAndSocila from "@/components/shared/blog-details/BlogTagsAndSocila";

/**
 * Format date for display
 */
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return {
    date: date.getDate(),
    month: date.toLocaleDateString('en-US', { month: 'short' }),
    year: date.getFullYear(),
    full: date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
  };
}

const BlogDetails = ({ blogId }) => {
  const { data: blog, isLoading, isError, error } = useBlog(blogId);

  if (isLoading) {
    return (
      <section>
        <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
          <div className="text-center py-20">
            <p className="text-contentColor dark:text-contentColor-dark">Loading blog...</p>
          </div>
        </div>
      </section>
    );
  }

  if (isError || !blog) {
    return (
      <section>
        <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
          <div className="text-center py-20">
            <p className="text-red-500">
              {error?.message || 'Blog not found'}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const dateInfo = formatDate(blog.published_at || blog.created_at);
  const tags = blog.metadata?.tags || [];
  const links = blog.metadata?.links || [];
  const youtubeLinks = blog.metadata?.youtubeLinks || [];

  return (
    <section>
      <div className="container py-10 md:py-50px lg:py-60px 2xl:py-100px">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
          <div className="lg:col-start-1 lg:col-span-8 space-y-[35px]">
            {/* blog */}
            <div data-aos="fade-up">
              {/* blog thumbnail */}
              {blog.featured_image_url && (
                <div className="overflow-hidden relative mb-30px">
                  <img
                    src={blog.featured_image_url}
                    alt={blog.title}
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* blog content */}
              <div>
                {/* Title */}
                <h1 className="text-size-26 md:text-size-32 lg:text-size-34 font-bold text-blackColor dark:text-blackColor-dark mb-25px !leading-30px">
                  {blog.title}
                </h1>

                {/* Author and Date */}
                <div className="mb-25px pb-19px border-b border-borderColor dark:border-borderColor-dark">
                  <ul className="flex flex-wrap items-center gap-x-15px">
                    <li>
                      <span className="text-contentColor text-sm dark:text-contentColor-dark">
                        <i className="icofont-business-man-alt-2"></i> {blog.author?.name || 'Admin'}
                      </span>
                    </li>
                    {dateInfo && (
                      <li>
                        <span className="text-contentColor text-sm dark:text-contentColor-dark">
                          <i className="icofont-calendar"></i> {dateInfo.full}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                {/* Excerpt */}
                {blog.excerpt && (
                  <p
                    className="text-lg text-darkdeep4 mb-25px !leading-30px font-medium"
                    data-aos="fade-up"
                  >
                    {blog.excerpt}
                  </p>
                )}

                {/* Main Content - Rich HTML */}
                {blog.content && (
                  <div
                    className="rich-text-content text-lg text-darkdeep4 mb-25px !leading-30px"
                    data-aos="fade-up"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                  />
                )}

                {/* YouTube Videos */}
                {youtubeLinks && youtubeLinks.length > 0 && (
                  <div className="space-y-6 mb-30px">
                    {youtubeLinks.map((ytLink, index) => (
                      <div key={index} data-aos="fade-up">
                        <h4 className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-15px !leading-30px">
                          {ytLink.title || 'Video'}
                        </h4>
                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                          <iframe
                            src={ytLink.embedUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* External Links */}
                {links && links.length > 0 && (
                  <div className="mb-30px" data-aos="fade-up">
                    <h4 className="text-size-26 font-bold text-blackColor dark:text-blackColor-dark mb-15px !leading-30px">
                      Related Links
                    </h4>
                    <ul className="space-y-3">
                      {links.map((link, index) => (
                        <li key={index} className="flex items-center group">
                          <i className="icofont-link px-0.5 py-2 text-primaryColor bg-whitegrey3 bg-opacity-40 group-hover:bg-primaryColor group-hover:text-white group-hover:opacity-100 mr-15px dark:bg-whitegrey1-dark"></i>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm lg:text-xs 2xl:text-sm font-medium leading-25px lg:leading-21px 2xl:leading-25px text-darkdeep4 hover:text-primaryColor"
                          >
                            {link.title || link.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* tag and share */}
                {tags && tags.length > 0 && (
                  <BlogTagsAndSocila tags={tags} />
                )}
                
                {/* previous comment area */}
                <ClientComment />
                
                {/* write comment area */}
                <CommentFome />
              </div>
            </div>
          </div>
          {/* blog sidebar */}
          <div className="lg:col-start-9 lg:col-span-4">
            <BlogsSidebar excludeSections={['categories', 'popular-tag', 'follow-us', 'get-in-touch']} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogDetails;
