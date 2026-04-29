// =============================================
// Admin Panel - Shared Logic
// =============================================

// ── Auth Guard ─────────────────────────────
async function adminInit(activePage) {
    // Fix date
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('ar-SA', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../rede.html#login';
        return;
    }

    const { data: profile } = await supabase
        .from('users').select('full_name, is_admin').eq('id', session.user.id).single();

    if (!profile || !profile.is_admin) {
        alert('ليس لديك صلاحية الدخول إلى لوحة التحكم');
        window.location.href = '../index.html';
        return;
    }

    const name = profile.full_name || session.user.email;
    const nameEl = document.getElementById('adminName');
    const topEl  = document.getElementById('topbarName');
    if (nameEl) nameEl.textContent = name;
    if (topEl)  topEl.textContent = name;

    // Mark active nav link
    document.querySelectorAll('.nav-link[data-page]').forEach(a => {
        a.classList.toggle('active', a.dataset.page === activePage);
    });

    // Sidebar toggle
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        document.getElementById('sidebar')?.classList.add('collapsed');
    }
}

// ── Sidebar Toggle ──────────────────────────
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        sb.classList.toggle('mobile-open');
    } else {
        sb.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed'));
    }
}

// ── Logout ──────────────────────────────────
async function adminLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('profileData');
    window.location.href = '../index.html';
}

// ── Nav Badge ────────────────────────────────
function setNavBadge(id, count) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = count;
    el.style.display = count > 0 ? '' : 'none';
}

// ── Toast ────────────────────────────────────
function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: 'fa-check-circle', danger: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}" style="font-size:1.1rem;flex-shrink:0"></i> ${esc(message)}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ── Helpers ──────────────────────────────────
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('ar-SA', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function audienceBadge(type) {
    const map = {
        employee: ['badge-employee','<i class="fas fa-briefcase"></i> موظف'],
        seeker:   ['badge-seeker',  '<i class="fas fa-search"></i> باحث عن عمل'],
        both:     ['badge-both',    '<i class="fas fa-users"></i> الجميع']
    };
    const [cls, label] = map[type] || ['badge-both','الجميع'];
    return `<span class="badge ${cls}">${label}</span>`;
}

function statusBadge(s) {
    const map = {
        pending:   ['badge-pending',  'معلق'],
        approved:  ['badge-approved', 'مقبول'],
        completed: ['badge-completed','مكتمل'],
        rejected:  ['badge-rejected', 'مرفوض']
    };
    const [cls, label] = map[s] || ['badge-pending', s];
    return `<span class="badge ${cls}">${label}</span>`;
}

function contactBadge(s) {
    const map = {
        new:     ['badge-new',    '<i class="fas fa-circle" style="font-size:.5rem"></i> جديد'],
        read:    ['badge-read',   'مقروء'],
        replied: ['badge-replied','تم الرد']
    };
    const [cls, label] = map[s] || ['badge-new', s];
    return `<span class="badge ${cls}">${label}</span>`;
}

function emptyState(msg, icon = 'fa-inbox') {
    return `<div class="empty-state"><i class="fas ${icon}"></i><p>${msg}</p></div>`;
}

function renderError(containerId, msg) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div class="alert alert-danger" style="margin:1rem"><i class="fas fa-exclamation-circle"></i> ${esc(msg)}</div>`;
}

// Mobile: close sidebar when clicking outside
document.addEventListener('click', (e) => {
    const sb = document.getElementById('sidebar');
    if (!sb) return;
    if (window.innerWidth <= 768 && sb.classList.contains('mobile-open')) {
        if (!sb.contains(e.target) && !e.target.closest('.topbar-menu-btn')) {
            sb.classList.remove('mobile-open');
        }
    }
});
