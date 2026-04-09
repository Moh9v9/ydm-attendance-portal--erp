/**
 * API Wrapper for ERPNext Communication
 * Uses same-origin Vercel proxy (/api/erp) to bypass CORS/cookie restrictions.
 */
class ERPNextAPI {
    constructor() {
        this.proxyEndpoint = '/api/erp';
    }

    async proxy(action, payload = {}) {
        let response;
        try {
            response = await fetch(this.proxyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ action, ...payload })
            });
        } catch (_) {
            throw new Error('تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت وإعدادات Vercel.');
        }

        let data;
        try {
            data = await response.json();
        } catch (_) {
            data = {};
        }

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('انتهت جلستك. يرجى إعادة تسجيل الدخول.');
            }
            if (response.status === 403) {
                throw new Error('ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء في ERPNext.');
            }
            const serverMessages = data?._server_messages;
            if (serverMessages) {
                try {
                    const parsed = JSON.parse(serverMessages);
                    const first = JSON.parse(parsed[0]);
                    throw new Error(first.message || 'ERPNext error');
                } catch (_) {}
            }
            throw new Error(data?.error || data?.message || 'حدث خطأ غير معروف');
        }

        return data;
    }

    async login(_baseUrlIgnored, email, password) {
        const data = await this.proxy('login', { email, password });
        return data.full_name || data.message || email;
    }

    async logout() {
        await this.proxy('logout');
    }

    async rawRequest(endpoint, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        const data = await this.proxy('request', {
            endpoint,
            method,
            body: options.body ? JSON.parse(options.body) : undefined
        });
        return data;
    }

    async validateLogin() {
        const data = await this.rawRequest('/api/method/frappe.auth.get_logged_user');
        return data.message;
    }

    async getEmployees() {
        const queryParams = '?fields=["name","employee_name","designation"]&limit_page_length=500';
        const data = await this.rawRequest(`/api/resource/Employee${queryParams}`);
        return data.data || [];
    }

    async getAttendances(date) {
        const filters = `[["attendance_date","=","${date}"],["docstatus","<",2]]`;
        const queryParams = `?fields=["name","employee","status","actual_overtime_duration","docstatus","attendance_date"]&filters=${encodeURIComponent(filters)}&limit_page_length=500`;
        const data = await this.rawRequest(`/api/resource/Attendance${queryParams}`);
        return data.data || [];
    }

    async deleteAttendance(docName) {
        const data = await this.rawRequest(`/api/resource/Attendance/${docName}`, {
            method: 'DELETE'
        });
        return data.message;
    }

    async updateAttendance(docName, payload) {
        const data = await this.rawRequest(`/api/resource/Attendance/${docName}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return data.data;
    }

    async createAttendance(payload) {
        const data = await this.rawRequest(`/api/resource/Attendance`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return data.data;
    }
}

window.erpApi = new ERPNextAPI();
