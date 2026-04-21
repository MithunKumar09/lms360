/**
 * Resume Preview Component
 * 
 * Live preview of resume
 */

'use client';

export default function ResumePreview({ resumeData }) {
  const personalInfo = resumeData?.personalInfo || {};
  const education = resumeData?.education || [];
  const skills = resumeData?.skills || [];
  const experience = resumeData?.experience || [];
  const projects = resumeData?.projects || [];
  const certificates = resumeData?.certificates || [];

  return (
    <div className="resume-preview" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.6' }}>
      {/* Header */}
      <div className="mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-2xl font-bold mb-2">
          {personalInfo.firstName} {personalInfo.lastName}
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span className="mx-2">|</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
        </div>
        {personalInfo.bio && (
          <p className="mt-2 text-sm">{personalInfo.bio}</p>
        )}
      </div>

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 text-gray-900 dark:text-gray-100">Education</h2>
          {education.map((edu, index) => (
            <div key={index} className="mb-3">
              <div className="flex justify-between">
                <span className="font-semibold">{edu.degree}</span>
                {edu.year && <span>{edu.year}</span>}
              </div>
              {edu.institution && <p className="text-sm text-gray-600 dark:text-gray-400">{edu.institution}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 text-gray-900 dark:text-gray-100">Skills</h2>
          <p className="text-sm">{Array.isArray(skills) ? skills.join(', ') : skills}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 text-gray-900 dark:text-gray-100">Experience</h2>
          {experience.map((exp, index) => (
            <div key={index} className="mb-4">
              <div className="flex justify-between">
                <span className="font-semibold">{exp.title}</span>
                {exp.duration && <span className="text-sm">{exp.duration}</span>}
              </div>
              {exp.company && <p className="text-sm text-gray-600 dark:text-gray-400">{exp.company}</p>}
              {exp.description && <p className="text-sm mt-1">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 text-gray-900 dark:text-gray-100">Projects</h2>
          {projects.map((project, index) => (
            <div key={index} className="mb-3">
              <h3 className="font-semibold">{project.title}</h3>
              {project.description && <p className="text-sm">{project.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Certificates */}
      {certificates.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 border-b border-gray-300 dark:border-gray-600 pb-1 text-gray-900 dark:text-gray-100">Certificates</h2>
          {certificates.map((cert, index) => (
            <div key={index} className="mb-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{cert.title}</span>
              {cert.issuer && <span className="text-sm text-gray-600 dark:text-gray-400"> - {cert.issuer}</span>}
              {cert.issuedAt && <span className="text-sm text-gray-600 dark:text-gray-400"> ({cert.issuedAt})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
