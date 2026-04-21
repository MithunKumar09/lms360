/**
 * Seed Certificate Templates
 * 
 * Creates default prebuilt certificate templates
 */

import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { query, closePool } from '../index.js';

const DEFAULT_TEMPLATES = [
  {
    name: 'Elegant Classic',
    type: 'prebuilt',
    description: 'A traditional certificate design with ornate gold borders, elegant serif typography, and formal centered layout',
    templateHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 30px;
      font-family: 'Georgia', 'Times New Roman', serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .certificate {
      background: #faf8f3;
      padding: 70px 80px;
      border: 15px solid #d4af37;
      border-radius: 8px;
      box-shadow: 0 15px 50px rgba(0, 0, 0, 0.4), inset 0 0 100px rgba(212, 175, 55, 0.1);
      text-align: center;
      max-width: 1000px;
      width: 100%;
      position: relative;
      overflow: hidden;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 20px;
      left: 20px;
      right: 20px;
      bottom: 20px;
      border: 3px solid #b8941f;
      border-radius: 4px;
      pointer-events: none;
    }
    .certificate::after {
      content: '';
      position: absolute;
      top: 40px;
      left: 40px;
      right: 40px;
      bottom: 40px;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 2px;
      pointer-events: none;
    }
    .ornament-top {
      position: absolute;
      top: 15px;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 40px;
      background: linear-gradient(90deg, transparent, #d4af37, transparent);
      border-top: 2px solid #b8941f;
    }
    .ornament-top::before,
    .ornament-top::after {
      content: '✦';
      position: absolute;
      top: -8px;
      color: #d4af37;
      font-size: 20px;
    }
    .ornament-top::before {
      left: 20px;
    }
    .ornament-top::after {
      right: 20px;
    }
    .ornament-bottom {
      position: absolute;
      bottom: 15px;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 40px;
      background: linear-gradient(90deg, transparent, #d4af37, transparent);
      border-bottom: 2px solid #b8941f;
    }
    .ornament-bottom::before,
    .ornament-bottom::after {
      content: '✦';
      position: absolute;
      bottom: -8px;
      color: #d4af37;
      font-size: 20px;
    }
    .ornament-bottom::before {
      left: 20px;
    }
    .ornament-bottom::after {
      right: 20px;
    }
    .seal-left {
      position: absolute;
      left: 30px;
      top: 50%;
      transform: translateY(-50%);
      width: 80px;
      height: 80px;
      border: 4px solid #d4af37;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.1), transparent);
    }
    .seal-left::before {
      content: '★';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 40px;
      color: #d4af37;
    }
    .seal-right {
      position: absolute;
      right: 30px;
      top: 50%;
      transform: translateY(-50%);
      width: 80px;
      height: 80px;
      border: 4px solid #d4af37;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.1), transparent);
    }
    .seal-right::before {
      content: '★';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 40px;
      color: #d4af37;
    }
    .header {
      font-size: 52px;
      font-weight: bold;
      color: #1a1a2e;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 5px;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 1;
    }
    .subtitle {
      font-size: 22px;
      color: #4a5568;
      margin-bottom: 50px;
      font-style: italic;
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }
    .name {
      font-size: 42px;
      font-weight: bold;
      color: #1a1a2e;
      margin: 50px 0;
      padding: 30px 40px;
      border-top: 4px double #d4af37;
      border-bottom: 4px double #d4af37;
      background: linear-gradient(to bottom, rgba(212, 175, 55, 0.05), transparent);
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 1;
    }
    .course-label {
      font-size: 20px;
      color: #4a5568;
      margin: 30px 0 15px 0;
      font-style: italic;
      position: relative;
      z-index: 1;
    }
    .course {
      font-size: 32px;
      color: #2d3748;
      margin: 15px 0 40px 0;
      font-weight: 600;
      position: relative;
      z-index: 1;
    }
    .date {
      font-size: 18px;
      color: #4a5568;
      margin-top: 40px;
      font-style: italic;
      position: relative;
      z-index: 1;
    }
    .qr-code {
      margin-top: 35px;
      text-align: center;
      position: relative;
      z-index: 1;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #718096;
      line-height: 1.8;
      position: relative;
      z-index: 1;
    }
    .verification {
      margin-top: 10px;
      font-size: 12px;
      color: #a0aec0;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="ornament-top"></div>
    <div class="seal-left"></div>
    <div class="seal-right"></div>
    <div class="ornament-bottom"></div>
    <div class="header">Certificate of Completion</div>
    <div class="subtitle">This is to certify that</div>
    <div class="name">{{studentName}}</div>
    <div class="course-label">has successfully completed the course</div>
    <div class="course">{{courseName}}</div>
    <div class="date">Issued on {{completionDate}}</div>
    <div class="qr-code">{{qrCode}}</div>
    <div class="footer">
      <div>Verification Code: <strong>{{verificationCode}}</strong></div>
      <div class="verification">{{domain}}</div>
    </div>
  </div>
</body>
</html>`,
    isDefault: true,
  },
  {
    name: 'Modern Minimalist',
    type: 'prebuilt',
    description: 'A contemporary certificate design with clean geometric shapes, abstract patterns, and modern sans-serif typography',
    templateHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 20px;
      font-family: 'Helvetica Neue', 'Arial', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .certificate {
      background: #ffffff;
      padding: 60px 70px;
      width: 100%;
      max-width: 1000px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .geometric-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      opacity: 0.03;
      pointer-events: none;
    }
    .circle-1 {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea, #764ba2);
      opacity: 0.15;
    }
    .circle-2 {
      position: absolute;
      bottom: -80px;
      left: -80px;
      width: 250px;
      height: 250px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f093fb, #f5576c);
      opacity: 0.15;
    }
    .triangle {
      position: absolute;
      top: 50px;
      right: 50px;
      width: 0;
      height: 0;
      border-left: 80px solid transparent;
      border-right: 80px solid transparent;
      border-bottom: 140px solid rgba(102, 126, 234, 0.1);
      transform: rotate(45deg);
    }
    .accent-line {
      position: absolute;
      top: 0;
      left: 0;
      width: 8px;
      height: 100%;
      background: linear-gradient(180deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    }
    .content {
      position: relative;
      z-index: 1;
    }
    .header {
      font-size: 48px;
      font-weight: 300;
      color: #667eea;
      margin-bottom: 20px;
      text-align: left;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .divider {
      width: 120px;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      margin: 30px 0;
      border-radius: 2px;
    }
    .certify-text {
      font-size: 16px;
      color: #718096;
      margin: 40px 0 30px 0;
      text-align: left;
      line-height: 1.6;
      font-weight: 300;
    }
    .name {
      font-size: 44px;
      font-weight: 700;
      color: #2d3748;
      margin: 30px 0;
      text-align: left;
      letter-spacing: -1px;
      line-height: 1.2;
    }
    .course-wrapper {
      margin: 40px 0;
      padding-left: 20px;
      border-left: 4px solid #667eea;
    }
    .course-label {
      font-size: 14px;
      color: #a0aec0;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .course {
      font-size: 28px;
      color: #4a5568;
      font-weight: 500;
      line-height: 1.4;
    }
    .date {
      font-size: 16px;
      color: #718096;
      margin-top: 50px;
      text-align: left;
      font-weight: 300;
    }
    .bottom-section {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 40px;
    }
    .qr-code {
      flex-shrink: 0;
    }
    .footer {
      flex: 1;
      text-align: left;
      font-size: 12px;
      color: #a0aec0;
      line-height: 1.8;
    }
    .verification-code {
      font-weight: 600;
      color: #667eea;
      font-size: 13px;
      margin-top: 5px;
    }
    .domain {
      margin-top: 8px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="geometric-bg">
      <div class="circle-1"></div>
      <div class="circle-2"></div>
      <div class="triangle"></div>
    </div>
    <div class="accent-line"></div>
    <div class="content">
      <div class="header">Certificate</div>
      <div class="header" style="font-size: 42px; margin-top: -10px;">of Completion</div>
      <div class="divider"></div>
      <div class="certify-text">
        This certifies that the individual named below has successfully completed all requirements and demonstrated proficiency in the course material.
      </div>
      <div class="name">{{studentName}}</div>
      <div class="course-wrapper">
        <div class="course-label">Course</div>
        <div class="course">{{courseName}}</div>
      </div>
      <div class="date">{{completionDate}}</div>
      <div class="bottom-section">
        <div class="qr-code">{{qrCode}}</div>
        <div class="footer">
          <div><strong>Verification Code:</strong></div>
          <div class="verification-code">{{verificationCode}}</div>
          <div class="domain">{{domain}}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`,
    isDefault: false,
  },
  {
    name: 'Premium Luxury',
    type: 'prebuilt',
    description: 'A sophisticated certificate design with embossed effects, mixed typography, decorative corners, and rich color scheme',
    templateHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 25px;
      font-family: 'Georgia', 'Times New Roman', serif;
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .certificate {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      padding: 80px 90px;
      border: 20px solid #1a365d;
      border-radius: 12px;
      box-shadow: 
        0 25px 80px rgba(0, 0, 0, 0.5),
        inset 0 0 150px rgba(26, 54, 93, 0.05),
        inset 0 0 50px rgba(212, 175, 55, 0.1);
      text-align: center;
      max-width: 1020px;
      width: 100%;
      position: relative;
      overflow: hidden;
    }
    .certificate::before {
      content: '';
      position: absolute;
      top: 30px;
      left: 30px;
      right: 30px;
      bottom: 30px;
      border: 2px solid #d4af37;
      border-radius: 8px;
      pointer-events: none;
    }
    .corner-ornament {
      position: absolute;
      width: 120px;
      height: 120px;
      border: 3px solid #d4af37;
      pointer-events: none;
    }
    .corner-top-left {
      top: 20px;
      left: 20px;
      border-right: none;
      border-bottom: none;
      border-top-left-radius: 12px;
    }
    .corner-top-left::before {
      content: '◆';
      position: absolute;
      top: -15px;
      left: -15px;
      font-size: 30px;
      color: #d4af37;
    }
    .corner-top-right {
      top: 20px;
      right: 20px;
      border-left: none;
      border-bottom: none;
      border-top-right-radius: 12px;
    }
    .corner-top-right::before {
      content: '◆';
      position: absolute;
      top: -15px;
      right: -15px;
      font-size: 30px;
      color: #d4af37;
    }
    .corner-bottom-left {
      bottom: 20px;
      left: 20px;
      border-right: none;
      border-top: none;
      border-bottom-left-radius: 12px;
    }
    .corner-bottom-left::before {
      content: '◆';
      position: absolute;
      bottom: -15px;
      left: -15px;
      font-size: 30px;
      color: #d4af37;
    }
    .corner-bottom-right {
      bottom: 20px;
      right: 20px;
      border-left: none;
      border-top: none;
      border-bottom-right-radius: 12px;
    }
    .corner-bottom-right::before {
      content: '◆';
      position: absolute;
      bottom: -15px;
      right: -15px;
      font-size: 30px;
      color: #d4af37;
    }
    .embossed-pattern {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(26, 54, 93, 0.05) 0%, transparent 50%);
      pointer-events: none;
    }
    .seal-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      opacity: 0.06;
      pointer-events: none;
    }
    .seal-container::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 180px;
      height: 180px;
      border: 8px solid #1a365d;
      border-radius: 50%;
    }
    .seal-container::after {
      content: '★';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 120px;
      color: #d4af37;
    }
    .content {
      position: relative;
      z-index: 1;
    }
    .header {
      font-size: 56px;
      font-weight: bold;
      color: #1a365d;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 6px;
      text-shadow: 
        2px 2px 0px rgba(212, 175, 55, 0.3),
        4px 4px 8px rgba(0, 0, 0, 0.1);
      font-family: 'Georgia', serif;
    }
    .subtitle {
      font-size: 20px;
      color: #4a5568;
      margin-bottom: 60px;
      font-style: italic;
      letter-spacing: 2px;
      font-weight: 300;
    }
    .name-container {
      margin: 60px 0;
      padding: 40px 60px;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.1), rgba(26, 54, 93, 0.05));
      border-top: 5px solid #d4af37;
      border-bottom: 5px solid #d4af37;
      position: relative;
    }
    .name-container::before,
    .name-container::after {
      content: '✦';
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 24px;
      color: #d4af37;
    }
    .name-container::before {
      left: 20px;
    }
    .name-container::after {
      right: 20px;
    }
    .name {
      font-size: 46px;
      font-weight: bold;
      color: #1a365d;
      text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.1);
      letter-spacing: 2px;
    }
    .course-section {
      margin: 50px 0;
    }
    .course-label {
      font-size: 18px;
      color: #718096;
      margin-bottom: 15px;
      font-style: italic;
      letter-spacing: 1px;
    }
    .course {
      font-size: 34px;
      color: #2d3748;
      font-weight: 600;
      letter-spacing: 1px;
    }
    .date {
      font-size: 18px;
      color: #4a5568;
      margin-top: 50px;
      font-style: italic;
      letter-spacing: 1px;
    }
    .qr-code {
      margin-top: 40px;
      text-align: center;
    }
    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid rgba(212, 175, 55, 0.3);
      font-size: 13px;
      color: #718096;
      line-height: 2;
    }
    .verification {
      font-weight: 600;
      color: #1a365d;
      font-size: 14px;
      margin-top: 8px;
    }
    .domain {
      font-size: 12px;
      color: #a0aec0;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="embossed-pattern"></div>
    <div class="seal-container"></div>
    <div class="corner-ornament corner-top-left"></div>
    <div class="corner-ornament corner-top-right"></div>
    <div class="corner-ornament corner-bottom-left"></div>
    <div class="corner-ornament corner-bottom-right"></div>
    <div class="content">
      <div class="header">Certificate</div>
      <div class="subtitle">of Achievement</div>
      <div class="subtitle" style="margin-top: -40px; margin-bottom: 40px;">This is to certify that</div>
      <div class="name-container">
        <div class="name">{{studentName}}</div>
      </div>
      <div class="course-section">
        <div class="course-label">has successfully completed the course</div>
        <div class="course">{{courseName}}</div>
      </div>
      <div class="date">Issued on {{completionDate}}</div>
      <div class="qr-code">{{qrCode}}</div>
      <div class="footer">
        <div>Verification Code: <span class="verification">{{verificationCode}}</span></div>
        <div class="domain">{{domain}}</div>
      </div>
    </div>
  </div>
</body>
</html>`,
    isDefault: false,
  },
];

/**
 * Seed certificate templates
 */
export async function seedCertificateTemplates() {
  console.log('🌱 Seeding certificate templates...');

  try {
    let createdCount = 0;
    let skippedCount = 0;

    for (const template of DEFAULT_TEMPLATES) {
      // Check if template already exists
      const existing = await query(
        `SELECT id FROM certificate_templates WHERE name = $1`,
        [template.name]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Template "${template.name}" already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Insert template
      await query(
        `INSERT INTO certificate_templates (
          name, type, template_html, description, is_default
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          template.name,
          template.type,
          template.templateHtml,
          template.description,
          template.isDefault,
        ]
      );

      console.log(`✅ Created template: ${template.name}`);
      createdCount++;
    }

    console.log('✅ Certificate templates seeded successfully');
    console.log(`   Created: ${createdCount}, Skipped: ${skippedCount}`);

    return {
      success: true,
      created: createdCount,
      skipped: skippedCount,
      total: DEFAULT_TEMPLATES.length,
    };
  } catch (error) {
    console.error('❌ Error seeding certificate templates:', error);
    throw error;
  }
}

/**
 * Run seeder (standalone execution)
 */
async function runSeeder() {
  try {
    await seedCertificateTemplates();
    console.log('✅ Seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if executed directly
// Check if this module is the main entry point
const __filename = fileURLToPath(import.meta.url);
const mainModulePath = process.argv[1] ? resolve(process.argv[1]) : '';
const currentFilePath = resolve(__filename);

// Normalize paths for comparison (handle Windows paths)
const normalizePath = (path) => path.replace(/\\/g, '/').toLowerCase();
const isMainModule = normalizePath(currentFilePath) === normalizePath(mainModulePath);

if (isMainModule) {
  runSeeder();
}

export default seedCertificateTemplates;

