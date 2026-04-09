/**
 * Application State & Logic
 */
const AppState = {
    user: null,
    date: new Date().toISOString().split('T')[0], // Default to today
    employees: [],      // Array from ERPNext
    drafts: [],         // Array from ERPNext for the selected date
    rows: {},           // Internal state merging emp + draft + transient changes
    selectedRows: new Set(),
    searchQuery: '',
    lang: localStorage.getItem('app_lang') || 'ar',
    theme: localStorage.getItem('app_theme') || 'light',
    sortConfig: { key: 'name', direction: 'asc' }
};

const i18n = {
    ar: {
        app_title: "بوابة الحضور والانصراف - ERPNext",
        company_name: "شركة يوسف المحمادي مقاولات عامة",
        company_tagline: "نظام إدارة الموارد البشرية",
        app_header_subtitle: "بوابة الحضور والانصراف",
        powered_by: "مدعوم بواسطة",
        login_title: "تسجيل الدخول",
        login_subtitle: "أدخل بريدك الإلكتروني وكلمة المرور الخاصة بحسابك في ERPNext",
        lbl_erp_url: "رابط النظام (Base URL)",
        lbl_email: "البريد الإلكتروني",
        lbl_password: "كلمة المرور",
        btn_login: "دخول",
        login_help: "يتم تسجيل الدخول مباشرةً إلى حسابك في ERPNext. بيانات الدخول لا تُحفظ ولا تُرسل لأي جهة خارجية.",
        loading: "جاري التحميل...",
        btn_logout: "تسجيل خروج",
        lbl_attendance_date: "تاريخ الحضور:",
        placeholder_search: "بحث باسم أو رقم الموظف...",
        btn_reload: "تحديث البيانات",
        stat_total_emp: "إجمالي الموظفين",
        stat_absent: "الغياب",
        stat_overtime_emps: "موظفون بإضافي",
        stat_total_hours: "إجمالي الساعات",
        btn_reset: "إلغاء التعديلات",
        btn_save: "حفظ التغييرات",
        th_emp_id: "رقم الموظف",
        th_emp_name: "الاسم",
        th_designation: "المسمى الوظيفي",
        th_status: "الحالة",
        th_overtime: "ساعات إضافي",
        th_record_status: "حالة السجل",
        empty_search: "لا توجد بيانات مطابقة للبحث",
        
        lbl_selected: "محدد",
        lbl_change_status: "تغيير الحالة...",
        placeholder_bulk_ot: "إضافي موحد...",
        btn_apply: "تطبيق",
        msg_no_bulk_action_selected: "يرجى تحديد حالة أو قيمة إضافي للتطبيق.",
        msg_bulk_apply_success: "تم تطبيق التعديلات بنجاح. لا تنسى حفظ التغييرات.",

        status_present: "حاضر",
        status_absent: "غائب",
        badge_submitted: "معتمد (للعرض فقط)",
        badge_remove: "سيتم الحذف للوضع الافتراضي",
        badge_dirty: "غير محفوظ (تعديل)",
        badge_draft: "مسودة محفوظة",
        badge_default: "افتراضي (حاضر)",
        btn_verifying: "جاري التحقق...",
        msg_login_failed: "فشل تسجيل الدخول",
        msg_success: "نجاح",
        msg_data_fetched: "تم سحب البيانات بنجاح.",
        msg_fetch_error: "خطأ في جلب البيانات",
        msg_save_success: "تم الحفظ",
        msg_save_count: "تم تحديث السجلات بنجاح ({count}).",
        msg_warning: "تنبيه",
        msg_save_failed: "فشل في حفظ {count} سجل. يرجى المراجعة.",
        msg_row_error: "خطأ في {name}",
        designation_unknown: "غير محدد"
    },
    en: {
        app_title: "Attendance Portal - ERPNext",
        company_name: "Yousef Almehmadi General Contracting LLT.",
        company_tagline: "Human Resources Management System",
        app_header_subtitle: "Attendance Portal",
        powered_by: "Powered by",
        login_title: "Login",
        login_subtitle: "Enter your email and password to access ERPNext",
        lbl_erp_url: "System URL (Base URL)",
        lbl_email: "Email",
        lbl_password: "Password",
        btn_login: "Login",
        login_help: "Your credentials are used to log in directly to ERPNext. They are never stored or sent to any third party.",
        loading: "Loading...",
        btn_logout: "Logout",
        lbl_attendance_date: "Attendance Date:",
        placeholder_search: "Search by Employee name or ID...",
        btn_reload: "Refresh Data",
        stat_total_emp: "Total Employees",
        stat_absent: "Absent",
        stat_overtime_emps: "Employees w/ Overtime",
        stat_total_hours: "Total Hours",
        btn_reset: "Discard Changes",
        btn_save: "Save Changes",
        th_emp_id: "Employee ID",
        th_emp_name: "Name",
        th_designation: "Designation",
        th_status: "Status",
        th_overtime: "Overtime Hours",
        th_record_status: "Record Status",
        empty_search: "No matching data found",

        lbl_selected: "Selected",
        lbl_change_status: "Change Status...",
        placeholder_bulk_ot: "Set Overtime...",
        btn_apply: "Apply",
        msg_no_bulk_action_selected: "Please select a status or enter an overtime value to apply.",
        msg_bulk_apply_success: "Changes applied successfully. Don't forget to save.",

        status_present: "Present",
        status_absent: "Absent",
        badge_submitted: "Submitted (Read-only)",
        badge_remove: "Will restore to Default",
        badge_dirty: "Unsaved (Pending)",
        badge_draft: "Draft Saved",
        badge_default: "Default (Present)",
        btn_verifying: "Verifying...",
        msg_login_failed: "Login Failed",
        msg_success: "Success",
        msg_data_fetched: "Data fetched successfully.",
        msg_fetch_error: "Error fetching data",
        msg_save_success: "Saved",
        msg_save_count: "Successfully updated ({count}) records.",
        msg_warning: "Warning",
        msg_save_failed: "Failed to save {count} records. Please review.",
        msg_row_error: "Error in {name}",
        designation_unknown: "Unspecified"
    }
};

function t(key, params = {}) {
    let text = i18n[AppState.lang][key] || key;
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
    }
    return text;
}

// UI Elements caching
const UI = {
    loginView: document.getElementById('login-view'),
    appView: document.getElementById('app-view'),
    loginForm: document.getElementById('login-form'),
    btnLogin: document.getElementById('btn-login'),
    btnSpinner: document.querySelector('.btn-spinner'),
    btnText: document.querySelector('.btn-text'),
    btnLogout: document.getElementById('btn-logout'),
    
    currentUserName: document.getElementById('current-user-name'),
    attendanceDate: document.getElementById('attendance-date'),
    searchInput: document.getElementById('search-input'),
    btnReload: document.getElementById('btn-reload'),
    
    tbody: document.getElementById('employees-tbody'),
    btnSaveAll: document.getElementById('btn-save-all'),
    btnResetRows: document.getElementById('btn-reset-rows'),
    emptyState: document.getElementById('empty-state'),
    
    statTotalEmp: document.getElementById('stat-total-emp'),
    statAbsent: document.getElementById('stat-absent'),
    statOvertimeEmps: document.getElementById('stat-overtime-emps'),
    statTotalHours: document.getElementById('stat-total-hours'),

    // Bulk UI
    bulkActionBar: document.getElementById('bulk-actions-bar'),
    bulkCount: document.getElementById('bulk-count'),
    bulkStatus: document.getElementById('bulk-status'),
    bulkOvertime: document.getElementById('bulk-overtime'),
    btnApplyBulk: document.getElementById('btn-apply-bulk'),
    checkAll: document.getElementById('check-all')
};

/**
 * Toast Notification System
 */
function showToast(title, message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    
    const icon = isError 
        ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function showLoader() { document.getElementById('global-loader').classList.remove('hidden'); }
function hideLoader() { document.getElementById('global-loader').classList.add('hidden'); }

/**
 * Localization and Theme Logic
 */
function applySettings() {
    // Theme
    if (AppState.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.querySelectorAll('.icon-moon').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.icon-sun').forEach(el => el.classList.remove('hidden'));
    } else {
        document.body.classList.remove('dark-theme');
        document.querySelectorAll('.icon-moon').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.icon-sun').forEach(el => el.classList.add('hidden'));
    }
    
    // Lang
    document.documentElement.lang = AppState.lang;
    document.documentElement.dir = AppState.lang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('.lang-text-label').forEach(el => el.textContent = AppState.lang === 'ar' ? 'EN' : 'عربي');
    
    // Update texts
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    if (Object.keys(AppState.rows).length > 0) {
        renderTable();
    }
}

function toggleTheme() {
    AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('app_theme', AppState.theme);
    applySettings();
}

function toggleLang() {
    AppState.lang = AppState.lang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('app_lang', AppState.lang);
    applySettings();
}

/**
 * Initialization and Event Binding
 */
function initApp() {
    applySettings();

    document.getElementById('btn-login-theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('btn-app-theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('btn-login-lang-toggle').addEventListener('click', toggleLang);
    document.getElementById('btn-app-lang-toggle').addEventListener('click', toggleLang);

    // ERP URL is now hardcoded, no need to read from localStorage

    UI.loginForm.addEventListener('submit', handleLogin);

    UI.btnLogout.addEventListener('click', async () => {
        await window.erpApi.logout();
        UI.appView.classList.remove('active');
        setTimeout(() => {
            UI.appView.classList.add('hidden');
            UI.loginView.classList.remove('hidden');
            setTimeout(() => UI.loginView.classList.add('active'), 50);
        }, 300);
    });

    UI.attendanceDate.value = AppState.date;
    UI.attendanceDate.addEventListener('change', (e) => {
        AppState.date = e.target.value;
        loadData(false);
    });

    UI.btnReload.addEventListener('click', () => loadData(true));
    UI.searchInput.addEventListener('input', (e) => {
        AppState.searchQuery = e.target.value.toLowerCase().trim();
        renderTable();
    });

    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.getAttribute('data-sort');
            if (AppState.sortConfig.key === key) {
                AppState.sortConfig.direction = AppState.sortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                AppState.sortConfig.key = key;
                AppState.sortConfig.direction = 'asc';
            }
            renderTable();
        });
    });

    UI.btnResetRows.addEventListener('click', () => {
        initializeRowsFromState();
        renderTable();
    });

    UI.btnSaveAll.addEventListener('click', handleSaveAll);

    // Bulk Events
    UI.checkAll.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const checkboxes = document.querySelectorAll('.emp-checkbox:not(:disabled)');
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            const empId = cb.getAttribute('data-emp');
            if (isChecked) AppState.selectedRows.add(empId);
            else AppState.selectedRows.delete(empId);
        });
        updateBulkActionBar();
    });

    UI.btnApplyBulk.addEventListener('click', applyBulkActions);
}

/**
 * ERP requests are routed through same-origin proxy: /api/erp
 */
const ERP_BASE_URL = '';

/**
 * Handle Login process
 */
async function handleLogin(e) {
    e.preventDefault();
    const url      = ERP_BASE_URL;
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    UI.btnLogin.disabled = true;
    UI.btnSpinner.classList.remove('hidden');
    UI.btnText.textContent = t('btn_verifying');

    try {
        const fullName = await window.erpApi.login(url, email, password);
        AppState.user = fullName;
        UI.currentUserName.textContent = fullName;

        UI.loginView.classList.remove('active');
        setTimeout(() => {
            UI.loginView.classList.add('hidden');
            UI.appView.classList.remove('hidden');
            setTimeout(() => UI.appView.classList.add('active'), 50);
            loadData(true);
        }, 300);
    } catch (err) {
        showToast(t('msg_login_failed'), err.message, true);
    } finally {
        UI.btnLogin.disabled = false;
        UI.btnSpinner.classList.add('hidden');
        UI.btnText.textContent = t('btn_login');
    }
}

async function loadData(loadEmployees = true) {
    showLoader();
    try {
        if (loadEmployees) {
            AppState.employees = await window.erpApi.getEmployees();
        }
        AppState.drafts = await window.erpApi.getAttendances(AppState.date);
        
        initializeRowsFromState();
        renderTable();
        showToast(t('msg_success'), t('msg_data_fetched'));
    } catch (err) {
        showToast(t('msg_fetch_error'), err.message, true);
    } finally {
        hideLoader();
    }
}

function initializeRowsFromState() {
    AppState.rows = {};
    AppState.selectedRows.clear();
    UI.bulkStatus.value = '';
    UI.bulkOvertime.value = '';
    updateBulkActionBar();

    AppState.employees.forEach(emp => {
        const draft = AppState.drafts.find(d => d.employee === emp.name);
        AppState.rows[emp.name] = {
            id: emp.name,
            name: emp.employee_name,
            designation: emp.designation || t('designation_unknown'),
            originalDraftName: draft ? draft.name : null,
            originalDocstatus: draft ? draft.docstatus : null,
            originalStatus: draft ? draft.status : 'Present',
            originalOvertime: draft ? (draft.actual_overtime_duration || 0) : 0,
            status: draft ? draft.status : 'Present',
            overtime: draft ? (draft.actual_overtime_duration || 0) : 0,
        };
    });
}

function getRowAction(row) {
    if (row.originalDocstatus === 1) return 'NONE'; // Submitted
    const isDirty = (row.status !== row.originalStatus) || (row.overtime !== row.originalOvertime);
    if (!isDirty) return 'NONE';

    const needsRecord = !(row.status === 'Present' && row.overtime === 0);
    const hasOriginalRecord = !!row.originalDraftName;

    if (!needsRecord && hasOriginalRecord) return 'DELETE';
    else if (needsRecord && hasOriginalRecord) return 'PUT';
    else if (needsRecord && !hasOriginalRecord) return 'POST';
    return 'NONE';
}

function updateBulkActionBar() {
    const checkboxes = document.querySelectorAll('.emp-checkbox:not(:disabled)');
    if (checkboxes.length > 0 && AppState.selectedRows.size === checkboxes.length) {
        UI.checkAll.checked = true;
    } else {
        UI.checkAll.checked = false;
    }

    if (AppState.selectedRows.size > 0) {
        UI.bulkCount.textContent = AppState.selectedRows.size;
        UI.bulkActionBar.classList.add('show');
    } else {
        UI.bulkActionBar.classList.remove('show');
    }
}

function applyBulkActions() {
    const statusVal = UI.bulkStatus.value;
    const otVal = UI.bulkOvertime.value;
    
    if (!statusVal && otVal === '') {
        showToast(t('msg_warning'), t('msg_no_bulk_action_selected'), true);
        return;
    }
    
    AppState.selectedRows.forEach(empId => {
        const row = AppState.rows[empId];
        if (!row || row.originalDocstatus === 1) return;
        
        if (statusVal) {
            row.status = statusVal;
        }
        
        let targetOt = otVal !== '' ? parseFloat(otVal) : row.overtime;
        if (targetOt < 0) targetOt = 0;
        
        if (row.status === 'Absent') {
            row.overtime = 0; // Fixed zero on absent
        } else {
            row.overtime = targetOt;
        }
    });
    
    AppState.selectedRows.clear();
    UI.bulkStatus.value = '';
    UI.bulkOvertime.value = '';
    
    renderTable();
    updateBulkActionBar();
    
    showToast(t('msg_success'), t('msg_bulk_apply_success'));
}

function renderTable() {
    const tbody = UI.tbody;
    tbody.innerHTML = '';
    
    let totalEmployees = 0;
    let absentCount = 0;
    let overtimeEmps = 0;
    let totalOvertimeHours = 0;
    let dirtyCount = 0;
    let index = 1;
    
    let rowsArray = Object.values(AppState.rows);
    let matchedCount = 0;

    // Apply Sorting
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
        if (th.getAttribute('data-sort') === AppState.sortConfig.key) {
            th.classList.add(AppState.sortConfig.direction);
        }
    });

    const { key, direction } = AppState.sortConfig;
    rowsArray.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    rowsArray.forEach(row => {
        if (AppState.searchQuery) {
            if (!row.id.toLowerCase().includes(AppState.searchQuery) && 
                !(row.name && row.name.toLowerCase().includes(AppState.searchQuery))) {
                return;
            }
        }
        
        matchedCount++;
        totalEmployees++;
        
        if (row.status === 'Absent') absentCount++;
        if (row.overtime > 0) {
            overtimeEmps++;
            totalOvertimeHours += parseFloat(row.overtime);
        }

        const action = getRowAction(row);
        if (action !== 'NONE') dirtyCount++;

        const tr = document.createElement('tr');
        if (action !== 'NONE') tr.classList.add('row-dirty');

        let badgeHtml = '';
        const isSubmitted = row.originalDocstatus === 1;

        if (isSubmitted) {
            badgeHtml = `<span class="badge badge-submitted">${t('badge_submitted')}</span>`;
        } else if (action === 'DELETE') {
            badgeHtml = `<span class="badge badge-remove">${t('badge_remove')}</span>`;
        } else if (action === 'POST' || action === 'PUT') {
            badgeHtml = `<span class="badge badge-dirty">${t('badge_dirty')}</span>`;
        } else if (row.originalDraftName) {
            badgeHtml = `<span class="badge badge-draft">${t('badge_draft')}</span>`;
        } else {
            badgeHtml = `<span class="badge badge-default">${t('badge_default')}</span>`;
        }

        const isSelected = AppState.selectedRows.has(row.id);
        
        tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox emp-checkbox" data-emp="${row.id}" ${isSelected ? 'checked' : ''} ${isSubmitted ? 'disabled' : ''}></td>
            <td>${index++}</td>
            <td><strong>${row.name}</strong></td>
            <td>${row.designation}</td>
            <td class="td-status">
                <select class="status-select" data-emp="${row.id}" ${isSubmitted ? 'disabled' : ''}>
                    <option value="Present" ${row.status === 'Present' ? 'selected' : ''}>${t('status_present')}</option>
                    <option value="Absent" ${row.status === 'Absent' ? 'selected' : ''}>${t('status_absent')}</option>
                </select>
            </td>
            <td class="td-overtime">
                <input type="number" min="0" max="24" step="0.5" class="overtime-input" data-emp="${row.id}" value="${row.overtime}" ${row.status === 'Absent' || isSubmitted ? 'disabled' : ''}>
            </td>
            <td>${badgeHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    UI.statTotalEmp.textContent = totalEmployees;
    UI.statAbsent.textContent = absentCount;
    UI.statOvertimeEmps.textContent = overtimeEmps;
    UI.statTotalHours.textContent = totalOvertimeHours;

    if (matchedCount === 0) UI.emptyState.classList.remove('hidden');
    else UI.emptyState.classList.add('hidden');

    const UIHasChanges = dirtyCount > 0;
    UI.btnSaveAll.disabled = !UIHasChanges;
    UI.btnResetRows.disabled = !UIHasChanges;

    // Reset master checkbox if empty search
    if (matchedCount === 0) UI.checkAll.checked = false;

    bindRowEvents();
    updateBulkActionBar();
}

function bindRowEvents() {
    document.querySelectorAll('.emp-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const empId = e.target.getAttribute('data-emp');
            if (e.target.checked) AppState.selectedRows.add(empId);
            else AppState.selectedRows.delete(empId);
            updateBulkActionBar();
        });
    });

    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', (e) => {
            const empId = e.target.getAttribute('data-emp');
            const newStatus = e.target.value;
            AppState.rows[empId].status = newStatus;
            
            if (newStatus === 'Absent') {
                AppState.rows[empId].overtime = 0;
            }
            renderTable();
        });
    });

    document.querySelectorAll('.overtime-input').forEach(input => {
        input.addEventListener('input', (e) => {
            const empId = e.target.getAttribute('data-emp');
            let val = parseFloat(e.target.value) || 0;
            if (val < 0) val = 0;
            AppState.rows[empId].overtime = val;
            renderTable();
        });
    });
}

async function handleSaveAll() {
    const rowsArray = Object.values(AppState.rows);
    
    UI.btnSaveAll.disabled = true;
    UI.btnResetRows.disabled = true;
    showLoader();

    let successCount = 0;
    let errorCount = 0;

    for (const row of rowsArray) {
        const action = getRowAction(row);
        if (action === 'NONE') continue;

        const payload = {
            employee: row.id,
            attendance_date: AppState.date,
            status: row.status,
            actual_overtime_duration: row.overtime,
            docstatus: 0
        };

        try {
            if (action === 'DELETE') await window.erpApi.deleteAttendance(row.originalDraftName);
            else if (action === 'PUT') await window.erpApi.updateAttendance(row.originalDraftName, payload);
            else if (action === 'POST') await window.erpApi.createAttendance(payload);
            successCount++;
        } catch (err) {
            errorCount++;
            console.error(`Error saving ${row.id}:`, err);
            showToast(t('msg_row_error', {name: row.name}), err.message, true);
        }
    }

    hideLoader();

    if (successCount > 0) {
        showToast(t('msg_save_success'), t('msg_save_count', {count: successCount}));
        loadData(false); 
    }
    if (errorCount > 0) {
        showToast(t('msg_warning'), t('msg_save_failed', {count: errorCount}), true);
    }
}

document.addEventListener('DOMContentLoaded', initApp);
