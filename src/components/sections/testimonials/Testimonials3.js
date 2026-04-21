"use client";

import { useState, useMemo } from "react";
import TiltWrapper from "@/components/shared/wrappers/TiltWrapper";
import Image from "next/image";
import Link from "next/link";
import aboutImage4 from "@/assets/images/about/about_4.png";
import FeaturedSlider from "@/components/shared/featured-courses/FeaturedSlider";
import teacherImagLg1 from "@/assets/images/team/1.png";
import InstructorFeedbackModal from "@/components/shared/modals/InstructorFeedbackModal";
import { useAuthStore } from "@/store/index.js";

const Testimonials3 = ({ isInsTructorDetails, instructor, links, roles, socialLinks, rating }) => {
  const [imageError, setImageError] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // Get current user to check if they're a student
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.role === 'student' || user?.role === 'orgstudent';
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Map instructor data to component props
  const instructorData = useMemo(() => {
    if (!instructor) {
      return {
        name: '',
        subject: '',
        imageLg: teacherImagLg1,
        bio: 'No bio available.',
        socialLinks: {},
        rating: { averageRating: 0, totalReviews: 0 },
      };
    }

    const firstName = instructor.first_name || instructor.firstName || '';
    const lastName = instructor.last_name || instructor.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || instructor.email || 'Instructor';
    
    // Extract subjects from links
    const subjects = links?.instructor || [];
    const subjectTitles = subjects
      .map(link => link.subject_title)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
    
    const subject = subjectTitles.length > 0 
      ? subjectTitles.join(', ')
      : 'General';
    
    // Use avatar_url if available, otherwise use default
    const hasAvatarUrl = instructor.avatar_url && 
                        typeof instructor.avatar_url === 'string' && 
                        instructor.avatar_url.trim() !== '';
    const imageLg = hasAvatarUrl ? instructor.avatar_url : teacherImagLg1;
    
    // Get bio from instructor data
    const bio = instructor.bio || instructor.description || 'No bio available.';

    return {
      name: fullName,
      subject,
      imageLg,
      bio,
      instructorId: instructor.id,
      socialLinks: socialLinks || {},
      rating: rating || { averageRating: 0, totalReviews: 0 },
    };
  }, [instructor, links, socialLinks, rating]);

  // Render stars based on rating
  const renderStars = (ratingValue) => {
    const stars = [];
    const fullStars = Math.floor(ratingValue);
    const hasHalfStar = ratingValue % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`star-${i}`} className="icofont-star text-size-15 text-yellow"></i>);
    }
    if (hasHalfStar) {
      stars.push(<i key="half-star" className="icofont-star-half text-size-15 text-yellow"></i>);
    }
    // Fill remaining stars as empty
    const remainingStars = 5 - Math.ceil(ratingValue);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<i key={`empty-${i}`} className="icofont-star text-size-15 text-gray-300"></i>);
    }
    return stars;
  };
  return (
    <section
      className={`${
        isInsTructorDetails
          ? "pt-70px pb-100px"
          : "py-50px md:py-70px lg:py-20 2xl:pt-0 2xl:pb-50px"
      }`}
    >
      <div
        className={
          isInsTructorDetails
            ? ""
            : "py-10 md:py-10 2xl:py-50px 3xl:py-30 mx-10px md:mx-50px 3xl:mx-150px bg-darkdeep3 dark:bg-darkdeep3-dark shadow-container rounded-5"
        }
      >
        <div className="container">
          {/* about section  */}
          <div className="grid grid-cols-1 lg:grid-cols-12 pt-30px gap-x-30px">
            {/* about left */}
            <div
              className="lg:col-start-1 lg:col-span-4 relative z-0 mb-30px lg:mb-0 pb-0 md:pb-30px xl:pb-0 overflow-visible"
              data-aos="fade-up"
            >
              <TiltWrapper>
                <div className="tilt">
                  <div className="w-full aspect-square rounded-full overflow-hidden">
                    <Image 
                      src={imageError ? teacherImagLg1 : instructorData.imageLg} 
                      alt={instructorData.name || "Instructor"} 
                      className="rounded-full"
                      width={400}
                      height={400}
                      placeholder={instructorData.imageLg?.src ? "blur" : "empty"}
                      style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                      onError={() => {
                        if (!imageError) {
                          setImageError(true);
                        }
                      }}
                    />
                  </div>

                  <Image
                    className="absolute top-0 left-[-30px] animate-move-hor z-[-1]"
                    src={aboutImage4}
                    alt=""
                  />
                </div>
              </TiltWrapper>
            </div>
            {/* about right */}
            <div data-aos="fade-up" className="lg:col-start-5 lg:col-span-8">
              <div className="flex justify-between items-center flex-wrap md:flex-nowrap">
                <div>
                  <h3 className="text-size-25 md:text-size-40 lg:text-3xl 2xl:text-size-40 font-bold leading-34px md:leading-13.5 lg:leading-11 2xl:leading-13.5  text-blackColor dark:text-blackColor-dark">
                    {instructorData.name}
                  </h3>
                  <p className="text-sm md:text-base leading-7 text-contentColor dark:text-contentColor-dark">
                    Teaches {instructorData.subject}
                  </p>
                </div>
                <div>
                  <p className="text-blackColor dark:text-blackColor-dark mb-5px">
                    Review:
                  </p>
                  <div className="mb-10px">
                    {instructorData.rating.totalReviews > 0 ? (
                      <>
                        {renderStars(instructorData.rating.averageRating)}
                        <span className="text-xs text-lightGrey6 ml-1">
                          ({instructorData.rating.totalReviews})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-lightGrey6">No reviews yet</span>
                      </>
                    )}
                  </div>
                  {/* Feedback Button - Only show for students on instructor details page */}
                  {isInsTructorDetails && isAuthenticated && isStudent && instructorData.instructorId && (
                    <button
                      onClick={() => setIsFeedbackModalOpen(true)}
                      className="text-xs text-whiteColor bg-primaryColor px-15px py-5px rounded hover:bg-primaryColor/90 transition-all"
                      aria-label={instructorData.rating.totalReviews > 0 ? 'Edit your feedback' : 'Give feedback to this instructor'}
                    >
                      {instructorData.rating.totalReviews > 0 ? 'Edit Feedback' : 'Give Feedback'}
                    </button>
                  )}
                </div>
                <div>
                  <p className="text-blackColor dark:text-blackColor-dark">
                    Follow Us:
                  </p>
                  <ul className="flex gap-13px text-base text-contentColor dark:text-contentColor-dark">
                    {instructorData.socialLinks?.facebook && (
                      <li>
                        <Link
                          className="hover:text-primaryColor"
                          href={instructorData.socialLinks.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="icofont-facebook"></i>
                        </Link>
                      </li>
                    )}
                    {instructorData.socialLinks?.twitter && (
                      <li>
                        <Link
                          className="hover:text-primaryColor"
                          href={instructorData.socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="icofont-twitter"></i>
                        </Link>
                      </li>
                    )}
                    {instructorData.socialLinks?.linkedin && (
                      <li>
                        <Link
                          className="hover:text-primaryColor"
                          href={instructorData.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="icofont-linkedin"></i>
                        </Link>
                      </li>
                    )}
                    {instructorData.socialLinks?.github && (
                      <li>
                        <Link
                          className="hover:text-primaryColor"
                          href={instructorData.socialLinks.github}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="icofont-github"></i>
                        </Link>
                      </li>
                    )}
                    {instructorData.socialLinks?.website && (
                      <li>
                        <Link
                          className="hover:text-primaryColor"
                          href={instructorData.socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <i className="icofont-globe"></i>
                        </Link>
                      </li>
                    )}
                    {!instructorData.socialLinks?.facebook && 
                     !instructorData.socialLinks?.twitter && 
                     !instructorData.socialLinks?.linkedin && 
                     !instructorData.socialLinks?.github && 
                     !instructorData.socialLinks?.website && (
                      <li>
                        <span className="text-xs text-contentColor dark:text-contentColor-dark">
                          No social links available
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="pt-7 mt-30px border-t border-borderColor dark:border-borderColor-dark">
                <h4 className="text-xl text-blackColor dark:text-blackColor-dark font-semibold mb-1">
                  Short Bio
                </h4>
                <p className="leading-7 text-contentColor dark:text-contentColor-dark">
                  {instructorData.bio}
                </p>
              </div>
              {isInsTructorDetails ? (
                <>
                  <div className="mb-10px mt-10">
                    <h4 className="text-3xl font-bold text-blackColor dark:text-blackColor-dark leading-1.2">
                      Online Course
                    </h4>
                  </div>
                  <div className="-mx-15px">
                    <FeaturedSlider instructorId={instructorData.instructorId} />
                  </div>
                </>
              ) : (
                ""
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Feedback Modal */}
      {isInsTructorDetails && instructorData.instructorId && (
        <InstructorFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          instructorId={instructorData.instructorId}
        />
      )}
    </section>
  );
};

export default Testimonials3;
