"use client";
import HeadingPrimary from "@/components/shared/headings/HeadingPrimary";
import SectionName from "@/components/shared/section-names/SectionName";
import Image from "next/image";
import blogImage1 from "@/assets/images/blog/blog_1.png";
import blogImage2 from "@/assets/images/blog/blog_2.png";
import blogImage3 from "@/assets/images/blog/blog_3.png";
import blogImage4 from "@/assets/images/blog/blog_4.png";
import blogImage26 from "@/assets/images/blog/blog_26.jpg";
import blogImage27 from "@/assets/images/blog/blog_27.jpg";
import blogImage28 from "@/assets/images/blog/blog_28.jpg";
import blogImage31 from "@/assets/images/blog/blog_31.jpg";
import blogImage32 from "@/assets/images/blog/blog_32.jpg";
import blogImage33 from "@/assets/images/blog/blog_33.jpg";
import Link from "next/link";
import useIsTrue from "@/hooks/useIsTrue";
import { useHomeBlogs } from "@/hooks/api/useHomeBlogs";
import { useEffect, useMemo, useState } from "react";

/**
 * Shuffle array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Format date to day and month
 * @param {string} dateString - ISO date string
 * @returns {Object} { date: string, month: string }
 */
function formatBlogDate(dateString) {
  if (!dateString) {
    return { date: "", month: "" };
  }
  const date = new Date(dateString);
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  return { date: day.toString(), month };
}

const Blogs = ({ secondary }) => {
  const isHome9 = useIsTrue("/home-9");
  const isHome9Dark = useIsTrue("/home-9-dark");
  
  // Fetch blogs from API
  const { data: blogsData, isLoading, isError, error } = useHomeBlogs({ limit: 10 }); // Fetch more for shuffling
  
  // Fallback images for when blog doesn't have featured image
  const fallbackImages = [
    secondary ? blogImage26 : isHome9 || isHome9Dark ? blogImage31 : blogImage1,
    secondary ? blogImage27 : isHome9 || isHome9Dark ? blogImage32 : blogImage3,
    secondary ? blogImage28 : isHome9 || isHome9Dark ? blogImage33 : blogImage4,
  ];

  // Shuffle and slice blogs (only shuffle once on mount/data change)
  const [shuffledBlogs, setShuffledBlogs] = useState([]);
  
  useEffect(() => {
    if (blogsData?.blogs && blogsData.blogs.length > 0) {
      const shuffled = shuffleArray(blogsData.blogs);
      setShuffledBlogs(shuffled.slice(0, 3)); // Take first 3 after shuffle
    }
  }, [blogsData]);

  // Transform blogs to component format
  const blogs = useMemo(() => {
    if (!shuffledBlogs || shuffledBlogs.length === 0) return [];
    
    return shuffledBlogs.map((blog, idx) => {
      const { date, month } = formatBlogDate(blog.published_at || blog.created_at);
      
      return {
        id: blog.id,
        title: blog.title,
        desc: blog.excerpt || blog.content?.substring(0, 200) + '...' || '',
        date,
        month,
        image: blog.featured_image_url || fallbackImages[idx % fallbackImages.length],
        author: blog.author || { name: 'Admin' },
        slug: blog.slug,
      };
    });
  }, [shuffledBlogs, fallbackImages]);

  return (
    <section>
      <div className="container py-100px">
        {/*  heading  */}
        <div className="mb-5 md:mb-10" data-aos="fade-up">
          <div className="relative text-center">
            <div>
              <div>
                <SectionName>News & Blogs</SectionName>
              </div>
            </div>
            <HeadingPrimary>
              {" "}
              {isHome9 || isHome9Dark ? (
                <>
                  Our Latest{" "}
                  <span className="relative after:w-full after:h-[7px] z-0 after:bg-secondaryColor after:absolute after:left-0 after:bottom-3 md:after:bottom-5 after:z-[-1]">
                    Research
                  </span>
                </>
              ) : (
                "Leatest News & Blog"
              )}
            </HeadingPrimary>
          </div>
        </div>

        {/*  blogs  */}

        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
            <div className="lg:col-start-1 lg:col-span-12 text-center py-20">
              <p className="text-contentColor dark:text-contentColor-dark">Loading blogs...</p>
            </div>
          </div>
        )}

        {isError && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
            <div className="lg:col-start-1 lg:col-span-12 text-center py-20">
              <p className="text-red-500">Failed to load blogs. Please try again later.</p>
            </div>
          </div>
        )}

        {!isLoading && !isError && blogs?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
            {blogs.map(
              ({ id, title, date, desc, image, author, month, slug }, idx) =>
                idx === 0 && (
                  <div
                    key={id || idx}
                    className="lg:col-start-1 lg:col-span-8 group shadow-blog"
                    data-aos="fade-up"
                  >
                    {/*  blog thumbnail  */}
                    <div className="overflow-hidden relative">
                      {typeof image === 'string' && image.startsWith('http') ? (
                        <img
                          src={image}
                          alt={title}
                          className="w-full group-hover:scale-110 transition-all duration-300"
                        />
                      ) : (
                      <Image
                          src={image}
                          alt={title}
                        className="w-full group-hover:scale-110 transition-all duration-300"
                        placeholder="blur"
                          width={800}
                          height={450}
                      />
                      )}
                      <div className="text-base md:text-3xl leading-5 md:leading-9 font-semibold text-white px-15px py-5px md:px-6 md:py-2 bg-primaryColor rounded text-center absolute top-5 left-5">
                        {date} <br /> {month}
                      </div>
                    </div>
                    {/*  blog content  */}
                    <div className="p-5 md:p-35px md:pt-10">
                      <h3 className="text-2xl md:text-4xl leading-30px md:leading-45px font-bold text-blackColor hover:text-primaryColor pb-25px dark:text-blackColor-dark dark:hover:text-primaryColor">
                        <Link href={`/blogs/${slug || id}`}>{title}</Link>
                      </h3>
                      <p className="text-base text-contentColor dark:text-contentColor-dark mb-30px">
                        {desc}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {author?.avatar_url ? (
                            <div className="w-11 h-11">
                              <img
                                src={author.avatar_url}
                                alt={author.name}
                                className="rounded-full w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                          <div className="w-11 h-11">
                            <Image
                              src={blogImage2}
                              alt=""
                              className="rounded-full"
                            />
                          </div>
                          )}
                          <div className="text-sm md:text-lg text-darkdeep5 dark:text-darkdeep5-dark">
                            By:
                            <span className="text-blackColor dark:text-blackColor-dark">
                              {author?.name || 'Admin'}
                            </span>
                          </div>
                        </div>
                        {/*  social  */}
                        <div>
                          <ul className="flex gap-1">
                            <li>
                              <a
                                href="#"
                                className="text-sm md:text-size-15 w-5 h-5 md:w-[39px] md:h-[39px] flex items-center justify-center border border-borderColor text-darkdeep4 hover:text-primaryColor dark:border-borderColor-dark rounded"
                              >
                                <i className="icofont-facebook"></i>
                              </a>
                            </li>
                            <li>
                              <a
                                href="#"
                                className="text-sm md:text-size-15 w-5 h-5 md:w-[39px] md:h-[39px] flex items-center justify-center border border-borderColor text-darkdeep4 hover:text-primaryColor dark:border-borderColor-dark rounded"
                              >
                                <i className="icofont-youtube-play"></i>
                              </a>
                            </li>
                            <li>
                              <a
                                href="#"
                                className="text-sm md:text-size-15 w-5 h-5 md:w-[39px] md:h-[39px] flex items-center justify-center border border-borderColor text-darkdeep4 hover:text-primaryColor dark:border-borderColor-dark rounded"
                              >
                                <i className="icofont-instagram"></i>
                              </a>
                            </li>
                            <li>
                              <a
                                href="#"
                                className="text-sm md:text-size-15 w-5 h-5 md:w-[39px] md:h-[39px] flex items-center justify-center border border-borderColor text-darkdeep4 hover:text-primaryColor dark:border-borderColor-dark rounded"
                              >
                                <i className="icofont-twitter"></i>
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )
            )}

          {/*  blog 2 & 3  */}

          <div className="lg:col-start-9 lg:col-span-4">
            <div className="flex flex-col gap-y-30px">
                {blogs.map(
                  ({ id, title, date, image, month, slug }, idx) =>
                    idx > 0 &&
                    idx < 3 && (
                      <div
                        key={id || idx}
                        className="group shadow-blog"
                        data-aos="fade-up"
                      >
                        {/*  blog thumbnail  */}
                        <div className="overflow-hidden relative">
                          {typeof image === 'string' && image.startsWith('http') ? (
                            <img
                              src={image}
                              alt={title}
                              className="w-full group-hover:scale-110 transition-all duration-300"
                            />
                          ) : (
                          <Image
                              src={image}
                              alt={title}
                              className="w-full group-hover:scale-110 transition-all duration-300"
                            placeholder="blur"
                              width={400}
                              height={250}
                          />
                          )}
                          <div className="text-base md:text-2xl leading-5 md:leading-30px font-semibold text-white px-15px py-5px md:px-22px md:py-7px bg-primaryColor rounded text-center absolute top-5 left-5">
                            {date} <br />
                            {month}
                          </div>
                        </div>
                        {/*  blog content  */}
                        <div className="px-5 py-25px">
                          <h3 className="text-2xl md:text-size-28 leading-30px md:leading-35px font-bold text-blackColor hover:text-primaryColor dark:text-blackColor-dark dark:hover:text-primaryColor">
                            <Link href={`/blogs/${slug || id}`}>{title}</Link>
                          </h3>
                        </div>
                      </div>
                    )
                )}
            </div>
          </div>
        </div>
        )}

        {!isLoading && !isError && (!blogs || blogs.length === 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-30px">
            <div className="lg:col-start-1 lg:col-span-12 text-center py-20">
              <p className="text-contentColor dark:text-contentColor-dark">No blogs available at the moment.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Blogs;
