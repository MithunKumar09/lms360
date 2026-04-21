/**
 * Student Dashboard Page Object Model
 * 
 * Specific page object for student dashboard
 */

import { DashboardPage } from './DashboardPage.js';

export class StudentDashboardPage extends DashboardPage {
  constructor(page) {
    super(page, '/dashboards/student-dashboard');
    
    // Student-specific selectors
    this.selectors = {
      ...this.selectors,
      enrolledCourses: '[data-testid="enrolled-courses"], .enrolled-courses, .course-card',
      progressSection: '[data-testid="progress"], .progress-section',
      upcomingQuizzes: '[data-testid="upcoming-quizzes"], .upcoming-quizzes',
      recentActivity: '[data-testid="recent-activity"], .recent-activity',
      roadmapLink: 'a[href*="roadmap"], a:has-text("Roadmap")',
      coursesLink: 'a[href*="courses"], a:has-text("Courses")',
      quizzesLink: 'a[href*="quiz"], a:has-text("Quizzes")',
    };
  }

  /**
   * Check if enrolled courses section is visible
   * @returns {Promise<boolean>}
   */
  async hasEnrolledCourses() {
    const courses = this.page.locator(this.selectors.enrolledCourses).first();
    return await courses.isVisible().catch(() => false);
  }

  /**
   * Get number of enrolled courses
   * @returns {Promise<number>}
   */
  async getEnrolledCoursesCount() {
    const courses = this.page.locator(this.selectors.enrolledCourses);
    return await courses.count();
  }

  /**
   * Check if progress section is visible
   * @returns {Promise<boolean>}
   */
  async hasProgressSection() {
    const progress = this.page.locator(this.selectors.progressSection).first();
    return await progress.isVisible().catch(() => false);
  }

  /**
   * Navigate to roadmap
   */
  async navigateToRoadmap() {
    const roadmapLink = this.page.locator(this.selectors.roadmapLink).first();
    if (await roadmapLink.isVisible().catch(() => false)) {
      await roadmapLink.click();
      await this.page.waitForURL(/\/roadmap/, { timeout: 10000 });
    }
  }

  /**
   * Navigate to courses
   */
  async navigateToCourses() {
    const coursesLink = this.page.locator(this.selectors.coursesLink).first();
    if (await coursesLink.isVisible().catch(() => false)) {
      await coursesLink.click();
      await this.page.waitForURL(/\/courses/, { timeout: 10000 });
    }
  }

  /**
   * Navigate to quizzes
   */
  async navigateToQuizzes() {
    const quizzesLink = this.page.locator(this.selectors.quizzesLink).first();
    if (await quizzesLink.isVisible().catch(() => false)) {
      await quizzesLink.click();
      await this.page.waitForURL(/\/quiz/, { timeout: 10000 });
    }
  }
}
