/**
 * Courses Database Utilities
 * 
 * Provides CRUD operations for published courses.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/courses/courses
 */

import { query, getClient } from '../index.js';

/**
 * Create a new course
 * @param {Object} data - Course data
 * @param {string} data.title - Course title
 * @param {string} data.slug - Course slug
 * @param {string} data.createdBy - User ID who created the course
 * @param {string} [data.orgId] - Organization ID
 * @param {Object} data.courseData - Full course data from form
 * @returns {Promise<Object>} Created course object
 */
export async function createCourse(data) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    const {
      title,
      slug,
      createdBy,
      orgId = null,
      courseData,
    } = data;

    // Insert main course record
    const courseResult = await client.query(
      `INSERT INTO courses (
        title, slug, org_id, category_id, subcategory_id, course_type_id,
        program_type_id, course_level_id, regular_price, discounted_price,
        about_course, intro_video_url, cover_image_url, description, language, start_date,
        certificate_template_id, certificate_upload_url, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'published', $19
      ) RETURNING *`,
      [
        title,
        slug,
        orgId,
        courseData.categoryId || null,
        courseData.subcategoryId || null,
        courseData.courseTypeId || null,
        courseData.programTypeId || null,
        courseData.courseLevelId || null,
        courseData.regularPrice || 0,
        courseData.discountedPrice || 0,
        courseData.aboutCourse || null,
        courseData.introVideoUrl || null,
        courseData.coverImageUrl || null,
        courseData.description || null,
        courseData.language || 'English',
        courseData.startDate || null,
        courseData.certificateTemplateId || null,
        courseData.certificateUploadUrl || null,
        createdBy,
      ]
    );

    const course = courseResult.rows[0];
    const courseId = course.id;

    // Insert course instructors
    if (courseData.instructorIds && courseData.instructorIds.length > 0) {
      // Remove duplicates and filter out null/undefined values
      const uniqueInstructorIds = [...new Set(courseData.instructorIds.filter(id => id != null))];
      
      if (uniqueInstructorIds.length > 0) {
        // Validate that all instructor IDs exist in the users table
        const placeholders = uniqueInstructorIds.map((_, index) => `$${index + 1}`).join(', ');
        const validationResult = await client.query(
          `SELECT id FROM users WHERE id IN (${placeholders})`,
          uniqueInstructorIds
        );
        
        const validInstructorIds = validationResult.rows.map(row => row.id);
        const invalidInstructorIds = uniqueInstructorIds.filter(id => !validInstructorIds.includes(id));
        
        if (invalidInstructorIds.length > 0) {
          await client.query('ROLLBACK');
          throw new Error(
            `Invalid instructor IDs: ${invalidInstructorIds.join(', ')}. These users do not exist in the database.`
          );
        }
        
        if (validInstructorIds.length > 0) {
          const instructorValues = validInstructorIds.map((_, index) => {
            const baseIndex = index * 2;
            return `($${baseIndex + 1}, $${baseIndex + 2})`;
          }).join(', ');
          
          const instructorParams = validInstructorIds.flatMap(id => [courseId, id]);
          
          await client.query(
            `INSERT INTO course_instructors (course_id, instructor_id) VALUES ${instructorValues}`,
            instructorParams
          );
        }
      }
    }

    // Insert course classes
    if (courseData.classIds && courseData.classIds.length > 0) {
      const classValues = courseData.classIds.map((_, index) => {
        const baseIndex = index * 2;
        return `($${baseIndex + 1}, $${baseIndex + 2})`;
      }).join(', ');
      
      const classParams = courseData.classIds.flatMap(id => [courseId, id]);
      
      await client.query(
        `INSERT INTO course_classes (course_id, class_id) VALUES ${classValues}`,
        classParams
      );
    }

    // Insert course subjects
    if (courseData.subjectIds && courseData.subjectIds.length > 0) {
      const subjectValues = courseData.subjectIds.map((_, index) => {
        const baseIndex = index * 2;
        return `($${baseIndex + 1}, $${baseIndex + 2})`;
      }).join(', ');
      
      const subjectParams = courseData.subjectIds.flatMap(id => [courseId, id]);
      
      await client.query(
        `INSERT INTO course_subjects (course_id, subject_id) VALUES ${subjectValues}`,
        subjectParams
      );
    }

    // Insert course skills (many-to-many relationship)
    if (courseData.courseSkills && courseData.courseSkills.length > 0) {
      const skillValues = courseData.courseSkills.map((_, index) => {
        const baseIndex = index * 2;
        return `($${baseIndex + 1}, $${baseIndex + 2})`;
      }).join(', ');
      
      const skillParams = courseData.courseSkills.flatMap(id => [courseId, id]);
      
      await client.query(
        `INSERT INTO courses_skills (course_id, skill_id) VALUES ${skillValues}
         ON CONFLICT (course_id, skill_id) DO NOTHING`,
        skillParams
      );
    }

    // Insert course tags
    if (courseData.tags && courseData.tags.length > 0) {
      const tagValues = courseData.tags.map((_, index) => {
        const baseIndex = index * 2;
        return `($${baseIndex + 1}, $${baseIndex + 2})`;
      }).join(', ');
      
      const tagParams = courseData.tags.flatMap(tag => [courseId, tag]);
      
      await client.query(
        `INSERT INTO course_tags (course_id, tag) VALUES ${tagValues}`,
        tagParams
      );
    }

    // Insert course requirements
    if (courseData.requirements && courseData.requirements.length > 0) {
      const requirementValues = courseData.requirements.map((req, index) => {
        const baseIndex = index * 3;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`;
      }).join(', ');
      
      const requirementParams = courseData.requirements.flatMap((req, index) => [
        courseId,
        req,
        index,
      ]);
      
      await client.query(
        `INSERT INTO course_requirements (course_id, requirement, order_index) VALUES ${requirementValues}`,
        requirementParams
      );
    }

    // Insert modules, chapters, and lessons
    if (courseData.modules && courseData.modules.length > 0) {
      for (let moduleIndex = 0; moduleIndex < courseData.modules.length; moduleIndex++) {
        const courseModule = courseData.modules[moduleIndex];
        
        // Insert module
        const moduleResult = await client.query(
          `INSERT INTO course_modules (course_id, title, description, order_index)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [
            courseId,
            courseModule.title || `Module ${moduleIndex + 1}`,
            courseModule.description || null,
            moduleIndex,
          ]
        );
        
        const moduleId = moduleResult.rows[0].id;

        // Insert chapters
        if (courseModule.chapters && courseModule.chapters.length > 0) {
          for (let chapterIndex = 0; chapterIndex < courseModule.chapters.length; chapterIndex++) {
            const chapter = courseModule.chapters[chapterIndex];
            
            // Insert chapter
            const chapterResult = await client.query(
              `INSERT INTO course_chapters (module_id, title, description, order_index)
               VALUES ($1, $2, $3, $4) RETURNING *`,
              [
                moduleId,
                chapter.title || `Chapter ${chapterIndex + 1}`,
                chapter.description || null,
                chapterIndex,
              ]
            );
            
            const chapterId = chapterResult.rows[0].id;

            // Insert lessons
            if (chapter.lessons && chapter.lessons.length > 0) {
              for (let lessonIndex = 0; lessonIndex < chapter.lessons.length; lessonIndex++) {
                const lesson = chapter.lessons[lessonIndex];
                
                await client.query(
                  `INSERT INTO course_lessons (
                    chapter_id, title, description, lesson_type, video_url,
                    text_content, quiz_id, assignment_id, material_url,
                    duration, order_index, is_preview
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                  [
                    chapterId,
                    lesson.title || `Lesson ${lessonIndex + 1}`,
                    lesson.description || null,
                    lesson.type || 'video',
                    lesson.videoUrl || null,
                    lesson.textContent || null,
                    lesson.quizId || null,
                    lesson.assignmentId || null,
                    lesson.materialUrl || null,
                    lesson.duration || null,
                    lessonIndex,
                    lesson.isPreview || false,
                  ]
                );
              }
            }
          }
        }
      }
    }

    await client.query('COMMIT');

    return course;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating course:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get course by ID
 * @param {string} courseId - Course UUID
 * @returns {Promise<Object|null>} Course object or null if not found
 */
export async function getCourseById(courseId) {
  try {
    const result = await query(
      `SELECT * FROM courses WHERE id = $1`,
      [courseId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting course:', error);
    throw error;
  }
}

