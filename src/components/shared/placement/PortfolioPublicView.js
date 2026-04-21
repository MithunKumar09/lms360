/**
 * Portfolio Public View Component
 * 
 * Displays a public portfolio by slug (no authentication required)
 */

'use client';

import { useEffect, useState } from 'react';

export default function PortfolioPublicView({ slug }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/placement/portfolio/${slug}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portfolio');
        }

        setPortfolio(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPortfolio();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full text-center">
          <h2 className="text-red-800 font-semibold text-lg mb-2">Portfolio Not Found</h2>
          <p className="text-red-600">{error || 'This portfolio does not exist or is not public.'}</p>
        </div>
      </div>
    );
  }

  const portfolioData = portfolio.portfolioData || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center space-x-6">
            {portfolioData.about?.avatarUrl && (
              <img
                src={portfolioData.about.avatarUrl}
                alt={portfolioData.about.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                {portfolioData.about?.name || 'Portfolio'}
              </h1>
              {portfolioData.about?.bio && (
                <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">{portfolioData.about.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Skills */}
        {portfolioData.skills && portfolioData.skills.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {portfolioData.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {portfolioData.projects && portfolioData.projects.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolioData.projects.map((project) => (
                <div key={project.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{project.title}</h3>
                  {project.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{project.description}</p>
                  )}
                  {project.completedAt && (
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(project.completedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses */}
        {portfolioData.courses && portfolioData.courses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioData.courses.map((course) => (
                <div key={course.id} className="flex items-start space-x-4">
                  {course.coverImageUrl && (
                    <img
                      src={course.coverImageUrl}
                      alt={course.title}
                      className="w-20 h-20 rounded object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{course.title}</h3>
                    {course.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{course.description}</p>
                    )}
                    {course.completedAt && (
                      <p className="text-gray-500 text-xs mt-1">
                        Completed: {new Date(course.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certificates */}
        {portfolioData.certificates && portfolioData.certificates.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Certificates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioData.certificates.map((cert) => (
                <div key={cert.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cert.title}</h3>
                  {cert.issuer && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Issued by: {cert.issuer}</p>
                  )}
                  {cert.issuedAt && (
                    <p className="text-gray-500 text-xs mt-1">
                      {new Date(cert.issuedAt).toLocaleDateString()}
                    </p>
                  )}
                  {cert.certificateUrl && (
                    <a
                      href={cert.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
                    >
                      View Certificate →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {portfolioData.education && portfolioData.education.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Education</h2>
            <div className="space-y-4">
              {portfolioData.education.map((edu, index) => (
                <div key={index} className="border-l-4 border-blue-500 pl-4">
                  {edu.degree && (
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{edu.degree}</h3>
                  )}
                  {edu.institution && (
                    <p className="text-gray-600 dark:text-gray-400">{edu.institution}</p>
                  )}
                  {edu.year && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{edu.year}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {portfolioData.about?.email && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Contact</h2>
            <p className="text-gray-700 dark:text-gray-300">
              <a href={`mailto:${portfolioData.about.email}`} className="text-blue-600 hover:text-blue-700">
                {portfolioData.about.email}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
