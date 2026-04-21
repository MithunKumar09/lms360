/**
 * Jest Setup File
 * 
 * Runs before each test file
 * Configures testing library and global test utilities
 */

// Import jest-dom matchers
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Suppress console errors in tests (optional - comment out if you want to see them)
// global.console = {
//   ...console,
//   error: jest.fn(),
//   warn: jest.fn(),
// };

// Setup global test timeout
jest.setTimeout(10000);

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Polyfill for Next.js Request/Response APIs in test environment
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers || {});
      this.body = init.body || null;
      this.cache = init.cache || 'default';
      this.credentials = init.credentials || 'same-origin';
      this.mode = init.mode || 'cors';
      this.redirect = init.redirect || 'follow';
      this.referrer = init.referrer || '';
      this.signal = init.signal || null;
    }

    async json() {
      if (this.body) {
        return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
      }
      return {};
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || {});
    }

    clone() {
      return new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: this.body,
      });
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers || {});
      this.ok = this.status >= 200 && this.status < 300;
      this.redirected = false;
      this.type = 'default';
      this.url = '';
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || {});
    }

    clone() {
      return new Response(this.body, {
        status: this.status,
        statusText: this.statusText,
        headers: this.headers,
      });
    }
  };
}

// Mock Next.js server module
jest.mock('next/server', () => {
  class MockNextResponse extends Response {
    constructor(body, init = {}) {
      super(body, init);
      this._data = body ? (typeof body === 'string' ? JSON.parse(body) : body) : null;
    }

    async json() {
      return this._data || JSON.parse(await this.text());
    }

    static json(data, init = {}) {
      const response = new MockNextResponse(JSON.stringify(data), {
        status: init.status || 200,
        headers: {
          'Content-Type': 'application/json',
          ...init.headers,
        },
      });
      response._data = data;
      return response;
    }

    static redirect(url, init = {}) {
      return new MockNextResponse(null, {
        status: init.status || 307,
        headers: {
          Location: url,
          ...init.headers,
        },
      });
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

