# Lighthouse CI Performance Testing

This directory contains Lighthouse CI reports and configuration for automated performance audits.

## What is Lighthouse CI?

Lighthouse CI is a tool that runs Lighthouse audits in CI/CD pipelines and enforces performance budgets. It tests Core Web Vitals, accessibility, best practices, and SEO.

## Installation

Install Lighthouse CI as a dev dependency:

```bash
npm install -D @lhci/cli
```

## Configuration

Configuration is in `.lighthouserc.js` at the project root.

### URLs Tested

- Homepage: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Courses: `http://localhost:3000/courses`
- About: `http://localhost:3000/about`
- Contact: `http://localhost:3000/contact`

### Performance Thresholds

- **Performance Score**: Minimum 70%
- **Accessibility Score**: Minimum 90%
- **Best Practices Score**: Minimum 80%
- **SEO Score**: Minimum 80%

### Core Web Vitals

- **First Contentful Paint (FCP)**: < 2 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Total Blocking Time (TBT)**: < 300ms
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Speed Index**: < 3 seconds

## Running Tests

### Run All Audits

```bash
npm run test:lighthouse
```

Or directly:

```bash
lhci autorun
```

### Run with Custom Configuration

```bash
lhci autorun --config=.lighthouserc.js
```

### Run Single URL

```bash
lhci autorun --collect.url=http://localhost:3000/login
```

## Reports

Reports are saved to `./lighthouse/reports/` directory.

### View Reports

1. HTML reports are generated automatically
2. Open `lighthouse/reports/` directory
3. Open the HTML file in a browser

### Report Format

Reports are named: `{pathname}-{datetime}-report.{extension}`

Example: `login-2024-01-15T10-30-00-report.html`

## Performance Budgets

The configuration enforces performance budgets:

- Total page weight: < 5MB
- DOM size: < 1500 nodes
- Image optimization required
- Modern image formats (WebP) recommended

## Core Web Vitals

Lighthouse CI tests these Core Web Vitals:

1. **LCP (Largest Contentful Paint)**: Time to render largest content
2. **FID (First Input Delay)**: Time to first user interaction
3. **CLS (Cumulative Layout Shift)**: Visual stability

## Integration

### Local Development

Run before committing:

```bash
npm run test:lighthouse
```

### CI/CD Integration

While CI/CD workflows are not included in this phase, you can integrate:

```yaml
# Example GitHub Actions
- name: Run Lighthouse CI
  run: |
    npm run dev &
    sleep 10
    npm run test:lighthouse
```

## Troubleshooting

### Server Not Starting

- Ensure port 3000 is available
- Check `npm run dev` works manually
- Increase `startServerReadyTimeout` if needed

### Low Performance Scores

- Optimize images
- Reduce JavaScript bundle size
- Enable code splitting
- Use CDN for static assets
- Implement caching

### High LCP

- Optimize largest content element
- Preload critical resources
- Reduce server response time
- Use efficient image formats

### High CLS

- Set image dimensions
- Reserve space for ads/embeds
- Avoid inserting content above existing content
- Use CSS aspect-ratio

## Best Practices

1. **Run regularly** - Test performance on every major change
2. **Monitor trends** - Track scores over time
3. **Set realistic budgets** - Based on your target users
4. **Test on mobile** - Most users are on mobile devices
5. **Fix critical issues first** - Focus on errors, then warnings

## Resources

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
