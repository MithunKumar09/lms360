/**
 * Search Utility Functions
 * 
 * Utility functions for search-related operations including
 * highlighting, text matching, and search term processing.
 */

/**
 * Highlight search term in text
 * 
 * @param {string} text - Text to highlight in
 * @param {string} searchTerm - Search term to highlight
 * @param {string} highlightClass - CSS class for highlighting (default: 'bg-yellow-200')
 * @returns {Array|string} Array of React elements or plain string
 */
export const highlightSearchTerm = (text, searchTerm, highlightClass = 'bg-yellow-200 dark:bg-yellow-800') => {
  if (!text || !searchTerm) return text;
  
  const escapedTerm = escapeRegExp(searchTerm);
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    // Check if this part matches the search term (case-insensitive)
    if (part.toLowerCase() === searchTerm.toLowerCase()) {
      return (
        <mark key={index} className={highlightClass}>
          {part}
        </mark>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

/**
 * Escape special regex characters in search term
 * 
 * @param {string} string - String to escape
 * @returns {string} Escaped string
 */
export const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Normalize search term for matching
 * 
 * @param {string} term - Search term to normalize
 * @returns {string} Normalized search term
 */
export const normalizeSearchTerm = (term) => {
  return term.trim().toLowerCase();
};

/**
 * Check if text matches search term (fuzzy matching)
 * 
 * @param {string} text - Text to search in
 * @param {string} searchTerm - Search term
 * @returns {boolean} True if text matches search term
 */
export const matchesSearchTerm = (text, searchTerm) => {
  if (!text || !searchTerm) return false;
  
  const normalizedText = normalizeSearchTerm(text);
  const normalizedSearch = normalizeSearchTerm(searchTerm);
  
  return normalizedText.includes(normalizedSearch);
};

/**
 * Extract keywords from search term
 * 
 * @param {string} searchTerm - Search term
 * @returns {Array<string>} Array of keywords
 */
export const extractKeywords = (searchTerm) => {
  return searchTerm
    .trim()
    .split(/\s+/)
    .filter((keyword) => keyword.length > 0)
    .map(normalizeSearchTerm);
};

/**
 * Calculate search relevance score
 * 
 * @param {string} text - Text to score
 * @param {string} searchTerm - Search term
 * @returns {number} Relevance score (0-1)
 */
export const calculateRelevanceScore = (text, searchTerm) => {
  if (!text || !searchTerm) return 0;
  
  const normalizedText = normalizeSearchTerm(text);
  const normalizedSearch = normalizeSearchTerm(searchTerm);
  
  // Exact match
  if (normalizedText === normalizedSearch) return 1;
  
  // Starts with search term
  if (normalizedText.startsWith(normalizedSearch)) return 0.9;
  
  // Contains search term
  if (normalizedText.includes(normalizedSearch)) return 0.7;
  
  // Fuzzy match (check if all words are present)
  const searchKeywords = extractKeywords(searchTerm);
  const textKeywords = extractKeywords(text);
  
  const matchedKeywords = searchKeywords.filter((keyword) =>
    textKeywords.some((textKeyword) => textKeyword.includes(keyword))
  );
  
  return matchedKeywords.length / searchKeywords.length;
};

