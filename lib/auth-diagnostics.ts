'use client'

/**
 * Fitflix Auth Diagnostics Suite
 * 
 * Intercepts localStorage, document.cookie, fetch, and XMLHttpRequest to trace the source of
 * token loss, cookies deletions, or 401/403 errors with exact call stacks.
 */

declare global {
  interface Window {
    __auth_diagnostics_initialized?: boolean;
  }
  interface XMLHttpRequest {
    _url?: string;
    _method?: string;
    _requestHeaders?: Record<string, string>;
  }
}

export function initAuthDiagnostics() {
  if (typeof window === 'undefined') return;
  if (window.__auth_diagnostics_initialized) return;
  window.__auth_diagnostics_initialized = true;

  // 1. Startup environment diagnostics
  console.log(
    `%c[AUTH-DIAGNOSTIC] Initializing Suite%c`,
    'background: #1e293b; color: #10b981; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 13px;',
    '',
    {
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '[UNDEFINED - DEFAULT TO http://localhost:3000]',
      NEXT_PUBLIC_DEBUG_AUTH: process.env.NEXT_PUBLIC_DEBUG_AUTH,
      NODE_ENV: process.env.NODE_ENV,
      userAgent: navigator.userAgent,
      time: new Date().toISOString()
    }
  );

  const authKeys = ['hh_token', 'hh_credentials', 'hh_email', 'hh_user'];

  // Helper to log state snapshots
  const logStateSnapshot = (stage: 'LOAD' | 'UNLOAD') => {
    try {
      const hh_token = localStorage.getItem('hh_token');
      const hh_credentials = localStorage.getItem('hh_credentials');
      const hh_email = localStorage.getItem('hh_email');
      const hh_user = localStorage.getItem('hh_user');
      
      let hh_authed = null;
      if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(^|;)\s*hh_authed\s*=\s*([^;]+)/);
        hh_authed = match ? match[2] : null;
      }

      const state = {
        hh_token: hh_token ? `[PRESENT - length: ${hh_token.length}]` : '[MISSING]',
        hh_credentials: hh_credentials ? '[PRESENT]' : '[MISSING]',
        hh_email: hh_email || '[MISSING]',
        hh_user: hh_user ? JSON.parse(hh_user) : '[MISSING]',
        hh_authed_cookie: hh_authed ? `[PRESENT: ${hh_authed}]` : '[MISSING]'
      };

      console.log(
        `%c[AUTH-DIAGNOSTIC] State Snapshot at ${stage}%c`,
        stage === 'LOAD' 
          ? 'background: #0d9488; color: white; padding: 3px 6px; border-radius: 4px; font-weight: bold;' 
          : 'background: #b91c1c; color: white; padding: 3px 6px; border-radius: 4px; font-weight: bold;',
        '',
        state
      );
    } catch (e) {
      console.error('[AUTH-DIAGNOSTIC] Failed to build state snapshot', e);
    }
  };

  // Log snapshot on load
  logStateSnapshot('LOAD');

  // Register snapshot on unload
  window.addEventListener('beforeunload', () => {
    logStateSnapshot('UNLOAD');
  });

  // 2. LocalStorage Interceptor
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  const originalClear = localStorage.clear;

  localStorage.setItem = function(key: string, value: string) {
    if (authKeys.includes(key)) {
      console.warn(
        `%c[AUTH-DIAGNOSTIC] localStorage.setItem called for key: "${key}"%c`,
        'color: #d97706; font-weight: bold;',
        '',
        {
          key,
          value: (key === 'hh_credentials' || key === 'hh_token') ? '[REDACTED_FOR_SECURITY]' : value,
          stack: new Error().stack
        }
      );
    }
    return originalSetItem.apply(this, [key, value]);
  };

  localStorage.removeItem = function(key: string) {
    if (authKeys.includes(key)) {
      console.error(
        `%c[AUTH-DIAGNOSTIC] localStorage.removeItem called for key: "${key}"%c`,
        'color: #ef4444; font-weight: bold;',
        '',
        {
          key,
          stack: new Error().stack
        }
      );
    }
    return originalRemoveItem.apply(this, [key]);
  };

  localStorage.clear = function() {
    console.error(
      `%c[AUTH-DIAGNOSTIC] localStorage.clear() called! Clears all keys: ${authKeys.join(', ')}%c`,
      'color: #ef4444; font-weight: bold; font-size: 12px;',
      '',
      {
        stack: new Error().stack
      }
    );
    return originalClear.apply(this);
  };

  // 3. Document Cookie Interceptor
  try {
    const proto = Document.prototype || HTMLDocument.prototype;
    const cookieDescriptor = Object.getOwnPropertyDescriptor(proto, 'cookie');
    if (cookieDescriptor && cookieDescriptor.set && cookieDescriptor.get) {
      const originalSetCookie = cookieDescriptor.set;
      const originalGetCookie = cookieDescriptor.get;

      Object.defineProperty(document, 'cookie', {
        configurable: true,
        enumerable: true,
        get: function() {
          return originalGetCookie.call(this);
        },
        set: function(val) {
          const cookieStr = String(val);
          if (cookieStr.includes('hh_authed')) {
            const isDeletion = cookieStr.includes('max-age=0') || cookieStr.includes('expires=Thu, 01 Jan 1970');
            console.log(
              `%c[AUTH-DIAGNOSTIC] document.cookie set: "${cookieStr}" (${isDeletion ? 'DELETION' : 'WRITE'})%c`,
              isDeletion ? 'color: #ef4444; font-weight: bold;' : 'color: #10b981; font-weight: bold;',
              '',
              {
                cookieValue: cookieStr,
                stack: new Error().stack
              }
            );
          }
          originalSetCookie.call(this, val);
        }
      });
    }
  } catch (e) {
    console.warn('[AUTH-DIAGNOSTIC] Could not monkey-patch document.cookie', e);
  }

  // 4. Fetch API Interceptor
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
    const method = init?.method || (input instanceof Request ? (input as Request).method : 'GET');
    
    let hasAuthHeader = false;
    if (init?.headers) {
      const headers = new Headers(init.headers);
      hasAuthHeader = headers.has('Authorization');
    } else if (input instanceof Request) {
      hasAuthHeader = input.headers.has('Authorization');
    }

    try {
      const response = await originalFetch.apply(this, [input, init]);
      if (response.status === 401 || response.status === 403) {
        console.error(
          `%c[AUTH-DIAGNOSTIC] HTTP Error ${response.status} on FETCH: ${method} ${url}%c`,
          'background: #7f1d1d; color: #fecaca; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
          '',
          {
            url,
            method,
            status: response.status,
            classification: hasAuthHeader 
              ? 'Token Rejected (Server-Side Invalidation) - The Authorization header was sent, but the server rejected it.'
              : 'Storage Empty (Client-Side Loss) - No Authorization header was sent, which caused the authentication check to fail.',
            stack: new Error().stack
          }
        );
      }
      return response;
    } catch (err) {
      throw err;
    }
  };

  // 5. XMLHttpRequest Interceptor
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    this._url = typeof url === 'string' ? url : url.toString();
    this._method = method;
    this._requestHeaders = {};
    return originalOpen.apply(this, [method, url, ...args] as any);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(header: string, value: string) {
    if (this._requestHeaders) {
      this._requestHeaders[header.toLowerCase()] = value;
    }
    return originalSetRequestHeader.apply(this, [header, value]);
  };

  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this;
    const stack = new Error().stack;
    const url = xhr._url ?? '';
    const method = xhr._method ?? 'UNKNOWN';

    xhr.addEventListener('load', function() {
      if (xhr.status === 401 || xhr.status === 403) {
        const hasAuthHeader = xhr._requestHeaders ? !!xhr._requestHeaders['authorization'] : false;
        console.error(
          `%c[AUTH-DIAGNOSTIC] HTTP Error ${xhr.status} on XHR: ${method} ${url}%c`,
          'background: #7f1d1d; color: #fecaca; padding: 4px 8px; border-radius: 4px; font-weight: bold;',
          '',
          {
            url,
            method,
            status: xhr.status,
            classification: hasAuthHeader 
              ? 'Token Rejected (Server-Side Invalidation) - The Authorization header was sent, but the server rejected it.'
              : 'Storage Empty (Client-Side Loss) - No Authorization header was sent, which caused the authentication check to fail.',
            response: xhr.responseText ? xhr.responseText.substring(0, 500) : null,
            stack: stack
          }
        );
      }
    });

    return originalSend.apply(this, [body]);
  };
}

export function AuthDiagnostics() {
  const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_AUTH === '1';
  
  if (typeof window !== 'undefined' && isDev) {
    initAuthDiagnostics();
  }
  return null;
}

