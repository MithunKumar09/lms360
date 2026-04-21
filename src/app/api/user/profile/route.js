/**
 * User Profile API Route
 * 
 * Returns current authenticated user's profile information
 * GET /api/user/profile
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getUserById } from '@/lib/db/users.js';

/**
 * GET /api/user/profile
 * 
 * Returns current user's profile information including:
 * - firstName
 * - lastName
 * - profileImage (avatar_url)
 * - email
 * - other profile fields
 */
export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Get user profile data
    const user = await getUserById(session.user.id);
    
    // console.log('👤 [USER PROFILE API] User data from getUserById:', {
    //   userId: session.user.id,
    //   userRole: session.user.role,
    //   userOrgId: session.user.orgId,
    //   dbUser: user ? {
    //     id: user.id,
    //     email: user.email,
    //     org_id: user.org_id,
    //     organization_name: user.organization_name,
    //     organization_display_name: user.organization_display_name,
    //     full_user: user
    //   } : null
    // });
    
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    // ===== INSTRUCTOR-SPECIFIC DATA: Fetch classes and subjects =====
    let instructorClasses = [];
    let instructorSubjects = [];
    
    // ===== STUDENT-SPECIFIC DATA: Fetch cohorts and subjects =====
    let studentCohorts = [];
    let studentSubjects = [];
    
    // Check if user is an instructor (handle both 'instructor' and 'orginstructor' roles)
    const isInstructor = session.user.role === 'instructor' || session.user.role === 'orginstructor';
    
    // Check if user is a student (handle both 'student' and 'orgstudent' roles)
    const isStudent = session.user.role === 'student' || session.user.role === 'orgstudent';
    
    if (isInstructor) {
      // console.log('👨‍🏫 [USER PROFILE API] Fetching instructor classes and subjects...');
      const { query } = await import('@/lib/db/index.js');
      
      try {
        // Fetch instructor's assigned classes (cohorts) with full details
        // Combine results from both instructor_classes and user_class_subject_links tables
        const classesResult = await query(
          `SELECT DISTINCT
            c.id,
            c.code as cohort_code,
            c.level,
            c.status as cohort_status,
            pn.id as program_node_id,
            pn.title as program_node_title,
            pn.code as program_node_code,
            pn.node_type as program_node_type,
            s.id as session_id,
            s.code as session_code,
            s.start_date as session_start_date,
            s.end_date as session_end_date,
            t.id as term_id,
            t.label as term_label,
            t.number as term_number,
            t.term_type,
            sec.id as section_id,
            sec.label as section_label,
            o.name as organization_name,
            o.display_name as organization_display_name
           FROM (
             SELECT DISTINCT ic.cohort_id
             FROM instructor_classes ic
             WHERE ic.instructor_user_id = $1
             UNION
             SELECT DISTINCT ucsl.cohort_id
             FROM user_class_subject_links ucsl
             WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor'
           ) instructor_cohorts
           INNER JOIN cohorts c ON instructor_cohorts.cohort_id = c.id
           LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
           LEFT JOIN academic_sessions s ON c.session_id = s.id
           LEFT JOIN terms t ON c.term_id = t.id
           LEFT JOIN sections sec ON c.section_id = sec.id
           LEFT JOIN organizations o ON c.org_id = o.id
           WHERE c.status = 'published'
           ORDER BY s.start_date DESC, c.level ASC, c.code ASC`,
          [session.user.id]
        );
        
        instructorClasses = Array.isArray(classesResult?.rows)
          ? classesResult.rows
              .filter(row => row && typeof row === 'object')
              .map(row => ({
                id: row.id,
                code: row.cohort_code,
                level: row.level,
                status: row.cohort_status,
                programNode: row.program_node_id ? {
                  id: row.program_node_id,
                  title: row.program_node_title,
                  code: row.program_node_code,
                  type: row.program_node_type,
                } : null,
                session: row.session_id ? {
                  id: row.session_id,
                  code: row.session_code,
                  startDate: row.session_start_date,
                  endDate: row.session_end_date,
                } : null,
                term: row.term_id ? {
                  id: row.term_id,
                  label: row.term_label,
                  number: row.term_number,
                  type: row.term_type,
                } : null,
                section: row.section_id ? {
                  id: row.section_id,
                  label: row.section_label,
                } : null,
                organization: row.organization_name ? {
                  name: row.organization_name,
                  displayName: row.organization_display_name,
                } : null,
              }))
          : [];
        
        // Fetch instructor's assigned subjects with full details
        // Combine results from both instructor_classes and user_class_subject_links tables
        const subjectsResult = await query(
          `SELECT DISTINCT
            sc.id as subject_id,
            sc.code as subject_code,
            sc.title as subject_title,
            sc.level as subject_level,
            so.id as offering_id,
            so.cohort_id,
            c.code as cohort_code,
            c.level as cohort_level,
            pn.title as program_node_title,
            s.code as session_code,
            t.label as term_label,
            t.number as term_number
           FROM (
             SELECT DISTINCT ic.subject_offering_id
             FROM instructor_classes ic
             WHERE ic.instructor_user_id = $1 AND ic.subject_offering_id IS NOT NULL
             UNION
             SELECT DISTINCT ucsl.subject_offering_id
             FROM user_class_subject_links ucsl
             WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor' AND ucsl.subject_offering_id IS NOT NULL
           ) instructor_offerings
           INNER JOIN subject_offerings so ON instructor_offerings.subject_offering_id = so.id
           INNER JOIN subject_catalog sc ON so.subject_id = sc.id
           LEFT JOIN cohorts c ON so.cohort_id = c.id
           LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
           LEFT JOIN academic_sessions s ON c.session_id = s.id
           LEFT JOIN terms t ON c.term_id = t.id
           WHERE so.status = 'published'
             AND sc.id IS NOT NULL
           ORDER BY sc.level ASC, sc.title ASC, c.code ASC`,
          [session.user.id]
        );
        
        instructorSubjects = Array.isArray(subjectsResult?.rows)
          ? subjectsResult.rows
              .filter(row => row && typeof row === 'object')
              .map(row => ({
                subject: {
                  id: row.subject_id,
                  code: row.subject_code,
                  title: row.subject_title,
                  level: row.subject_level,
                },
                offering: {
                  id: row.offering_id,
                  cohortId: row.cohort_id,
                  cohortCode: row.cohort_code,
                  cohortLevel: row.cohort_level,
                  programNode: row.program_node_title,
                  sessionCode: row.session_code,
                  termLabel: row.term_label,
                  termNumber: row.term_number,
                },
              }))
          : [];
        
        // console.log('👨‍🏫 [USER PROFILE API] Instructor data fetched:', {
        //   classesCount: instructorClasses.length,
        //   subjectsCount: instructorSubjects.length,
        // });
      } catch (error) {
        console.error('👨‍🏫 [USER PROFILE API] Error fetching instructor data:', error);
        // Continue without instructor data if there's an error
      }
    }
    
    if (isStudent) {
      // console.log('🎓 [USER PROFILE API] Fetching student cohorts and subjects...');
      const { query } = await import('@/lib/db/index.js');
      
      try {
        // Fetch student's assigned cohorts (classes) with full details from student_links
        const cohortsResult = await query(
          `SELECT DISTINCT
            c.id,
            c.code as cohort_code,
            c.level,
            c.status as cohort_status,
            sl.roll_no,
            pn.id as program_node_id,
            pn.title as program_node_title,
            pn.code as program_node_code,
            pn.node_type as program_node_type,
            s.id as session_id,
            s.code as session_code,
            s.start_date as session_start_date,
            s.end_date as session_end_date,
            t.id as term_id,
            t.label as term_label,
            t.number as term_number,
            t.term_type,
            sec.id as section_id,
            sec.label as section_label,
            o.name as organization_name,
            o.display_name as organization_display_name
           FROM student_links sl
           INNER JOIN cohorts c ON sl.cohort_id = c.id
           LEFT JOIN program_nodes pn ON sl.program_node_id = pn.id OR c.program_node_id = pn.id
           LEFT JOIN academic_sessions s ON c.session_id = s.id
           LEFT JOIN terms t ON c.term_id = t.id
           LEFT JOIN sections sec ON c.section_id = sec.id
           LEFT JOIN organizations o ON c.org_id = o.id
           WHERE sl.user_id = $1
             AND c.status = 'published'
           ORDER BY s.start_date DESC, c.level ASC, c.code ASC`,
          [session.user.id]
        );
        
        studentCohorts = cohortsResult.rows.map(row => ({
          id: row.id,
          code: row.cohort_code,
          level: row.level,
          status: row.cohort_status,
          rollNo: row.roll_no,
          programNode: row.program_node_id ? {
            id: row.program_node_id,
            title: row.program_node_title,
            code: row.program_node_code,
            type: row.program_node_type,
          } : null,
          session: row.session_id ? {
            id: row.session_id,
            code: row.session_code,
            startDate: row.session_start_date,
            endDate: row.session_end_date,
          } : null,
          term: row.term_id ? {
            id: row.term_id,
            label: row.term_label,
            number: row.term_number,
            type: row.term_type,
          } : null,
          section: row.section_id ? {
            id: row.section_id,
            label: row.section_label,
          } : null,
          organization: row.organization_name ? {
            name: row.organization_name,
            displayName: row.organization_display_name,
          } : null,
        }));
        
        // Fetch student's assigned subjects with full details from user_class_subject_links
        const subjectsResult = await query(
          `SELECT DISTINCT
            sc.id as subject_id,
            sc.code as subject_code,
            sc.title as subject_title,
            sc.level as subject_level,
            so.id as offering_id,
            so.cohort_id,
            c.code as cohort_code,
            c.level as cohort_level,
            pn.title as program_node_title,
            s.code as session_code,
            s.start_date as session_start_date,
            s.end_date as session_end_date,
            t.label as term_label,
            t.number as term_number,
            t.term_type,
            sec.label as section_label
           FROM user_class_subject_links ucsl
           INNER JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
           INNER JOIN subject_catalog sc ON so.subject_id = sc.id
           LEFT JOIN cohorts c ON ucsl.cohort_id = c.id OR so.cohort_id = c.id
           LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
           LEFT JOIN academic_sessions s ON c.session_id = s.id
           LEFT JOIN terms t ON c.term_id = t.id
           LEFT JOIN sections sec ON c.section_id = sec.id
           WHERE ucsl.user_id = $1
             AND ucsl.link_type = 'student'
             AND so.status = 'published'
             AND sc.id IS NOT NULL
           ORDER BY sc.level ASC, sc.title ASC, c.code ASC`,
          [session.user.id]
        );
        
        studentSubjects = subjectsResult.rows.map(row => ({
          subject: {
            id: row.subject_id,
            code: row.subject_code,
            title: row.subject_title,
            level: row.subject_level,
          },
          offering: {
            id: row.offering_id,
            cohortId: row.cohort_id,
            cohortCode: row.cohort_code,
            cohortLevel: row.cohort_level,
            programNode: row.program_node_title,
            sessionCode: row.session_code,
            sessionStartDate: row.session_start_date,
            sessionEndDate: row.session_end_date,
            termLabel: row.term_label,
            termNumber: row.term_number,
            termType: row.term_type,
            sectionLabel: row.section_label,
          },
        }));
        
        // console.log('🎓 [USER PROFILE API] Student data fetched:', {
        //   cohortsCount: studentCohorts.length,
        //   subjectsCount: studentSubjects.length,
        // });
      } catch (error) {
        console.error('🎓 [USER PROFILE API] Error fetching student data:', error);
        // Continue without student data if there's an error
      }
    }

    // Prepare response data
    const responseData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      username: user.username || null,
      phone: user.phone || null,
      skill: user.skill || null,
      displayName: user.display_name || null,
      bio: user.bio || null,
      profileImage: user.avatar_url || null,
      status: user.status,
      emailVerifiedAt: user.email_verified_at,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      orgId: user.org_id || null,
      organizationName: user.organization_name || user.organization_display_name || null,
      role: session.user.role, // Include role for frontend to detect instructor/student
      // Instructor-specific data
      ...(isInstructor && {
        classes: instructorClasses,
        subjects: instructorSubjects,
      }),
      // Student-specific data
      ...(isStudent && {
        cohorts: studentCohorts,
        subjects: studentSubjects,
      }),
    };

    // console.log('👤 [USER PROFILE API] Response data being sent:', {
    //   orgId: responseData.orgId,
    //   organizationName: responseData.organizationName,
    //   role: responseData.role,
    //   isInstructor: isInstructor,
    //   isStudent: isStudent,
    //   classesCount: instructorClasses.length,
    //   subjectsCount: instructorSubjects.length,
    //   cohortsCount: studentCohorts.length,
    //   studentSubjectsCount: studentSubjects.length,
    //   hasClasses: responseData.classes?.length > 0,
    //   hasSubjects: responseData.subjects?.length > 0,
    //   hasCohorts: responseData.cohorts?.length > 0,
    //   full_response_keys: Object.keys(responseData),
    // });

    // Return user profile data
    return NextResponse.json({
      success: true,
      user: responseData,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user profile',
      },
      { status: 500 }
    );
  }
}

