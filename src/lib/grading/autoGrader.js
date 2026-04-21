/**
 * Auto-Grading Utility
 * 
 * Core auto-grading logic for assignments and quizzes.
 * Supports only auto-gradable question types:
 * - Multiple Choice (MCQ)
 * - True/False
 * - Fill in the blanks (exact match or keyword matching)
 * - Numeric (range or exact match)
 * - Short answer (keyword matching)
 * 
 * @module lib/grading/autoGrader
 */

/**
 * Calculate marks for a single question based on answer type
 * @param {Object} question - Question object with type, correct answer, marks
 * @param {*} studentAnswer - Student's answer (format depends on question type)
 * @param {Object} options - Grading options
 * @returns {Object} { isCorrect: boolean, marksObtained: number, feedback?: string }
 */
export function calculateMarks(question, studentAnswer, options = {}) {
  const {
    caseSensitive = false,
    keywordMatching = true,
    numericTolerance = 0.01,
  } = options;

  const questionType = question.questionType || question.type;
  const maxMarks = parseFloat(question.marks || question.maxMarks || 1);
  const correctAnswer = question.correctAnswer || question.correct_answer;

  switch (questionType) {
    case 'multiple_choice': {
      // studentAnswer should be array of option IDs
      // correctAnswer should be array of correct option IDs
      const studentOptions = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
      const correctOptions = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

      // Sort for comparison
      const studentSorted = [...studentOptions].sort().join(',');
      const correctSorted = [...correctOptions].sort().join(',');

      const isCorrect = studentSorted === correctSorted;
      return {
        isCorrect,
        marksObtained: isCorrect ? maxMarks : 0,
      };
    }

    case 'true_false': {
      // studentAnswer should be boolean or string 'true'/'false'
      // correctAnswer should be boolean or string 'true'/'false'
      const studentBool = typeof studentAnswer === 'string'
        ? studentAnswer.toLowerCase() === 'true'
        : Boolean(studentAnswer);
      const correctBool = typeof correctAnswer === 'string'
        ? correctAnswer.toLowerCase() === 'true'
        : Boolean(correctAnswer);

      const isCorrect = studentBool === correctBool;
      return {
        isCorrect,
        marksObtained: isCorrect ? maxMarks : 0,
      };
    }

    case 'fill_in_the_blanks':
    case 'fill_blank': {
      // studentAnswer should be string
      // correctAnswer should be string or array of acceptable answers
      if (!studentAnswer || typeof studentAnswer !== 'string') {
        return {
          isCorrect: false,
          marksObtained: 0,
        };
      }

      const studentText = caseSensitive ? studentAnswer.trim() : studentAnswer.trim().toLowerCase();
      const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

      // Check for exact match
      for (const correct of correctAnswers) {
        const correctText = caseSensitive ? String(correct).trim() : String(correct).trim().toLowerCase();
        if (studentText === correctText) {
          return {
            isCorrect: true,
            marksObtained: maxMarks,
          };
        }
      }

      // If keyword matching is enabled, check for keyword presence
      if (keywordMatching) {
        for (const correct of correctAnswers) {
          const correctText = String(correct).trim().toLowerCase();
          const keywords = correctText.split(/\s+/).filter(k => k.length > 2); // Words longer than 2 chars
          
          if (keywords.length > 0 && keywords.every(keyword => studentText.includes(keyword))) {
            return {
              isCorrect: true,
              marksObtained: maxMarks * 0.8, // 80% marks for keyword match
              feedback: 'Partial credit for keyword matching',
            };
          }
        }
      }

      return {
        isCorrect: false,
        marksObtained: 0,
      };
    }

    case 'numeric': {
      // studentAnswer should be number or numeric string
      // correctAnswer should be number or { value: number, tolerance?: number }
      const studentNum = typeof studentAnswer === 'string' ? parseFloat(studentAnswer) : Number(studentAnswer);
      const correctValue = typeof correctAnswer === 'object' && correctAnswer.value !== undefined
        ? Number(correctAnswer.value)
        : Number(correctAnswer);
      const tolerance = typeof correctAnswer === 'object' && correctAnswer.tolerance !== undefined
        ? Number(correctAnswer.tolerance)
        : numericTolerance;

      if (isNaN(studentNum) || isNaN(correctValue)) {
        return {
          isCorrect: false,
          marksObtained: 0,
        };
      }

      const difference = Math.abs(studentNum - correctValue);
      const isCorrect = difference <= tolerance;

      return {
        isCorrect,
        marksObtained: isCorrect ? maxMarks : 0,
      };
    }

    case 'short_answer': {
      // studentAnswer should be string
      // correctAnswer should be string or array of acceptable answers
      if (!studentAnswer || typeof studentAnswer !== 'string') {
        return {
          isCorrect: false,
          marksObtained: 0,
        };
      }

      const studentText = caseSensitive ? studentAnswer.trim() : studentAnswer.trim().toLowerCase();
      const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

      // Check for exact match first
      for (const correct of correctAnswers) {
        const correctText = caseSensitive ? String(correct).trim() : String(correct).trim().toLowerCase();
        if (studentText === correctText) {
          return {
            isCorrect: true,
            marksObtained: maxMarks,
          };
        }
      }

      // Keyword matching for short answers
      if (keywordMatching) {
        for (const correct of correctAnswers) {
          const correctText = String(correct).trim().toLowerCase();
          const keywords = correctText.split(/\s+/).filter(k => k.length > 2);
          
          if (keywords.length > 0) {
            const matchedKeywords = keywords.filter(keyword => studentText.includes(keyword));
            const matchRatio = matchedKeywords.length / keywords.length;

            if (matchRatio >= 0.7) { // 70% of keywords matched
              return {
                isCorrect: matchRatio >= 0.9, // 90%+ = fully correct
                marksObtained: maxMarks * matchRatio,
                feedback: matchRatio >= 0.9 ? undefined : 'Partial credit for keyword matching',
              };
            }
          }
        }
      }

      return {
        isCorrect: false,
        marksObtained: 0,
      };
    }

    default:
      // Unknown question type - cannot auto-grade
      console.warn(`Unknown question type: ${questionType}. Cannot auto-grade.`);
      return {
        isCorrect: false,
        marksObtained: 0,
        feedback: 'Question type not supported for auto-grading',
      };
  }
}

/**
 * Grade an assignment submission automatically
 * @param {Object} submission - Submission object with answers
 * @param {Object} assignment - Assignment object with questions
 * @returns {Object} Grading result
 */
export function gradeAssignmentSubmission(submission, assignment) {
  // Note: Assignments typically don't have structured questions like quizzes
  // This is a placeholder - actual implementation depends on assignment structure
  // For now, assignments might be file-based and require different grading logic
  
  // If assignment has questions (like a quiz), use quiz grading logic
  if (assignment.questions && Array.isArray(assignment.questions)) {
    return gradeQuizAttempt(submission.answers || [], assignment.questions);
  }

  // For file-based assignments, auto-grading might not be applicable
  // Return default result
  return {
    totalMarks: 0,
    marksObtained: 0,
    percentage: 0,
    isPassed: false,
    gradedQuestions: [],
  };
}

/**
 * Grade a quiz attempt automatically
 * @param {Array} studentAnswers - Array of { questionId, answer } objects
 * @param {Array} questions - Array of question objects with correct answers
 * @returns {Object} Grading result
 */
export function gradeQuizAttempt(studentAnswers, questions) {
  const gradedQuestions = [];
  let totalMarks = 0;
  let marksObtained = 0;

  // Create a map of student answers by question ID
  const answerMap = new Map();
  studentAnswers.forEach(answer => {
    answerMap.set(answer.questionId, answer.answer);
  });

  // Grade each question
  questions.forEach(question => {
    const studentAnswer = answerMap.get(question.id);
    const result = calculateMarks(question, studentAnswer);

    totalMarks += parseFloat(question.marks || 1);
    marksObtained += result.marksObtained;

    gradedQuestions.push({
      questionId: question.id,
      questionType: question.questionType || question.type,
      isCorrect: result.isCorrect,
      marksObtained: result.marksObtained,
      maxMarks: parseFloat(question.marks || 1),
      feedback: result.feedback,
    });
  });

  const percentage = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;

  return {
    totalMarks,
    marksObtained,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
    isPassed: marksObtained >= (assignment?.passingMarks || 0),
    gradedQuestions,
  };
}


/**
 * Update course progress based on assignment/quiz completion
 * @param {string} enrollmentId - Course enrollment ID
 * @param {number} marksObtained - Marks obtained
 * @param {number} maxMarks - Maximum marks
 * @param {Object} course - Course object
 * @returns {Promise<Object>} Updated progress information
 */
export async function updateCourseProgress(enrollmentId, marksObtained, maxMarks, course) {
  // This will be implemented in progressTracker.js
  // Placeholder for now
  return {
    enrollmentId,
    progressPercentage: 0,
    isCompleted: false,
  };
}
