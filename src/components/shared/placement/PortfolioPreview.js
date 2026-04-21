/**
 * Portfolio Preview Component
 */

'use client';

export default function PortfolioPreview({ portfolioData }) {
  const about = portfolioData?.about || {};
  const skills = portfolioData?.skills || [];
  const projects = portfolioData?.projects || [];
  const courses = portfolioData?.courses || [];
  const certificates = portfolioData?.certificates || [];

  return (
    <div className="portfolio-preview bg-white dark:bg-gray-800 p-8">
      {/* About Section */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">{about.name || 'Your Name'}</h1>
        {about.email && <p className="text-gray-600 dark:text-gray-400">{about.email}</p>}
        {about.bio && <p className="mt-4 text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">{about.bio}</p>}
      </div>

      {/* Skills Section */}
      {skills.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(skills) ? skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {skill}
              </span>
            )) : null}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project, index) => (
              <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">{project.title}</h3>
                {project.description && <p className="text-gray-600 dark:text-gray-400">{project.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses Section */}
      {courses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Courses</h2>
          <div className="space-y-3">
            {courses.map((course, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold">{course.title}</h3>
                {course.description && <p className="text-gray-600 text-sm">{course.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates Section */}
      {certificates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Certificates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {certificates.map((cert, index) => (
              <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg text-center">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{cert.title}</h3>
                {cert.issuer && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{cert.issuer}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
