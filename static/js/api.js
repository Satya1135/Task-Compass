/**
 * TASK COMPASS — API CLIENT (VANILLA JAVASCRIPT FETCH)
 * Communicates with Django REST Framework endpoints.
 */

const API = {
    baseUrl: '/api',

    getCsrfToken() {
        const match = document.cookie.match(/csrftoken=([^;]+)/);
        if (match) return match[1];
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : '';
    },

    async request(endpoint, options = {}) {
        const csrfToken = this.getCsrfToken();
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
        };
        if (csrfToken && options.method && options.method.toUpperCase() !== 'GET') {
            headers['X-CSRFToken'] = csrfToken;
        }

        const config = {
            headers,
            ...options
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errDetail = errorData.detail || errorData.message || (errorData.error ? (typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)) : null);
                throw new Error(errDetail || `API Error ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    },

    // Workplaces & Roles
    async getWorkplaces() {
        return await this.request('/workplaces/');
    },

    async getWorkplaceDetail(slugOrId) {
        return await this.request(`/workplaces/${slugOrId}/`);
    },

    // Session Management
    async createSession(studentName, workplaceId, roleId) {
        return await this.request('/sessions/', {
            method: 'POST',
            body: JSON.stringify({
                student_name: studentName,
                workplace_id: workplaceId,
                role_id: roleId
            })
        });
    },

    async getSession(sessionId) {
        return await this.request(`/sessions/${sessionId}/`);
    },

    // Stage Progression
    async getStageScenarios(sessionId, stageNumber) {
        return await this.request(`/sessions/${sessionId}/stage/${stageNumber}/`);
    },

    async submitAnswer(sessionId, payload) {
        return await this.request(`/sessions/${sessionId}/answers/`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async submitStage(sessionId, stageNumber, answers) {
        return await this.request(`/sessions/${sessionId}/stage/${stageNumber}/submit/`, {
            method: 'POST',
            body: JSON.stringify({
                stage: stageNumber,
                answers: answers
            })
        });
    },

    // Results & Reflection
    async getResults(sessionId) {
        return await this.request(`/sessions/${sessionId}/results/`);
    },

    async submitReflection(sessionId, reflectionData) {
        return await this.request(`/sessions/${sessionId}/reflection/`, {
            method: 'POST',
            body: JSON.stringify(reflectionData)
        });
    },

    async completeSession(sessionId) {
        return await this.request(`/sessions/${sessionId}/complete/`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    // Student Authentication & Identity API
    async register(userData) {
        return await this.request('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    },

    async login(credentials) {
        return await this.request('/auth/login/', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    },

    async logout() {
        return await this.request('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({})
        });
    },

    async getCurrentUser() {
        return await this.request('/auth/me/');
    },

    async getUserHistory() {
        return await this.request('/auth/history/');
    },

    // Student Dashboard, History Review & Verified Certificate
    async getStudentDashboard() {
        return await this.request('/student/dashboard/');
    },

    async getSessionReview(sessionId) {
        return await this.request(`/sessions/${sessionId}/review/`);
    },

    async getSessionCertificate(sessionId) {
        return await this.request(`/sessions/${sessionId}/certificate/`);
    }
};

