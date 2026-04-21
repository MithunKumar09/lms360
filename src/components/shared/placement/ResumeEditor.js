/**
 * Resume Editor Component
 * 
 * Section-based form editor for resume
 */

'use client';

import { useState } from 'react';

export default function ResumeEditor({ resumeData, onSave }) {
  const [data, setData] = useState(resumeData);
  const [activeSection, setActiveSection] = useState('personalInfo');

  const updateField = (section, field, value) => {
    setData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const updateArray = (section, index, field, value) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addArrayItem = (section, newItem) => {
    setData(prev => ({
      ...prev,
      [section]: [...prev[section], newItem]
    }));
  };

  const removeArrayItem = (section, index) => {
    setData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    onSave(data);
  };

  const sections = [
    { id: 'personalInfo', label: 'Personal Information' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'certificates', label: 'Certificates' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Resume</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90"
        >
          Save Changes
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeSection === section.id
                ? 'bg-primaryColor text-whiteColor'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Personal Information */}
      {activeSection === 'personalInfo' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
            <input
              type="text"
              value={data.personalInfo?.firstName || ''}
              onChange={(e) => updateField('personalInfo', 'firstName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input
              type="text"
              value={data.personalInfo?.lastName || ''}
              onChange={(e) => updateField('personalInfo', 'lastName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={data.personalInfo?.email || ''}
              onChange={(e) => updateField('personalInfo', 'email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
            <input
              type="tel"
              value={data.personalInfo?.phone || ''}
              onChange={(e) => updateField('personalInfo', 'phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={data.personalInfo?.bio || ''}
              onChange={(e) => updateField('personalInfo', 'bio', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {/* Education */}
      {activeSection === 'education' && (
        <div className="space-y-4">
          {data.education?.map((edu, index) => (
            <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-white dark:bg-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Education #{index + 1}</h3>
                <button
                  onClick={() => removeArrayItem('education', index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Degree"
                  value={edu.degree || ''}
                  onChange={(e) => updateArray('education', index, 'degree', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Institution"
                  value={edu.institution || ''}
                  onChange={(e) => updateArray('education', index, 'institution', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Year"
                  value={edu.year || ''}
                  onChange={(e) => updateArray('education', index, 'year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('education', { degree: '', institution: '', year: '' })}
            className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            + Add Education
          </button>
        </div>
      )}

      {/* Skills */}
      {activeSection === 'skills' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Skills (comma-separated)
            </label>
            <input
              type="text"
              value={Array.isArray(data.skills) ? data.skills.join(', ') : ''}
              onChange={(e) => {
                const skills = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                setData(prev => ({ ...prev, skills }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="JavaScript, React, Node.js"
            />
          </div>
        </div>
      )}

      {/* Experience */}
      {activeSection === 'experience' && (
        <div className="space-y-4">
          {data.experience?.map((exp, index) => (
            <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-white dark:bg-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Experience #{index + 1}</h3>
                <button
                  onClick={() => removeArrayItem('experience', index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Job Title"
                  value={exp.title || ''}
                  onChange={(e) => updateArray('experience', index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Company"
                  value={exp.company || ''}
                  onChange={(e) => updateArray('experience', index, 'company', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <textarea
                  placeholder="Description"
                  value={exp.description || ''}
                  onChange={(e) => updateArray('experience', index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g., Jan 2020 - Dec 2022)"
                  value={exp.duration || ''}
                  onChange={(e) => updateArray('experience', index, 'duration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('experience', { title: '', company: '', description: '', duration: '' })}
            className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            + Add Experience
          </button>
        </div>
      )}

      {/* Projects */}
      {activeSection === 'projects' && (
        <div className="space-y-4">
          {data.projects?.map((project, index) => (
            <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-white dark:bg-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Project #{index + 1}</h3>
                <button
                  onClick={() => removeArrayItem('projects', index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Project Title"
                  value={project.title || ''}
                  onChange={(e) => updateArray('projects', index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <textarea
                  placeholder="Description"
                  value={project.description || ''}
                  onChange={(e) => updateArray('projects', index, 'description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('projects', { title: '', description: '' })}
            className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            + Add Project
          </button>
        </div>
      )}

      {/* Certificates */}
      {activeSection === 'certificates' && (
        <div className="space-y-4">
          {data.certificates?.map((cert, index) => (
            <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-white dark:bg-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Certificate #{index + 1}</h3>
                <button
                  onClick={() => removeArrayItem('certificates', index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Certificate Name"
                  value={cert.title || ''}
                  onChange={(e) => updateArray('certificates', index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Issuer"
                  value={cert.issuer || ''}
                  onChange={(e) => updateArray('certificates', index, 'issuer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="Date"
                  value={cert.issuedAt || ''}
                  onChange={(e) => updateArray('certificates', index, 'issuedAt', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('certificates', { title: '', issuer: '', issuedAt: '' })}
            className="w-full px-4 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            + Add Certificate
          </button>
        </div>
      )}
    </div>
  );
}
