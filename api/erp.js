const ERP_BASE_URL = 'https://erpnext.ydm-ds1621.synology.me';

const COOKIE_SID = 'erp_sid';
const COOKIE_CSRF = 'erp_csrf';

function parseCookies(cookieHeader = '') {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => {
        const idx = v.indexOf('=');
        if (idx === -1) return [v, ''];
        return [decodeURIComponent(v.slice(0, idx)), decodeURIComponent(v.slice(idx + 1))];
      })
  );
}

function getSetCookieArray(response) {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }
  const raw = response.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function extractCookieValue(setCookieHeaders, cookieName) {
  for (const header of setCookieHeaders) {
    const firstPart = header.split(';')[0];
    if (!firstPart) continue;
    const [name, ...rest] = firstPart.split('=');
    if (name?.trim() === cookieName) {
      return rest.join('=').trim();
    }
  }
  return null;
}

function makeCookie(name, value, maxAge = 28800) {
  const encoded = encodeURIComponent(value ?? '');
  return `${name}=${encoded}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

async function erpRequest(endpoint, { method = 'GET', body, sid, csrf }) {
  const headers = { Accept: 'application/json' };
  if (sid) headers.Cookie = `sid=${sid}`;

  const hasBody = body !== undefined && body !== null;
  if (hasBody && typeof body === 'string') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }

  const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  if (isMutating && csrf) {
    headers['X-Frappe-CSRF-Token'] = csrf;
  }

  const response = await fetch(`${ERP_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: hasBody ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { message: await response.text().catch(() => '') };

  return { response, data };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { action, endpoint, method, body, email, password } = req.body || {};
  const cookies = parseCookies(req.headers.cookie || '');
  const sid = cookies[COOKIE_SID];
  const csrf = cookies[COOKIE_CSRF];

  try {
    if (action === 'login') {
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }

      const form = new URLSearchParams({ usr: email, pwd: password }).toString();
      const { response, data } = await erpRequest('/api/method/login', {
        method: 'POST',
        body: form
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: data?.message || 'Login failed' });
      }

      const setCookies = getSetCookieArray(response);
      const newSid = extractCookieValue(setCookies, 'sid');
      if (!newSid) {
        return res.status(502).json({ error: 'ERP session cookie not received' });
      }

      const csrfToken = response.headers.get('x-frappe-csrf-token') || '';
      res.setHeader('Set-Cookie', [
        makeCookie(COOKIE_SID, newSid),
        makeCookie(COOKIE_CSRF, csrfToken)
      ]);

      return res.status(200).json({ message: data?.message || 'Logged In', full_name: data?.full_name || email });
    }

    if (action === 'logout') {
      if (sid) {
        await erpRequest('/api/method/logout', { method: 'GET', sid, csrf });
      }
      res.setHeader('Set-Cookie', [
        `${COOKIE_SID}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        `${COOKIE_CSRF}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
      ]);
      return res.status(200).json({ message: 'Logged out' });
    }

    if (action === 'request') {
      if (!endpoint || !method) {
        return res.status(400).json({ error: 'Missing endpoint or method' });
      }
      if (!sid) {
        return res.status(401).json({ error: 'Session expired. Please login again.' });
      }

      const { response, data } = await erpRequest(endpoint, { method, body, sid, csrf });
      const freshCsrf = response.headers.get('x-frappe-csrf-token');
      if (freshCsrf && freshCsrf !== csrf) {
        res.setHeader('Set-Cookie', makeCookie(COOKIE_CSRF, freshCsrf));
      }

      if (!response.ok) {
        return res.status(response.status).json(data || { error: 'ERP request failed' });
      }

      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
}
