# k6 Performance Testing

This directory contains k6 load testing scripts for performance and stress testing.

## What is k6?

k6 is a modern load testing tool that uses JavaScript/ES6. It's designed for performance testing of APIs and web applications.

## Installation

k6 is not an npm package - it must be installed separately:

### Windows

**Option 1: With Admin Rights (Chocolatey)**
```powershell
# Open PowerShell as Administrator, then:
choco install k6
```

**Option 2: Manual Installation (No Admin Required)**
1. Download from https://github.com/grafana/k6/releases
2. Extract to a folder (e.g., `C:\k6`)
3. Add folder to PATH in Environment Variables

**Option 3: Using Scoop (No Admin Required)**
```powershell
scoop install k6
```

**See `k6/INSTALL_WINDOWS.md` for detailed Windows installation instructions.**

### macOS
```bash
brew install k6
```

### Linux
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D9B
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Or download from https://k6.io/docs/getting-started/installation/
```

## Test Scripts

### 1. Smoke Test (`smoke-test.js`)
Quick test to verify basic functionality.

```bash
k6 run k6/scripts/smoke-test.js
```

### 2. API Load Test (`api-load-test.js`)
Tests API endpoints under medium load.

```bash
k6 run k6/scripts/api-load-test.js
```

### 3. Payment Flow Load Test (`payment-flow-load.js`)
Tests payment-related endpoints under load.

```bash
k6 run k6/scripts/payment-flow-load.js
```

### 4. Dashboard Load Test (`dashboard-load.js`)
Tests dashboard endpoints under load.

```bash
k6 run k6/scripts/dashboard-load.js
```

## Configuration

### Environment Variables

Set these before running tests:

```bash
# Base URL (default: http://localhost:3000)
export K6_BASE_URL=http://localhost:3000

# Test user credentials
export TEST_USER_EMAIL=student@test.com
export TEST_USER_PASSWORD=testpassword123

# Test course ID
export TEST_COURSE_ID=test-course-1

# Test coupon code
export TEST_COUPON_CODE=TEST10

# Auth token (if available)
export AUTH_TOKEN=your-token-here
```

### Load Scenarios

Available in `k6/config.js`:

- **lightLoad**: 10 users, 1 minute
- **mediumLoad**: 50 users, 2 minutes
- **heavyLoad**: 100 users, 3 minutes
- **spikeTest**: Rapid spike to 200 users

## Running Tests

### Basic Run
```bash
k6 run k6/scripts/api-load-test.js
```

### With Environment Variables

**PowerShell:**
```powershell
$env:K6_BASE_URL="http://localhost:3000"
$env:TEST_USER_EMAIL="student@test.com"
$env:TEST_USER_PASSWORD="testpassword123"
k6 run k6/scripts/api-load-test.js
```

**Or use the PowerShell helper script:**
```powershell
.\k6\run-tests.ps1 api
.\k6\run-tests.ps1 payment
.\k6\run-tests.ps1 dashboard
.\k6\run-tests.ps1 smoke
```

**Bash/Linux/Mac:**
```bash
K6_BASE_URL=http://localhost:3000 k6 run k6/scripts/api-load-test.js
```

### With Custom VUs (Virtual Users)
```bash
k6 run --vus 10 --duration 30s k6/scripts/api-load-test.js
```

### With Output Options
```bash
# JSON output
k6 run --out json=results.json k6/scripts/api-load-test.js

# InfluxDB output (if configured)
k6 run --out influxdb=http://localhost:8086/k6 k6/scripts/api-load-test.js
```

## Test Results

k6 provides detailed metrics:

- **http_req_duration**: Request duration (p95, p99)
- **http_req_failed**: Request failure rate
- **iterations**: Number of test iterations
- **data_received/sent**: Data transfer rates
- **vus**: Virtual users count

### Example Output

```
     ✓ health check status is 200
     ✓ courses endpoint status is 200
     ✓ courses response time < 500ms

     checks.........................: 100.00% ✓ 150  ✗ 0
     data_received..................: 2.5 MB  42 kB/s
     data_sent......................: 150 kB  2.5 kB/s
     http_req_duration..............: avg=245ms min=120ms med=230ms max=890ms p(95)=450ms p(99)=680ms
     http_req_failed................: 0.00%   ✓ 0    ✗ 0
     http_reqs......................: 150     2.5/s
     iteration_duration.............: avg=1.2s min=800ms med=1.1s max=2.1s p(95)=1.8s p(99)=2.0s
     iterations.....................: 50      0.83/s
     vus............................: 10      min=10 max=10
```

## Thresholds

Tests define performance thresholds that must be met:

- **http_req_duration**: p95 < 500ms, p99 < 1000ms
- **http_req_failed**: < 1% failure rate
- **iteration_duration**: p95 < 2000ms

If thresholds are not met, the test will fail.

## Best Practices

1. **Start with smoke tests** - Verify basic functionality first
2. **Gradually increase load** - Start with light load, then medium, then heavy
3. **Monitor server resources** - Watch CPU, memory, database connections
4. **Test realistic scenarios** - Use actual user workflows
5. **Set appropriate thresholds** - Based on your SLA requirements
6. **Run tests regularly** - Include in CI/CD pipeline if possible

## Troubleshooting

### Connection Refused
- Ensure the server is running on the specified BASE_URL
- Check firewall settings
- Verify network connectivity

### High Failure Rate
- Check server logs for errors
- Verify database connections
- Check server resource usage (CPU, memory)

### Slow Response Times
- Check database query performance
- Verify API endpoint optimization
- Check for N+1 query problems
- Review caching strategies

## Integration with CI/CD

While CI/CD workflows are not included in this phase, k6 can be integrated:

```yaml
# Example GitHub Actions
- name: Run k6 load tests
  run: |
    k6 run k6/scripts/smoke-test.js
    k6 run k6/scripts/api-load-test.js
```

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 JavaScript API](https://k6.io/docs/javascript-api/)
- [k6 Best Practices](https://k6.io/docs/using-k6/best-practices/)
