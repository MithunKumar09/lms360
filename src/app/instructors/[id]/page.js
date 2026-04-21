import InstructorDetailsMain from "@/components/layout/main/InstructorDetailsMain";
import ThemeController from "@/components/shared/others/ThemeController";
import PageWrapper from "@/components/shared/wrappers/PageWrapper";
import { notFound } from "next/navigation";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { getUserById } from "@/lib/db/users.js";
import { query } from "@/lib/db/index.js";

export const metadata = {
  title: "Instructor Details | Edurock - Education LMS Template",
  description: "Instructor Details | Edurock - Education LMS Template",
};

const Instructor_Details = async ({ params }) => {
  const { id } = params;
  
  // Get current session for access control
  const session = await auth();
  if (!session?.user) {
    notFound();
  }

  try {
    // Get user basic info
    const instructor = await getUserById(id);
    if (!instructor) {
      notFound();
    }

    // Get user roles
    const rolesRes = await query(
      `SELECT r.code, r.title, ur.org_id, o.name AS org_label
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       LEFT JOIN organizations o ON o.id = ur.org_id
       WHERE ur.user_id = $1
       ORDER BY r.code, o.name`,
      [id]
    );
    const roles = rolesRes.rows.map(r => ({
      id: r.code + (r.org_id || ''),
      code: r.code,
      title: r.title,
      org_id: r.org_id,
      org_label: r.org_label || (r.org_id ? null : 'Global')
    }));

    // Verify instructor has instructor or orginstructor role
    const hasInstructorRole = roles.some(
      (role) => role.code === "instructor" || role.code === "orginstructor"
    );

    if (!hasInstructorRole) {
      notFound();
    }

    // Organization access control: Admin can only access users from their organization
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;
    
    if (userRole === "admin" && userOrgId) {
      // Get user's organization
      const userOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, userOrgId]
      );
      
      if (userOrgRes.rows.length === 0) {
        notFound();
      }
    } else if (userRole !== "superadmin") {
      // Other roles (instructor, student, etc.) can only access users from their organization
      if (userOrgId) {
        const userOrgRes = await query(
          `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [id, userOrgId]
        );
        
        if (userOrgRes.rows.length === 0) {
          notFound();
        }
      }
    }

    // Get instructor links (cohorts and subjects)
    let links = { instructor: [] };
    try {
      const instructorLinksRes = await query(
        `SELECT 
          ic.id, 
          ic.cohort_id,
          ic.subject_offering_id,
          c.code as cohort_code,
          c.level as cohort_level,
          so.subject_id,
          sc.title as subject_title,
          sc.code as subject_code
         FROM instructor_classes ic
         LEFT JOIN cohorts c ON c.id = ic.cohort_id
         LEFT JOIN subject_offerings so ON so.id = ic.subject_offering_id
         LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
         WHERE ic.instructor_user_id = $1
         UNION
         SELECT 
          ucsl.id,
          ucsl.cohort_id,
          ucsl.subject_offering_id,
          c.code as cohort_code,
          c.level as cohort_level,
          so.subject_id,
          sc.title as subject_title,
          sc.code as subject_code
         FROM user_class_subject_links ucsl
         LEFT JOIN cohorts c ON c.id = ucsl.cohort_id
         LEFT JOIN subject_offerings so ON so.id = ucsl.subject_offering_id
         LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
         WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor'`,
        [id]
      );
      links.instructor = instructorLinksRes.rows;
    } catch (err) {
      console.log('Instructor links table not available:', err.message);
      links.instructor = [];
    }

    // Get social links
    let socialLinks = {
      facebook: null,
      twitter: null,
      linkedin: null,
      website: null,
      github: null,
    };
    try {
      const socialLinksRes = await query(
        `SELECT facebook, twitter, linkedin, website, github
         FROM user_social_links
         WHERE user_id = $1`,
        [id]
      );
      if (socialLinksRes.rows.length > 0) {
        socialLinks = {
          facebook: socialLinksRes.rows[0].facebook,
          twitter: socialLinksRes.rows[0].twitter,
          linkedin: socialLinksRes.rows[0].linkedin,
          website: socialLinksRes.rows[0].website,
          github: socialLinksRes.rows[0].github,
        };
      }
    } catch (err) {
      console.log('Social links table not available:', err.message);
      // Keep default empty social links
    }

    // Calculate instructor rating from instructor_reviews table
    // Get reviews directly for this instructor
    let instructorRating = {
      averageRating: 0,
      totalReviews: 0,
    };
    try {
      const { getInstructorReviewStats } = await import('@/lib/db/instructors/reviews.js');
      const stats = await getInstructorReviewStats(id);
        instructorRating = {
        averageRating: stats.averageRating || 0,
        totalReviews: stats.totalReviews || 0,
        };
    } catch (err) {
      console.log('Error calculating instructor rating:', err.message);
      // Keep default rating (0, 0)
    }

    // Pass instructor data to component
    return (
      <PageWrapper>
        <main>
          <InstructorDetailsMain 
            instructor={instructor} 
            links={links} 
            roles={roles}
            socialLinks={socialLinks}
            rating={instructorRating}
          />
          <ThemeController />
        </main>
      </PageWrapper>
    );
  } catch (error) {
    console.error("Error fetching instructor:", error);
    notFound();
  }
};

export default Instructor_Details;
