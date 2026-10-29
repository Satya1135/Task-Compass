/**
 * TASK COMPASS — STATE MANAGEMENT
 * Central client-side state store for workplace simulations.
 */

const State = {
    workplaces: [],
    activeWorkplace: null,
    activeRole: null,
    studentName: 'Student Learner',
    user: null,
    session: null,
    
    currentStage: 1,
    scenarios: [],
    currentScenarioIndex: 0,
    answers: {},

    // Stage 1 interactive selection
    stage1SelectedRole: null,
    stage1SelectedOption: null,

    // Stage 2 route builder
    stage2CurrentRoute: [],

    // Stage 3 collaboration choice
    stage3SelectedOption: null,

    // Results & reflection
    resultsData: null,

    setUser(user) {
        this.user = user;
        if (user) {
            this.setStudentName(user.student_name || user.first_name || user.username);
            const pill = document.getElementById('auth-status-pill');
            if (pill) {
                pill.textContent = 'Student';
                pill.classList.add('authenticated');
            }
            const authBtn = document.getElementById('btn-auth-action');
            if (authBtn) {
                authBtn.textContent = 'Account';
            }
            const avatar = document.getElementById('user-avatar-icon');
            if (avatar) {
                const initial = (user.first_name || user.username || 'S')[0].toUpperCase();
                avatar.innerHTML = `<span style="font-weight: 700; font-size: 13px;">${initial}</span>`;
            }
        } else {
            this.clearUser();
        }
    },

    clearUser() {
        this.user = null;
        this.setStudentName('Student Learner');
        const pill = document.getElementById('auth-status-pill');
        if (pill) {
            pill.textContent = 'Guest';
            pill.classList.remove('authenticated');
        }
        const authBtn = document.getElementById('btn-auth-action');
        if (authBtn) {
            authBtn.textContent = 'Sign In';
        }
        const avatar = document.getElementById('user-avatar-icon');
        if (avatar) {
            avatar.innerHTML = `
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            `;
        }
    },

    setStudentName(name) {
        this.studentName = name ? name.trim() : 'Student Learner';
        const displayElem = document.getElementById('student-display-name');
        if (displayElem) displayElem.textContent = this.studentName;
    },

    setActiveWorkplace(workplace) {
        this.activeWorkplace = workplace;
    },

    setActiveRole(role) {
        this.activeRole = role;
    },

    setSession(session) {
        this.session = session;
        this.currentStage = session.current_stage || 1;
    },

    resetStageData() {
        this.stage1SelectedRole = null;
        this.stage1SelectedOption = null;
        this.stage2CurrentRoute = [];
        this.stage3SelectedOption = null;
        this.answers = {};
    },

    notify(message, type = 'info') {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span class="toast-msg"></span>
        `;
        const spanEl = toast.querySelector('.toast-msg');
        if (spanEl) spanEl.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(10px)';
                toast.style.transition = 'all 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }
};
