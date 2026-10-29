/**
 * TASK COMPASS — STAGE 3: COLLABORATION CHALLENGE
 * 
 * Interactive simulation stage teaching students how multiple workplace roles
 * collaborate to resolve complex, cross-functional incidents.
 * 
 * Features:
 * - 3 Tech Company collaboration scenarios (Ransomware Incident, Major Security Vulnerability, Customer Data Security Incident)
 * - Tripartite Collaboration Builder:
 *   1. Designate Primary Owner (single lead role accountable for coordinating response)
 *   2. Assemble Supporting Team (cross-functional domain specialists)
 *   3. Build Collaboration Workflow (ordered 5-step incident execution and escalation stream)
 * - 12 Tech Company role cards in canonical order with realistic workplace photographs
 * - Dual interaction model: HTML5 drag-and-drop AND tap-to-add with Move Up / Move Down / Remove controls
 * - Fully accessible keyboard navigation (Tab, Enter/Space) and ARIA attributes
 * - Authoritative server-side answer evaluation and 1pt / 0pt scoring
 * - Constructive educational feedback: "Let's review the collaboration plan" with side-by-side comparison for incorrect plans,
 *   and "✓ Collaboration Plan Correct" with optimal workflow breakdown for correct plans
 * - Stage 3 completion screen with scorecard and key takeaways
 * - Session state recovery across page reloads
 * - Mobile responsive layout (1 column on mobile, 2 on tablet, 4 on desktop)
 */

const Stage3 = {
    container: null,
    scenarios: [],
    currentIndex: 0,
    availableRoles: [],
    primaryRole: null,
    supportingRoles: [],
    workflow: [],
    isSubmitted: false,
    currentFeedback: null,
    sessionProgress: null,

    // Drag-and-drop state tracking
    draggedRoleId: null,
    draggedSlotIndex: null,

    /**
     * Initializes and renders Stage 3
     */
    async render(container, scenarios) {
        this.container = container;
        this.scenarios = Array.isArray(scenarios) ? scenarios : [];
        this.primaryRole = null;
        this.supportingRoles = [];
        this.workflow = [];
        this.isSubmitted = false;
        this.currentFeedback = null;

        if (this.scenarios.length === 0) {
            container.innerHTML = `
                <div class="scenario-card" style="text-align: center; padding: 48px;">
                    <h3 style="color: var(--color-navy); margin-bottom: 8px;">No Stage 3 Scenarios Found</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                        Unable to load workplace collaboration scenarios for Stage 3. Please try again.
                    </p>
                    <button class="btn btn-primary" onclick="App.goToStage(3)">Reload Stage 3</button>
                </div>
            `;
            return;
        }

        // Load and sort 12 Tech Company roles
        await this.loadAvailableRoles();

        // Sync session state from server for refresh recovery
        await this.syncSessionState();

        // If all scenarios already completed, render completion screen
        if (this.sessionProgress && this.sessionProgress.is_stage_complete) {
            this.renderCompletionScreen();
        } else {
            this.renderCurrentScenario();
        }
    },

    /**
     * Loads the 12 Tech Company roles in canonical order
     */
    async loadAvailableRoles() {
        if (State.activeWorkplace && Array.isArray(State.activeWorkplace.roles) && State.activeWorkplace.roles.length > 0) {
            this.availableRoles = this.sortRoles(State.activeWorkplace.roles);
            return;
        }

        try {
            const wp = await API.getWorkplaceDetail('tech-company');
            if (wp && wp.roles) {
                State.setActiveWorkplace(wp);
                this.availableRoles = this.sortRoles(wp.roles);
            }
        } catch (err) {
            console.warn('Could not fetch workplace roles for Stage 3:', err);
            this.availableRoles = [];
        }
    },

    /**
     * Sorts roles by standard Tech Company sequence
     */
    sortRoles(rolesList) {
        const roles = [...rolesList];
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

        roles.sort((a, b) => {
            const idxA = TECH_ROLE_ORDER.indexOf(a.slug);
            const idxB = TECH_ROLE_ORDER.indexOf(b.slug);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return (a.order || 0) - (b.order || 0);
        });

        return roles;
    },

    /**
     * Synchronizes state with backend SimulationSession
     */
    async syncSessionState() {
        if (!State.session || !State.session.id) return;

        try {
            const sessionData = await API.getSession(State.session.id);
            if (sessionData && sessionData.stage_3_progress) {
                this.sessionProgress = sessionData.stage_3_progress;
                const answered = sessionData.stage_3_progress.answered_scenarios || {};

                // Find first unanswered scenario
                const firstUnansweredIdx = this.scenarios.findIndex(s => !answered[s.id]);
                if (firstUnansweredIdx !== -1) {
                    this.currentIndex = firstUnansweredIdx;
                } else if (Object.keys(answered).length >= this.scenarios.length) {
                    this.sessionProgress.is_stage_complete = true;
                }
            }
        } catch (err) {
            console.warn('Could not sync Stage 3 session state from server:', err);
        }
    },

    /**
     * Returns the required number of supporting roles for the current scenario
     */
    getExpectedSupportingCount() {
        const s = this.scenarios[this.currentIndex];
        if (!s) return 4;
        if (s.supporting_roles && Array.isArray(s.supporting_roles) && s.supporting_roles.length > 0) {
            return s.supporting_roles.length;
        }
        if (s.supporting_teams && Array.isArray(s.supporting_teams) && s.supporting_teams.length > 0) {
            return s.supporting_teams.length;
        }
        // Scenario 1 requires 3 supporting roles, Scenario 2 & 3 require 4
        return (this.currentIndex === 0) ? 3 : 4;
    },

    /**
     * Renders the active scenario view
     */
    renderCurrentScenario() {
        if (!this.container) return;

        const s = this.scenarios[this.currentIndex];
        if (!s) {
            this.renderCompletionScreen();
            return;
        }

        const totalScenarios = this.scenarios.length;
        const currentNum = this.currentIndex + 1;
        const urgencyClass = s.urgency_level === 'Critical' ? 'badge-danger' : (s.urgency_level === 'High' ? 'badge-warning' : 'badge-teal');
        const expectedSuppCount = this.getExpectedSupportingCount();

        // Reset per-scenario selections
        this.primaryRole = null;
        this.supportingRoles = [];
        this.workflow = [];
        this.isSubmitted = false;
        this.currentFeedback = null;

        this.container.innerHTML = `
            <div class="stage3-container">
                <!-- Stage 3 Header Card -->
                <div class="stage3-header-card">
                    <div class="stage3-header-left">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="badge badge-success" style="font-weight: 700; font-size: 0.8rem; padding: 4px 10px;">
                                &#10003; STAGE 1 COMPLETE
                            </span>
                            <span class="badge badge-success" style="font-weight: 700; font-size: 0.8rem; padding: 4px 10px;">
                                &#10003; STAGE 2 COMPLETE
                            </span>
                            <span class="badge badge-teal" style="font-weight: 700; font-size: 0.8rem; padding: 4px 10px;">
                                STAGE 3 OF 3: ACTIVE
                            </span>
                            <span class="badge badge-navy" style="font-size: 0.8rem; padding: 4px 10px;">
                                ${State.activeWorkplace ? State.activeWorkplace.name.toUpperCase() : 'TECH COMPANY'}
                            </span>
                        </div>
                        <h2 class="stage3-main-title">COLLABORATION CHALLENGE</h2>
                        <p class="stage3-main-subtitle">
                            Complex workplace problems rarely belong to one person. Build the right team and coordinate their response.
                        </p>
                    </div>
                    <div class="stage3-header-right">
                        <div class="stage1-scenario-pill" id="stage3-progress-pill">
                            <span class="stat-dot"></span>
                            <span>Scenario ${currentNum} of ${totalScenarios}</span>
                        </div>
                    </div>
                </div>

                <!-- Main Scenario Card -->
                <div class="scenario-card stage3-card" id="stage3-scenario-card">
                    <!-- Header Bar -->
                    <div class="scenario-header-bar">
                        <div class="scenario-badge-cluster">
                            <span class="badge ${urgencyClass}">${s.urgency_level || 'Critical'} Priority</span>
                            ${s.incident_type ? `<span class="badge badge-navy">${s.incident_type}</span>` : ''}
                        </div>
                        <span class="scenario-number-tag">Scenario ${currentNum} of ${totalScenarios}</span>
                    </div>

                    <!-- Title -->
                    <h3 class="scenario-title" id="scenario-heading">${s.title}</h3>

                    <!-- Situation Context Box -->
                    <div class="scenario-situation-box">
                        <div class="scenario-situation-label">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            SITUATION
                        </div>
                        <p class="scenario-situation-text">${s.situation || s.description}</p>
                    </div>

                    <!-- Question Callout -->
                    <div class="scenario-question-callout" style="border-left-color: var(--color-primary);">
                        <h4 class="scenario-question-title" style="color: var(--color-navy);">COLLABORATION OBJECTIVE</h4>
                        <p class="scenario-question-subtitle">
                            ${s.task || 'Build the team that should collaborate to handle this incident.'}
                        </p>
                    </div>

                    <!-- COLLABORATION TEAM BUILDER WORKSPACE -->
                    <div class="stage3-builder-workspace" role="region" aria-label="Collaboration Team Builder">
                        
                        <!-- STEP 1: PRIMARY OWNER SELECTION -->
                        <div class="stage3-builder-step" id="step-primary-owner-container">
                            <div class="stage3-step-header">
                                <div class="stage3-step-header-left">
                                    <div class="stage3-step-number" id="step-num-1">1</div>
                                    <div class="stage3-step-titles">
                                        <h4>PRIMARY OWNER</h4>
                                        <p>Select exactly ONE primary owner who coordinates the incident response.</p>
                                    </div>
                                </div>
                                <span class="badge badge-teal" id="badge-primary-status">Unassigned</span>
                            </div>

                            <div class="stage3-primary-zone is-empty" 
                                 id="stage3-primary-dropzone"
                                 ondragover="Stage3.onPrimaryDragOver(event)"
                                 ondragleave="Stage3.onPrimaryDragLeave(event)"
                                 ondrop="Stage3.onPrimaryDrop(event)"
                                 onclick="Stage3.onPrimaryZoneClick()"
                                 role="button"
                                 tabindex="0"
                                 aria-label="Primary Owner dropzone">
                                ${this.renderPrimaryZoneContent()}
                            </div>
                        </div>

                        <!-- STEP 2: SUPPORTING TEAM SELECTION -->
                        <div class="stage3-builder-step" id="step-supporting-team-container">
                            <div class="stage3-step-header">
                                <div class="stage3-step-header-left">
                                    <div class="stage3-step-number" id="step-num-2">2</div>
                                    <div class="stage3-step-titles">
                                        <h4>SUPPORTING TEAM</h4>
                                        <p>Select the cross-functional roles needed to investigate, contain, and remediate.</p>
                                    </div>
                                </div>
                                <span class="badge badge-navy" id="badge-supporting-counter">
                                    0 / ${expectedSuppCount} Roles Selected
                                </span>
                            </div>

                            <div class="stage3-supporting-zone" 
                                 id="stage3-supporting-container"
                                 ondragover="Stage3.onSupportingDragOver(event)"
                                 ondragleave="Stage3.onSupportingDragLeave(event)"
                                 ondrop="Stage3.onSupportingDrop(event)">
                                ${this.renderSupportingZoneContent()}
                            </div>
                        </div>

                        <!-- STEP 3: COLLABORATION WORKFLOW -->
                        <div class="stage3-builder-step" id="step-workflow-container">
                            <div class="stage3-step-header">
                                <div class="stage3-step-header-left">
                                    <div class="stage3-step-number" id="step-num-3">3</div>
                                    <div class="stage3-step-titles">
                                        <h4>COLLABORATION WORKFLOW</h4>
                                        <p>Sequence the roles into an end-to-end 5-step collaboration stream from intake to resolution.</p>
                                    </div>
                                </div>
                                <span class="badge badge-navy" id="badge-workflow-counter">
                                    0 / 5 Steps Arranged
                                </span>
                            </div>

                            <!-- Workflow Helper Toolbar -->
                            <div class="stage3-workflow-toolbar">
                                <button class="btn btn-secondary btn-sm" 
                                        onclick="Stage3.populateWorkflowFromTeam()"
                                        title="Automatically add selected Primary Owner and Supporting Team to workflow slots">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                    Populate From Selected Team
                                </button>

                                <button class="btn btn-secondary btn-sm" 
                                        onclick="Stage3.clearWorkflow()"
                                        title="Clear all roles in workflow">
                                    Reset Workflow
                                </button>
                            </div>

                            <!-- Workflow Stream -->
                            <div class="stage2-route-stream" id="stage3-workflow-stream-container">
                                <div class="route-endpoint-node start-node">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                    <span>START: INCIDENT INTAKE</span>
                                </div>

                                <div class="route-flow-arrow">&darr;</div>

                                <!-- 5 Workflow Slots Container -->
                                <div id="stage3-workflow-slots-container" style="width: 100%; display: flex; flex-direction: column; gap: 6px;">
                                    ${this.renderWorkflowSlots()}
                                </div>

                                <div class="route-flow-arrow">&darr;</div>

                                <div class="route-endpoint-node end-node">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                                    <span>END: ESCALATION & RESOLUTION</span>
                                </div>
                            </div>
                        </div>

                        <!-- Workspace Action Bar -->
                        <div class="stage2-action-bar" style="margin-top: 10px;">
                            <button class="btn btn-secondary btn-sm" 
                                    id="btn-reset-stage3"
                                    onclick="Stage3.resetAllSelections()"
                                    style="display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Reset All Selections
                            </button>

                            <button class="btn btn-primary btn-lg" 
                                    id="btn-submit-stage3"
                                    onclick="Stage3.submitCollaborationPlan()"
                                    style="font-size: 1.05rem; padding: 13px 40px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                                Submit Collaboration Plan &rarr;
                            </button>
                        </div>
                    </div>

                    <!-- AVAILABLE ROLES BANK (12 TECH ROLES) -->
                    <div class="stage2-available-section" style="margin-top: 28px;">
                        <div class="stage2-section-header">
                            <div>
                                <h4>AVAILABLE ROLES BANK (12 ROLES)</h4>
                                <p>Select or drag roles into Primary Owner, Supporting Team, and Collaboration Workflow.</p>
                            </div>
                            <span class="badge badge-teal">${this.availableRoles.length} Tech Roles</span>
                        </div>

                        <!-- 12 Role Cards Grid (4 cols desktop, 2 cols tablet, 1 col mobile) -->
                        <div class="stage2-available-grid" id="stage3-available-roles-grid" role="region" aria-label="12 Available Tech Roles">
                            ${this.availableRoles.map((role, idx) => this.renderRoleBankCard(role, idx)).join('')}
                        </div>
                    </div>

                    <!-- Feedback Mount Point -->
                    <div id="stage3-feedback-mount"></div>
                </div>
            </div>
        `;

        this.updateWorkspaceUI();
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Renders content inside Primary Owner zone
     */
    renderPrimaryZoneContent() {
        if (!this.primaryRole) {
            return `
                <div class="slot-empty-prompt" style="margin: 0; justify-content: center; gap: 8px;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                    <strong>Drop Primary Owner role here</strong>
                    <span>or click [★ Set Primary] on any role card below</span>
                </div>
            `;
        }

        const role = this.primaryRole;
        return `
            <div class="stage3-primary-display">
                <div class="stage3-primary-thumb">
                    <img src="/static/images/roles/${role.slug}.jpg" alt="${role.name}" onerror="this.src='/static/images/roles/cybersecurity-engineer.jpg'">
                </div>
                <div class="stage3-primary-info">
                    <h4>${role.name}</h4>
                    <span>Designated Primary Owner</span>
                </div>
            </div>
            ${!this.isSubmitted ? `
                <button class="btn-clear-assignment" 
                        onclick="event.stopPropagation(); Stage3.clearPrimaryRole();" 
                        aria-label="Change Primary Owner">
                    Change Primary &times;
                </button>
            ` : ''}
        `;
    },

    /**
     * Renders content inside Supporting Team zone
     */
    renderSupportingZoneContent() {
        if (this.supportingRoles.length === 0) {
            return `
                <div class="stage3-supporting-empty-prompt">
                    No supporting roles selected yet. Tap <strong>[+ Support]</strong> on role cards below to assemble the supporting team.
                </div>
            `;
        }

        return this.supportingRoles.map(role => `
            <div class="stage3-supporting-chip">
                <div class="stage3-chip-thumb">
                    <img src="/static/images/roles/${role.slug}.jpg" alt="${role.name}" onerror="this.src='/static/images/roles/cybersecurity-engineer.jpg'">
                </div>
                <div class="stage3-chip-details">
                    <strong>${role.name}</strong>
                    <span>${role.category || 'Tech Team'}</span>
                </div>
                ${!this.isSubmitted ? `
                    <button class="btn-remove-chip" 
                            onclick="Stage3.removeSupportingRole(${role.id})" 
                            title="Remove ${role.name} from supporting team"
                            aria-label="Remove ${role.name}">
                        &times;
                    </button>
                ` : ''}
            </div>
        `).join('');
    },

    /**
     * Renders all 5 slots of the collaboration workflow
     */
    renderWorkflowSlots() {
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i > 0) {
                html += `<div class="route-flow-arrow">&darr;</div>`;
            }
            html += this.renderWorkflowSlot(i);
        }
        return html;
    },

    /**
     * Renders a single workflow slot
     */
    renderWorkflowSlot(index) {
        const role = this.workflow[index];
        const isFilled = Boolean(role);

        if (!isFilled) {
            return `
                <div class="stage2-route-slot is-empty"
                     id="stage3-workflow-slot-${index}"
                     data-slot-index="${index}"
                     role="button"
                     tabindex="0"
                     aria-label="Workflow position ${index + 1}: Empty slot. Drop role here or click [+ Flow] on a role card."
                     ondragover="Stage3.onWorkflowSlotDragOver(event, ${index})"
                     ondragleave="Stage3.onWorkflowSlotDragLeave(event, ${index})"
                     ondrop="Stage3.onWorkflowSlotDrop(event, ${index})"
                     onclick="Stage3.onEmptyWorkflowSlotClick(${index})"
                     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); Stage3.onEmptyWorkflowSlotClick(${index});}">
                    <span class="slot-position-badge">${index + 1}</span>
                    <div class="slot-empty-prompt">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        <span>Drop role here or click [+ Flow] below</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="stage2-route-slot is-filled ${this.isSubmitted ? 'locked' : ''}"
                 id="stage3-workflow-slot-${index}"
                 data-slot-index="${index}"
                 draggable="${!this.isSubmitted}"
                 role="region"
                 aria-label="Workflow position ${index + 1}: ${role.name}"
                 ondragstart="Stage3.onWorkflowSlotDragStart(event, ${index})"
                 ondragover="Stage3.onWorkflowSlotDragOver(event, ${index})"
                 ondragleave="Stage3.onWorkflowSlotDragLeave(event, ${index})"
                 ondrop="Stage3.onWorkflowSlotDrop(event, ${index})">
                <span class="slot-position-badge">${index + 1}</span>
                <div class="slot-filled-content">
                    <div class="slot-role-thumb">
                        <img src="/static/images/roles/${role.slug}.jpg" alt="${role.name}" onerror="this.src='/static/images/roles/cybersecurity-engineer.jpg'">
                    </div>
                    <div class="slot-role-details">
                        <strong>${role.name}</strong>
                        <span>${role.category || 'Tech Team'}</span>
                    </div>
                </div>
                ${!this.isSubmitted ? `
                    <div class="slot-action-controls">
                        <button class="btn-slot-control" 
                                title="Move Up" 
                                aria-label="Move ${role.name} up to position ${index}"
                                ${index === 0 ? 'disabled' : ''} 
                                onclick="event.stopPropagation(); Stage3.moveWorkflowUp(${index})">
                            &uarr;
                        </button>
                        <button class="btn-slot-control" 
                                title="Move Down" 
                                aria-label="Move ${role.name} down to position ${index + 2}"
                                ${index >= this.workflow.length - 1 ? 'disabled' : ''} 
                                onclick="event.stopPropagation(); Stage3.moveWorkflowDown(${index})">
                            &darr;
                        </button>
                        <button class="btn-slot-control btn-remove" 
                                title="Remove from workflow" 
                                aria-label="Remove ${role.name} from workflow"
                                onclick="event.stopPropagation(); Stage3.removeWorkflowRole(${index})">
                            &times;
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Renders a single role card in the 12-role bank with Stage 3 action buttons
     */
    renderRoleBankCard(role, idx) {
        const isPrimary = this.primaryRole && this.primaryRole.id === role.id;
        const isSupporting = this.supportingRoles.some(r => r.id === role.id);
        const workflowPos = this.workflow.findIndex(r => r.id === role.id);
        const inWorkflow = workflowPos !== -1;
        const isSecurity = ['cybersecurity-engineer', 'soc-analyst', 'security-analyst'].includes(role.slug);

        let cardClass = 'stage3-role-card';
        if (isPrimary) cardClass += ' is-primary';
        if (isSupporting) cardClass += ' is-supporting';
        if (this.isSubmitted) cardClass += ' locked';

        return `
            <div class="${cardClass}"
                 id="stage3-bank-role-${role.id}"
                 data-role-id="${role.id}"
                 draggable="${!this.isSubmitted}"
                 role="region"
                 aria-label="${role.name}"
                 ondragstart="Stage3.onBankRoleDragStart(event, ${role.id})">
                
                <div class="stage2-role-photo">
                    <img src="/static/images/roles/${role.slug}.jpg" alt="${role.name}" loading="lazy" onerror="this.src='/static/images/roles/cybersecurity-engineer.jpg'">
                    
                    ${isPrimary ? `
                        <span class="stage2-role-placed-badge" style="background-color: var(--color-primary);">PRIMARY OWNER</span>
                    ` : (isSupporting ? `
                        <span class="stage2-role-placed-badge" style="background-color: var(--color-navy);">SUPPORTING</span>
                    ` : '')}

                    ${inWorkflow ? `
                        <span style="position: absolute; bottom: 6px; right: 6px; background-color: rgba(15, 23, 42, 0.85); color: #ffffff; font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; backdrop-filter: blur(4px);">Flow #${workflowPos + 1}</span>
                    ` : ''}

                    <div style="position: absolute; top: 6px; left: 6px; display: flex; gap: 4px;">
                        <span class="stage1-order-tag" style="background-color: rgba(15, 23, 42, 0.78); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700;">#${idx + 1}</span>
                        ${isSecurity ? `
                            <span class="stage1-order-tag" style="background-color: rgba(13, 148, 136, 0.9); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700;">SEC</span>
                        ` : ''}
                    </div>
                </div>

                <div class="stage2-role-body">
                    <h5 class="stage2-role-name">${role.name}</h5>
                    <span class="stage2-role-tag">${role.category || 'Tech Team'}</span>
                </div>

                ${!this.isSubmitted ? `
                    <div class="stage3-card-actions">
                        <button class="btn-card-action ${isPrimary ? 'active-primary' : ''}" 
                                onclick="Stage3.setPrimaryRole(${role.id})"
                                title="Set ${role.name} as Primary Owner"
                                aria-label="Set ${role.name} as Primary Owner">
                            ${isPrimary ? '&#10003; Primary' : '★ Primary'}
                        </button>
                        
                        <button class="btn-card-action ${isSupporting ? 'active-support' : ''}" 
                                onclick="Stage3.toggleSupportingRole(${role.id})"
                                title="Toggle ${role.name} in Supporting Team"
                                aria-label="Toggle ${role.name} in Supporting Team">
                            ${isSupporting ? '&#10003; Support' : '+ Support'}
                        </button>

                        <button class="btn-card-action" 
                                onclick="Stage3.addRoleToWorkflow(${role.id})"
                                title="Add ${role.name} to Workflow sequence"
                                aria-label="Add ${role.name} to Workflow">
                            + Flow
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Sets the single primary owner role
     */
    setPrimaryRole(roleId) {
        if (this.isSubmitted) return;

        const role = this.availableRoles.find(r => r.id === roleId);
        if (!role) return;

        // If this role was in supporting roles, remove it from supporting
        const suppIdx = this.supportingRoles.findIndex(r => r.id === roleId);
        if (suppIdx !== -1) {
            this.supportingRoles.splice(suppIdx, 1);
        }

        this.primaryRole = role;
        State.notify(`Designated ${role.name} as Primary Owner.`, 'info');
        this.updateWorkspaceUI();
    },

    /**
     * Clears the primary owner role
     */
    clearPrimaryRole() {
        if (this.isSubmitted) return;
        this.primaryRole = null;
        this.updateWorkspaceUI();
    },

    /**
     * Toggles a role into/out of the supporting team
     */
    toggleSupportingRole(roleId) {
        if (this.isSubmitted) return;

        const role = this.availableRoles.find(r => r.id === roleId);
        if (!role) return;

        // Cannot add Primary Owner to supporting team
        if (this.primaryRole && this.primaryRole.id === roleId) {
            State.notify(`${role.name} is already designated as the Primary Owner and cannot be in the supporting team.`, 'warning');
            return;
        }

        const existingIdx = this.supportingRoles.findIndex(r => r.id === roleId);
        if (existingIdx !== -1) {
            this.supportingRoles.splice(existingIdx, 1);
            State.notify(`Removed ${role.name} from Supporting Team.`, 'info');
        } else {
            const expectedCount = this.getExpectedSupportingCount();
            if (this.supportingRoles.length >= expectedCount) {
                State.notify(`This incident requires ${expectedCount} supporting roles. Remove a role before adding another.`, 'warning');
                return;
            }
            this.supportingRoles.push(role);
            State.notify(`Added ${role.name} to Supporting Team.`, 'info');
        }

        this.updateWorkspaceUI();
    },

    /**
     * Removes a role from the supporting team
     */
    removeSupportingRole(roleId) {
        if (this.isSubmitted) return;
        const idx = this.supportingRoles.findIndex(r => r.id === roleId);
        if (idx !== -1) {
            const removed = this.supportingRoles.splice(idx, 1);
            if (removed[0]) {
                State.notify(`Removed ${removed[0].name} from Supporting Team.`, 'info');
            }
            this.updateWorkspaceUI();
        }
    },

    /**
     * Helper to automatically populate workflow from selected Primary + Supporting roles
     */
    populateWorkflowFromTeam() {
        if (this.isSubmitted) return;

        const teamRoles = [];
        if (this.primaryRole) {
            teamRoles.push(this.primaryRole);
        }
        this.supportingRoles.forEach(r => {
            if (!teamRoles.some(existing => existing.id === r.id)) {
                teamRoles.push(r);
            }
        });

        // Always check if Engineering Manager is needed to reach 5 roles if not already present
        if (teamRoles.length < 5) {
            const em = this.availableRoles.find(r => r.slug === 'engineering-manager');
            if (em && !teamRoles.some(r => r.id === em.id)) {
                teamRoles.push(em);
            }
        }

        if (teamRoles.length === 0) {
            State.notify('Please select your Primary Owner and Supporting Team first.', 'warning');
            return;
        }

        this.workflow = teamRoles.slice(0, 5);
        this.updateWorkspaceUI();
        State.notify('Populated workflow sequence. Use Move Up / Move Down or drag to arrange into correct execution order.', 'info');
    },

    /**
     * Adds a role to the workflow sequence
     */
    addRoleToWorkflow(roleId) {
        if (this.isSubmitted) return;

        const role = this.availableRoles.find(r => r.id === roleId);
        if (!role) return;

        const existingPos = this.workflow.findIndex(r => r.id === roleId);
        if (existingPos !== -1) {
            State.notify(`${role.name} is already in the workflow at step ${existingPos + 1}.`, 'info');
            return;
        }

        if (this.workflow.length >= 5) {
            State.notify('Workflow sequence is full (5 roles max). Remove or reorder a role to make changes.', 'warning');
            return;
        }

        this.workflow.push(role);
        this.updateWorkspaceUI();
    },

    /**
     * Removes a role from the workflow sequence
     */
    removeWorkflowRole(index) {
        if (this.isSubmitted) return;
        if (index >= 0 && index < this.workflow.length) {
            const removed = this.workflow.splice(index, 1);
            if (removed[0]) {
                State.notify(`Removed ${removed[0].name} from workflow.`, 'info');
            }
            this.updateWorkspaceUI();
        }
    },

    /**
     * Moves a workflow role up one position
     */
    moveWorkflowUp(index) {
        if (this.isSubmitted || index <= 0) return;
        const temp = this.workflow[index];
        this.workflow[index] = this.workflow[index - 1];
        this.workflow[index - 1] = temp;
        this.updateWorkspaceUI();
    },

    /**
     * Moves a workflow role down one position
     */
    moveWorkflowDown(index) {
        if (this.isSubmitted || index >= this.workflow.length - 1) return;
        const temp = this.workflow[index];
        this.workflow[index] = this.workflow[index + 1];
        this.workflow[index + 1] = temp;
        this.updateWorkspaceUI();
    },

    /**
     * Clears all roles from the workflow sequence
     */
    clearWorkflow() {
        if (this.isSubmitted) return;
        this.workflow = [];
        this.updateWorkspaceUI();
        State.notify('Workflow reset. Add roles to sequence.', 'info');
    },

    /**
     * Resets all selections in the scenario
     */
    resetAllSelections() {
        if (this.isSubmitted) return;
        this.primaryRole = null;
        this.supportingRoles = [];
        this.workflow = [];
        this.updateWorkspaceUI();
        State.notify('All team and workflow selections have been reset.', 'info');
    },

    /**
     * Primary zone click handler
     */
    onPrimaryZoneClick() {
        if (this.isSubmitted) return;
        State.notify('Tap [★ Primary] on any role card below to designate the Primary Owner.', 'info');
        const bank = document.getElementById('stage3-available-roles-grid');
        if (bank) bank.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Workflow empty slot click handler
     */
    onEmptyWorkflowSlotClick(slotIndex) {
        if (this.isSubmitted) return;
        State.notify(`Click [+ Flow] on any role card below to place it into Workflow Step ${slotIndex + 1}.`, 'info');
        const bank = document.getElementById('stage3-available-roles-grid');
        if (bank) bank.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Drag-and-drop: Start dragging from role bank
     */
    onBankRoleDragStart(e, roleId) {
        if (this.isSubmitted) {
            e.preventDefault();
            return;
        }
        this.draggedRoleId = roleId;
        this.draggedSlotIndex = null;
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'bank_role', roleId: roleId }));
        e.dataTransfer.effectAllowed = 'copyMove';
    },

    /**
     * Drag-and-drop: Over primary zone
     */
    onPrimaryDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        const zone = document.getElementById('stage3-primary-dropzone');
        if (zone) zone.classList.add('drag-over');
    },

    onPrimaryDragLeave(e) {
        const zone = document.getElementById('stage3-primary-dropzone');
        if (zone) zone.classList.remove('drag-over');
    },

    onPrimaryDrop(e) {
        e.preventDefault();
        const zone = document.getElementById('stage3-primary-dropzone');
        if (zone) zone.classList.remove('drag-over');

        if (this.isSubmitted) return;
        let roleId = this.draggedRoleId;
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
            if (data.roleId) roleId = data.roleId;
        } catch (err) {}

        if (roleId) {
            this.setPrimaryRole(roleId);
        }
    },

    /**
     * Drag-and-drop: Over supporting zone
     */
    onSupportingDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    },

    onSupportingDragLeave(e) {},

    onSupportingDrop(e) {
        e.preventDefault();
        if (this.isSubmitted) return;
        let roleId = this.draggedRoleId;
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
            if (data.roleId) roleId = data.roleId;
        } catch (err) {}

        if (roleId) {
            this.toggleSupportingRole(roleId);
        }
    },

    /**
     * Drag-and-drop: Over workflow slot
     */
    onWorkflowSlotDragStart(e, slotIndex) {
        if (this.isSubmitted) {
            e.preventDefault();
            return;
        }
        this.draggedSlotIndex = slotIndex;
        this.draggedRoleId = null;
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'workflow_slot', slotIndex: slotIndex }));
        e.dataTransfer.effectAllowed = 'move';
    },

    onWorkflowSlotDragOver(e, slotIndex) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const slot = document.getElementById(`stage3-workflow-slot-${slotIndex}`);
        if (slot) slot.classList.add('drag-over');
    },

    onWorkflowSlotDragLeave(e, slotIndex) {
        const slot = document.getElementById(`stage3-workflow-slot-${slotIndex}`);
        if (slot) slot.classList.remove('drag-over');
    },

    onWorkflowSlotDrop(e, targetSlotIndex) {
        e.preventDefault();
        const slot = document.getElementById(`stage3-workflow-slot-${targetSlotIndex}`);
        if (slot) slot.classList.remove('drag-over');

        if (this.isSubmitted) return;

        let data = {};
        try {
            data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        } catch (err) {}

        // Case 1: Dragging from available bank
        if (data.type === 'bank_role' || this.draggedRoleId) {
            const roleId = data.roleId || this.draggedRoleId;
            const role = this.availableRoles.find(r => r.id === roleId);
            if (!role) return;

            const existingPos = this.workflow.findIndex(r => r.id === roleId);
            if (existingPos !== -1) {
                if (targetSlotIndex < this.workflow.length) {
                    const temp = this.workflow[targetSlotIndex];
                    this.workflow[targetSlotIndex] = role;
                    this.workflow[existingPos] = temp;
                }
            } else {
                if (targetSlotIndex < this.workflow.length) {
                    this.workflow[targetSlotIndex] = role;
                } else if (this.workflow.length < 5) {
                    this.workflow.push(role);
                }
            }
            this.draggedRoleId = null;
            this.updateWorkspaceUI();
            return;
        }

        // Case 2: Dragging a slot to reorder
        if (data.type === 'workflow_slot' || this.draggedSlotIndex !== null) {
            const sourceIndex = (data.slotIndex !== undefined) ? data.slotIndex : this.draggedSlotIndex;
            if (sourceIndex === null || sourceIndex === undefined) return;

            if (targetSlotIndex < this.workflow.length && sourceIndex < this.workflow.length) {
                const temp = this.workflow[targetSlotIndex];
                this.workflow[targetSlotIndex] = this.workflow[sourceIndex];
                this.workflow[sourceIndex] = temp;
            } else if (sourceIndex < this.workflow.length) {
                const [item] = this.workflow.splice(sourceIndex, 1);
                this.workflow.push(item);
            }
            this.draggedSlotIndex = null;
            this.updateWorkspaceUI();
        }
    },

    /**
     * Updates all UI components after changes
     */
    updateWorkspaceUI() {
        const expectedSuppCount = this.getExpectedSupportingCount();

        // 1. Primary zone update
        const primaryZone = document.getElementById('stage3-primary-dropzone');
        const primaryBadge = document.getElementById('badge-primary-status');
        const stepNum1 = document.getElementById('step-num-1');
        if (primaryZone) {
            primaryZone.className = `stage3-primary-zone ${this.primaryRole ? 'is-filled' : 'is-empty'}`;
            primaryZone.innerHTML = this.renderPrimaryZoneContent();
        }
        if (primaryBadge) {
            primaryBadge.textContent = this.primaryRole ? 'Designated' : 'Unassigned';
            primaryBadge.className = `badge ${this.primaryRole ? 'badge-success' : 'badge-teal'}`;
        }
        if (stepNum1) {
            stepNum1.className = `stage3-step-number ${this.primaryRole ? 'step-completed' : ''}`;
        }

        // 2. Supporting team update
        const suppContainer = document.getElementById('stage3-supporting-container');
        const suppBadge = document.getElementById('badge-supporting-counter');
        const stepNum2 = document.getElementById('step-num-2');
        if (suppContainer) {
            suppContainer.className = `stage3-supporting-zone ${this.supportingRoles.length > 0 ? 'has-roles' : ''}`;
            suppContainer.innerHTML = this.renderSupportingZoneContent();
        }
        if (suppBadge) {
            const isCountMatch = (this.supportingRoles.length === expectedSuppCount);
            suppBadge.textContent = `${this.supportingRoles.length} / ${expectedSuppCount} Roles Selected`;
            suppBadge.className = `badge ${isCountMatch ? 'badge-success' : 'badge-navy'}`;
        }
        if (stepNum2) {
            const isCountMatch = (this.supportingRoles.length === expectedSuppCount);
            stepNum2.className = `stage3-step-number ${isCountMatch ? 'step-completed' : ''}`;
        }

        // 3. Workflow update
        const workflowContainer = document.getElementById('stage3-workflow-slots-container');
        const workflowBadge = document.getElementById('badge-workflow-counter');
        const stepNum3 = document.getElementById('step-num-3');
        if (workflowContainer) {
            workflowContainer.innerHTML = this.renderWorkflowSlots();
        }
        if (workflowBadge) {
            const isWorkflowFull = (this.workflow.length === 5);
            workflowBadge.textContent = `${this.workflow.length} / 5 Steps Arranged`;
            workflowBadge.className = `badge ${isWorkflowFull ? 'badge-success' : 'badge-navy'}`;
        }
        if (stepNum3) {
            stepNum3.className = `stage3-step-number ${this.workflow.length === 5 ? 'step-completed' : ''}`;
        }

        // 4. Role Bank update
        const bankGrid = document.getElementById('stage3-available-roles-grid');
        if (bankGrid) {
            bankGrid.innerHTML = this.availableRoles.map((role, idx) => this.renderRoleBankCard(role, idx)).join('');
        }

        // 5. Submit button state
        const submitBtn = document.getElementById('btn-submit-stage3');
        if (submitBtn) {
            const isReady = (
                this.primaryRole !== null &&
                this.supportingRoles.length === expectedSuppCount &&
                this.workflow.length === 5 &&
                !this.isSubmitted
            );
            submitBtn.disabled = !isReady;
            if (isReady) {
                submitBtn.title = 'Click to submit complete collaboration plan';
            } else if (!this.isSubmitted) {
                submitBtn.title = 'Complete Primary Owner, Supporting Team, and Workflow to submit';
            }
        }
    },

    /**
     * Submits the collaboration plan to backend for authoritative evaluation
     */
    async submitCollaborationPlan() {
        if (this.isSubmitted) return;

        const s = this.scenarios[this.currentIndex];
        if (!s) return;

        const expectedSuppCount = this.getExpectedSupportingCount();

        // Strict Client-Side Pre-validation with Friendly Messages
        if (!this.primaryRole) {
            State.notify('Please designate a Primary Owner for this incident.', 'warning');
            return;
        }

        if (this.supportingRoles.length !== expectedSuppCount) {
            State.notify(`Please select exactly ${expectedSuppCount} supporting roles for this incident (currently ${this.supportingRoles.length} selected).`, 'warning');
            return;
        }

        if (this.supportingRoles.some(r => r.id === this.primaryRole.id)) {
            State.notify('The Primary Owner cannot also be included in the Supporting Team.', 'warning');
            return;
        }

        if (this.workflow.length !== 5) {
            State.notify(`Please arrange all 5 roles into the collaboration workflow sequence (currently ${this.workflow.length} arranged).`, 'warning');
            return;
        }

        const submitBtn = document.getElementById('btn-submit-stage3');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <span style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
                    Evaluating Collaboration Plan...
                </span>
            `;
        }

        this.isSubmitted = true;
        this.updateWorkspaceUI();

        try {
            const payload = {
                stage: 3,
                scenario_id: s.id,
                primary_role: this.primaryRole.id,
                supporting_roles: this.supportingRoles.map(r => r.id),
                workflow: this.workflow.map(r => r.id),
                student_notes: `Stage 3 Plan: Primary=${this.primaryRole.name} | Support=${this.supportingRoles.map(r => r.name).join(', ')} | Flow=${this.workflow.map(r => r.name).join(' -> ')}`
            };

            const response = await API.submitAnswer(State.session.id, payload);
            this.currentFeedback = response;
            this.sessionProgress = response.stage_progress;

            this.renderFeedback(response);
        } catch (err) {
            console.error('Failed to submit Stage 3 collaboration plan:', err);
            this.isSubmitted = false;
            this.updateWorkspaceUI();

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Collaboration Plan &rarr;';
            }

            State.notify('Something went wrong while submitting your collaboration plan. Please try again.', 'danger');
        }
    },

    /**
     * Renders feedback based on backend authoritative evaluation
     */
    renderFeedback(result) {
        const mount = document.getElementById('stage3-feedback-mount');
        if (!mount) return;

        const isCorrect = Boolean(result.is_correct);
        const explanation = result.explanation || '';
        const submittedWorkflow = Array.isArray(result.workflow) ? result.workflow : [];
        const correctWorkflow = Array.isArray(result.correct_workflow) ? result.correct_workflow : [];
        const submittedSupporting = Array.isArray(result.supporting_roles) ? result.supporting_roles : [];
        const correctSupporting = Array.isArray(result.correct_supporting_roles) ? result.correct_supporting_roles : [];
        const primaryRole = result.primary_role || {};
        const correctPrimary = result.correct_primary_role || {};

        const isLastScenario = this.currentIndex >= this.scenarios.length - 1;
        const nextScenarioNum = this.currentIndex + 2;

        mount.innerHTML = `
            <div class="stage2-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}" role="alert">
                <!-- Header Badge Row -->
                <div class="feedback-badge-row">
                    ${isCorrect ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-success" style="font-size: 0.95rem; font-weight: 800; padding: 6px 16px;">
                                &#10003; Collaboration Plan Correct
                            </span>
                            <span class="badge badge-teal">+1 Point Awarded</span>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-warning" style="font-size: 0.95rem; font-weight: 800; padding: 6px 16px; background-color: #f59e0b; color: #ffffff;">
                                Let's review the collaboration plan.
                            </span>
                            <span class="badge badge-navy">0 Points</span>
                        </div>
                    `}

                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-navy);">
                        Scenario ${this.currentIndex + 1} of ${this.scenarios.length}
                    </span>
                </div>

                <!-- Structured Feedback Specifications -->
                ${isCorrect ? `
                    <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 14px;">
                        <!-- Primary Role -->
                        <div class="feedback-spec-card">
                            <h5>PRIMARY ROLE:</h5>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span class="badge badge-teal" style="font-size: 0.9rem; padding: 6px 14px;">
                                    ${correctPrimary.name || primaryRole.name}
                                </span>
                                <span style="font-size: 0.85rem; color: #059669; font-weight: 600;">&#10003; Incident Lead Confirmed</span>
                            </div>
                        </div>

                        <!-- Supporting Team -->
                        <div class="feedback-spec-card">
                            <h5>SUPPORTING TEAM:</h5>
                            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                ${correctSupporting.map(r => `
                                    <span class="badge badge-navy" style="font-size: 0.85rem; padding: 5px 12px;">
                                        ${r.name}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Collaboration Workflow -->
                        <div class="feedback-spec-card">
                            <h5>COLLABORATION WORKFLOW:</h5>
                            <div class="feedback-flow-stream">
                                ${correctWorkflow.map((item, idx) => `
                                    <div class="feedback-flow-step match-correct">
                                        <span class="flow-step-num" style="background-color: var(--color-primary);">${item.position || (idx + 1)}</span>
                                        <span class="flow-step-name">${item.name}</span>
                                        <span class="badge badge-teal" style="font-size: 0.7rem; margin-left: auto;">Step ${idx + 1}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : `
                    <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 14px;">
                        <!-- Primary Role Comparison -->
                        <div class="stage3-feedback-roles-grid">
                            <div class="feedback-spec-card">
                                <h5 style="color: #64748b;">YOUR PRIMARY ROLE:</h5>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span class="badge badge-navy" style="font-size: 0.85rem; padding: 5px 12px;">
                                        ${primaryRole.name || 'None Selected'}
                                    </span>
                                    <span style="font-size: 0.8rem; color: ${result.is_primary_correct ? '#059669' : '#d97706'}; font-weight: 700;">
                                        ${result.is_primary_correct ? '&#10003; Correct' : 'Needs Review'}
                                    </span>
                                </div>
                            </div>

                            <div class="feedback-spec-card">
                                <h5 style="color: var(--color-primary);">CORRECT PRIMARY ROLE:</h5>
                                <span class="badge badge-teal" style="font-size: 0.85rem; padding: 5px 12px;">
                                    ${correctPrimary.name}
                                </span>
                            </div>
                        </div>

                        <!-- Supporting Team Comparison -->
                        <div class="stage3-feedback-roles-grid">
                            <div class="feedback-spec-card">
                                <h5 style="color: #64748b;">YOUR TEAM:</h5>
                                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                    ${submittedSupporting.map(r => `
                                        <span class="badge badge-navy" style="font-size: 0.78rem;">${r.name}</span>
                                    `).join('')}
                                </div>
                            </div>

                            <div class="feedback-spec-card">
                                <h5 style="color: var(--color-primary);">CORRECT SUPPORTING TEAM:</h5>
                                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                    ${correctSupporting.map(r => `
                                        <span class="badge badge-teal" style="font-size: 0.78rem;">${r.name}</span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>

                        <!-- Workflow Comparison -->
                        <div class="feedback-compare-grid">
                            <div class="feedback-compare-col">
                                <h5 style="color: #64748b;">YOUR WORKFLOW:</h5>
                                <div class="feedback-flow-stream">
                                    ${submittedWorkflow.map((item, idx) => {
                                        const match = correctWorkflow[idx] && correctWorkflow[idx].name === item.name;
                                        return `
                                            <div class="feedback-flow-step ${match ? 'match-correct' : 'match-incorrect'}">
                                                <span class="flow-step-num" style="background-color: ${match ? 'var(--color-primary)' : '#94a3b8'};">${item.position || (idx + 1)}</span>
                                                <span class="flow-step-name" style="color: ${match ? 'var(--color-navy)' : '#475569'};">${item.name}</span>
                                                <span style="font-size: 0.75rem; margin-left: auto; color: ${match ? '#059669' : '#d97706'}; font-weight: 700;">
                                                    ${match ? '&#10003; Match' : 'Order Shift'}
                                                </span>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>

                            <div class="feedback-compare-col">
                                <h5 style="color: var(--color-primary);">CORRECT WORKFLOW:</h5>
                                <div class="feedback-flow-stream">
                                    ${correctWorkflow.map((item, idx) => `
                                        <div class="feedback-flow-step match-correct">
                                            <span class="flow-step-num" style="background-color: var(--color-primary);">${item.position || (idx + 1)}</span>
                                            <span class="flow-step-name">${item.name}</span>
                                            <span class="badge badge-teal" style="font-size: 0.7rem; margin-left: auto;">Sequence ${idx + 1}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `}

                <!-- Educational Rationale / Explanation Box -->
                <div class="feedback-explanation" style="margin-top: 16px;">
                    <strong>${isCorrect ? 'Why this collaboration plan is optimal:' : 'Collaboration Model Explanation:'}</strong>
                    <p style="margin-top: 6px; white-space: pre-line;">${explanation}</p>
                </div>

                <!-- Next Action -->
                <div class="feedback-actions">
                    <button class="btn btn-primary btn-lg" 
                            id="btn-next-stage3"
                            onclick="Stage3.nextScenario()"
                            style="font-size: 1.05rem; padding: 13px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                        ${isLastScenario ? 'Complete Stage 3 &rarr;' : `Next Scenario &rarr; Scenario ${nextScenarioNum}`}
                    </button>
                </div>
            </div>
        `;

        mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Advances to next scenario or renders Stage 3 completion screen
     */
    nextScenario() {
        this.currentIndex++;
        this.primaryRole = null;
        this.supportingRoles = [];
        this.workflow = [];
        this.isSubmitted = false;
        this.currentFeedback = null;

        if (this.currentIndex >= this.scenarios.length) {
            this.renderCompletionScreen();
        } else {
            this.renderCurrentScenario();
        }
    },

    /**
     * Displays Stage 3 completion state
     */
    renderCompletionScreen() {
        if (!this.container) return;

        // Authoritative scores from sessionProgress if available
        const progress = this.sessionProgress || {};
        const completed = progress.scenarios_completed || this.scenarios.length;
        const correct = typeof progress.correct_answers === 'number' ? progress.correct_answers : 3;
        const total = progress.total_scenarios || this.scenarios.length || 3;
        const percentage = typeof progress.stage_score_percentage === 'number' 
            ? progress.stage_score_percentage 
            : Math.round((correct / total) * 100);

        this.container.innerHTML = `
            <div class="stage3-container">
                <div class="stage1-completion-card">
                    <div class="completion-icon-wrapper" aria-hidden="true" style="background-color: var(--color-bg-soft-teal); color: var(--color-primary); border-color: var(--color-primary-border);">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>

                    <span class="badge badge-teal" style="font-size: 0.85rem; font-weight: 700; padding: 6px 16px;">STAGE 3 COMPLETE</span>
                    <h2 class="completion-title">Stage 3 Complete</h2>
                    <p class="completion-subtitle">
                        You have mastered cross-functional team assembly and workflow coordination for complex incidents.
                    </p>

                    <!-- Scorecard Grid -->
                    <div class="completion-stats-grid">
                        <div class="completion-stat-card">
                            <span class="stat-big-number">${completed} / ${total}</span>
                            <span class="stat-small-label">Scenarios Completed</span>
                        </div>
                        <div class="completion-stat-card">
                            <span class="stat-big-number">${correct} / ${total}</span>
                            <span class="stat-small-label">Correct Collaboration Plans</span>
                        </div>
                        <div class="completion-stat-card highlight">
                            <span class="stat-big-number">${percentage}%</span>
                            <span class="stat-small-label">Stage 3 Score</span>
                        </div>
                    </div>

                    <!-- Key Takeaways Box -->
                    <div class="completion-takeaway-box">
                        <h4>Key Takeaways: Multi-Role Incident Collaboration</h4>
                        <ul>
                            <li>
                                <strong>Clear Incident Leadership:</strong> Complex security crises require a designated Primary Owner (SOC Analyst for active intrusion triage, Cybersecurity Engineer for zero-day vulnerability remediation) to lead coordination while domain specialists execute technical containment.
                            </li>
                            <li>
                                <strong>Interdisciplinary Coordination:</strong> Effective solutions depend on seamless synergy—Backend Developers patch vulnerable application logic, Network Engineers isolate affected subnets, DevOps engineers safeguard immutable backups, and QA validates security fixes.
                            </li>
                            <li>
                                <strong>Structured Communication & Governance:</strong> Engineering Managers align technical execution with executive visibility, resource escalation, and customer transparency to ensure compliant, verified incident closure.
                            </li>
                        </ul>
                    </div>

                    <!-- Action Buttons -->
                    <div class="completion-actions">
                        <button class="btn btn-primary btn-lg" 
                                id="btn-view-final-results"
                                onclick="App.goToResults()"
                                style="font-size: 1.05rem; padding: 14px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                            View Final Results &rarr;
                        </button>
                        <button class="btn btn-secondary btn-lg" 
                                onclick="Stage3.reviewScenarios()"
                                style="font-size: 1.05rem; padding: 14px 28px;">
                            Review Stage 3 Scenarios
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Allows student to review scenarios from the beginning
     */
    reviewScenarios() {
        this.currentIndex = 0;
        this.primaryRole = null;
        this.supportingRoles = [];
        this.workflow = [];
        this.isSubmitted = false;
        this.renderCurrentScenario();
    }
};
