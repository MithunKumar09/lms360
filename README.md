# LMS360

> architecture carries **ten** role-based dashboards.

## Platform Access, Multi-Tenant & Authentication Rules

- **Multi-Tenant Architecture** → Each organization on the platform operates as a fully isolated environment with its own users, courses, and data → users in one organization cannot see or access anything belonging to another.
- **Domain-Based Access** → Users reach the LMS through their organization's dedicated portal or domain → only that organization's content and users are loaded for that session.
- **Authentication Flow** → User submits credentials → the system validates identity, confirms the assigned role, and verifies the organization context → access is granted only to the appropriate dashboard.
- **Role-Based Authorization** → Once logged in, each user can view and perform only the actions their role permits → features outside their role remain hidden and inaccessible.
- **Organization Isolation** → Admins, instructors, students, and all other users can manage only data that belongs to their own organization → cross-organization access is blocked at every level.
- **Super Admin Privileges** → Super Admin operates above individual organizations and can manage the entire platform, all tenants, and global settings → organization-level users cannot perform these elevated actions.
- **Session Protection** → Every page and action is checked against the authenticated user's identity and organization → protected resources cannot be reached without a valid, active session.
- **MFA (Multi-Factor Authentication)** → Privileged users such as Super Admins and Admins must complete a second verification step before accessing their dashboards → sensitive operations are protected by an additional security layer.
- **Public vs Protected Pages** → Course catalogs, blogs, events, and informational pages are open to anyone without login → dashboards, management tools, and personal data require successful authentication first.
- **Permission Enforcement** → The menu items and features visible to each user are determined by their assigned permissions → users only see the modules they are authorized to use, keeping the interface clean and secure.

---

## Super Admin Dashboard

- **User Management** → Super Admin creates platform-wide user accounts and assigns roles → users gain access to their respective dashboards and features immediately.
- **Organization Management** → Super Admin creates, edits, or manages organizations (tenants) on the platform → each organization operates as an isolated environment with its own users, courses, and data.
- **Bulk Operations** → Super Admin uploads multiple organizations or announcements at once → large-scale changes are applied across the platform in a single action.
- **Academic Structure** → Super Admin defines classes, subjects, sessions, terms, and program nodes → organizations can structure their academic calendar and curriculum within that framework.
- **Course Oversight** → Super Admin views and controls all courses across the platform → course access rules can be enforced or adjusted globally.
- **Quiz & Assessment Management** → Super Admin creates quizzes, reviews all student attempts, and monitors performance across every course → assessment quality and integrity are maintained platform-wide.
- **Announcement Broadcasting** → Super Admin publishes announcements individually or in bulk → all targeted users see relevant notices in their dashboards.
- **Finance — Orders & Revenue** → Super Admin tracks every course purchase and monitors total revenue across all organizations → financial health of the platform is visible at a glance.
- **Finance — Payouts & Settlements** → Super Admin processes vendor and instructor payouts, manages settlements, and tracks payment splits → content creators receive accurate and timely earnings.
- **Finance — Reconciliation** → Super Admin reconciles payment records against transaction logs → discrepancies are identified and resolved before they affect reporting.
- **Vendor KYC Verification** → Super Admin reviews and approves vendor identity documents → only verified vendors are allowed to offer paid courses or content.
- **Payment Webhook Logs** → Super Admin monitors real-time payment gateway events → failed or suspicious transactions are caught and investigated quickly.
- **Vendor Management** → Super Admin approves vendor registration requests and manages active vendor accounts → the marketplace maintains only trusted content providers.
- **Brand Management** → Super Admin manages brand partners and approves or allocates brand events → brand activity on the platform stays controlled and on-brand.
- **Audit Logs** → Super Admin reviews a full chronological record of all system actions → accountability is maintained and compliance requirements are met.
- **Sidebar Access Control** → Super Admin enables or disables specific menu items for any role → each role sees only the features relevant to them.
- **Feedback & Reviews** → Super Admin views course ratings and user feedback submitted across the platform → content quality is monitored and acted upon.
- **Blog Management** → Super Admin publishes and manages platform-wide blog content → educational articles and news reach the broader user base.

---

## Admin Dashboard (School / Organization Admin)

- **User Management** → Admin creates and manages all users within their organization → new students, instructors, and staff are onboarded with the correct roles and access.
- **Instructor Approval** → Admin reviews instructor applications → approved instructors gain access to course creation and teaching tools within the organization.
- **Mentor Management** → Admin approves mentor requests and oversees active mentors → students are connected with qualified professionals.
- **Parent Access Control** → Admin decides which student information parents are allowed to view → privacy and disclosure levels are set per organization policy.
- **Course Management** → Admin manages all courses offered within the organization, including settings and access configuration → the course catalog stays organized and up to date.
- **Course Assignment** → Admin assigns courses to specific students or instructors → the right people have access to the right learning content.
- **Quiz & Assessment Oversight** → Admin creates quizzes, reviews student attempts, and tracks performance across the organization → academic standards are enforced consistently.
- **Placement Postings** → Admin publishes job and internship opportunities for students → students have access to real career pathways from within the platform.
- **Placement Applications** → Admin reviews student applications submitted for posted opportunities → the hiring pipeline is managed end to end within the platform.
- **Announcements** → Admin broadcasts announcements to users within the organization, individually or in bulk → important updates reach the right people without delay.
- **Organization Finance** → Admin monitors the organization's financial activity → revenue, transactions, and spending are visible at the organizational level.
- **Audit Logs** → Admin reviews activity logs scoped to their organization → internal accountability and policy compliance are maintained.

---

## Instructor Dashboard

- **Course Creation & Management** → Instructor creates new courses and updates existing ones → students enrolled in the organization gain access to the latest learning materials.
- **Assignment Creation** → Instructor creates and publishes assignments with descriptions and deadlines → students know exactly what is required and when it is due.
- **Assignment Grading** → Instructor reviews submitted assignments and provides grades or feedback → students receive timely evaluations on their work.
- **Quiz Creation & Management** → Instructor creates quizzes with configurable questions and publishes them to students → assessments are ready for students to attempt on schedule.
- **Quiz Attempt Tracking** → Instructor views all student quiz attempts and scores → performance gaps are identified and addressed early.
- **Student Management** → Instructor views and manages the list of students enrolled in their courses → class composition is clear and up to date.
- **Announcements** → Instructor posts announcements to students in their courses → important information reaches learners directly inside the platform.
- **Course Reviews** → Instructor sees feedback and ratings students have left for their courses → teaching quality is continuously improved based on real student input.

---

## Student Dashboard

- **Enrolled Courses** → Student accesses all courses they are enrolled in → learning materials, lessons, and resources are available in one place.
- **Assignments** → Student views assigned tasks, reads the instructions, and submits their completed work → deadlines and requirements are clearly visible throughout.
- **Quizzes** → Student takes quizzes assigned to their courses and reviews past attempt results → performance history is tracked for self-improvement.
- **Learning Roadmap** → Student follows a visual milestone-based progression path → overall progress, completed milestones, and learning streaks are shown at a glance.
- **Leaderboard** → Student sees their ranking compared to peers → healthy competition motivates consistent engagement with course content.
- **Placement — Jobs & Internships** → Student browses available job and internship listings posted within the platform and submits applications → career opportunities are accessible without leaving the LMS.
- **Placement Drives** → Student views upcoming campus placement events → preparation and participation in drives are managed from the student dashboard.
- **Application Tracking** → Student monitors the status of all placement applications submitted → every opportunity is tracked from application to outcome.
- **Resume & Portfolio** → Student builds and manages their resume and portfolio within the platform → a professional profile is ready to share with recruiters and mentors.
- **Virtual Internships** → Student browses and enrolls in virtual internship programs → real-world experience is accessible regardless of location.
- **Mentorized Groups** → Student joins mentor-led groups for guided learning and career advice → peer collaboration and expert mentorship happen in a structured setting.
- **Wishlist** → Student saves courses they are interested in for future enrollment → preferred learning content is easy to find and revisit.

---

## Vendor Dashboard

- **Course Creation & Management** → Vendor creates and publishes courses on the platform → enrolled students gain access to the vendor's learning content.
- **Enrolled Students Tracking** → Vendor views which students are enrolled in each course → audience engagement and reach are visible in real time.
- **Quiz & Assignment Creation** → Vendor creates assessments tied to their courses → learning outcomes are measured for every student in the course.
- **Event Management** → Vendor creates and manages events, tracks registrations, and views attendee lists → learning events are organized and participation is monitored.
- **Workshop Management** → Vendor creates and manages workshops with registration tracking → hands-on learning experiences are delivered and measured efficiently.
- **Earnings & Finance** → Vendor views a breakdown of revenue earned from course enrollments → income from the platform is fully transparent and traceable.
- **Bank Details** → Vendor saves banking information for payouts → earnings are transferred to the correct account without manual intervention.
- **Announcements** → Vendor broadcasts announcements to enrolled students → important course or event updates reach learners directly.

---

## Mentor Dashboard

- **Event Management** → Mentor creates and manages career or learning events, tracks attendee registrations → professional events are organized and participation is recorded.
- **Job Postings** → Mentor posts job opportunities and tracks student applications received → real career openings are surfaced to students directly within the platform.
- **Workshop Management** → Mentor creates workshops and views who has registered → skill-building sessions are managed and attendance is tracked.
- **Virtual Classroom** → Mentor hosts group learning sessions with mentees → guided instruction and discussion happen in a shared online space.
- **Application Analytics** → Mentor views statistics on how many students applied to their job postings → the effectiveness of opportunities is measured and improved.
- **Registration Analytics** → Mentor sees event and workshop registration trends → engagement levels inform how future sessions are planned.

---

## Parent Dashboard

- **Student Progress Monitoring** → Parent views their child's overall learning progress and course completion status → academic performance is visible without contacting the school directly.
- **Activity Tracker** → Parent sees a log of the student's recent activity on the platform → day-to-day engagement with coursework is transparent.
- **Achievements** → Parent views milestones and accomplishments the student has earned → recognition moments are shared with the family.

---

## Brand Dashboard

- **Certificate Program Management** → Brand creates certificate programs with defined criteria → learners who complete requirements can earn a brand-recognized credential.
- **Certificate Issuance** → Brand issues certificates to qualifying learners and maintains a record of all issued credentials → every certificate awarded is traceable and verifiable.
- **Certificate Verification** → Anyone can verify the authenticity of a certificate using a unique code → trust in the credential is established without contacting the issuer.
- **Brand Event Management** → Brand creates and manages events visible on the public platform → brand presence is extended through hosted learning experiences.
- **Analytics** → Brand views performance metrics on certificates issued and events held → the impact of brand activity on the platform is measurable.

---

## Company Dashboard

- **Virtual Internship Programs** → Company creates and manages virtual internship opportunities listed on the platform → students discover and apply to real-world programs without leaving the LMS.
- **Internship Applicant Tracking** → Company views details of each internship program and monitors interest → recruitment pipelines are managed directly within the platform.
