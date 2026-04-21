/**
 * Lighthouse CI Configuration
 * 
 * Automated performance audits using Lighthouse CI
 * Tests Core Web Vitals and performance metrics
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/courses',
        'http://localhost:3000/about',
        'http://localhost:3000/contact',
      ],
      
      // Start Next.js dev server before testing
      startServerCommand: 'npm run dev',
      startServerReadyPattern: 'ready',
      startServerReadyTimeout: 120000, // 2 minutes
      
      // Number of runs per URL
      numberOfRuns: 3,
      
      // Settings
      settings: {
        // Use mobile emulation
        emulatedFormFactor: 'mobile',
        // Throttling settings
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
        },
        // Screen emulation
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
        },
        // Skip certain audits (optional)
        skipAudits: [],
      },
    },
    
    // Assertions - performance thresholds
    assert: {
      assertions: {
        // Performance score (0-100)
        'categories:performance': ['warn', { minScore: 0.7 }], // 70% minimum
        'categories:accessibility': ['error', { minScore: 0.9 }], // 90% minimum
        'categories:best-practices': ['warn', { minScore: 0.8 }], // 80% minimum
        'categories:seo': ['warn', { minScore: 0.8 }], // 80% minimum
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }], // < 2s
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }], // < 2.5s
        'total-blocking-time': ['warn', { maxNumericValue: 300 }], // < 300ms
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }], // < 0.1
        'speed-index': ['warn', { maxNumericValue: 3000 }], // < 3s
        
        // Resource sizes
        'total-byte-weight': ['warn', { maxNumericValue: 5000000 }], // < 5MB
        'dom-size': ['warn', { maxNumericValue: 1500 }], // < 1500 nodes
        
        // Image optimization
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'modern-image-formats': 'warn',
        
        // JavaScript
        'unused-javascript': 'warn',
        'unused-css-rules': 'warn',
        'render-blocking-resources': 'warn',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
      },
    },
    
    // Upload results (optional)
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse/reports',
      reportFilenamePattern: '%%PATHNAME%%-%%DATETIME%%-report.%%EXTENSION%%',
    },
    
    // Server configuration
    server: {
      port: 9001,
      storage: {
        storageMethod: 'filesystem',
        storagePath: './lighthouse/.lighthouseci',
      },
    },
  },
};
