'use client';

import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import teacherImag1 from "@/assets/images/teacher/teacher__1.png";
import Swal from "sweetalert2";

const InstructorContent = ({ instructors = [], courseId, type }) => {
  // Use first instructor if multiple, or show all if needed
  const instructor = instructors && instructors.length > 0 ? instructors[0] : null;

  // Get instructor name
  const instructorName = instructor?.name || instructor?.email || '--';
  
  // Get instructor photo or use placeholder
  const instructorPhoto = instructor?.photoUrl || teacherImag1;
  
  // Get designation/bio
  const designation = instructor?.designation || instructor?.bio || '--';
  const bio = instructor?.bio || '--';
  
  // Get instructor ID for link
  const instructorId = instructor?.id || null;

  // If no instructor, show placeholder
  if (!instructor) {
    return (
      <div>
        <div
          className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px flex flex-col md:flex-row shadow-autor"
          data-aos="fade-up"
        >
          <div className="flex mb-30px mr-5 flex-shrink-0">
            <Image
              src={teacherImag1}
              alt="Instructor"
              className="w-24 h-24 rounded-full"
              placeholder="blur"
            />
          </div>
          <div>
            <div className="mb-3">
              <h3 className="mb-7px text-xl font-bold text-blackColor2 dark:text-blackColor2-dark">
                --
              </h3>
              <p className="text-xs text-contentColor2 dark:text-contentColor2-dark">
                --
              </p>
            </div>
            <p className="text-sm text-contentColor dark:text-contentColor-dark mb-15px leading-26px">
              No instructor information available
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {Array.isArray(instructors) && instructors.map((instructor, index) => {
        if (!instructor || typeof instructor !== 'object') {
          return null;
        }
        const name = instructor?.name || instructor?.email || '--';
        const photo = instructor?.photoUrl || teacherImag1;
        const desig = instructor?.designation || instructor?.bio || '--';
        const instructorBio = instructor?.bio || '--';
        const instId = instructor?.id || null;

        return (
          <div
            key={instructor.id || index}
            className="p-5 md:p-30px lg:p-5 2xl:p-30px mb-30px flex flex-col md:flex-row shadow-autor"
            data-aos="fade-up"
          >
            {/* author avatar  */}
            <div className="flex mb-30px mr-5 flex-shrink-0">
              <Image
                src={photo}
                alt={name}
                className="w-24 h-24 rounded-full object-cover"
                width={96}
                height={96}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//9k="
              />
            </div>
            <div>
              {/* author name  */}
              <div className="mb-3">
                <h3 className="mb-7px">
                  {instId ? (
                    <Link
                      href={`/instructors/${instId}`}
                      className="text-xl font-bold text-blackColor2 dark:text-blackColor2-dark hover:text-primaryColor dark:hover:text-primaryColor"
                    >
                      {name}
                    </Link>
                  ) : (
                    <span className="text-xl font-bold text-blackColor2 dark:text-blackColor2-dark">
                      {name}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-contentColor2 dark:text-contentColor2-dark">
                  {desig !== '--' ? desig : 'Instructor'}
                </p>
              </div>
              {/* description  */}
              {instructorBio && instructorBio !== '--' && (
                <p className="text-sm text-contentColor dark:text-contentColor-dark mb-15px leading-26px">
                  {instructorBio}
                </p>
              )}
              {/* social media links */}
              <div>
                <ul className="flex gap-10px items-center">
                  {(() => {
                    // For course-details-3, use real social media links or show modal
                    if (type === 3) {
                      const facebookUrl = instructor?.facebookUrl || instructor?.facebook;
                      const youtubeUrl = instructor?.youtubeUrl || instructor?.youtube;
                      const instagramUrl = instructor?.instagramUrl || instructor?.instagram;
                      const twitterUrl = instructor?.twitterUrl || instructor?.twitter || instructor?.xUrl || instructor?.x;

                      const handleSocialClick = (url, platform) => {
                        if (!url || url === null || url === '') {
                          Swal.fire({
                            icon: 'info',
                            title: 'Social Media Not Available',
                            text: `This instructor has not linked their ${platform} profile yet.`,
                            confirmButtonText: 'OK',
                            confirmButtonColor: '#5f2ded',
                            customClass: {
                              popup: 'rounded-lg',
                              confirmButton: 'px-6 py-2 rounded'
                            }
                          });
                        } else {
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }
                      };

                      return (
                        <>
                          <li>
                            <button
                              onClick={() => handleSocialClick(facebookUrl, 'Facebook')}
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded cursor-pointer"
                            >
                              <i className="icofont-facebook"></i>
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleSocialClick(youtubeUrl, 'YouTube')}
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded cursor-pointer"
                            >
                              <i className="icofont-youtube-play"></i>
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleSocialClick(instagramUrl, 'Instagram')}
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded cursor-pointer"
                            >
                              <i className="icofont-instagram"></i>
                            </button>
                          </li>
                          <li>
                            <button
                              onClick={() => handleSocialClick(twitterUrl, 'Twitter')}
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded cursor-pointer"
                            >
                              <i className="icofont-twitter"></i>
                            </button>
                          </li>
                        </>
                      );
                    } else {
                      // For other pages, keep the original behavior
                      return (
                        <>
                          <li>
                            <a
                              href="https://www.facebook.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded"
                            >
                              <i className="icofont-facebook"></i>
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://www.youtube.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded"
                            >
                              <i className="icofont-youtube-play"></i>
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://www.instagram.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded"
                            >
                              <i className="icofont-instagram"></i>
                            </a>
                          </li>
                          <li>
                            <a
                              href="https://x.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-35px h-35px leading-35px text-center border border-borderColor2 text-contentColor hover:text-whiteColor hover:bg-primaryColor dark:text-contentColor-dark dark:hover:text-whiteColor dark:hover:bg-primaryColor dark:border-borderColor2-dark rounded"
                            >
                              <i className="icofont-twitter"></i>
                            </a>
                          </li>
                        </>
                      );
                    }
                  })()}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InstructorContent;
