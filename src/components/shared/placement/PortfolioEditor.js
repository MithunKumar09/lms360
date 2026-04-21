/**
 * Portfolio Editor Component
 */

'use client';

import { useState } from 'react';

export default function PortfolioEditor({ portfolioData, onSave }) {
  const [data, setData] = useState(portfolioData);
  const [activeSection, setActiveSection] = useState('about');

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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Portfolio</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg hover:bg-primaryColor/90"
        >
          Save Changes
        </button>
      </div>

      {/* Section Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {['about', 'skills', 'projects', 'courses', 'certificates'].map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap capitalize ${
              activeSection === section
                ? 'bg-primaryColor text-whiteColor'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* About Section */}
      {activeSection === 'about' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input
              type="text"
              value={data.about?.name || ''}
              onChange={(e) => updateField('about', 'name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={data.about?.email || ''}
              onChange={(e) => updateField('about', 'email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
            <textarea
              value={data.about?.bio || ''}
              onChange={(e) => updateField('about', 'bio', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {/* Skills Section */}
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

      {/* Projects Section */}
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

      {/* Courses Section */}
      {activeSection === 'courses' && (
        <div className="space-y-4">
          {data.courses?.map((course, index) => (
            <div key={index} className="border border-gray-300 dark:border-gray-600 p-4 rounded-lg bg-white dark:bg-gray-700">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Course #{index + 1}</h3>
                <button
                  onClick={() => removeArrayItem('courses', index)}
                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Course Title"
                  value={course.title || ''}
                  onChange={(e) => updateArray('courses', index, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <textarea
                  placeholder="Description"
                  value={course.description || ''}
                  onChange={(e) => updateArray('courses', index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificates Section */}
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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
