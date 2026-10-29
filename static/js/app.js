/**
 * TASK COMPASS — MAIN APPLICATION ORCHESTRATOR
 * Controls screen transitions, workplace selection, 3x4 role grid rendering, and simulation lifecycle.
 */

const App = {
    async init() {
        this.bindEvents();
        await this.checkAuthStatus();
        await this.loadWorkplaces();
    },

    bindEvents() {
        // Mobile Navigation Toggle
        const mobileToggle = document.getElementById('mobile-toggle');
        const mobileDrawer = document.getElementById('mobile-drawer');
        if (mobileToggle && mobileDrawer) {
            mobileToggle.addEventListener('click', () => {
                mobileDrawer.classList.toggle('open');
            });
            // Close mobile menu on link click
            mobileDrawer.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    mobileDrawer.classList.remove('open');
                });
            });
        }

        // Student Name Input
        const studentNameInput = document.getElementById('input-student-name');
        if (studentNameInput) {
            studentNameInput.addEventListener('input', (e) => {
                State.setStudentName(e.target.value);
            });
        }

        // Search trigger
        const searchBtn = document.getElementById('search-toggle-btn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const searchPrompt = prompt('Search workplaces, roles, or cybersecurity scenarios:', 'Cybersecurity');
                if (searchPrompt) {
                    State.notify(`Filtering simulations for "${searchPrompt}"...`, 'info');
                    this.filterContent(searchPrompt);
                }
            });
        }

        // Smooth scroll nav links & smart simulation navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId && targetId !== '#') {
                    e.preventDefault();
                    if (targetId === '#simulate') {
                        const simElem = document.getElementById('simulate');
                        if (!simElem || simElem.style.display === 'none') {
                            State.notify('Please select a role below to start your simulation session!', 'info');
                            const wpElem = document.getElementById('workplaces');
                            if (wpElem) wpElem.scrollIntoView({ behavior: 'smooth' });
                            return;
                        }
                    }
                    const targetElem = document.querySelector(targetId);
                    if (targetElem) {
                        targetElem.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // Role Detail Modal Event Listeners
        const modalOverlay = document.getElementById('role-detail-modal');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeRoleDetailModal();
                }
            });
        }

        // Authentication Modal Overlay Listener
        const authModalOverlay = document.getElementById('auth-modal');
        if (authModalOverlay) {
            authModalOverlay.addEventListener('click', (e) => {
                if (e.target === authModalOverlay) {
                    this.closeAuthModal();
                }
            });
        }

        // Session Review Modal Overlay Listener
        const reviewModalOverlay = document.getElementById('session-review-modal');
        if (reviewModalOverlay) {
            reviewModalOverlay.addEventListener('click', (e) => {
                if (e.target === reviewModalOverlay) {
                    this.closeSessionReviewModal();
                }
            });
        }

        // Certificate Modal Overlay Listener
        const certModalOverlay = document.getElementById('certificate-modal');
        if (certModalOverlay) {
            certModalOverlay.addEventListener('click', (e) => {
                if (e.target === certModalOverlay) {
                    this.closeCertificateModal();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeRoleDetailModal();
                this.closeAuthModal();
                this.closeSessionReviewModal();
                this.closeCertificateModal();
            }
        });

        // IntersectionObserver for active navigation highlighting
        this.setupNavObserver();
    },

    setupNavObserver() {
        const sections = [
            { id: 'home', nav: 'home' },
            { id: 'workplaces', nav: 'workplaces' },
            { id: 'why-task-compass', nav: 'progress' },
            { id: 'how-it-works', nav: 'about' },
            { id: 'learn', nav: 'learn' },
            { id: 'simulate', nav: 'simulate' }
        ];

        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const match = sections.find(s => s.id === entry.target.id);
                    if (match) {
                        document.querySelectorAll('.nav-link').forEach(link => {
                            link.classList.toggle('active', link.getAttribute('data-nav') === match.nav);
                        });
                    }
                }
            });
        }, observerOptions);

        sections.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) observer.observe(el);
        });
    },

    async loadWorkplaces() {
        try {
            const workplaces = await API.getWorkplaces();
            State.workplaces = workplaces;

            // Render workplace cards with educational illustrations, domains tag, role/stage pill, and animated arrow
            const container = document.getElementById('workplace-cards-container');
            if (container) {
                container.innerHTML = workplaces.map(wp => `
                    <div class="workplace-card" data-slug="${wp.slug}" onclick="App.selectWorkplace('${wp.slug}')">
                        <div class="workplace-card-top">
                            <div class="workplace-illustration-box">
                                ${this.getWorkplaceIllustrationSvg(wp.slug)}
                            </div>
                            <h3 class="workplace-card-title">${wp.name}</h3>
                            <div class="workplace-domains-tag">${this.getWorkplaceDomainsTag(wp.slug)}</div>
                            <p class="workplace-card-desc">${wp.description}</p>
                        </div>
                        <div class="workplace-card-footer">
                            <span class="workplace-stats-pill">${wp.roles_count || 4} Roles &bull; 3 Stages</span>
                            <div class="workplace-arrow-circle" aria-label="Explore ${wp.name}">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>
                `).join('');
            }

            // Update live stats dynamically
            const statWorkplaces = document.getElementById('stat-workplaces');
            if (statWorkplaces) statWorkplaces.textContent = workplaces.length;

            const techWp = workplaces.find(w => w.slug === 'tech-company');
            const statRoles = document.getElementById('stat-roles');
            if (statRoles && techWp) statRoles.textContent = techWp.roles_count || 12;

            // Pre-load Tech Company in background state
            if (techWp) {
                const techDetail = await API.getWorkplaceDetail('tech-company');
                State.setActiveWorkplace(techDetail);
            }
        } catch (err) {
            console.error('Failed to load workplaces:', err);
            State.notify('Error connecting to backend API.', 'danger');
        }
    },

    getWorkplaceDomainsTag(slug) {
        switch (slug) {
            case 'tech-company':
                return `Software &bull; Cloud &bull; Networking &bull; <span class="cyber-shield-tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Cybersecurity</span>`;
            case 'startup':
                return `Innovation &bull; Growth &bull; Versatility`;
            case 'corporate-office':
                return `Business &bull; Operations &bull; Management`;
            case 'hospital-healthcare':
                return `Healthcare &bull; Patient Care &bull; Support`;
            default:
                return `Professional Team Environment`;
        }
    },

    /**
     * WORKPLACE OVERVIEW ROUTE & CONTROLLER (STEP 6)
     * Dynamically fetches workplace from backend and displays Workplace Overview experience.
     */
    async selectWorkplace(slug) {
        try {
            State.notify(`Loading ${slug.replace('-', ' ')} overview...`, 'info');
            const workplaceDetail = await API.getWorkplaceDetail(slug);
            State.setActiveWorkplace(workplaceDetail);

            // Highlight active workplace card on home
            document.querySelectorAll('.workplace-card').forEach(card => {
                card.classList.toggle('active-workplace', card.getAttribute('data-slug') === slug);
            });

            // Toggle Views: Hide landing, hide simulation, show overview
            const homeLanding = document.getElementById('home-landing-view');
            const overviewView = document.getElementById('workplace-overview-view');
            const simSection = document.getElementById('simulate');

            if (homeLanding) homeLanding.style.display = 'none';
            if (simSection) simSection.style.display = 'none';
            if (overviewView) {
                overviewView.style.display = 'block';

                // Populate Top Bar & Breadcrumb
                const breadcrumbName = document.getElementById('overview-breadcrumb-name');
                if (breadcrumbName) breadcrumbName.textContent = workplaceDetail.name;

                // Populate Category, Title, Subtitle, Description
                const catBadge = document.getElementById('overview-category-text');
                if (catBadge) catBadge.textContent = workplaceDetail.category ? workplaceDetail.category.toUpperCase() : 'YOUR WORKPLACE';

                const titleElem = document.getElementById('overview-title');
                if (titleElem) titleElem.textContent = workplaceDetail.name;

                const subtitleElem = document.getElementById('overview-subtitle');
                if (subtitleElem) {
                    if (slug === 'tech-company') {
                        subtitleElem.textContent = 'Build. Secure. Scale.';
                    } else {
                        subtitleElem.textContent = workplaceDetail.tagline || workplaceDetail.name;
                    }
                }

                const descElem = document.getElementById('overview-desc');
                if (descElem) {
                    if (slug === 'tech-company') {
                        descElem.textContent = 'Explore how software, cloud, networking, cybersecurity and product teams work together to build and operate modern technology products.';
                    } else {
                        descElem.textContent = workplaceDetail.description;
                    }
                }

                // Populate Statistics Cards
                const rolesCount = workplaceDetail.roles ? workplaceDetail.roles.length : 12;
                const scenariosCount = workplaceDetail.scenarios_count || (slug === 'tech-company' ? 9 : 3);
                
                const statRoles = document.getElementById('overview-stat-roles');
                if (statRoles) statRoles.textContent = rolesCount;

                const statScenarios = document.getElementById('overview-stat-scenarios');
                if (statScenarios) statScenarios.textContent = scenariosCount;

                // Render Hero Illustration
                const illustrationContainer = document.getElementById('overview-illustration-container');
                if (illustrationContainer) {
                    illustrationContainer.innerHTML = this.renderOverviewIllustration(slug);
                }

                // Render Domains
                this.renderOverviewDomains(workplaceDetail);

                // Render Security & Resilience Section
                this.renderOverviewSecurity(workplaceDetail);

                // Render Role Exploration 3x4 Grid (Step 7)
                this.renderRoleExploration(workplaceDetail.roles || []);

                // Smooth scroll to top of overview page
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            console.error('Failed to load workplace detail:', err);
            State.notify('Error loading workplace overview.', 'danger');
        }
    },

    /**
     * Returns to the Home Landing View and scrolls to the Workplace Selection grid
     */
    backToWorkplaces() {
        const homeLanding = document.getElementById('home-landing-view');
        const overviewView = document.getElementById('workplace-overview-view');
        const simSection = document.getElementById('simulate');

        if (overviewView) overviewView.style.display = 'none';
        if (simSection) simSection.style.display = 'none';
        if (homeLanding) homeLanding.style.display = 'block';

        const wpSection = document.getElementById('workplaces');
        if (wpSection) {
            wpSection.scrollIntoView({ behavior: 'smooth' });
        }
    },

    /**
     * Switches view to Home Landing Page for any target section (#home, #workplaces, etc.)
     */
    showHomeLanding(targetId = '#home') {
        const homeLanding = document.getElementById('home-landing-view');
        const overviewView = document.getElementById('workplace-overview-view');
        const simSection = document.getElementById('simulate');

        if (overviewView) overviewView.style.display = 'none';
        if (simSection) simSection.style.display = 'none';
        if (homeLanding) homeLanding.style.display = 'block';

        if (targetId && targetId !== '#') {
            const el = document.querySelector(targetId);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
    },

    /**
     * Launches a simulation session directly from Workplace Overview
     */
    async startSimulationFromOverview() {
        await this.startSimulationWithSelectedRole();
    },

    /**
     * Smoothly scrolls to the role exploration 3x4 grid (Step 7)
     */
    exploreRolesFromOverview() {
        const rolesContainer = document.getElementById('overview-roles-exploration-container');
        if (rolesContainer) {
            rolesContainer.scrollIntoView({ behavior: 'smooth' });
        }
    },

    /**
     * Renders educational hero illustration for the workplace overview
     */
    renderOverviewIllustration(slug) {
        if (slug === 'tech-company') {
            return `
                <svg width="380" height="260" viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="225" width="350" height="15" rx="4" fill="#e2e8f0" />
                    <!-- Cloud Server Infrastructure Rack -->
                    <rect x="30" y="55" width="95" height="170" rx="8" fill="#0f172a" />
                    <!-- Server Shelves -->
                    <rect x="40" y="70" width="75" height="22" rx="3" fill="#1e293b" />
                    <circle cx="48" cy="81" r="3" fill="#10b981" />
                    <circle cx="58" cy="81" r="3" fill="#0d9488" />
                    <line x1="68" y1="81" x2="105" y2="81" stroke="#334155" stroke-width="2.5" />

                    <rect x="40" y="100" width="75" height="22" rx="3" fill="#1e293b" />
                    <circle cx="48" cy="111" r="3" fill="#0d9488" />
                    <circle cx="58" cy="111" r="3" fill="#0284c7" />
                    <line x1="68" y1="111" x2="98" y2="111" stroke="#334155" stroke-width="2.5" />

                    <rect x="40" y="130" width="75" height="22" rx="3" fill="#1e293b" />
                    <circle cx="48" cy="141" r="3" fill="#14b8a6" />
                    <circle cx="58" cy="141" r="3" fill="#f59e0b" />
                    <line x1="68" y1="141" x2="105" y2="141" stroke="#334155" stroke-width="2.5" />

                    <rect x="40" y="160" width="75" height="22" rx="3" fill="#1e293b" />
                    <circle cx="48" cy="171" r="3" fill="#10b981" />
                    <circle cx="58" cy="171" r="3" fill="#0d9488" />
                    <line x1="68" y1="171" x2="90" y2="171" stroke="#334155" stroke-width="2.5" />

                    <rect x="40" y="190" width="75" height="22" rx="3" fill="#1e293b" />
                    <circle cx="48" cy="201" r="3" fill="#0284c7" />
                    <circle cx="58" cy="201" r="3" fill="#7c3aed" />
                    <line x1="68" y1="201" x2="105" y2="201" stroke="#334155" stroke-width="2.5" />

                    <!-- Network Pipeline To Development Terminal -->
                    <path d="M125 111 H165 V140 H180" stroke="#0d9488" stroke-width="3" stroke-dasharray="4 3" />
                    <circle cx="165" cy="111" r="4" fill="#0d9488" />
                    <circle cx="180" cy="140" r="4" fill="#0284c7" />

                    <!-- Developer & Product Terminal Screen -->
                    <rect x="180" y="70" width="165" height="115" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
                    <rect x="180" y="70" width="165" height="22" rx="8" fill="#0d9488" />
                    <circle cx="192" cy="81" r="3" fill="#fde047" />
                    <circle cx="202" cy="81" r="3" fill="#6ee7b7" />
                    <text x="214" y="84" font-size="9" font-family="'Outfit', sans-serif" font-weight="700" fill="#ffffff">SYSTEM ARCHITECTURE</text>

                    <!-- Code & Pipeline nodes on terminal -->
                    <line x1="195" y1="106" x2="245" y2="106" stroke="#0284c7" stroke-width="3" stroke-linecap="round" />
                    <line x1="195" y1="118" x2="275" y2="118" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" />
                    <line x1="195" y1="130" x2="225" y2="130" stroke="#cbd5e1" stroke-width="2.5" stroke-linecap="round" />

                    <!-- Security Shield Badge (Top Right Prominence) -->
                    <g transform="translate(290, 30)">
                        <rect x="0" y="0" width="60" height="60" rx="14" fill="#ffffff" stroke="#99f6e4" stroke-width="2" />
                        <path d="M30 14 L16 20 V29 C16 38.5 22 45.5 30 48 C38 45.5 44 38.5 44 29 V20 Z" fill="#0d9488" />
                        <path d="M25 29 L28.5 32.5 L35.5 25.5" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                    </g>

                    <!-- Team Collaboration Avatars (Bottom) -->
                    <circle cx="215" cy="205" r="14" fill="#0d9488" />
                    <circle cx="245" cy="205" r="14" fill="#0284c7" />
                    <circle cx="275" cy="205" r="14" fill="#7c3aed" />
                    <circle cx="305" cy="205" r="14" fill="#059669" />
                    <text x="211" y="209" font-size="10" font-weight="700" fill="#ffffff">PM</text>
                    <text x="239" y="209" font-size="10" font-weight="700" fill="#ffffff">DEV</text>
                    <text x="270" y="209" font-size="10" font-weight="700" fill="#ffffff">SEC</text>
                    <text x="299" y="209" font-size="10" font-weight="700" fill="#ffffff">OPS</text>
                </svg>
            `;
        } else if (slug === 'startup') {
            return `
                <svg width="380" height="260" viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="225" width="350" height="15" rx="4" fill="#e2e8f0" />
                    <!-- Ascending Rocket -->
                    <g transform="translate(60, 30)">
                        <path d="M35 110 C35 125 45 135 45 135 C45 135 55 125 55 110 Z" fill="#f59e0b" />
                        <path d="M45 10 C60 30 70 60 70 95 L20 95 C20 60 30 30 45 10 Z" fill="#7c3aed" />
                        <circle cx="45" cy="50" r="10" fill="#ffffff" />
                        <circle cx="45" cy="50" r="6" fill="#0284c7" />
                        <path d="M20 75 L5 98 L20 95 Z" fill="#0d9488" />
                        <path d="M70 75 L85 98 L70 95 Z" fill="#0d9488" />
                    </g>
                    <!-- Agile Sprint Board -->
                    <rect x="175" y="55" width="165" height="135" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
                    <rect x="175" y="55" width="165" height="24" rx="8" fill="#7c3aed" />
                    <text x="187" y="71" font-size="9" font-family="'Outfit', sans-serif" font-weight="700" fill="#ffffff">AGILE SPRINT &bull; MVP</text>
                    <!-- Sticky Cards -->
                    <rect x="185" y="90" width="40" height="30" rx="4" fill="#fef08a" stroke="#fde047" />
                    <rect x="235" y="90" width="45" height="30" rx="4" fill="#a7f3d0" stroke="#6ee7b7" />
                    <rect x="185" y="130" width="95" height="45" rx="4" fill="#e0f2fe" stroke="#bae6fd" />
                    <polyline points="195 158 215 148 240 152 270 138" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            `;
        } else if (slug === 'corporate-office') {
            return `
                <svg width="380" height="260" viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="225" width="350" height="15" rx="4" fill="#e2e8f0" />
                    <!-- Corporate Towers -->
                    <rect x="45" y="60" width="60" height="165" rx="4" fill="#1e293b" />
                    <rect x="115" y="40" width="75" height="185" rx="4" fill="#0f172a" />
                    <!-- Governance Matrix Card -->
                    <rect x="205" y="55" width="145" height="145" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
                    <rect x="205" y="55" width="145" height="24" rx="8" fill="#0284c7" />
                    <text x="217" y="71" font-size="9" font-family="'Outfit', sans-serif" font-weight="700" fill="#ffffff">CHANGE GOVERNANCE</text>
                    <!-- Org Hierarchy -->
                    <rect x="250" y="90" width="55" height="18" rx="4" fill="#0284c7" />
                    <path d="M277 108 V120 H225 V132 M277 120 H325 V132" stroke="#0284c7" stroke-width="2" />
                    <rect x="210" y="132" width="35" height="16" rx="3" fill="#0ea5e9" />
                    <rect x="260" y="132" width="35" height="16" rx="3" fill="#0ea5e9" />
                    <rect x="310" y="132" width="35" height="16" rx="3" fill="#0ea5e9" />
                </svg>
            `;
        } else if (slug === 'hospital-healthcare') {
            return `
                <svg width="380" height="260" viewBox="0 0 380 260" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="15" y="225" width="350" height="15" rx="4" fill="#e2e8f0" />
                    <!-- Stethoscope -->
                    <path d="M45 60 C45 105 75 135 110 135 C145 135 175 105 175 60" stroke="#0d9488" stroke-width="5" stroke-linecap="round" />
                    <path d="M110 135 V175 C110 190 125 195 140 195 H165" stroke="#0d9488" stroke-width="5" stroke-linecap="round" />
                    <circle cx="178" cy="195" r="14" fill="#0f766e" />
                    <circle cx="178" cy="195" r="7" fill="#99f6e4" />
                    <!-- Clinical Telemetry Tablet -->
                    <rect x="195" y="55" width="155" height="150" rx="8" fill="#ffffff" stroke="#a7f3d0" stroke-width="2" />
                    <rect x="195" y="55" width="155" height="24" rx="8" fill="#059669" />
                    <text x="207" y="71" font-size="9" font-family="'Outfit', sans-serif" font-weight="700" fill="#ffffff">CLINICAL TELEMETRY &bull; EHR</text>
                    <!-- ECG Heartbeat Wave -->
                    <path d="M205 130 H225 L235 105 L248 160 L258 115 L268 140 L275 130 H335" stroke="#059669" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                    <circle cx="248" cy="160" r="4" fill="#059669" />
                </svg>
            `;
        }
        return '';
    },

    /**
     * Renders the 4 domain cards for Tech Company or dynamic domains for other workplaces
     */
    renderOverviewDomains(wp) {
        const grid = document.getElementById('overview-domains-grid');
        const heading = document.getElementById('overview-domains-heading');
        const subheading = document.getElementById('overview-domains-subheading');
        const tag = document.getElementById('overview-domains-tag');

        if (!grid) return;

        if (wp.slug === 'tech-company') {
            if (heading) heading.textContent = 'EXPLORE THE TECH COMPANY';
            if (subheading) subheading.textContent = 'Discover the four key operational domains driving modern software organizations.';
            if (tag) tag.textContent = 'ORGANIZATIONAL DOMAINS';

            grid.innerHTML = `
                <!-- 1. SOFTWARE DEVELOPMENT -->
                <div class="domain-card">
                    <div>
                        <div class="domain-icon-box">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        </div>
                        <h3>Software Development</h3>
                        <div class="domain-roles-pills">
                            <span class="domain-role-pill">Frontend Developer</span>
                            <span class="domain-role-pill">Backend Developer</span>
                            <span class="domain-role-pill">QA / Test Engineer</span>
                        </div>
                    </div>
                    <p class="domain-desc">Responsible for scalable system architecture, core application logic, API integrations, and continuous test coverage.</p>
                </div>

                <!-- 2. CLOUD & INFRASTRUCTURE -->
                <div class="domain-card">
                    <div>
                        <div class="domain-icon-box" style="background-color: #e0f2fe; color: #0284c7;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                        </div>
                        <h3>Cloud &amp; Infrastructure</h3>
                        <div class="domain-roles-pills">
                            <span class="domain-role-pill">DevOps / Cloud</span>
                            <span class="domain-role-pill">Network Engineer</span>
                        </div>
                    </div>
                    <p class="domain-desc">Maintains high-availability cloud environments, automated CI/CD build pipelines, low-latency network routes, and zero-downtime releases.</p>
                </div>

                <!-- 3. CYBERSECURITY -->
                <div class="domain-card" style="border-color: #99f6e4;">
                    <div>
                        <div class="domain-icon-box" style="background-color: var(--color-bg-soft-teal); color: var(--color-primary);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        </div>
                        <h3>Cybersecurity</h3>
                        <div class="domain-roles-pills">
                            <span class="domain-role-pill" style="border-color: var(--color-primary-border); color: var(--color-primary);">Cybersecurity Eng.</span>
                            <span class="domain-role-pill">SOC Analyst</span>
                            <span class="domain-role-pill">Security Analyst</span>
                        </div>
                    </div>
                    <p class="domain-desc">Protects digital assets, monitors active threats, investigates SIEM alerts, enforces least privilege, and ensures regulatory compliance.</p>
                </div>

                <!-- 4. PRODUCT & DESIGN -->
                <div class="domain-card">
                    <div>
                        <div class="domain-icon-box" style="background-color: #ede9fe; color: #7c3aed;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path><path d="M15 9h6"></path></svg>
                        </div>
                        <h3>Product &amp; Design</h3>
                        <div class="domain-roles-pills">
                            <span class="domain-role-pill">Product Manager</span>
                            <span class="domain-role-pill">UX / UI Designer</span>
                        </div>
                    </div>
                    <p class="domain-desc">Defines roadmap priorities, analyzes user journeys, designs intuitive user interfaces, and balances feature scope with delivery constraints.</p>
                </div>
            `;
        } else {
            // Dynamic domains for Startup, Corporate Office, Hospital
            if (heading) heading.textContent = `EXPLORE ${wp.name.toUpperCase()}`;
            if (subheading) subheading.textContent = `Discover how teams and disciplines operate inside ${wp.name}.`;
            if (tag) tag.textContent = `${wp.category ? wp.category.toUpperCase() : 'DOMAINS'}`;

            // Group roles into categories
            const rolesByCategory = {};
            (wp.roles || []).forEach(r => {
                const cat = r.category || 'Core Team';
                if (!rolesByCategory[cat]) rolesByCategory[cat] = [];
                rolesByCategory[cat].push(r);
            });

            grid.innerHTML = Object.entries(rolesByCategory).map(([cat, rolesList]) => `
                <div class="domain-card">
                    <div>
                        <div class="domain-icon-box">
                            ${this.getWorkplaceIconSvg(wp.icon || 'terminal')}
                        </div>
                        <h3>${cat}</h3>
                        <div class="domain-roles-pills">
                            ${rolesList.map(r => `<span class="domain-role-pill">${r.name}</span>`).join('')}
                        </div>
                    </div>
                    <p class="domain-desc">${rolesList[0].tagline || (rolesList[0].description ? rolesList[0].description.substring(0, 100) + '...' : 'Key functional pillar within this organization.')}</p>
                </div>
            `).join('');
        }
    },

    /**
     * Renders the SECURITY & RESILIENCE section highlighting the 5 security roles
     */
    renderOverviewSecurity(wp) {
        const securitySection = document.getElementById('overview-security-section');
        const rolesGrid = document.getElementById('security-roles-grid');
        if (!securitySection || !rolesGrid) return;

        if (wp.slug === 'tech-company') {
            securitySection.style.display = 'block';
            rolesGrid.innerHTML = `
                <!-- 1. Cybersecurity Engineer -->
                <div class="security-role-card">
                    <div class="security-role-icon">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h4 class="security-role-title">Cybersecurity Engineer</h4>
                    <p class="security-role-desc">Architects secure application boundaries, patches vulnerabilities, and configures defense-in-depth firewalls.</p>
                </div>

                <!-- 2. SOC Analyst -->
                <div class="security-role-card">
                    <div class="security-role-icon" style="background-color: #ecfdf5; color: #059669;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
                    </div>
                    <h4 class="security-role-title">SOC Analyst</h4>
                    <p class="security-role-desc">Performs 24/7 SIEM alert triage, analyzes suspicious payloads, and neutralizes live intrusion vectors.</p>
                </div>

                <!-- 3. Security Analyst -->
                <div class="security-role-card">
                    <div class="security-role-icon" style="background-color: #eff6ff; color: #0284c7;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                    <h4 class="security-role-title">Security Analyst</h4>
                    <p class="security-role-desc">Maintains GRC compliance (SOC 2, ISO 27001), conducts risk audits, and verifies third-party vendor safety.</p>
                </div>

                <!-- 4. Network Engineer -->
                <div class="security-role-card">
                    <div class="security-role-icon" style="background-color: #f5f3ff; color: #7c3aed;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="2" width="6" height="6" rx="1"></rect><rect x="16" y="2" width="6" height="6" rx="1"></rect><rect x="9" y="16" width="6" height="6" rx="1"></rect><path d="M5 8v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"></path><line x1="12" y1="12" x2="12" y2="16"></line></svg>
                    </div>
                    <h4 class="security-role-title">Network Engineer</h4>
                    <p class="security-role-desc">Secures VPC subnets, segments traffic, provisions encrypted VPN tunnels, and optimizes routing paths.</p>
                </div>

                <!-- 5. DevOps / Cloud Engineer -->
                <div class="security-role-card">
                    <div class="security-role-icon" style="background-color: #fff7ed; color: #ea580c;">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>
                    </div>
                    <h4 class="security-role-title">DevOps / Cloud</h4>
                    <p class="security-role-desc">Automates cloud infrastructure as code (IaC), hardens container images, and enforces zero-trust IAM roles.</p>
                </div>
            `;
        } else {
            // For other workplaces, show their unique resilience and collaboration focus
            securitySection.style.display = 'block';
            const bannerHeader = securitySection.querySelector('.security-banner-header');
            if (bannerHeader) {
                const title = bannerHeader.querySelector('h2');
                const quote = bannerHeader.querySelector('.security-quote');
                const intro = bannerHeader.querySelector('.security-intro-text');
                const badge = bannerHeader.querySelector('.security-badge-pill');

                if (badge) badge.textContent = 'CORE DISCIPLINES';
                if (title) title.textContent = `OPERATIONAL EXCELLENCE & RESILIENCE`;
                if (quote) quote.innerHTML = `&ldquo;High-performing teams rely on clear delegation, mutual accountability, and shared ownership.&rdquo;`;
                if (intro) intro.textContent = `Explore how roles in ${wp.name} coordinate across complex incidents, compliance obligations, and time-critical operational escalations.`;
            }

            rolesGrid.innerHTML = (wp.roles || []).map(r => `
                <div class="security-role-card">
                    <div class="security-role-icon">
                        ${this.getRoleIconSvg(r.slug || r.name)}
                    </div>
                    <h4 class="security-role-title">${r.name}</h4>
                    <p class="security-role-desc">${r.tagline || (r.description ? r.description.substring(0, 85) + '...' : 'Key operational stakeholder.')}</p>
                </div>
            `).join('');
        }
    },

    /**
     * STEP 7: TECH COMPANY ROLE EXPLORATION AND 3x4 ROLE GRID
     * Dynamically renders exactly 12 roles in a unified 3 rows x 4 columns grid on desktop.
     * Guaranteed ordering, student-friendly descriptions, security accents, and interactive modal.
     */
    renderRoleExploration(roles) {
        const grid = document.getElementById('tech-roles-container');
        const headerLabel = document.getElementById('role-exploration-label');
        const headerTitle = document.getElementById('role-exploration-title');
        const headerDesc = document.getElementById('role-exploration-desc');
        const headerStats = document.getElementById('role-exploration-stats');

        const wp = State.activeWorkplace;
        const isTechCompany = !wp || wp.slug === 'tech-company';

        if (headerLabel) {
            headerLabel.textContent = isTechCompany ? 'TECH COMPANY' : (wp.name ? wp.name.toUpperCase() : 'ROLES DIRECTORY');
        }
        if (headerTitle) {
            headerTitle.textContent = 'Meet the Team';
        }
        if (headerDesc) {
            headerDesc.textContent = isTechCompany
                ? 'Explore the people behind a modern technology organization and discover what each role contributes.'
                : `Explore the team members behind ${wp.name} and understand their key responsibilities.`;
        }
        if (headerStats) {
            headerStats.textContent = `${roles.length} Professional Roles`;
        }

        if (!grid) return;

        if (!roles || roles.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: #ffffff; border-radius: 20px; border: 1px solid var(--color-border-light);">
                    <p style="color: var(--color-text-secondary); font-size: 1rem; margin-bottom: 16px;">Unable to load roles right now. Please try again.</p>
                    <button class="btn btn-primary btn-sm" onclick="App.selectWorkplace('${wp ? wp.slug : 'tech-company'}')">Retry</button>
                </div>
            `;
            return;
        }

        // Canonical 12 Tech Company role ordering (3 rows x 4 columns desktop grid)
        // ROW 1: Product Manager, UX / UI Designer, Frontend Developer, Backend Developer
        // ROW 2: QA / Test Engineer, DevOps / Cloud Engineer, Network Engineer, Cybersecurity Engineer
        // ROW 3: SOC Analyst, Security Analyst, Engineering Manager, Customer Support / IT
        const TECH_ROLE_ORDER = [
            'product-manager',
            'ux-ui-designer',
            'frontend-developer',
            'backend-developer',
            'qa-test-engineer',
            'devops-cloud-engineer',
            'network-engineer',
            'cybersecurity-engineer',
            'soc-analyst',
            'security-analyst',
            'engineering-manager',
            'customer-support-it'
        ];

        let sortedRoles = [...roles];
        if (isTechCompany) {
            sortedRoles.sort((a, b) => {
                const idxA = TECH_ROLE_ORDER.indexOf(a.slug);
                const idxB = TECH_ROLE_ORDER.indexOf(b.slug);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                return (a.order || 0) - (b.order || 0);
            });
        }

        // Verify exactly 12 roles rendered
        if (isTechCompany && sortedRoles.length !== 12) {
            console.warn(`[Task Compass Step 7] Expected 12 Tech Company roles, found ${sortedRoles.length}`);
        }

        grid.innerHTML = sortedRoles.map((role, idx) => {
            const isSelected = State.activeRole && State.activeRole.id === role.id;
            const description = this.getStudentFriendlyDescription(role);
            const isSecurity = ['cybersecurity-engineer', 'soc-analyst', 'security-analyst'].includes(role.slug);
            const isCoreTech = ['network-engineer', 'devops-cloud-engineer'].includes(role.slug);
            const catClass = this.getCategoryClass(role.category);
            const altText = this.getRoleSemanticAltText(role);
            const roleIconSvg = this.getRoleIconSvg(role.slug);

            return `
                <div class="role-card ${isSelected ? 'selected-role' : ''}"
                     id="role-card-${role.id}"
                     data-role-id="${role.id}"
                     data-role-key="${role.slug}"
                     data-role-slug="${role.slug}"
                     data-role-name="${role.name}"
                     data-role-category="${role.category || 'Specialist'}"
                     data-is-cybersecurity="${role.is_cybersecurity ? 'true' : 'false'}"
                     draggable="true"
                     tabindex="0"
                     role="button"
                     aria-label="Explore ${role.name} role in ${role.category || 'Technology'}"
                     onclick="App.selectAndExploreRole(${role.id})"
                     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); App.selectAndExploreRole(${role.id});}">
                    
                    <!-- Top 16:9 Realistic Workplace Photograph -->
                    <div class="role-card-photo-wrapper">
                        <img src="/static/images/roles/${role.slug}.jpg"
                             alt="${altText}"
                             width="400"
                             height="225"
                             loading="lazy"
                             onerror="this.onerror=null; this.src='/static/images/roles/${role.slug}.svg';">
                        
                        <!-- Floating Badges Over Photo (Order & Category/Discipline) -->
                        <div class="role-photo-badges">
                            <span class="role-card-order-tag">#${idx + 1}</span>
                            ${isSecurity ? `
                                <span class="role-security-badge" title="Cybersecurity Core Discipline">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    SECURITY
                                </span>
                            ` : ''}
                            ${isCoreTech ? `
                                <span class="role-security-badge" style="background-color: #e0f2fe; border-color: #bae6fd; color: #0369a1;" title="Core Infrastructure Discipline">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="2" y="2" width="6" height="6" rx="1"></rect><rect x="16" y="2" width="6" height="6" rx="1"></rect><rect x="9" y="16" width="6" height="6" rx="1"></rect><path d="M5 8v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"></path><line x1="12" y1="12" x2="12" y2="16"></line></svg>
                                    CORE TECH
                                </span>
                            ` : ''}
                        </div>

                        <!-- Selection Indicator Checkmark Floating on Photo -->
                        <div class="role-check-indicator" aria-hidden="true">&#10003;</div>

                        <!-- Floating Role Icon Badge -->
                        <div class="role-card-avatar-icon" aria-hidden="true">
                            ${roleIconSvg}
                        </div>
                    </div>

                    <!-- Role Card Content Body -->
                    <div class="role-card-body">
                        <!-- Role Name -->
                        <h3 class="role-card-name">${role.name}</h3>

                        <!-- Department / Category Pill -->
                        <div style="margin-bottom: 8px;">
                            <span class="role-card-category-pill ${catClass}">${role.category || 'Specialist'}</span>
                        </div>

                        <!-- Short Role Description (Student-Friendly) -->
                        <p class="role-card-desc">${description}</p>

                        <!-- Explore Role Interaction Button -->
                        <div class="role-card-explore">
                            <span>Explore Role</span>
                            <span class="explore-arrow">&rarr;</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach HTML5 Drag-and-Drop preparation listeners
        grid.querySelectorAll('.role-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                const roleId = card.getAttribute('data-role-id');
                const roleSlug = card.getAttribute('data-role-slug');
                const roleName = card.getAttribute('data-role-name');
                const roleCat = card.getAttribute('data-role-category');
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    id: parseInt(roleId),
                    slug: roleSlug,
                    name: roleName,
                    category: roleCat
                }));
                e.dataTransfer.effectAllowed = 'copyMove';
                card.classList.add('dragging-role');
            });
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging-role');
            });
        });
    },

    /**
     * Maps each role to a student-friendly description per Step 7 specification
     */
    getStudentFriendlyDescription(role) {
        const slug = (role.slug || '').toLowerCase();
        const TECH_ROLE_DESCRIPTIONS = {
            'product-manager': 'Defines product goals and coordinates what the team should build.',
            'ux-ui-designer': 'Designs intuitive interfaces and experiences for users.',
            'frontend-developer': 'Builds the interfaces users interact with.',
            'backend-developer': 'Builds the server-side systems, APIs and application logic.',
            'qa-test-engineer': 'Tests software to find problems and ensure quality.',
            'devops-cloud-engineer': 'Manages cloud infrastructure, deployment and reliable delivery.',
            'network-engineer': 'Designs and maintains the systems that connect technology together.',
            'cybersecurity-engineer': 'Protects applications, systems and infrastructure from security threats.',
            'soc-analyst': 'Monitors security events and investigates suspicious activity.',
            'security-analyst': 'Analyzes risks, vulnerabilities and security requirements.',
            'engineering-manager': 'Coordinates engineering teams and helps deliver technical work.',
            'customer-support-it': 'Helps users solve technical problems and keeps support operations moving.'
        };

        if (TECH_ROLE_DESCRIPTIONS[slug]) {
            return TECH_ROLE_DESCRIPTIONS[slug];
        }

        return role.tagline || (role.description ? (role.description.length > 80 ? role.description.substring(0, 80) + '...' : role.description) : 'Contributes core domain capabilities to team goals.');
    },

    getUsuallyOwnsSummary(role) {
        const slug = (role.slug || '').toLowerCase();
        const OWNS_SUMMARY = {
            'product-manager': 'Product strategy, roadmap prioritization, feature backlogs, and stakeholder alignment.',
            'ux-ui-designer': 'User experience wireframes, design system components, accessibility, and user research.',
            'frontend-developer': 'Client-side application views, responsive design rendering, state management, and user interaction.',
            'backend-developer': 'Server application logic, RESTful API endpoints, database schemas, and data persistence.',
            'qa-test-engineer': 'Test suite automation, regression testing, bug identification, and release quality verification.',
            'devops-cloud-engineer': 'CI/CD deployment pipelines, cloud infrastructure provisioning, container platforms, and observability.',
            'network-engineer': 'VPC network topology, subnet routing, firewall enforcement, and network connectivity.',
            'cybersecurity-engineer': 'Security vulnerabilities, threat defense architecture, SAST/DAST reviews, and security engineering.',
            'soc-analyst': '24/7 SIEM telemetry monitoring, suspicious anomaly triage, threat neutralization, and alert investigation.',
            'security-analyst': 'Security compliance audits (SOC 2, ISO 27001), third-party risk assessments, and security governance.',
            'engineering-manager': 'Sprint delivery coordination, engineering team unblocking, post-incident reviews, and technical leadership.',
            'customer-support-it': 'Front-line customer technical assistance, employee IT onboarding, and user issue escalation.'
        };

        return OWNS_SUMMARY[slug] || (role.tagline || 'Primary domain tasks and deliverables.');
    },

    /**
     * Returns rich, semantic alt text for realistic role photographs per Step 7A
     */
    getRoleSemanticAltText(role) {
        const slug = (role.slug || '').toLowerCase();
        const ROLE_ALT_TEXTS = {
            'product-manager': 'Product Manager leading strategy and product roadmap planning in a modern office',
            'ux-ui-designer': 'UX UI Designer creating wireframes and interactive interface designs on screen',
            'frontend-developer': 'Frontend Developer coding responsive web application interfaces and user experiences',
            'backend-developer': 'Backend Developer designing scalable server APIs, microservices, and databases',
            'qa-test-engineer': 'QA Test Engineer executing automated testing suites and software quality verification',
            'devops-cloud-engineer': 'DevOps Cloud Engineer managing cloud infrastructure, Kubernetes, and CI/CD pipelines',
            'network-engineer': 'Network Engineer configuring network topology, switches, and enterprise routers',
            'cybersecurity-engineer': 'Cybersecurity Engineer auditing infrastructure and hardening defensive security controls',
            'soc-analyst': 'SOC Analyst monitoring security operations center incident feeds and alert telemetry',
            'security-analyst': 'Security Analyst conducting risk assessments and enterprise security compliance audits',
            'engineering-manager': 'Engineering Manager coordinating sprint execution and cross-functional team delivery',
            'customer-support-it': 'Customer Support and IT Specialist troubleshooting technical incidents and user requests'
        };

        return ROLE_ALT_TEXTS[slug] || `${role.name} professional working in a modern technology organization`;
    },

    /**
     * Handles role card click / selection and launches the role detail modal
     */
    selectAndExploreRole(roleId) {
        const roles = State.activeWorkplace ? (State.activeWorkplace.roles || []) : [];
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        State.setActiveRole(role);

        // Highlight selected role card in grid
        document.querySelectorAll('.tech-roles-grid-3x4 .role-card').forEach(c => {
            const match = parseInt(c.getAttribute('data-role-id')) === role.id;
            c.classList.toggle('selected-role', match);
        });

        // Update profile bar feedback
        const feedbackElem = document.getElementById('role-selected-feedback');
        if (feedbackElem) {
            feedbackElem.innerHTML = `<span style="color: var(--color-primary); font-weight: 700;">Selected:</span> ${role.name} (${role.category || 'Core Team'})`;
        }

        // Open Detail Modal
        this.openRoleDetailModal(role);
    },

    /**
     * Opens the Role Detail Modal / Panel
     */
    openRoleDetailModal(role) {
        const modal = document.getElementById('role-detail-modal');
        const content = document.getElementById('role-modal-content');
        if (!modal || !content) return;

        const isSecurity = ['cybersecurity-engineer', 'soc-analyst', 'security-analyst'].includes(role.slug);
        const description = this.getStudentFriendlyDescription(role);
        const ownsSummary = this.getUsuallyOwnsSummary(role);
        const catClass = this.getCategoryClass(role.category);
        const altText = this.getRoleSemanticAltText(role);
        const roleIconSvg = this.getRoleIconSvg(role.slug);

        // Responsibilities
        const responsibilities = Array.isArray(role.responsibilities) && role.responsibilities.length > 0
            ? role.responsibilities
            : [ownsSummary];

        // Key collaborators / supporting roles
        const collaborators = Array.isArray(role.key_collaborators) && role.key_collaborators.length > 0
            ? role.key_collaborators
            : ['Engineering Manager', 'Frontend Developer', 'Backend Developer'];

        content.innerHTML = `
            <div class="role-modal-header">
                <!-- 16:9 Realistic Workplace Photograph in Modal Header -->
                <div class="role-modal-photo-wrapper">
                    <img src="/static/images/roles/${role.slug}.jpg"
                         alt="${altText}"
                         width="640"
                         height="360"
                         onerror="this.onerror=null; this.src='/static/images/roles/${role.slug}.svg';">
                    <div class="role-modal-avatar-icon" aria-hidden="true">
                        ${roleIconSvg}
                    </div>
                </div>

                <div class="role-modal-header-info">
                    <div class="role-modal-meta-row">
                        <span class="role-card-category-pill ${catClass}">${role.category || 'Specialist'}</span>
                        ${isSecurity ? `
                            <span class="role-security-badge">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                SECURITY
                            </span>
                        ` : ''}
                    </div>

                    <h3 class="role-modal-title" id="modal-role-name">${role.name.toUpperCase()}</h3>
                    <p class="role-modal-desc">${description}</p>
                </div>
            </div>

            <div class="role-modal-content-body">
                <!-- What this role usually owns -->
                <div class="role-modal-section">
                    <div class="role-modal-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        Usually owns
                    </div>
                    <p style="font-size: 0.88rem; color: #1e293b; font-weight: 600; margin-bottom: 8px;">${ownsSummary}</p>
                    <ul class="role-modal-owns-list">
                        ${responsibilities.map(resp => `<li>${resp}</li>`).join('')}
                    </ul>
                </div>

                <!-- Typical supporting roles (Works with) -->
                <div class="role-modal-section">
                    <div class="role-modal-section-title">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        Works with
                    </div>
                    <div class="role-modal-collaborators">
                        ${collaborators.map(collab => `<span class="role-modal-collab-pill">${collab}</span>`).join('')}
                    </div>
                </div>

                <!-- Modal Actions -->
                <div class="role-modal-footer-actions">
                    <button class="btn btn-secondary" onclick="App.closeRoleDetailModal()">
                        Close
                    </button>
                    <button class="btn btn-primary" onclick="App.startSimulationWithSelectedRole(${JSON.stringify(role).replace(/"/g, '&quot;')})">
                        Start Simulation as ${role.name} &rarr;
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    /**
     * Closes the Role Detail Modal
     */
    closeRoleDetailModal() {
        const modal = document.getElementById('role-detail-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    /**
     * Starts simulation using the selected role and existing session system
     */
    async startSimulationWithSelectedRole(roleOverride = null) {
        if (!State.activeWorkplace) {
            State.notify('Please select a workplace first.', 'warning');
            return;
        }

        const studentNameInput = document.getElementById('input-student-name');
        const studentName = studentNameInput && studentNameInput.value.trim() ? studentNameInput.value.trim() : State.studentName || 'Student Learner';
        State.setStudentName(studentName);

        const roles = State.activeWorkplace.roles || [];
        const targetRole = roleOverride || State.activeRole || roles.find(r => r.slug === 'cybersecurity-engineer') || roles[0];
        if (!targetRole) {
            State.notify('Unable to start simulation without a role.', 'danger');
            return;
        }
        State.setActiveRole(targetRole);

        this.closeRoleDetailModal();

        // Reuse existing session if it matches the active workplace and role
        const sessionWpId = State.session?.workplace?.id || State.session?.workplace_id;
        const sessionRoleId = State.session?.selected_role?.id || State.session?.selected_role_id;
        if (State.session && !State.session.completed && sessionWpId === State.activeWorkplace.id && sessionRoleId === targetRole.id) {
            State.notify(`Resuming simulation as ${targetRole.name}...`, 'info');
            this.openSimulationViewport(targetRole);
            return;
        }


        State.notify(`Initializing simulation session for ${targetRole.name}...`, 'info');

        try {
            const sessionData = await API.createSession(studentName, State.activeWorkplace.id, targetRole.id);
            State.setSession(sessionData);
            this.openSimulationViewport(targetRole);
        } catch (err) {
            console.error('Failed to create simulation session:', err);
            State.notify('Error starting simulation. Please try again.', 'danger');
        }
    },

    openSimulationViewport(role) {
        const homeLanding = document.getElementById('home-landing-view');
        const overviewView = document.getElementById('workplace-overview-view');
        const simSection = document.getElementById('simulate');

        if (homeLanding) homeLanding.style.display = 'none';
        if (overviewView) overviewView.style.display = 'none';
        if (simSection) {
            simSection.style.display = 'block';

            const wpBadge = document.getElementById('sim-active-workplace-badge');
            const roleBadge = document.getElementById('sim-active-role-badge');
            if (wpBadge) wpBadge.textContent = State.activeWorkplace.name;
            if (roleBadge) roleBadge.textContent = role.name;

            State.resetStageData();
            this.goToStage(1);
            simSection.scrollIntoView({ behavior: 'smooth' });
        }
    },

    getCategoryClass(category) {
        if (!category) return '';
        const c = category.toLowerCase();
        if (c.includes('product')) return 'cat-product';
        if (c.includes('design')) return 'cat-design';
        if (c.includes('engineering') || c.includes('fullstack')) return 'cat-engineering';
        if (c.includes('quality')) return 'cat-quality';
        if (c.includes('infrastructure')) return 'cat-infrastructure';
        if (c.includes('security') || c.includes('infosec') || c.includes('secops')) return 'cat-security';
        if (c.includes('leadership') || c.includes('management') || c.includes('clinical')) return 'cat-leadership';
        if (c.includes('operations') || c.includes('it') || c.includes('support')) return 'cat-operations';
        return '';
    },

    async launchSimulationWithRole(role) {
        await this.startSimulationWithSelectedRole(role);
    },

    async goToStage(stageNumber) {
        this.updateProgressTracker(stageNumber);
        const container = document.getElementById('stage-active-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--color-text-secondary);">
                <div style="width: 32px; height: 32px; border: 3px solid var(--color-primary-light); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px auto;"></div>
                <p>Loading Stage ${stageNumber} Scenarios...</p>
            </div>
        `;

        try {
            const stageData = await API.getStageScenarios(State.session.id, stageNumber);
            State.scenarios = stageData.scenarios || [];

            if (stageNumber === 1) {
                await Stage1.render(container, State.scenarios);
            } else if (stageNumber === 2) {
                await Stage2.render(container, State.scenarios);
            } else if (stageNumber === 3) {
                await Stage3.render(container, State.scenarios);
            }
        } catch (err) {
            console.error(`Failed to load stage ${stageNumber}:`, err);
            container.innerHTML = `
                <div class="scenario-card" style="text-align: center; padding: 40px;">
                    <h4 style="color: var(--color-danger); margin-bottom: 8px;">Error loading Stage ${stageNumber}</h4>
                    <p style="color: var(--color-text-secondary); margin-bottom: 16px;">We could not fetch the scenario data from the backend.</p>
                    <button class="btn btn-primary btn-sm" onclick="App.goToStage(${stageNumber})">Retry</button>
                </div>
            `;
        }
    },

    async goToResults() {
        this.updateProgressTracker(4);
        const container = document.getElementById('stage-active-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: var(--color-text-secondary);">
                <div style="width: 32px; height: 32px; border: 3px solid var(--color-primary-light); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px auto;"></div>
                <p>Computing Learning Analytics & Scorecard...</p>
            </div>
        `;

        try {
            const resultsData = await API.getResults(State.session.id);
            await Results.render(container, resultsData);
        } catch (err) {
            console.error('Failed to load results:', err);
            container.innerHTML = `
                <div class="scenario-card" style="text-align: center;">
                    <h4>Error loading results</h4>
                    <button class="btn btn-primary" onclick="App.goToResults()">Retry</button>
                </div>
            `;
        }
    },

    updateProgressTracker(stageNum) {
        const s1 = document.getElementById('tracker-step-1');
        const s2 = document.getElementById('tracker-step-2');
        const s3 = document.getElementById('tracker-step-3');
        const sRes = document.getElementById('tracker-step-results');

        const nodes = [s1, s2, s3, sRes];
        nodes.forEach((n, idx) => {
            if (!n) return;
            n.classList.remove('active-step', 'completed-step');
            const circle = n.querySelector('.step-circle');
            if (idx + 1 === stageNum) {
                n.classList.add('active-step');
                if (circle) circle.textContent = (idx + 1 === 4) ? '\u2713' : (idx + 1);
            } else if (idx + 1 < stageNum) {
                n.classList.add('completed-step');
                if (circle) circle.innerHTML = '&#10003;';
            } else {
                if (circle) circle.textContent = (idx + 1 === 4) ? '\u2713' : (idx + 1);
            }
        });
    },

    backToHome() {
        const simView = document.getElementById('simulate');
        if (simView) simView.style.display = 'none';
        const homeView = document.getElementById('home-landing-view');
        if (homeView) homeView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    exploreWorkplaces() {
        const simView = document.getElementById('simulate');
        if (simView) simView.style.display = 'none';
        const homeView = document.getElementById('home-landing-view');
        if (homeView) homeView.style.display = 'block';
        const section = document.getElementById('workplaces');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    },

    async tryAgain() {
        try {
            State.notify('Starting a fresh simulation session...', 'info');
            const wpId = State.activeWorkplace?.id || (State.session?.workplace?.id || 1);
            const roleId = State.activeRole?.id || (State.session?.selected_role?.id || 8);
            const studentName = State.studentName || 'Student Learner';

            // Create a brand new session in database, preserving old session
            const newSession = await API.createSession(studentName, wpId, roleId);
            State.setSession(newSession);
            State.resetStageData();

            const simView = document.getElementById('simulate');
            if (simView) simView.style.display = 'block';
            const homeView = document.getElementById('home-landing-view');
            if (homeView) homeView.style.display = 'none';

            await this.goToStage(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            State.notify('New simulation session started! Stage 1: Who Owns This?', 'success');
        } catch (err) {
            console.error('Failed to start a new simulation session:', err);
            State.notify('Could not start a new session. Please try again.', 'danger');
        }
    },


    filterContent(query) {
        const q = query.toLowerCase();
        document.querySelectorAll('#roles-grid-container .role-card').forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(q) ? 'flex' : 'none';
        });
    },

    // ----------------------------------------------------------------------
    // Professional Educational SVG Icons for the 12 Roles and Workplaces
    // ----------------------------------------------------------------------
    getRoleIconSvg(identifier) {
        const id = (identifier || '').toLowerCase();
        
        // 1. Product Manager
        if (id.includes('product-manager') || id.includes('product')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`;
        }
        // 2. UX / UI Designer
        if (id.includes('ux') || id.includes('ui') || id.includes('designer')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
        }
        // 3. Frontend Developer
        if (id.includes('frontend')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`;
        }
        // 4. Backend Developer
        if (id.includes('backend')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;
        }
        // 5. QA / Test Engineer
        if (id.includes('qa') || id.includes('test')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        }
        // 6. DevOps / Cloud Engineer
        if (id.includes('devops') || id.includes('cloud')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>`;
        }
        // 7. Network Engineer
        if (id.includes('network')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="6" height="6" rx="1"></rect><rect x="16" y="2" width="6" height="6" rx="1"></rect><rect x="9" y="16" width="6" height="6" rx="1"></rect><path d="M5 8v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"></path><line x1="12" y1="12" x2="12" y2="16"></line></svg>`;
        }
        // 8. Cybersecurity Engineer
        if (id.includes('cybersecurity') || id.includes('infosec')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="11" r="2"></circle><line x1="12" y1="13" x2="12" y2="16"></line></svg>`;
        }
        // 9. SOC Analyst
        if (id.includes('soc')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>`;
        }
        // 10. Security Analyst
        if (id.includes('security-analyst') || id.includes('grc')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
        }
        // 11. Engineering Manager
        if (id.includes('engineering-manager') || id.includes('manager') || id.includes('lead')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
        }
        // 12. Customer Support / IT
        if (id.includes('support') || id.includes('it')) {
            return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>`;
        }

        // Generic fallback icon
        return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`;
    },

    getWorkplaceIllustrationSvg(slug) {
        switch (slug) {
            case 'tech-company':
                return `
                    <svg width="180" height="74" viewBox="0 0 180 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Server / Cloud Unit -->
                        <rect x="18" y="16" width="56" height="42" rx="6" fill="#0f172a" />
                        <rect x="24" y="23" width="44" height="7" rx="2" fill="#1e293b" />
                        <circle cx="29" cy="26.5" r="1.5" fill="#10b981" />
                        <circle cx="35" cy="26.5" r="1.5" fill="#0d9488" />
                        <line x1="43" y1="26.5" x2="62" y2="26.5" stroke="#334155" stroke-width="2" />
                        
                        <rect x="24" y="33" width="44" height="7" rx="2" fill="#1e293b" />
                        <circle cx="29" cy="36.5" r="1.5" fill="#0d9488" />
                        <circle cx="35" cy="36.5" r="1.5" fill="#0284c7" />
                        <line x1="43" y1="36.5" x2="58" y2="36.5" stroke="#334155" stroke-width="2" />
                        
                        <rect x="24" y="43" width="44" height="7" rx="2" fill="#1e293b" />
                        <circle cx="29" cy="46.5" r="1.5" fill="#14b8a6" />
                        <circle cx="35" cy="46.5" r="1.5" fill="#f59e0b" />
                        <line x1="43" y1="46.5" x2="54" y2="46.5" stroke="#334155" stroke-width="2" />

                        <!-- Connecting Network Pipeline -->
                        <path d="M74 37 H96" stroke="#0d9488" stroke-width="2" stroke-dasharray="3 3" />
                        <circle cx="96" cy="37" r="3.5" fill="#0d9488" />
                        
                        <!-- Cloud & Code Container -->
                        <rect x="96" y="14" width="66" height="46" rx="8" fill="#f0fdfa" stroke="#99f6e4" stroke-width="1.5" />
                        <!-- Code brackets inside -->
                        <path d="M115 28 L109 37 L115 46" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <path d="M143 28 L149 37 L143 46" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <line x1="132" y1="26" x2="126" y2="48" stroke="#14b8a6" stroke-width="1.8" stroke-linecap="round" />
                        
                        <!-- Subtle Cybersecurity Shield Emblem Right Top -->
                        <g transform="translate(144, 6)">
                            <path d="M12 2L2 6v6c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V6l-10-4z" fill="#0d9488" />
                            <path d="M8.5 11.5l2.5 2.5 4.5-4.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </g>
                    </svg>
                `;
            case 'startup':
                return `
                    <svg width="180" height="74" viewBox="0 0 180 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Dynamic Ascending Rocket -->
                        <g transform="translate(30, 8)">
                            <path d="M18 46 C18 54 22 60 22 60 C22 60 26 54 26 46 Z" fill="#f59e0b" opacity="0.9" />
                            <path d="M20 46 C20 52 22 56 22 56 C22 56 24 52 24 46 Z" fill="#ef4444" />
                            <path d="M22 6 C28 14 32 26 32 38 L12 38 C12 26 16 14 22 6 Z" fill="#7c3aed" />
                            <circle cx="22" cy="22" r="4.5" fill="#ffffff" />
                            <circle cx="22" cy="22" r="2.5" fill="#0284c7" />
                            <path d="M12 30 L4 40 L12 38 Z" fill="#0d9488" />
                            <path d="M32 30 L40 40 L32 38 Z" fill="#0d9488" />
                        </g>
                        
                        <!-- Trajectory Arc -->
                        <path d="M68 54 C88 54 98 40 108 24" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="3 3" />
                        <circle cx="108" cy="24" r="3" fill="#7c3aed" />

                        <!-- Agile Kanban Sticky Cards & Growth Chart -->
                        <rect x="112" y="14" width="50" height="46" rx="6" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1.5" />
                        <rect x="117" y="20" width="18" height="12" rx="2" fill="#ecfdf5" stroke="#a7f3d0" />
                        <rect x="139" y="20" width="18" height="12" rx="2" fill="#eff6ff" stroke="#bfdbfe" />
                        <rect x="117" y="36" width="40" height="18" rx="2" fill="#fdf4ff" stroke="#f5d0fe" />
                        <polyline points="121 47 129 43 137 45 147 39" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                `;
            case 'corporate-office':
                return `
                    <svg width="180" height="74" viewBox="0 0 180 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Corporate Headquarters Towers -->
                        <rect x="24" y="22" width="28" height="40" rx="3" fill="#1e293b" />
                        <rect x="29" y="28" width="4" height="4" rx="1" fill="#94a3b8" />
                        <rect x="37" y="28" width="4" height="4" rx="1" fill="#94a3b8" />
                        <rect x="45" y="28" width="4" height="4" rx="1" fill="#38bdf8" />
                        <rect x="29" y="36" width="4" height="4" rx="1" fill="#38bdf8" />
                        <rect x="37" y="36" width="4" height="4" rx="1" fill="#94a3b8" />
                        <rect x="45" y="36" width="4" height="4" rx="1" fill="#94a3b8" />
                        <rect x="29" y="44" width="4" height="4" rx="1" fill="#94a3b8" />
                        <rect x="37" y="44" width="4" height="4" rx="1" fill="#38bdf8" />
                        <rect x="45" y="44" width="4" height="4" rx="1" fill="#94a3b8" />

                        <!-- Second Tower -->
                        <rect x="56" y="14" width="34" height="48" rx="3" fill="#0f172a" />
                        <rect x="62" y="20" width="5" height="5" rx="1" fill="#38bdf8" />
                        <rect x="71" y="20" width="5" height="5" rx="1" fill="#38bdf8" />
                        <rect x="80" y="20" width="5" height="5" rx="1" fill="#94a3b8" />
                        <rect x="62" y="29" width="5" height="5" rx="1" fill="#94a3b8" />
                        <rect x="71" y="29" width="5" height="5" rx="1" fill="#38bdf8" />
                        <rect x="80" y="29" width="5" height="5" rx="1" fill="#38bdf8" />
                        <rect x="62" y="38" width="5" height="5" rx="1" fill="#38bdf8" />
                        <rect x="71" y="38" width="5" height="5" rx="1" fill="#94a3b8" />
                        <rect x="80" y="38" width="5" height="5" rx="1" fill="#94a3b8" />

                        <!-- Management & Governance Hierarchy Card -->
                        <rect x="102" y="16" width="60" height="44" rx="6" fill="#f0f9ff" stroke="#bae6fd" stroke-width="1.5" />
                        <rect x="122" y="22" width="20" height="7" rx="2" fill="#0284c7" />
                        <path d="M132 29 V34 H116 V38 M132 34 H148 V38" stroke="#0284c7" stroke-width="1.2" />
                        <rect x="109" y="38" width="14" height="6" rx="1.5" fill="#0ea5e9" />
                        <rect x="141" y="38" width="14" height="6" rx="1.5" fill="#0ea5e9" />
                        <circle cx="152" cy="18" r="8" fill="#0f172a" />
                        <path d="M148 16 h8 v5 h-8 z M150 16 v-2 a2 2 0 0 1 4 0 v2" stroke="#ffffff" stroke-width="1.2" fill="none" />
                    </svg>
                `;
            case 'hospital-healthcare':
                return `
                    <svg width="180" height="74" viewBox="0 0 180 74" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <!-- Stethoscope Outline & Resonator -->
                        <path d="M26 18 C26 32 38 42 50 42 C62 42 74 32 74 18" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" />
                        <path d="M50 42 V54 C50 58 56 60 62 60 H70" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" />
                        <circle cx="76" cy="60" r="7" fill="#0f766e" />
                        <circle cx="76" cy="60" r="3.5" fill="#99f6e4" />
                        <circle cx="26" cy="18" r="3" fill="#0d9488" />
                        <circle cx="74" cy="18" r="3" fill="#0d9488" />

                        <!-- Clinical Tablet / Patient Telemetry Screen -->
                        <rect x="96" y="14" width="66" height="46" rx="6" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5" />
                        <g transform="translate(144, 20)">
                            <rect x="4" y="0" width="4" height="12" rx="1" fill="#059669" />
                            <rect x="0" y="4" width="12" height="4" rx="1" fill="#059669" />
                        </g>
                        <path d="M102 38 H112 L116 28 L122 48 L127 33 L131 41 L135 38 H142" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        <circle cx="122" cy="48" r="2" fill="#059669" />
                    </svg>
                `;
            default:
                return `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>`;
        }
    },

    getWorkplaceIconSvg(iconName) {
        switch (iconName) {
            case 'terminal':
                return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
            case 'rocket':
                return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 9V4s3.03.55 4 2c1.08 1.62 0 5 0 5"></path></svg>`;
            case 'briefcase':
                return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
            case 'heart-pulse':
                return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 7.65l.77.78L12 20.68l7.65-7.67.77-.78a5.4 5.4 0 0 0 0-7.65z"></path></svg>`;
            default:
                return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect></svg>`;
        }
    },

    // ========================================================================
    // AUTHENTICATION & STUDENT IDENTITY CONTROLLER
    // ========================================================================

    async checkAuthStatus() {
        try {
            const res = await API.getCurrentUser();
            if (res && res.authenticated && res.user) {
                State.setUser(res.user);
            } else {
                State.clearUser();
            }
        } catch (err) {
            console.warn('Auth status check notice:', err);
            State.clearUser();
        }
    },

    handleAuthBadgeClick() {
        if (State.user) {
            this.openDashboardView();
        } else {
            this.openAuthModal('login');
        }
    },

    handleAuthButtonClick() {
        if (State.user) {
            this.openDashboardView();
        } else {
            this.openAuthModal('login');
        }
    },

    openAuthModal(defaultTab = 'login') {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        this.renderAuthModal(defaultTab);
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    },

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    formatAuthErrorMessage(err) {
        if (!err) return 'An unexpected error occurred. Please try again.';
        let msg = err.message || String(err);
        try {
            const jsonStr = msg.replace(/^Error:\s*/, '').trim();
            if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
                const parsed = JSON.parse(jsonStr);
                if (parsed.detail) return parsed.detail;
                if (parsed.non_field_errors) {
                    return Array.isArray(parsed.non_field_errors) ? parsed.non_field_errors.join(' ') : String(parsed.non_field_errors);
                }
                const messages = [];
                for (const [k, v] of Object.entries(parsed)) {
                    const label = k.replace(/_/g, ' ');
                    const valStr = Array.isArray(v) ? v.join(' ') : String(v);
                    messages.push(`${label}: ${valStr}`);
                }
                if (messages.length > 0) return messages.join(' | ');
            }
        } catch (_) {}
        return msg;
    },

    renderAuthModal(activeTab = 'login') {
        const body = document.getElementById('auth-modal-body');
        if (!body) return;

        body.innerHTML = `
            <div class="auth-modal-header" style="text-align: center; margin-bottom: 20px;">
                <div class="auth-status-pill ${activeTab === 'login' ? 'student' : ''}" style="margin-bottom: 8px;">
                    ${activeTab === 'login' ? 'Student Sign In' : 'New Learner Account'}
                </div>
                <h2 id="auth-modal-title" style="font-size: 1.35rem; color: var(--color-navy); margin-bottom: 4px;">
                    ${activeTab === 'login' ? 'Welcome Back to Task Compass' : 'Create Your Student Account'}
                </h2>
                <p style="font-size: 0.85rem; color: var(--color-slate-500); margin: 0;">
                    ${activeTab === 'login' ? 'Sign in to access your saved simulation history & badges.' : 'Track completed workplace scenarios, scorecards & learning reflections.'}
                </p>
            </div>

            <!-- Tab Switcher -->
            <div class="auth-tabs" role="tablist">
                <button type="button" class="auth-tab-btn ${activeTab === 'login' ? 'active' : ''}" onclick="App.renderAuthModal('login')" role="tab" aria-selected="${activeTab === 'login'}">
                    Sign In
                </button>
                <button type="button" class="auth-tab-btn ${activeTab === 'register' ? 'active' : ''}" onclick="App.renderAuthModal('register')" role="tab" aria-selected="${activeTab === 'register'}">
                    Create Account
                </button>
            </div>

            <div id="auth-modal-error" class="auth-error-banner" style="display: none;" role="alert"></div>

            ${activeTab === 'login' ? `
                <form id="auth-login-form" onsubmit="App.handleLoginSubmit(event)" novalidate>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="login-username">Username or Email *</label>
                        <input type="text" id="login-username" class="auth-form-input" placeholder="e.g. alex.chen" required autocomplete="username">
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="login-password">Password *</label>
                        <input type="password" id="login-password" class="auth-form-input" placeholder="Enter your password" required autocomplete="current-password">
                    </div>
                    <button type="submit" id="btn-login-submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 8px;">
                        Sign In &rarr;
                    </button>
                    <div style="text-align: center; margin-top: 16px; font-size: 0.85rem; color: var(--color-slate-600);">
                        Need an account? 
                        <a href="javascript:void(0)" onclick="App.renderAuthModal('register')" style="color: var(--color-teal-600); font-weight: 600; text-decoration: underline;">
                            Create student account
                        </a>
                    </div>
                </form>
            ` : `
                <form id="auth-register-form" onsubmit="App.handleRegisterSubmit(event)" novalidate>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="auth-form-group">
                            <label class="auth-form-label" for="reg-first-name">Your Full Name</label>
                            <input type="text" id="reg-first-name" class="auth-form-input" placeholder="e.g. Alex Chen" autocomplete="name">
                        </div>
                        <div class="auth-form-group">
                            <label class="auth-form-label" for="reg-username">Username *</label>
                            <input type="text" id="reg-username" class="auth-form-input" placeholder="e.g. alexchen" required autocomplete="username">
                        </div>
                    </div>
                    <div class="auth-form-group">
                        <label class="auth-form-label" for="reg-email">Email Address *</label>
                        <input type="email" id="reg-email" class="auth-form-input" placeholder="alex@university.edu" required autocomplete="email">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="auth-form-group">
                            <label class="auth-form-label" for="reg-password">Password *</label>
                            <input type="password" id="reg-password" class="auth-form-input" placeholder="Min 6 chars" required autocomplete="new-password">
                        </div>
                        <div class="auth-form-group">
                            <label class="auth-form-label" for="reg-password-confirm">Confirm Password *</label>
                            <input type="password" id="reg-password-confirm" class="auth-form-input" placeholder="Repeat password" required autocomplete="new-password">
                        </div>
                    </div>
                    <button type="submit" id="btn-register-submit" class="btn btn-primary" style="width: 100%; justify-content: center; margin-top: 8px;">
                        Create Student Account &rarr;
                    </button>
                    <div style="text-align: center; margin-top: 16px; font-size: 0.85rem; color: var(--color-slate-600);">
                        Already have an account? 
                        <a href="javascript:void(0)" onclick="App.renderAuthModal('login')" style="color: var(--color-teal-600); font-weight: 600; text-decoration: underline;">
                            Sign in here
                        </a>
                    </div>
                </form>
            `}
        `;
    },

    async handleLoginSubmit(event) {
        event.preventDefault();
        const errorEl = document.getElementById('auth-modal-error');
        if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');
        const submitBtn = document.getElementById('btn-login-submit');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!username || !password) {
            if (errorEl) {
                errorEl.textContent = 'Please enter both username and password.';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Signing in...';
        }

        try {
            const res = await API.login({ username, password });
            if (res && res.user) {
                State.setUser(res.user);
                State.notify(`Welcome back, ${res.user.first_name || res.user.username}!`, 'success');
                this.closeAuthModal();
            } else {
                throw new Error('Sign in failed. Please verify your credentials.');
            }
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = this.formatAuthErrorMessage(err);
                errorEl.style.display = 'block';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Sign In &rarr;';
            }
        }
    },

    async handleRegisterSubmit(event) {
        event.preventDefault();
        const errorEl = document.getElementById('auth-modal-error');
        if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }

        const firstNameInput = document.getElementById('reg-first-name');
        const usernameInput = document.getElementById('reg-username');
        const emailInput = document.getElementById('reg-email');
        const passwordInput = document.getElementById('reg-password');
        const confirmInput = document.getElementById('reg-password-confirm');
        const submitBtn = document.getElementById('btn-register-submit');

        const first_name = firstNameInput ? firstNameInput.value.trim() : '';
        const username = usernameInput ? usernameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        const password_confirm = confirmInput ? confirmInput.value : '';

        if (!username || !email || !password) {
            if (errorEl) {
                errorEl.textContent = 'Please fill in all required fields (username, email, password).';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (password !== password_confirm) {
            if (errorEl) {
                errorEl.textContent = 'Passwords do not match.';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (password.length < 6) {
            if (errorEl) {
                errorEl.textContent = 'Password must be at least 6 characters long.';
                errorEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Creating account...';
        }

        try {
            const res = await API.register({ username, email, first_name, password, password_confirm });
            if (res && res.user) {
                State.setUser(res.user);
                State.notify(`Account created successfully! Welcome, ${res.user.first_name || res.user.username}!`, 'success');
                this.closeAuthModal();
            } else {
                throw new Error('Registration failed.');
            }
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = this.formatAuthErrorMessage(err);
                errorEl.style.display = 'block';
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Create Student Account &rarr;';
            }
        }
    },

    async openProfileModal() {
        const modal = document.getElementById('auth-modal');
        const body = document.getElementById('auth-modal-body');
        if (!modal || !body) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        body.innerHTML = `
            <div style="text-align: center; padding: 30px 0;">
                <div style="margin: 0 auto 16px auto; width: 32px; height: 32px; border: 3px solid var(--color-teal-100); border-top-color: var(--color-teal-600); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="color: var(--color-slate-600); font-size: 0.9rem;">Loading your simulation portfolio...</p>
            </div>
        `;

        try {
            const historyData = await API.getUserHistory();
            const user = historyData.user || State.user || {};
            const stats = historyData.stats || { total_simulations: 0, completed_simulations: 0, avg_score_pct: 0, highest_score_pct: 0 };
            const simulations = historyData.simulations || [];

            const displayName = user.first_name || user.username || 'Student';
            const initials = displayName.charAt(0).toUpperCase();

            body.innerHTML = `
                <div class="profile-card">
                    <!-- Profile Avatar & Details -->
                    <div class="profile-avatar-large">${initials}</div>
                    <h2 style="font-size: 1.35rem; color: var(--color-navy); margin-bottom: 4px;">${displayName}</h2>
                    <p style="font-size: 0.85rem; color: var(--color-slate-500); margin: 0;">@${user.username} &bull; ${user.email || 'No email'}</p>
                    <div style="margin-top: 8px;">
                        <span class="auth-status-pill student">Verified Student Account</span>
                    </div>

                    <!-- Career / Performance Statistics -->
                    <div class="profile-stats-grid">
                        <div class="profile-stat-box">
                            <div class="profile-stat-value">${stats.completed_simulations}</div>
                            <div class="profile-stat-label">Completed</div>
                        </div>
                        <div class="profile-stat-box">
                            <div class="profile-stat-value">${stats.avg_score_pct}%</div>
                            <div class="profile-stat-label">Avg Score</div>
                        </div>
                        <div class="profile-stat-box">
                            <div class="profile-stat-value">${stats.highest_score_pct}%</div>
                            <div class="profile-stat-label">Top Score</div>
                        </div>
                    </div>

                    <!-- Simulation Session History -->
                    <div class="profile-history-section">
                        <div class="profile-history-title">
                            <span>Simulation Portfolio</span>
                            <span style="font-size: 0.75rem; color: var(--color-slate-500); font-weight: normal;">${simulations.length} total</span>
                        </div>
                        ${simulations.length === 0 ? `
                            <div class="profile-history-empty">
                                <p style="margin: 0; font-weight: 500;">No simulation records yet.</p>
                                <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--color-slate-500);">Complete a scenario to track your scores and stage evaluations here!</p>
                            </div>
                        ` : `
                            <div class="profile-history-list">
                                ${simulations.map(sim => `
                                    <div class="profile-history-card">
                                        <div class="history-card-left">
                                            <div class="history-role-title">${sim.role_name}</div>
                                            <div class="history-meta-date">${sim.workplace_name} &bull; ${new Date(sim.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                        </div>
                                        <div class="history-card-right">
                                            ${sim.completed ? `
                                                <span class="history-score-badge">${sim.final_score}/9 (${sim.percentage}%)</span>
                                                <span class="auth-status-pill student">Done</span>
                                            ` : `
                                                <span class="auth-status-pill" style="background: #fef3c7; color: #b45309;">In Progress</span>
                                            `}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Footer Action Buttons -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-light);">
                        <button type="button" class="btn btn-secondary btn-sm" onclick="App.handleLogout()" style="color: #dc2626; border-color: #fca5a5;">
                            Sign Out
                        </button>
                        <button type="button" class="btn btn-primary btn-sm" onclick="App.closeAuthModal()">
                            Close
                        </button>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load profile history:', err);
            body.innerHTML = `
                <div class="auth-error-banner" style="display: block; margin: 20px 0;">
                    Failed to load profile data: ${err.message || 'Unknown error'}
                </div>
                <div style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick="App.closeAuthModal()">Close</button>
                </div>
            `;
        }
    },

    async handleLogout() {
        try {
            await API.logout();
            State.clearUser();
            State.notify('You have been signed out successfully.', 'info');
            this.closeAuthModal();
            // Refresh dashboard view if open
            const dashboardView = document.getElementById('student-dashboard-view');
            if (dashboardView && dashboardView.style.display !== 'none') {
                this.loadStudentDashboard();
            }
        } catch (err) {
            console.error('Logout error:', err);
            State.clearUser();
            this.closeAuthModal();
        }
    },

    // ========================================================================
    // STUDENT DASHBOARD & ANALYTICS CONTROLLER (STEP 16)
    // ========================================================================

    openDashboardView() {
        const homeLanding = document.getElementById('home-landing-view');
        const overviewView = document.getElementById('workplace-overview-view');
        const simSection = document.getElementById('simulate');
        const dashboardSection = document.getElementById('student-dashboard-view');

        if (homeLanding) homeLanding.style.display = 'none';
        if (overviewView) overviewView.style.display = 'none';
        if (simSection) simSection.style.display = 'none';
        if (dashboardSection) {
            dashboardSection.style.display = 'block';
            dashboardSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Update active nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-nav') === 'dashboard');
        });

        this.loadStudentDashboard();
    },

    closeDashboardView() {
        const homeLanding = document.getElementById('home-landing-view');
        const dashboardSection = document.getElementById('student-dashboard-view');

        if (dashboardSection) dashboardSection.style.display = 'none';
        if (homeLanding) homeLanding.style.display = 'block';

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-nav') === 'home');
        });
    },

    async loadStudentDashboard() {
        const container = document.getElementById('student-dashboard-content');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 48px 0;">
                <div style="margin: 0 auto 16px auto; width: 36px; height: 36px; border: 3px solid var(--color-teal-100); border-top-color: var(--color-teal-600); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="color: var(--color-slate-600); font-size: 0.95rem;">Loading your simulation portfolio and competency growth...</p>
            </div>
        `;

        try {
            const data = await API.getStudentDashboard();

            if (!data.authenticated) {
                // Render Guest State with educational preview & call-to-actions
                container.innerHTML = `
                    <div class="dashboard-shell">
                        <div class="dashboard-header-banner">
                            <div>
                                <div class="auth-status-pill" style="margin-bottom: 8px;">Guest Learner</div>
                                <h1 class="dashboard-header-title">Student Career Dashboard</h1>
                                <p class="dashboard-header-subtitle">
                                    Sign in or create an account to persist simulation history across devices, track competency progression, and earn verified credentials.
                                </p>
                            </div>
                            <div class="dashboard-header-actions">
                                <button class="btn btn-secondary btn-sm" onclick="App.openAuthModal('login')">Sign In</button>
                                <button class="btn btn-primary btn-sm" onclick="App.openAuthModal('register')">Create Account &rarr;</button>
                            </div>
                        </div>

                        ${State.session ? `
                            <div style="background: var(--color-bg-muted); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                                    <div>
                                        <span class="auth-status-pill student">Active Browser Session</span>
                                        <h3 style="margin: 8px 0 4px 0; color: var(--color-navy); font-size: 1.15rem;">
                                            ${State.session.selected_role?.name || 'Simulation'} &bull; ${State.session.workplace?.name || 'Tech Company'}
                                        </h3>
                                        <p style="margin: 0; font-size: 0.85rem; color: var(--color-slate-600);">
                                            Score: <strong>${State.session.total_score || 0} pts</strong> &bull; Status: ${State.session.status === 'completed' ? 'Completed' : 'In Progress'}
                                        </p>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="btn btn-secondary btn-sm" onclick="App.openSessionReview('${State.session.id}')">Review Answers</button>
                                        ${State.session.status === 'completed' ? `
                                            <button class="btn btn-primary btn-sm" onclick="App.openCertificate('${State.session.id}')">View Certificate</button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>
                        ` : ''}

                        <div style="text-align: center; padding: 40px 20px; background: var(--color-bg-muted); border-radius: var(--radius-lg);">
                            <h3 style="color: var(--color-navy); margin-bottom: 8px;">Start Your First Workplace Simulation</h3>
                            <p style="color: var(--color-slate-600); max-width: 520px; margin: 0 auto 20px auto; font-size: 0.9rem;">
                                Explore 12 technical roles in the Tech Company, solve realistic operational incidents, and verify your incident ownership, routing, and collaboration skills.
                            </p>
                            <a href="#workplaces" class="btn btn-primary" onclick="App.closeDashboardView()">Explore Workplaces &rarr;</a>
                        </div>
                    </div>
                `;
                return;
            }

            const user = data.user || {};
            const summary = data.summary || {};
            const comps = data.competencies || {};
            const roles = data.role_experience || [];
            const sims = data.simulations || [];

            container.innerHTML = `
                <div class="dashboard-shell">
                    <!-- Dashboard Header Banner -->
                    <div class="dashboard-header-banner">
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                <span class="auth-status-pill student">Verified Student</span>
                                <span style="font-size: 0.8rem; color: var(--color-slate-500);">Member since ${new Date(user.date_joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                            </div>
                            <h1 class="dashboard-header-title">${user.student_name || user.username}'s Career Dashboard</h1>
                            <p class="dashboard-header-subtitle">
                                Verified workplace simulation progression, competency mastery ratings, and official credentials of career readiness.
                            </p>
                        </div>
                        <div class="dashboard-header-actions">
                            <button class="btn btn-secondary btn-sm" onclick="App.closeDashboardView(); window.location.hash='#workplaces';">
                                New Simulation &rarr;
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="App.handleLogout()" style="color: #dc2626; border-color: #fca5a5;">
                                Sign Out
                            </button>
                        </div>
                    </div>

                    <!-- 4-KPI Grid -->
                    <div class="dashboard-kpi-grid">
                        <div class="dashboard-kpi-card">
                            <div class="dashboard-kpi-val">${summary.completed_simulations}</div>
                            <div class="dashboard-kpi-label">Completed Runs</div>
                            <div class="dashboard-kpi-sub">${summary.total_simulations} total launched</div>
                        </div>
                        <div class="dashboard-kpi-card">
                            <div class="dashboard-kpi-val">${summary.overall_average_score}%</div>
                            <div class="dashboard-kpi-label">Overall Average</div>
                            <div class="dashboard-kpi-sub">Across all 3 stages</div>
                        </div>
                        <div class="dashboard-kpi-card">
                            <div class="dashboard-kpi-val">${summary.top_score_percentage}%</div>
                            <div class="dashboard-kpi-label">Top Performance</div>
                            <div class="dashboard-kpi-sub">Best scenario completion</div>
                        </div>
                        <div class="dashboard-kpi-card">
                            <div class="dashboard-kpi-val">${summary.certificates_earned}</div>
                            <div class="dashboard-kpi-label">Certificates Earned</div>
                            <div class="dashboard-kpi-sub">&ge; 70% passing grade</div>
                        </div>
                    </div>

                    <!-- Competency Progression Section -->
                    <div class="dashboard-section-title">
                        <span>Workplace Competency Progression</span>
                        <span style="font-size: 0.8rem; color: var(--color-slate-500); font-weight: normal;">Authoritative Evaluation</span>
                    </div>

                    <div class="competency-cards-grid">
                        <!-- Ownership -->
                        <div class="competency-card">
                            <div>
                                <div class="competency-top-row">
                                    <div class="competency-name">${comps.ownership?.name || 'Incident Ownership'}</div>
                                    <span class="competency-tier-pill ${(comps.ownership?.tier || '').toLowerCase()}">${comps.ownership?.tier || 'Introductory'}</span>
                                </div>
                                <p class="competency-desc">${comps.ownership?.description || 'Accuracy in discerning the primary role responsible for incidents.'}</p>
                            </div>
                            <div class="competency-meter-box">
                                <div class="competency-meter-labels">
                                    <span>Mastery Score</span>
                                    <span>${comps.ownership?.score_percentage || 0}%</span>
                                </div>
                                <div class="competency-bar-track">
                                    <div class="competency-bar-fill" style="width: ${comps.ownership?.score_percentage || 0}%;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Routing -->
                        <div class="competency-card">
                            <div>
                                <div class="competency-top-row">
                                    <div class="competency-name">${comps.routing?.name || 'Workflow Routing'}</div>
                                    <span class="competency-tier-pill ${(comps.routing?.tier || '').toLowerCase()}">${comps.routing?.tier || 'Introductory'}</span>
                                </div>
                                <p class="competency-desc">${comps.routing?.description || 'Precision in building multi-team operational pipelines from intake through deployment.'}</p>
                            </div>
                            <div class="competency-meter-box">
                                <div class="competency-meter-labels">
                                    <span>Mastery Score</span>
                                    <span>${comps.routing?.score_percentage || 0}%</span>
                                </div>
                                <div class="competency-bar-track">
                                    <div class="competency-bar-fill" style="width: ${comps.routing?.score_percentage || 0}%;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Collaboration -->
                        <div class="competency-card">
                            <div>
                                <div class="competency-top-row">
                                    <div class="competency-name">${comps.collaboration?.name || 'Incident Response Collaboration'}</div>
                                    <span class="competency-tier-pill ${(comps.collaboration?.tier || '').toLowerCase()}">${comps.collaboration?.tier || 'Introductory'}</span>
                                </div>
                                <p class="competency-desc">${comps.collaboration?.description || 'Mastery of supporting functional teams and crisis communication flows during outages.'}</p>
                            </div>
                            <div class="competency-meter-box">
                                <div class="competency-meter-labels">
                                    <span>Mastery Score</span>
                                    <span>${comps.collaboration?.score_percentage || 0}%</span>
                                </div>
                                <div class="competency-bar-track">
                                    <div class="competency-bar-fill" style="width: ${comps.collaboration?.score_percentage || 0}%;"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Roles Explored Section -->
                    ${roles.length > 0 ? `
                        <div style="margin-bottom: 32px;">
                            <div class="dashboard-section-title">
                                <span>Roles Practiced</span>
                                <span style="font-size: 0.8rem; color: var(--color-slate-500); font-weight: normal;">${roles.length} roles explored</span>
                            </div>
                            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                                ${roles.map(r => `
                                    <div style="background: var(--color-bg-white); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 8px 14px; display: flex; align-items: center; gap: 8px;">
                                        <span style="font-weight: 600; color: var(--color-navy); font-size: 0.88rem;">${r.role_name}</span>
                                        <span style="font-size: 0.75rem; background: var(--color-bg-muted); color: var(--color-slate-600); padding: 2px 6px; border-radius: var(--radius-sm);">${r.attempts} runs</span>
                                        <span class="history-score-badge" style="font-size: 0.75rem; padding: 2px 6px;">Top: ${r.best_pct}%</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Simulation Portfolio History Table -->
                    <div class="dashboard-section-title">
                        <span>Simulation Portfolio & Audit Records</span>
                        <span style="font-size: 0.8rem; color: var(--color-slate-500); font-weight: normal;">${sims.length} total records</span>
                    </div>

                    ${sims.length === 0 ? `
                        <div class="profile-history-empty" style="padding: 36px 20px;">
                            <p style="font-weight: 600; margin-bottom: 4px;">No simulation records found yet.</p>
                            <p style="color: var(--color-slate-500); font-size: 0.85rem; margin-bottom: 16px;">Launch a workplace simulation to track your score, review question answers, and earn verified credentials.</p>
                            <a href="#workplaces" class="btn btn-primary btn-sm" onclick="App.closeDashboardView()">Start First Simulation &rarr;</a>
                        </div>
                    ` : `
                        <div class="dashboard-table-container">
                            <table class="dashboard-table">
                                <thead>
                                    <tr>
                                        <th>Workplace & Role</th>
                                        <th>Date</th>
                                        <th>Stages (S1 / S2 / S3)</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                        <th style="text-align: right;">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sims.map(s => `
                                        <tr>
                                            <td>
                                                <div style="font-weight: 600; color: var(--color-navy);">${s.role_name}</div>
                                                <div style="font-size: 0.75rem; color: var(--color-slate-500);">${s.workplace_name}</div>
                                            </td>
                                            <td style="font-size: 0.82rem; color: var(--color-slate-600);">
                                                ${new Date(s.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <span style="font-family: var(--font-mono); font-size: 0.82rem;">
                                                    ${s.stage_1_correct}/3 &bull; ${s.stage_2_correct}/3 &bull; ${s.stage_3_correct}/3
                                                </span>
                                            </td>
                                            <td>
                                                <span class="history-score-badge">${s.score_correct}/9 (${s.percentage}%)</span>
                                            </td>
                                            <td>
                                                ${s.completed ? `
                                                    <span class="auth-status-pill student">Completed</span>
                                                ` : `
                                                    <span class="auth-status-pill" style="background: #fef3c7; color: #b45309;">In Progress</span>
                                                `}
                                            </td>
                                            <td style="text-align: right; white-space: nowrap;">
                                                <button class="btn btn-secondary btn-sm" style="padding: 4px 10px; font-size: 0.8rem;" onclick="App.openSessionReview('${s.id}')">
                                                    Review &rarr;
                                                </button>
                                                ${s.certificate_eligible ? `
                                                    <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 0.8rem; margin-left: 6px;" onclick="App.openCertificate('${s.id}')">
                                                        Certificate
                                                    </button>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            `;
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            container.innerHTML = `
                <div class="dashboard-shell">
                    <div class="auth-error-banner" style="display: block; margin: 20px 0;">
                        Failed to load student dashboard: ${err.message || 'Unknown error'}
                    </div>
                    <div style="text-align: center;">
                        <button class="btn btn-primary" onclick="App.loadStudentDashboard()">Retry</button>
                    </div>
                </div>
            `;
        }
    },

    // ========================================================================
    // PAST SIMULATION REVIEW MODAL CONTROLLER
    // ========================================================================

    async openSessionReview(sessionId) {
        const modal = document.getElementById('session-review-modal');
        const body = document.getElementById('session-review-modal-body');
        if (!modal || !body) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        body.innerHTML = `
            <div style="text-align: center; padding: 36px 0;">
                <div style="margin: 0 auto 16px auto; width: 32px; height: 32px; border: 3px solid var(--color-teal-100); border-top-color: var(--color-teal-600); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="color: var(--color-slate-600); font-size: 0.9rem;">Loading simulation question audit...</p>
            </div>
        `;

        try {
            const data = await API.getSessionReview(sessionId);
            const score = data.score || { correct: 0, total: 9, percentage: 0 };
            const responses = data.responses || [];
            const refl = data.reflection || {};

            body.innerHTML = `
                <div style="padding: 10px 4px;">
                    <!-- Review Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--color-border-light); padding-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <span class="auth-status-pill student" style="margin-bottom: 6px;">Simulation Audit</span>
                            <h2 style="font-size: 1.4rem; color: var(--color-navy); margin: 4px 0;">${this.escapeHtml(data.role_name)} &bull; ${this.escapeHtml(data.workplace_name)}</h2>
                            <p style="font-size: 0.85rem; color: var(--color-slate-500); margin: 0;">Completed: ${data.completed_at ? new Date(data.completed_at).toLocaleString() : 'In Progress'}</p>
                        </div>
                        <div style="text-align: right;">
                            <span class="history-score-badge" style="font-size: 1.1rem; padding: 6px 14px;">${score.correct} / ${score.total} (${score.percentage}%)</span>
                        </div>
                    </div>

                    <!-- Question Audit Cards -->
                    <h3 style="font-size: 1rem; color: var(--color-navy); margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.04em;">Question Responses & Feedback</h3>

                    ${responses.length === 0 ? `
                        <p style="color: var(--color-slate-500); font-size: 0.9rem;">No response data recorded for this session.</p>
                    ` : responses.map((r, i) => `
                        <div class="review-question-card">
                            <div class="review-q-header">
                                <span style="font-size: 0.78rem; font-weight: 600; color: var(--color-slate-500);">Stage ${r.stage} &bull; Scenario ${r.question_number}</span>
                                <span class="review-q-badge ${r.is_correct ? 'correct' : 'incorrect'}">
                                    ${r.is_correct ? '&#10003; Correct' : '&#10007; Suboptimal'}
                                </span>
                            </div>
                            <div class="review-q-title">${this.escapeHtml(r.scenario_title)}</div>
                            <div class="review-q-desc">${this.escapeHtml(r.scenario_situation)}</div>
                            <div class="review-q-ans-box">
                                <div style="font-size: 0.78rem; color: var(--color-slate-500); margin-bottom: 2px;">Your Selection:</div>
                                <div style="font-weight: 500; color: var(--color-navy);">${r.selected_role_name ? `Role: ${this.escapeHtml(r.selected_role_name)}` : this.escapeHtml(r.selected_option_text)}</div>
                            </div>
                            <div class="review-feedback-rationale">
                                <strong>Pedagogical Rationale:</strong> ${this.escapeHtml(r.feedback_rationale)}
                            </div>
                        </div>
                    `).join('')}

                    <!-- Reflection Section if present -->
                    ${refl && (refl.ownership_reflection || refl.collaboration_reflection || refl.improvement_reflection) ? `
                        <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--color-border-light);">
                            <h3 style="font-size: 1rem; color: var(--color-navy); margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.04em;">Student Reflection Takeaways</h3>
                            ${refl.ownership_reflection ? `
                                <div style="margin-bottom: 10px;">
                                    <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-slate-500);">Ownership Takeaway:</div>
                                    <div style="font-size: 0.88rem; color: var(--color-navy); background: var(--color-bg-muted); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 2px;">${this.escapeHtml(refl.ownership_reflection)}</div>
                                </div>
                            ` : ''}
                            ${refl.collaboration_reflection ? `
                                <div style="margin-bottom: 10px;">
                                    <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-slate-500);">Collaboration Takeaway:</div>
                                    <div style="font-size: 0.88rem; color: var(--color-navy); background: var(--color-bg-muted); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 2px;">${this.escapeHtml(refl.collaboration_reflection)}</div>
                                </div>
                            ` : ''}
                            ${refl.improvement_reflection ? `
                                <div style="margin-bottom: 10px;">
                                    <div style="font-size: 0.78rem; font-weight: 600; color: var(--color-slate-500);">Skills to Practice:</div>
                                    <div style="font-size: 0.88rem; color: var(--color-navy); background: var(--color-bg-muted); padding: 8px 12px; border-radius: var(--radius-sm); margin-top: 2px;">${this.escapeHtml(refl.improvement_reflection)}</div>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--color-border-light);">
                        <button class="btn btn-primary btn-sm" onclick="App.closeSessionReviewModal()">Close Review</button>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load session review:', err);
            body.innerHTML = `
                <div class="auth-error-banner" style="display: block; margin: 20px 0;">
                    Failed to load session review: ${err.message || 'Unknown error'}
                </div>
                <div style="text-align: right;">
                    <button class="btn btn-secondary btn-sm" onclick="App.closeSessionReviewModal()">Close</button>
                </div>
            `;
        }
    },

    closeSessionReviewModal() {
        const modal = document.getElementById('session-review-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    },

    // ========================================================================
    // VERIFIED CAREER READINESS CERTIFICATE CONTROLLER
    // ========================================================================

    async openCertificate(sessionId) {
        const modal = document.getElementById('certificate-modal');
        const body = document.getElementById('certificate-modal-body');
        if (!modal || !body) return;

        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        body.innerHTML = `
            <div style="text-align: center; padding: 48px; background: white; border-radius: var(--radius-lg);">
                <div style="margin: 0 auto 16px auto; width: 36px; height: 36px; border: 3px solid var(--color-teal-100); border-top-color: var(--color-teal-600); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                <p style="color: var(--color-slate-600);">Generating verified credential...</p>
            </div>
        `;

        try {
            const cert = await API.getSessionCertificate(sessionId);

            body.innerHTML = `
                <div>
                    <!-- Official Certificate Card -->
                    <div class="certificate-card" id="printable-certificate-card">
                        <div class="cert-corner-ornament cert-corner-tl"></div>
                        <div class="cert-corner-ornament cert-corner-tr"></div>
                        <div class="cert-corner-ornament cert-corner-bl"></div>
                        <div class="cert-corner-ornament cert-corner-br"></div>

                        <div class="cert-issuer-badge">TASK COMPASS &bull; VERIFIED CREDENTIAL</div>
                        <h2 class="cert-main-title">Certificate of Workplace Simulation Mastery</h2>
                        <div class="cert-sub-text">This certifies that</div>

                        <div class="cert-recipient-name">${cert.student_name}</div>

                        <div class="cert-statement">
                            has successfully completed the interactive workplace simulation for <strong>${cert.role_name}</strong> within the <strong>${cert.workplace_name}</strong> environment, demonstrating mastery in operational task ownership, cross-team routing pipelines, and incident collaboration.
                        </div>

                        <div style="margin-bottom: 18px;">
                            <span class="auth-status-pill student" style="font-size: 0.82rem; padding: 6px 14px;">
                                ${cert.distinction} &bull; Score: ${cert.score_correct}/${cert.score_total} (${cert.percentage}%)
                            </span>
                        </div>

                        <div class="cert-competencies-list">
                            ${cert.competencies_certified.map(c => `
                                <span class="cert-comp-badge">&#10003; ${c}</span>
                            `).join('')}
                        </div>

                        <div class="cert-footer-grid">
                            <div>
                                <div class="cert-meta-item">Date Issued</div>
                                <div class="cert-meta-val">${cert.issued_at}</div>
                            </div>
                            <div>
                                <div class="cert-meta-item">Credential Verification ID</div>
                                <div class="cert-meta-val">${cert.certificate_id}</div>
                            </div>
                            <div>
                                <div class="cert-meta-item">Authority</div>
                                <div class="cert-meta-val">Task Compass Academic Engine</div>
                            </div>
                        </div>
                    </div>

                    <!-- Certificate Action Buttons -->
                    <div class="cert-actions-bar">
                        <button class="btn btn-primary" onclick="window.print()">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                            Print / Save PDF
                        </button>
                        <button class="btn btn-secondary" onclick="App.closeCertificateModal()">
                            Close
                        </button>
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Failed to load certificate:', err);
            body.innerHTML = `
                <div style="background: white; border-radius: var(--radius-lg); padding: 32px; text-align: center;">
                    <div class="auth-error-banner" style="display: block; margin-bottom: 20px;">
                        ${err.message || 'Certificate unavailable.'}
                    </div>
                    <button class="btn btn-secondary" onclick="App.closeCertificateModal()">Close</button>
                </div>
            `;
        }
    },

    closeCertificateModal() {
        const modal = document.getElementById('certificate-modal');
        if (!modal) return;
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
};

// Bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
