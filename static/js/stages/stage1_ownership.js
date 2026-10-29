/**
 * TASK COMPASS — STAGE 1: WHO OWNS THIS?
 * 
 * Interactive simulation stage teaching students how to identify the primary
 * owner of a workplace task or incident in a modern technology company.
 * 
 * Features:
 * - One scenario at a time (Phishing Attack, Web App Vulnerability, Suspicious Network Traffic)
 * - Clear progress indicator (Stage 1 of 3, Scenario X of 3)
 * - 12 Tech Company role cards in canonical order with realistic workplace photographs
 * - Click-to-select and Drag-and-Drop support with synchronized state
 * - Authoritative server-side answer evaluation and scoring (1 pt per correct answer)
 * - Rich educational feedback (Correct / Not quite, Primary Owner, Supporting Roles, Explanation)
 * - Stage 1 Completion screen with scorecard and takeaways
 * - Session state recovery across page reloads
 * - Full keyboard accessibility and mobile responsiveness
 */

const Stage1 = {
    container: null,
    scenarios: [],
    currentIndex: 0,
    selectedRole: null,
    isSubmitted: false,
    currentFeedback: null,
    sessionProgress: null,

    /**
     * Initializes and renders Stage 1
     */
    async render(container, scenarios) {
        this.container = container;
        this.scenarios = Array.isArray(scenarios) ? scenarios : [];
        this.selectedRole = null;
        this.isSubmitted = false;
        this.currentFeedback = null;

        if (this.scenarios.length === 0) {
            container.innerHTML = `
                <div class="scenario-card" style="text-align: center; padding: 48px;">
                    <h3 style="color: var(--color-navy); margin-bottom: 8px;">No Stage 1 Scenarios Found</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                        Unable to load workplace scenarios for Stage 1. Please try again.
                    </p>
                    <button class="btn btn-primary" onclick="App.goToStage(1)">Reload Stage 1</button>
                </div>
            `;
            return;
        }

        // Check session progress for state recovery
        await this.syncSessionState();

        // If all scenarios already completed, render completion screen
        if (this.sessionProgress && this.sessionProgress.is_stage_complete) {
            this.renderCompletionScreen();
        } else {
            this.renderCurrentScenario();
        }
    },

    /**
     * Synchronizes state with backend SimulationSession
     */
    async syncSessionState() {
        if (!State.session || !State.session.id) return;

        try {
            const sessionData = await API.getSession(State.session.id);
            if (sessionData && sessionData.stage_1_progress) {
                this.sessionProgress = sessionData.stage_1_progress;
                const answered = sessionData.stage_1_progress.answered_scenarios || {};

                // Find first unanswered scenario
                const firstUnansweredIdx = this.scenarios.findIndex(s => !answered[s.id]);
                if (firstUnansweredIdx !== -1) {
                    this.currentIndex = firstUnansweredIdx;
                } else if (Object.keys(answered).length >= this.scenarios.length) {
                    this.sessionProgress.is_stage_complete = true;
                }
            }
        } catch (err) {
            console.warn('Could not sync Stage 1 session state from server:', err);
        }
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

        // Canonical 12 roles ordering for Tech Company
        const sortedRoles = this.getSortedRoles();

        this.container.innerHTML = `
            <div class="stage1-container">
                <!-- Stage 1 Top Header & Progress Indicator -->
                <div class="stage1-header-card">
                    <div class="stage1-header-left">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-teal" style="font-weight: 700; font-size: 0.8rem; padding: 4px 10px;">STAGE 1 OF 3</span>
                            <span class="badge badge-navy" style="font-size: 0.8rem; padding: 4px 10px;">${State.activeWorkplace ? State.activeWorkplace.name.toUpperCase() : 'TECH COMPANY'}</span>
                        </div>
                        <h2 class="stage1-main-title">WHO OWNS THIS?</h2>
                        <p class="stage1-main-subtitle">Choose the role that should primarily own the situation.</p>
                    </div>
                    <div class="stage1-header-right">
                        <div class="stage1-scenario-pill" id="stage1-progress-pill">
                            <span class="stat-dot"></span>
                            <span>Scenario ${currentNum} of ${totalScenarios}</span>
                        </div>
                    </div>
                </div>

                <!-- Main Scenario Card -->
                <div class="scenario-card stage1-card" id="stage1-scenario-card">
                    <!-- Scenario Meta Header -->
                    <div class="scenario-header-bar">
                        <div class="scenario-badge-cluster">
                            <span class="badge ${urgencyClass}">${s.urgency_level || 'High'} Priority</span>
                            ${s.incident_type ? `<span class="badge badge-navy">${s.incident_type}</span>` : ''}
                        </div>
                        <span class="scenario-number-tag">Scenario ${currentNum} of ${totalScenarios}</span>
                    </div>

                    <!-- Scenario Title -->
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
                    <div class="scenario-question-callout">
                        <h4 class="scenario-question-title">WHO SHOULD OWN THIS?</h4>
                        <p class="scenario-question-subtitle">
                            Drop the primary owner into the target area below, or choose a role card from the team list.
                        </p>
                    </div>

                    <!-- Drop Target Zone -->
                    <div class="stage1-dropzone ${this.selectedRole ? 'has-assignment' : ''}" 
                         id="stage1-dropzone"
                         role="region"
                         aria-label="Drop target zone for primary owner role">
                        ${this.renderDropzoneContent()}
                    </div>

                    <!-- Selected Role Status Bar -->
                    <div class="stage1-selection-status-bar" id="stage1-selection-status-bar">
                        <div class="selection-status-left">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                            <span>
                                ${this.selectedRole 
                                    ? `Selected Role: <strong>${this.selectedRole.name}</strong> (${this.selectedRole.category || 'Core Team'})` 
                                    : 'No primary owner selected yet. Tap or drag a role card below.'}
                            </span>
                        </div>
                        ${this.selectedRole ? `
                            <button class="btn-clear-assignment" onclick="Stage1.clearSelection()" style="background: none; border: none; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer;">
                                Clear Selection &times;
                            </button>
                        ` : ''}
                    </div>

                    <!-- Roles Grid Header -->
                    <div class="stage1-roles-grid-header">
                        <div>
                            <h4>SELECT A TECH COMPANY ROLE</h4>
                            <p>Select exactly ONE primary owner who should lead this incident or task.</p>
                        </div>
                        <span class="badge badge-navy">${sortedRoles.length} Available Roles</span>
                    </div>

                    <!-- Compact Role Cards Grid (4 cols desktop, 2 cols tablet, 1 col mobile) -->
                    <div class="stage1-roles-grid" id="stage1-roles-bank" role="radiogroup" aria-label="12 Tech Company Roles">
                        ${sortedRoles.map((role, idx) => this.renderCompactRoleCard(role, idx)).join('')}
                    </div>

                    <!-- Action Bar -->
                    <div class="stage1-action-bar">
                        <button class="btn btn-primary btn-lg" 
                                id="btn-submit-stage1" 
                                onclick="Stage1.submitAnswer()" 
                                ${!this.selectedRole || this.isSubmitted ? 'disabled' : ''}
                                style="font-size: 1.05rem; padding: 13px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35);">
                            Submit Answer &rarr;
                        </button>
                    </div>

                    <!-- Feedback Mount Point -->
                    <div id="stage1-feedback-mount"></div>
                </div>
            </div>
        `;

        this.setupDropzone();
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Returns HTML content for the drop zone
     */
    renderDropzoneContent() {
        if (this.selectedRole) {
            const role = this.selectedRole;
            const roleIconSvg = App.getRoleIconSvg(role.slug || role.name);
            return `
                <div class="assigned-role-display">
                    <div class="assigned-role-avatar" aria-hidden="true">
                        ${roleIconSvg}
                    </div>
                    <div class="assigned-role-info">
                        <h4>${role.name}</h4>
                        <span>Primary Owner Selected</span>
                    </div>
                    ${!this.isSubmitted ? `
                        <button class="btn-clear-assignment" onclick="event.stopPropagation(); Stage1.clearSelection();" aria-label="Change primary owner">
                            Change &times;
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="stage1-dropzone-prompt">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <strong>Drop the primary owner here</strong>
                <span>or tap any role card below to select</span>
            </div>
        `;
    },

    /**
     * Renders a single compact role card
     */
    renderCompactRoleCard(role, idx) {
        const isSelected = this.selectedRole && this.selectedRole.id === role.id;
        const roleIconSvg = App.getRoleIconSvg(role.slug || role.name);
        const altText = App.getRoleSemanticAltText ? App.getRoleSemanticAltText(role) : `${role.name} realistic photo`;
        const catClass = App.getCategoryClass ? App.getCategoryClass(role.category) : '';
        const isSecurity = ['cybersecurity-engineer', 'soc-analyst', 'security-analyst'].includes(role.slug);

        return `
            <div class="stage1-compact-role-card ${isSelected ? 'selected' : ''} ${this.isSubmitted ? 'locked' : ''}"
                 id="stage1-card-role-${role.id}"
                 data-role-id="${role.id}"
                 data-role-slug="${role.slug}"
                 draggable="${!this.isSubmitted}"
                 tabindex="${this.isSubmitted ? '-1' : '0'}"
                 role="radio"
                 aria-checked="${isSelected ? 'true' : 'false'}"
                 aria-label="Select ${role.name} as primary owner"
                 onclick="Stage1.selectRoleById(${role.id})"
                 ondragstart="Stage1.onDragStart(event, ${role.id})"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); Stage1.selectRoleById(${role.id});}">
                
                <!-- 16:9 Photo Header -->
                <div class="stage1-role-photo-wrapper">
                    <img src="/static/images/roles/${role.slug}.jpg"
                         alt="${altText}"
                         width="300"
                         height="169"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='/static/images/roles/${role.slug}.svg';">
                    
                    <div class="stage1-photo-badges">
                        <span class="stage1-order-tag">#${idx + 1}</span>
                        ${isSecurity ? `
                            <span class="stage1-order-tag" style="background-color: rgba(13, 148, 136, 0.9);">SEC</span>
                        ` : ''}
                    </div>

                    <!-- Checkmark floating on photo -->
                    <div class="stage1-role-check-indicator" aria-hidden="true">&#10003;</div>

                    <!-- Floating Avatar Circle Icon -->
                    <div class="stage1-avatar-icon" aria-hidden="true">
                        ${roleIconSvg}
                    </div>
                </div>

                <!-- Card Body -->
                <div class="stage1-role-card-body">
                    <h5 class="stage1-role-card-name">${role.name}</h5>
                    <div class="stage1-card-meta">
                        <span class="role-card-category-pill ${catClass}" style="font-size: 0.68rem; padding: 2px 7px;">
                            ${role.category || 'Specialist'}
                        </span>
                    </div>
                    <p class="stage1-role-card-desc" title="${role.tagline || role.description}">
                        ${role.tagline || (role.description ? role.description.substring(0, 65) + '...' : '')}
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Sets up HTML5 Drag-and-Drop on the dropzone
     */
    setupDropzone() {
        const dropzone = document.getElementById('stage1-dropzone');
        if (!dropzone) return;

        dropzone.addEventListener('dragover', (e) => {
            if (this.isSubmitted) return;
            e.preventDefault();
            dropzone.classList.add('drag-active');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('drag-active');
        });

        dropzone.addEventListener('drop', (e) => {
            if (this.isSubmitted) return;
            e.preventDefault();
            dropzone.classList.remove('drag-active');

            const roleIdStr = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('application/json');
            const roleId = parseInt(roleIdStr, 10);
            if (!isNaN(roleId)) {
                this.selectRoleById(roleId);
            }
        });

        dropzone.addEventListener('click', () => {
            if (this.isSubmitted) return;
            const rolesBank = document.getElementById('stage1-roles-bank');
            if (rolesBank) {
                rolesBank.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    },

    /**
     * DragStart handler for role cards
     */
    onDragStart(event, roleId) {
        if (this.isSubmitted) {
            event.preventDefault();
            return;
        }
        event.dataTransfer.setData('text/plain', String(roleId));
        event.dataTransfer.effectAllowed = 'copyMove';
    },

    /**
     * Selects a role by ID
     */
    selectRoleById(roleId) {
        if (this.isSubmitted) return;

        const roles = this.getSortedRoles();
        const role = roles.find(r => r.id === roleId);
        if (!role) return;

        this.selectedRole = role;

        // Update card highlights in DOM
        document.querySelectorAll('.stage1-compact-role-card').forEach(card => {
            const match = parseInt(card.getAttribute('data-role-id'), 10) === role.id;
            card.classList.toggle('selected', match);
            card.setAttribute('aria-checked', match ? 'true' : 'false');
        });

        // Update dropzone content
        const dropzone = document.getElementById('stage1-dropzone');
        if (dropzone) {
            dropzone.classList.add('has-assignment');
            dropzone.innerHTML = this.renderDropzoneContent();
        }

        // Update status bar
        const statusBar = document.getElementById('stage1-selection-status-bar');
        if (statusBar) {
            statusBar.innerHTML = `
                <div class="selection-status-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>Selected Role: <strong>${role.name}</strong> (${role.category || 'Core Team'})</span>
                </div>
                <button class="btn-clear-assignment" onclick="Stage1.clearSelection()" style="background: none; border: none; font-size: 0.82rem; font-weight: 600; color: #64748b; cursor: pointer;">
                    Clear Selection &times;
                </button>
            `;
        }

        // Enable Submit button
        const submitBtn = document.getElementById('btn-submit-stage1');
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    },

    /**
     * Clears current selection
     */
    clearSelection() {
        if (this.isSubmitted) return;

        this.selectedRole = null;

        document.querySelectorAll('.stage1-compact-role-card').forEach(card => {
            card.classList.remove('selected');
            card.setAttribute('aria-checked', 'false');
        });

        const dropzone = document.getElementById('stage1-dropzone');
        if (dropzone) {
            dropzone.classList.remove('has-assignment');
            dropzone.innerHTML = this.renderDropzoneContent();
        }

        const statusBar = document.getElementById('stage1-selection-status-bar');
        if (statusBar) {
            statusBar.innerHTML = `
                <div class="selection-status-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    <span>No primary owner selected yet. Tap or drag a role card below.</span>
                </div>
            `;
        }

        const submitBtn = document.getElementById('btn-submit-stage1');
        if (submitBtn) {
            submitBtn.disabled = true;
        }
    },

    /**
     * Submits the chosen role to the backend for authoritative evaluation
     */
    async submitAnswer() {
        if (!this.selectedRole) {
            State.notify('Please select a role before submitting your answer.', 'warning');
            return;
        }

        if (this.isSubmitted) return;

        const currentScenario = this.scenarios[this.currentIndex];
        if (!currentScenario) return;

        const submitBtn = document.getElementById('btn-submit-stage1');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <span style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
                    Evaluating Answer...
                </span>
            `;
        }

        // Lock role cards in UI
        this.isSubmitted = true;
        document.querySelectorAll('.stage1-compact-role-card').forEach(c => {
            c.classList.add('locked');
            c.setAttribute('draggable', 'false');
        });

        try {
            const payload = {
                stage: 1,
                scenario_id: currentScenario.id,
                selected_role_id: this.selectedRole.id,
                student_notes: `Stage 1 Choice: ${this.selectedRole.name}`
            };

            const response = await API.submitAnswer(State.session.id, payload);
            this.currentFeedback = response;
            this.sessionProgress = response.stage_progress;

            this.renderFeedback(response);
        } catch (err) {
            console.error('Failed to submit Stage 1 answer:', err);
            this.isSubmitted = false;
            document.querySelectorAll('.stage1-compact-role-card').forEach(c => {
                c.classList.remove('locked');
                c.setAttribute('draggable', 'true');
            });

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Submit Answer &rarr;';
            }

            State.notify('Something went wrong while submitting your answer. Please try again.', 'danger');
        }
    },

    /**
     * Renders feedback card below the scenario
     */
    renderFeedback(result) {
        const mount = document.getElementById('stage1-feedback-mount');
        if (!mount) return;

        const isCorrect = result.is_correct;
        const primaryOwner = result.primary_owner || {};
        const selectedRole = result.selected_role || this.selectedRole;
        const supportingRoles = Array.isArray(result.supporting_roles) ? result.supporting_roles : [];
        const explanation = result.explanation || '';
        const isLastScenario = this.currentIndex >= this.scenarios.length - 1;
        const nextScenarioNum = this.currentIndex + 2;

        mount.innerHTML = `
            <div class="stage1-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}" role="alert">
                <!-- Header Badge Row -->
                <div class="feedback-badge-row">
                    ${isCorrect ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-success" style="font-size: 0.95rem; font-weight: 800; padding: 6px 16px;">
                                &#10003; Correct
                            </span>
                            <span class="badge badge-teal">+1 Point Awarded</span>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-warning" style="font-size: 0.95rem; font-weight: 800; padding: 6px 16px; background-color: #f59e0b; color: #ffffff;">
                                Not quite
                            </span>
                            <span class="badge badge-navy">0 Points</span>
                        </div>
                    `}

                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-navy);">
                        Scenario ${this.currentIndex + 1} of ${this.scenarios.length}
                    </span>
                </div>

                <!-- Role Specification Details -->
                <div class="feedback-role-spec">
                    ${isCorrect ? `
                        <div class="feedback-spec-item">
                            <span class="spec-label">Primary Owner:</span>
                            <strong class="spec-value" style="color: var(--color-primary);">${primaryOwner.name || 'Assigned'}</strong>
                        </div>
                    ` : `
                        <div class="feedback-spec-item">
                            <span class="spec-label">Correct Primary Owner:</span>
                            <strong class="spec-value" style="color: var(--color-primary);">${primaryOwner.name || 'Assigned'}</strong>
                        </div>
                        <div class="feedback-spec-item">
                            <span class="spec-label">Your Answer:</span>
                            <strong class="spec-value" style="color: #64748b;">${selectedRole.name || 'Selected Role'}</strong>
                        </div>
                    `}

                    <div class="feedback-spec-item">
                        <span class="spec-label">Supporting Roles:</span>
                        <div class="supporting-roles-tags">
                            ${supportingRoles.length > 0 
                                ? supportingRoles.map(r => `<span class="badge badge-navy">${r}</span>`).join('') 
                                : '<span style="font-size: 0.85rem; color: var(--color-text-secondary);">Cross-functional squad members</span>'}
                        </div>
                    </div>
                </div>

                <!-- Explanation Box -->
                <div class="feedback-explanation">
                    <strong>${isCorrect ? 'Why this role owns this:' : `Why ${primaryOwner.name} owns this:`}</strong>
                    <p>${explanation}</p>
                </div>

                <!-- Next Action -->
                <div class="feedback-actions">
                    <button class="btn btn-primary btn-lg" 
                            id="btn-next-stage1"
                            onclick="Stage1.nextScenario()"
                            style="font-size: 1.05rem; padding: 13px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                        ${isLastScenario ? 'Complete Stage 1 &rarr;' : `Next Scenario &rarr; Scenario ${nextScenarioNum}`}
                    </button>
                </div>
            </div>
        `;

        mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Advances to the next scenario or displays the completion screen
     */
    nextScenario() {
        this.currentIndex++;
        this.selectedRole = null;
        this.isSubmitted = false;
        this.currentFeedback = null;

        if (this.currentIndex >= this.scenarios.length) {
            this.renderCompletionScreen();
        } else {
            this.renderCurrentScenario();
        }
    },

    /**
     * Displays Stage 1 completion state
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
            <div class="stage1-container">
                <div class="stage1-completion-card">
                    <div class="completion-icon-wrapper" aria-hidden="true">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </div>

                    <span class="badge badge-teal" style="font-size: 0.85rem; font-weight: 700; padding: 6px 16px;">STAGE 1 COMPLETE</span>
                    <h2 class="completion-title">Stage 1 Complete</h2>
                    <p class="completion-subtitle">
                        You have explored and completed all 3 ownership dilemmas for Tech Company.
                    </p>

                    <!-- Scorecard Grid -->
                    <div class="completion-stats-grid">
                        <div class="completion-stat-card">
                            <span class="stat-big-number">${completed} / ${total}</span>
                            <span class="stat-small-label">Scenarios Completed</span>
                        </div>
                        <div class="completion-stat-card">
                            <span class="stat-big-number">${correct} / ${total}</span>
                            <span class="stat-small-label">Correct Answers</span>
                        </div>
                        <div class="completion-stat-card highlight">
                            <span class="stat-big-number">${percentage}%</span>
                            <span class="stat-small-label">Stage 1 Score</span>
                        </div>
                    </div>

                    <!-- Key Takeaways Box -->
                    <div class="completion-takeaway-box">
                        <h4>Key Takeaways: Who Owns This?</h4>
                        <ul>
                            <li>
                                <strong>Clear Accountability:</strong> Every workplace incident or project requirement must have a single designated primary owner accountable for response and delivery.
                            </li>
                            <li>
                                <strong>Cross-Functional Collaboration:</strong> Primary owners do not resolve dilemmas alone—they coordinate supporting technical roles (Cybersecurity, DevOps, Networking, QA) to achieve robust solutions.
                            </li>
                            <li>
                                <strong>Right Role for the Right Domain:</strong> Operational security alerts require dedicated SOC triage, application vulnerabilities require AppSec engineering leadership, and infrastructure anomalies involve network specialists.
                            </li>
                        </ul>
                    </div>

                    <!-- Action Buttons -->
                    <div class="completion-actions">
                        <button class="btn btn-primary btn-lg" 
                                id="btn-continue-stage2"
                                onclick="Stage1.continueToStage2()"
                                style="font-size: 1.05rem; padding: 14px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                            Continue to Stage 2 &rarr;
                        </button>
                        <button class="btn btn-secondary btn-lg" 
                                onclick="Stage1.reviewScenarios()"
                                style="font-size: 1.05rem; padding: 14px 28px;">
                            Review Stage 1 Scenarios
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Handles Continue to Stage 2 click per requirement 9
     */
    continueToStage2() {
        if (typeof App !== 'undefined' && App.goToStage) {
            App.goToStage(2);
        } else {
            State.notify('Navigating to Stage 2: Task Routing...', 'info');
        }
    },

    /**
     * Allows student to review scenarios
     */
    reviewScenarios() {
        this.currentIndex = 0;
        this.selectedRole = null;
        this.isSubmitted = false;
        this.renderCurrentScenario();
    },

    /**
     * Returns canonical ordering of roles
     */
    getSortedRoles() {
        const roles = (State.activeWorkplace && State.activeWorkplace.roles) ? [...State.activeWorkplace.roles] : [];
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
    }
};
