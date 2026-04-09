/**
 * API Wrapper for ERPNext Communication
 * Authentication: Email + Password via session cookie (/api/method/login)
 */
class ERPNextAPI {
    constructor() {
        this.baseUrl = '';
        // CSRF token fetched after login (required by ERPNext for POST/PUT/DELETE)
        this.csrfToken = null;
    }

    /**
     * Set base URL only (no API keys needed for password login)
     */
    setBaseUrl(baseUrl) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    /**
     * Build request headers.
     * ERPNext session-based requests require X-Frappe-CSRF-Token for mutating calls.
     */
    getHeaders(isJson = true) {
        const headers = {
            'Accept': 'application/json',
        };
        if (isJson) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.csrfToken) {
            headers['X-Frappe-CSRF-Token'] = this.csrfToken;
        }
        return headers;
    }

    /**
     * Perform login with email/password.
     * ERPNext /api/method/login expects form-encoded body and sets a session cookie.
     * Returns the logged-in username on success.
     */
    async login(baseUrl, email, password) {
        this.setBaseUrl(baseUrl);

        const loginUrl = `${this.baseUrl}/api/method/login`;

        let response;
        try {
            response = await fetch(loginUrl, {
                method: 'POST',
                credentials: 'include', // send & save session cookie
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ usr: email, pwd: password })
            });
        } catch (err) {
            if (err.name === 'TypeError') {
                throw new Error('تعذّر الاتصال بالخادم. تأكد من صحة الرابط وأن الخادم يسمح بالاتصال (CORS).');
            }
            throw err;
        }

        let data;
        try { data = await response.json(); } catch (_) { data = {}; }

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
            }
            const msg = (data && data.message) || 'فشل تسجيل الدخول.';
            throw new Error(msg);
        }

        // Persist CSRF token returned in login response
        if (data && data.home_page) {
            // Frappe returns the CSRF token in a meta tag / cookie after login
            // Fetch it explicitly
            await this._fetchCsrfToken();
        }

        // Return username (Frappe returns { message: 'Logged In', full_name: '...' })
        return data.full_name || data.message || email;
    }

    /**
     * Fetch the CSRF token from the Frappe session endpoint.
     * Frappe stores it in api/method/frappe.auth.get_logged_user response header
     * or we can read it from the meta endpoint.
     */
    async _fetchCsrfToken() {
        try {
            const res = await fetch(`${this.baseUrl}/api/method/frappe.utils.scheduler.is_scheduler_inactive`, {
                credentials: 'include',
                headers: { 'Accept': 'application/json' }
            });
            // Frappe sets X-Frappe-Csrf-Token header on responses
            const token = res.headers.get('X-Frappe-Csrf-Token');
            if (token) this.csrfToken = token;
        } catch (_) {
            // Non-critical, continue without CSRF token
        }
    }

    /**
     * Logout from ERPNext session
     */
    async logout() {
        try {
            await fetch(`${this.baseUrl}/api/method/logout`, {
                method: 'GET',
                credentials: 'include',
                headers: this.getHeaders()
            });
        } catch (_) {}
        this.csrfToken = null;
    }

    /**
     * Core request method — uses session cookies (credentials: 'include')
     */
    async rawRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const method = (options.method || 'GET').toUpperCase();
        const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

        let response;
        try {
            response = await fetch(url, {
                ...options,
                credentials: 'include',
                headers: {
                    ...this.getHeaders(),
                    ...(options.headers || {})
                }
            });
        } catch (err) {
            if (err.name === 'TypeError') {
                throw new Error('مشكلة في الاتصال بالخادم أو مشكلة CORS.');
            }
            throw err;
        }

        // Capture fresh CSRF token on every response
        const freshToken = response.headers.get('X-Frappe-Csrf-Token');
        if (freshToken) this.csrfToken = freshToken;

        let data;
        try { data = await response.json(); } catch (_) { data = {}; }

        if (!response.ok) {
            let errorMsg = 'حدث خطأ غير معروف';
            if (response.status === 401) {
                errorMsg = 'انتهت جلستك. يرجى إعادة تسجيل الدخول.';
            } else if (response.status === 403) {
                errorMsg = 'ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء في ERPNext.';
            } else if (data && data._server_messages) {
                try {
                    const messages = JSON.parse(data._server_messages);
                    errorMsg = JSON.parse(messages[0]).message || errorMsg;
                } catch (_) {}
            } else if (data && data.exc) {
                errorMsg = 'حدث خطأ داخلي في الخادم.';
            }
            throw new Error(errorMsg);
        }

        return data;
    }

    /**
     * Validate login by fetching current user
     */
    async validateLogin() {
        const data = await this.rawRequest('/api/method/frappe.auth.get_logged_user');
        return data.message;
    }

    /**
     * Get all accessible employees (limit 500)
     */
    async getEmployees() {
        const queryParams = '?fields=["name","employee_name","designation"]&limit_page_length=500';
        const data = await this.rawRequest(`/api/resource/Employee${queryParams}`);
        return data.data || [];
    }

    /**
     * Get attendance records for a specific date
     */
    async getAttendances(date) {
        const filters = `[["attendance_date","=","${date}"],["docstatus","<",2]]`;
        const queryParams = `?fields=["name","employee","status","actual_overtime_duration","docstatus","attendance_date"]&filters=${encodeURIComponent(filters)}&limit_page_length=500`;
        const data = await this.rawRequest(`/api/resource/Attendance${queryParams}`);
        return data.data || [];
    }

    /**
     * Delete an attendance record
     */
    async deleteAttendance(docName) {
        const data = await this.rawRequest(`/api/resource/Attendance/${docName}`, {
            method: 'DELETE'
        });
        return data.message;
    }

    /**
     * Update an attendance record
     */
    async updateAttendance(docName, payload) {
        const data = await this.rawRequest(`/api/resource/Attendance/${docName}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return data.data;
    }

    /**
     * Create a new attendance record
     */
    async createAttendance(payload) {
        const data = await this.rawRequest(`/api/resource/Attendance`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data.data;
    }
}

// Global API instance
window.erpApi = new ERPNextAPI();
