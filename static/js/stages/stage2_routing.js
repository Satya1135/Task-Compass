/**
 * TASK COMPASS — STAGE 2: TASK ROUTING
 * 
 * Interactive simulation stage teaching students how workplace tasks and incidents
 * move between roles in a logical, cross-functional sequence.
 * 
 * Features:
 * - 3 Tech Company routing scenarios (Phishing Incident Response, Web Security Vulnerability, Suspicious Network Activity)
 * - 12 Tech Company roles displayed in canonical order with realistic workplace photographs
 * - Sequential 5-slot workflow route builder (START -> 1 -> 2 -> 3 -> 4 -> 5 -> END)
 * - Dual interaction model: HTML5 drag-and-drop AND tap-to-add with Move Up / Move Down / Remove controls
 * - Fully accessible keyboard navigation (Tab, Enter/Space) and ARIA attributes
 * - Authoritative server-side answer evaluation and 1pt / 0pt scoring
 * - Constructive educational feedback: "Let's review the routing" with side-by-side comparison for incorrect routes,
 *   and "✓ Correct Route" with workflow sequence for correct routes
 * - Stage 2 completion screen with scorecard and key takeaways
 * - Session state recovery across page reloads
 * - Mobile responsive layout (1 column on mobile, 2 on tablet, 4 on desktop)
 */

const Stage2 = {
    container: null,
    scenarios: [],
    currentIndex: 0,
    currentRoute: [],
    availableRoles: [],
    isSubmitted: false,
    currentFeedback: null,
    sessionProgress: null,

    // Drag-and-drop state tracking
    draggedRoleId: null,
    draggedSlotIndex: null,

    /**
     * Initializes and renders Stage 2
     */
    async render(container, scenarios) {
        this.container = container;
        this.scenarios = Array.isArray(scenarios) ? scenarios : [];
        this.currentRoute = [];
        this.isSubmitted = false;
        this.currentFeedback = null;

        if (this.scenarios.length === 0) {
            container.innerHTML = `
                <div class="scenario-card" style="text-align: center; padding: 48px;">
                    <h3 style="color: var(--color-navy); margin-bottom: 8px;">No Stage 2 Scenarios Found</h3>
                    <p style="color: var(--color-text-secondary); margin-bottom: 16px;">
                        Unable to load workplace routing scenarios for Stage 2. Please try again.
                    </p>
                    <button class="btn btn-primary" onclick="App.goToStage(2)">Reload Stage 2</button>
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
            console.warn('Could not fetch workplace roles for Stage 2:', err);
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
            if (sessionData && sessionData.stage_2_progress) {
                this.sessionProgress = sessionData.stage_2_progress;
                const answered = sessionData.stage_2_progress.answered_scenarios || {};

                // Find first unanswered scenario
                const firstUnansweredIdx = this.scenarios.findIndex(s => !answered[s.id]);
                if (firstUnansweredIdx !== -1) {
                    this.currentIndex = firstUnansweredIdx;
                } else if (Object.keys(answered).length >= this.scenarios.length) {
                    this.sessionProgress.is_stage_complete = true;
                }
            }
        } catch (err) {
            console.warn('Could not sync Stage 2 session state from server:', err);
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

        // Reset per-scenario route state
        this.currentRoute = [];
        this.isSubmitted = false;
        this.currentFeedback = null;

        this.container.innerHTML = `
            <div class="stage2-container">
                <!-- Stage 2 Header Card -->
                <div class="stage2-header-card">
                    <div class="stage2-header-left">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span class="badge badge-success" style="font-weight: 700; font-size: 0.8rem; padding: 4px 10px;">
                                &#10003; STAGE 1 COMPLETE
                            </span>
                            <span class="badge badge-teal" style="font-weight: 700; font-size: 0.8rem; padding: 4px 10px;">
                                STAGE 2 OF 3: ACTIVE
                            </span>
                            <span class="badge badge-navy" style="font-size: 0.8rem; padding: 4px 10px;">
                                ${State.activeWorkplace ? State.activeWorkplace.name.toUpperCase() : 'TECH COMPANY'}
                            </span>
                        </div>
                        <h2 class="stage2-main-title">TASK ROUTING</h2>
                        <p class="stage2-main-subtitle">Build the correct sequence of roles to handle the situation.</p>
                    </div>
                    <div class="stage2-header-right">
                        <div class="stage1-scenario-pill" id="stage2-progress-pill">
                            <span class="stat-dot"></span>
                            <span>Scenario ${currentNum} of ${totalScenarios}</span>
                        </div>
                    </div>
                </div>

                <!-- Main Scenario Card -->
                <div class="scenario-card stage2-card" id="stage2-scenario-card">
                    <!-- Header Bar -->
                    <div class="scenario-header-bar">
                        <div class="scenario-badge-cluster">
                            <span class="badge ${urgencyClass}">${s.urgency_level || 'High'} Priority</span>
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

                    <!-- Question / Instruction Callout -->
                    <div class="scenario-question-callout" style="border-left-color: var(--color-primary);">
                        <h4 class="scenario-question-title" style="color: var(--color-navy);">WORKFLOW ROUTING OBJECTIVE</h4>
                        <p class="scenario-question-subtitle">
                            ${s.task || 'Arrange the roles in the order they should handle this incident.'}
                        </p>
                    </div>

                    <!-- Stage 2 Route Workspace (The Sequential Route Builder) -->
                    <div class="stage2-route-workspace" role="region" aria-label="Route Workspace">
                        <div class="stage2-section-header">
                            <div>
                                <h4>YOUR ROUTE</h4>
                                <p>Build a 5-step sequence from incident intake to resolution and management escalation.</p>
                            </div>
                            <span class="badge badge-navy" id="stage2-route-counter">0 / 5 Roles Placed</span>
                        </div>

                        <!-- Sequential Route Stream -->
                        <div class="stage2-route-stream" id="stage2-route-stream-container">
                            <div class="route-endpoint-node start-node">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                                <span>START: INCIDENT INTAKE</span>
                            </div>

                            <div class="route-flow-arrow">&darr;</div>

                            <!-- 5 Route Slots Container -->
                            <div id="stage2-route-slots-container" style="width: 100%; display: flex; flex-direction: column; gap: 6px;">
                                ${this.renderAllSlots()}
                            </div>

                            <div class="route-flow-arrow">&darr;</div>

                            <div class="route-endpoint-node end-node">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                                <span>END: RESOLUTION & ESCALATION</span>
                            </div>
                        </div>

                        <!-- Workspace Action Bar -->
                        <div class="stage2-action-bar">
                            <button class="btn btn-secondary btn-sm" 
                                    id="btn-clear-route"
                                    onclick="Stage2.clearRoute()"
                                    style="display: flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                Reset Route
                            </button>

                            <button class="btn btn-primary btn-lg" 
                                    id="btn-check-route"
                                    onclick="Stage2.checkRoute()"
                                    disabled
                                    style="font-size: 1.05rem; padding: 12px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                                Check Route &rarr;
                            </button>
                        </div>
                    </div>

                    <!-- Available Roles Section -->
                    <div class="stage2-available-section" style="margin-top: 24px;">
                        <div class="stage2-section-header">
                            <div>
                                <h4>AVAILABLE ROLES</h4>
                                <p>Tap any role to add it to your route, or drag and drop it into a route position above.</p>
                            </div>
                            <span class="badge badge-teal">${this.availableRoles.length} Roles Bank</span>
                        </div>

                        <!-- 12 Role Cards Grid (4 cols desktop, 2 cols tablet, 1 col mobile) -->
                        <div class="stage2-available-grid" id="stage2-available-roles-grid" role="region" aria-label="12 Available Tech Roles">
                            ${this.availableRoles.map((role, idx) => this.renderAvailableRoleCard(role, idx)).join('')}
                        </div>
                    </div>

                    <!-- Feedback Mount Point -->
                    <div id="stage2-feedback-mount"></div>
                </div>
            </div>
        `;

        this.updateWorkspaceUI();
        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Renders all 5 slots with connector arrows
     */
    renderAllSlots() {
        let html = '';
        for (let i = 0; i < 5; i++) {
            if (i > 0) {
                html += `<div class="route-flow-arrow">&darr;</div>`;
            }
            html += this.renderSlot(i);
        }
        return html;
    },

    /**
     * Renders a single slot (empty or filled)
     */
    renderSlot(index) {
        const role = this.currentRoute[index];
        const isFilled = Boolean(role);

        if (!isFilled) {
            return `
                <div class="stage2-route-slot is-empty"
                     id="route-slot-${index}"
                     data-slot-index="${index}"
                     role="button"
                     tabindex="0"
                     aria-label="Route position ${index + 1}: Empty slot. Drop role here or tap an available role."
                     ondragover="Stage2.onSlotDragOver(event, ${index})"
                     ondragleave="Stage2.onSlotDragLeave(event, ${index})"
                     ondrop="Stage2.onSlotDrop(event, ${index})"
                     onclick="Stage2.onEmptySlotClick(${index})"
                     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); Stage2.onEmptySlotClick(${index});}">
                    <span class="slot-position-badge">${index + 1}</span>
                    <div class="slot-empty-prompt">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                        <span>Drop role here or tap a role below</span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="stage2-route-slot is-filled ${this.isSubmitted ? 'locked' : ''}"
                 id="route-slot-${index}"
                 data-slot-index="${index}"
                 draggable="${!this.isSubmitted}"
                 role="region"
                 aria-label="Route position ${index + 1}: ${role.name}"
                 ondragstart="Stage2.onSlotDragStart(event, ${index})"
                 ondragover="Stage2.onSlotDragOver(event, ${index})"
                 ondragleave="Stage2.onSlotDragLeave(event, ${index})"
                 ondrop="Stage2.onSlotDrop(event, ${index})">
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
                                onclick="event.stopPropagation(); Stage2.moveUp(${index})">
                            &uarr;
                        </button>
                        <button class="btn-slot-control" 
                                title="Move Down" 
                                aria-label="Move ${role.name} down to position ${index + 2}"
                                ${index >= this.currentRoute.length - 1 ? 'disabled' : ''} 
                                onclick="event.stopPropagation(); Stage2.moveDown(${index})">
                            &darr;
                        </button>
                        <button class="btn-slot-control btn-remove" 
                                title="Remove from route" 
                                aria-label="Remove ${role.name} from route"
                                onclick="event.stopPropagation(); Stage2.removeRole(${index})">
                            &times;
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    },

    /**
     * Renders a single available role card from the 12-role bank
     */
    renderAvailableRoleCard(role, idx) {
        const routePos = this.currentRoute.findIndex(r => r.id === role.id);
        const isPlaced = routePos !== -1;
        const isSecurity = ['cybersecurity-engineer', 'soc-analyst', 'security-analyst'].includes(role.slug);

        return `
            <div class="stage2-role-card ${isPlaced ? 'is-placed' : ''} ${this.isSubmitted ? 'locked' : ''}"
                 id="stage2-card-role-${role.id}"
                 data-role-id="${role.id}"
                 draggable="${!isPlaced && !this.isSubmitted}"
                 role="button"
                 tabindex="${isPlaced || this.isSubmitted ? '-1' : '0'}"
                 aria-label="${role.name}${isPlaced ? ` (In Route at position ${routePos + 1})` : ''}"
                 aria-disabled="${isPlaced || this.isSubmitted}"
                 ondragstart="Stage2.onDragRoleStart(event, ${role.id})"
                 onclick="Stage2.onRoleCardClick(${role.id})"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault(); Stage2.onRoleCardClick(${role.id});}">
                <div class="stage2-role-photo">
                    <img src="/static/images/roles/${role.slug}.jpg" alt="${role.name}" loading="lazy" onerror="this.src='/static/images/roles/cybersecurity-engineer.jpg'">
                    ${isPlaced ? `
                        <span class="stage2-role-placed-badge">In Route #${routePos + 1}</span>
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
            </div>
        `;
    },

    /**
     * Handles clicking an available role card
     */
    onRoleCardClick(roleId) {
        if (this.isSubmitted) return;

        const role = this.availableRoles.find(r => r.id === roleId);
        if (!role) return;

        const existingPos = this.currentRoute.findIndex(r => r.id === roleId);
        if (existingPos !== -1) {
            State.notify(`${role.name} is already placed at Position ${existingPos + 1} in your route.`, 'info');
            return;
        }

        if (this.currentRoute.length >= 5) {
            State.notify('Your route already contains 5 roles. Remove or reorder a role to make changes.', 'warning');
            return;
        }

        // Add to route
        this.currentRoute.push(role);
        this.updateWorkspaceUI();
    },

    /**
     * Handles clicking an empty slot
     */
    onEmptySlotClick(slotIndex) {
        if (this.isSubmitted) return;
        State.notify(`Tap any available role card below to place it into Position ${slotIndex + 1}.`, 'info');
        const bank = document.getElementById('stage2-available-roles-grid');
        if (bank) bank.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Removes a role from the route
     */
    removeRole(index) {
        if (this.isSubmitted) return;
        if (index >= 0 && index < this.currentRoute.length) {
            const removed = this.currentRoute.splice(index, 1);
            if (removed[0]) {
                State.notify(`Removed ${removed[0].name} from route.`, 'info');
            }
            this.updateWorkspaceUI();
        }
    },

    /**
     * Moves a role up one position
     */
    moveUp(index) {
        if (this.isSubmitted || index <= 0) return;
        const temp = this.currentRoute[index];
        this.currentRoute[index] = this.currentRoute[index - 1];
        this.currentRoute[index - 1] = temp;
        this.updateWorkspaceUI();
    },

    /**
     * Moves a role down one position
     */
    moveDown(index) {
        if (this.isSubmitted || index >= this.currentRoute.length - 1) return;
        const temp = this.currentRoute[index];
        this.currentRoute[index] = this.currentRoute[index + 1];
        this.currentRoute[index + 1] = temp;
        this.updateWorkspaceUI();
    },

    /**
     * Clears all placed roles from the current scenario route
     */
    clearRoute() {
        if (this.isSubmitted) return;
        if (this.currentRoute.length === 0) return;
        this.currentRoute = [];
        this.updateWorkspaceUI();
        State.notify('Route reset. Arrange the roles in the correct sequence.', 'info');
    },

    /**
     * Drag-and-drop: Drag from available roles bank
     */
    onDragRoleStart(e, roleId) {
        if (this.isSubmitted) {
            e.preventDefault();
            return;
        }
        this.draggedRoleId = roleId;
        this.draggedSlotIndex = null;
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'available_role', roleId: roleId }));
        e.dataTransfer.effectAllowed = 'copyMove';
    },

    /**
     * Drag-and-drop: Drag from route slot to reorder
     */
    onSlotDragStart(e, slotIndex) {
        if (this.isSubmitted) {
            e.preventDefault();
            return;
        }
        this.draggedSlotIndex = slotIndex;
        this.draggedRoleId = null;
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'slot_role', slotIndex: slotIndex }));
        e.dataTransfer.effectAllowed = 'move';
    },

    /**
     * Drag-and-drop: Over slot
     */
    onSlotDragOver(e, slotIndex) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const slot = document.getElementById(`route-slot-${slotIndex}`);
        if (slot) slot.classList.add('drag-over');
    },

    /**
     * Drag-and-drop: Leave slot
     */
    onSlotDragLeave(e, slotIndex) {
        const slot = document.getElementById(`route-slot-${slotIndex}`);
        if (slot) slot.classList.remove('drag-over');
    },

    /**
     * Drag-and-drop: Drop onto a slot
     */
    onSlotDrop(e, targetSlotIndex) {
        e.preventDefault();
        const slot = document.getElementById(`route-slot-${targetSlotIndex}`);
        if (slot) slot.classList.remove('drag-over');

        if (this.isSubmitted) return;

        let data = {};
        try {
            data = JSON.parse(e.dataTransfer.getData('text/plain') || '{}');
        } catch (err) {
            data = {};
        }

        // Case 1: Dragging an available role into a slot
        if (data.type === 'available_role' || this.draggedRoleId) {
            const roleId = data.roleId || this.draggedRoleId;
            const role = this.availableRoles.find(r => r.id === roleId);
            if (!role) return;

            const existingPos = this.currentRoute.findIndex(r => r.id === roleId);

            if (existingPos !== -1) {
                // Swap position with target if target is within current route
                if (targetSlotIndex < this.currentRoute.length) {
                    const temp = this.currentRoute[targetSlotIndex];
                    this.currentRoute[targetSlotIndex] = role;
                    this.currentRoute[existingPos] = temp;
                }
            } else {
                // If dropping into an existing filled position, replace it
                if (targetSlotIndex < this.currentRoute.length) {
                    this.currentRoute[targetSlotIndex] = role;
                } else {
                    // Dropping into an empty slot: push or insert at end
                    if (this.currentRoute.length < 5) {
                        this.currentRoute.push(role);
                    }
                }
            }
            this.draggedRoleId = null;
            this.updateWorkspaceUI();
            return;
        }

        // Case 2: Dragging a slot to reorder
        if (data.type === 'slot_role' || this.draggedSlotIndex !== null) {
            const sourceIndex = (data.slotIndex !== undefined) ? data.slotIndex : this.draggedSlotIndex;
            if (sourceIndex === null || sourceIndex === undefined) return;

            if (targetSlotIndex < this.currentRoute.length && sourceIndex < this.currentRoute.length) {
                const temp = this.currentRoute[targetSlotIndex];
                this.currentRoute[targetSlotIndex] = this.currentRoute[sourceIndex];
                this.currentRoute[sourceIndex] = temp;
            } else if (sourceIndex < this.currentRoute.length) {
                // Move item to end
                const [item] = this.currentRoute.splice(sourceIndex, 1);
                this.currentRoute.push(item);
            }

            this.draggedSlotIndex = null;
            this.updateWorkspaceUI();
        }
    },

    /**
     * Updates UI components after route modification
     */
    updateWorkspaceUI() {
        // 1. Re-render slots container
        const slotsContainer = document.getElementById('stage2-route-slots-container');
        if (slotsContainer) {
            slotsContainer.innerHTML = this.renderAllSlots();
        }

        // 2. Update route counter badge
        const counter = document.getElementById('stage2-route-counter');
        if (counter) {
            counter.textContent = `${this.currentRoute.length} / 5 Roles Placed`;
            counter.className = `badge ${this.currentRoute.length === 5 ? 'badge-success' : 'badge-navy'}`;
        }

        // 3. Update "Check Route" button
        const checkBtn = document.getElementById('btn-check-route');
        if (checkBtn) {
            checkBtn.disabled = (this.currentRoute.length !== 5 || this.isSubmitted);
            if (this.currentRoute.length === 5 && !this.isSubmitted) {
                checkBtn.title = 'Click to verify this workflow route';
            } else if (!this.isSubmitted) {
                checkBtn.title = `Place ${5 - this.currentRoute.length} more role(s) to verify route`;
            }
        }

        // 4. Update "Clear Route" button
        const clearBtn = document.getElementById('btn-clear-route');
        if (clearBtn) {
            clearBtn.disabled = (this.currentRoute.length === 0 || this.isSubmitted);
        }

        // 5. Update Available Roles grid to show placed state badges
        const rolesGrid = document.getElementById('stage2-available-roles-grid');
        if (rolesGrid) {
            rolesGrid.innerHTML = this.availableRoles.map((role, idx) => this.renderAvailableRoleCard(role, idx)).join('');
        }
    },

    /**
     * Submits the 5-role route to backend for authoritative evaluation
     */
    async checkRoute() {
        if (this.currentRoute.length !== 5) {
            State.notify('Please arrange all 5 roles in your route before checking.', 'warning');
            return;
        }

        if (this.isSubmitted) return;

        const currentScenario = this.scenarios[this.currentIndex];
        if (!currentScenario) return;

        const checkBtn = document.getElementById('btn-check-route');
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <span style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite;"></span>
                    Evaluating Route...
                </span>
            `;
        }

        // Lock route during evaluation
        this.isSubmitted = true;
        this.updateWorkspaceUI();

        try {
            const payload = {
                stage: 2,
                scenario_id: currentScenario.id,
                role_order: this.currentRoute.map(r => r.id),
                student_notes: `Stage 2 Route: ${this.currentRoute.map(r => r.name).join(' -> ')}`
            };

            const response = await API.submitAnswer(State.session.id, payload);
            this.currentFeedback = response;
            this.sessionProgress = response.stage_progress;

            this.renderFeedback(response);
        } catch (err) {
            console.error('Failed to submit Stage 2 route:', err);
            this.isSubmitted = false;
            this.updateWorkspaceUI();

            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = 'Check Route &rarr;';
            }

            State.notify('Something went wrong while checking your route. Please try again.', 'danger');
        }
    },

    /**
     * Renders feedback based on backend authoritative evaluation
     */
    renderFeedback(result) {
        const mount = document.getElementById('stage2-feedback-mount');
        if (!mount) return;

        const isCorrect = Boolean(result.is_correct);
        const explanation = result.explanation || '';
        const submittedRoute = Array.isArray(result.submitted_route) ? result.submitted_route : [];
        const correctRoute = Array.isArray(result.correct_route) ? result.correct_route : [];
        const isLastScenario = this.currentIndex >= this.scenarios.length - 1;
        const nextScenarioNum = this.currentIndex + 2;

        mount.innerHTML = `
            <div class="stage2-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-incorrect'}" role="alert">
                <!-- Header Badge Row -->
                <div class="feedback-badge-row">
                    ${isCorrect ? `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-success" style="font-size: 0.95rem; font-weight: 800; padding: 6px 16px;">
                                &#10003; Correct Route
                            </span>
                            <span class="badge badge-teal">+1 Point Awarded</span>
                        </div>
                    ` : `
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="badge badge-warning" style="font-size: 0.95rem; font-weight: 800; padding: 6px 16px; background-color: #f59e0b; color: #ffffff;">
                                Let's review the routing.
                            </span>
                            <span class="badge badge-navy">0 Points</span>
                        </div>
                    `}

                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-navy);">
                        Scenario ${this.currentIndex + 1} of ${this.scenarios.length}
                    </span>
                </div>

                <!-- Workflow Sequence Visualization -->
                ${isCorrect ? `
                    <div style="margin: 16px 0;">
                        <h5 style="font-size: 0.82rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--color-navy); margin-bottom: 10px;">
                            CORRECT WORKFLOW:
                        </h5>
                        <div class="feedback-flow-stream">
                            ${correctRoute.map((item, idx) => `
                                <div class="feedback-flow-step match-correct">
                                    <span class="flow-step-num" style="background-color: var(--color-primary);">${item.position || (idx + 1)}</span>
                                    <span class="flow-step-name">${item.name}</span>
                                    <span class="badge badge-teal" style="font-size: 0.7rem; margin-left: auto;">Step ${idx + 1}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div class="feedback-compare-grid">
                        <div class="feedback-compare-col">
                            <h5 style="color: #64748b;">Your Route:</h5>
                            <div class="feedback-flow-stream">
                                ${submittedRoute.map((item, idx) => {
                                    const match = correctRoute[idx] && correctRoute[idx].name === item.name;
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
                            <h5 style="color: var(--color-primary);">Correct Route:</h5>
                            <div class="feedback-flow-stream">
                                ${correctRoute.map((item, idx) => `
                                    <div class="feedback-flow-step match-correct">
                                        <span class="flow-step-num" style="background-color: var(--color-primary);">${item.position || (idx + 1)}</span>
                                        <span class="flow-step-name">${item.name}</span>
                                        <span class="badge badge-teal" style="font-size: 0.7rem; margin-left: auto;">Sequence ${idx + 1}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `}

                <!-- Educational Workflow Rationale / Explanation Box -->
                <div class="feedback-explanation" style="margin-top: 16px;">
                    <strong>${isCorrect ? 'Why this workflow is optimal:' : 'Routing Workflow Explanation:'}</strong>
                    <p style="margin-top: 6px; white-space: pre-line;">${explanation}</p>
                </div>

                <!-- Next Action -->
                <div class="feedback-actions">
                    <button class="btn btn-primary btn-lg" 
                            id="btn-next-stage2"
                            onclick="Stage2.nextScenario()"
                            style="font-size: 1.05rem; padding: 13px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                        ${isLastScenario ? 'Complete Stage 2 &rarr;' : `Next Scenario &rarr; Scenario ${nextScenarioNum}`}
                    </button>
                </div>
            </div>
        `;

        mount.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    /**
     * Advances to next scenario or renders Stage 2 completion screen
     */
    nextScenario() {
        this.currentIndex++;
        this.currentRoute = [];
        this.isSubmitted = false;
        this.currentFeedback = null;

        if (this.currentIndex >= this.scenarios.length) {
            this.renderCompletionScreen();
        } else {
            this.renderCurrentScenario();
        }
    },

    /**
     * Displays Stage 2 completion state
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
            <div class="stage2-container">
                <div class="stage1-completion-card">
                    <div class="completion-icon-wrapper" aria-hidden="true" style="background-color: var(--color-bg-soft-teal); color: var(--color-primary); border-color: var(--color-primary-border);">
                        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    </div>

                    <span class="badge badge-teal" style="font-size: 0.85rem; font-weight: 700; padding: 6px 16px;">STAGE 2 COMPLETE</span>
                    <h2 class="completion-title">Stage 2 Complete</h2>
                    <p class="completion-subtitle">
                        You have mastered all 3 task routing workflows for Tech Company incidents.
                    </p>

                    <!-- Scorecard Grid -->
                    <div class="completion-stats-grid">
                        <div class="completion-stat-card">
                            <span class="stat-big-number">${completed} / ${total}</span>
                            <span class="stat-small-label">Scenarios Completed</span>
                        </div>
                        <div class="completion-stat-card">
                            <span class="stat-big-number">${correct} / ${total}</span>
                            <span class="stat-small-label">Correct Routes</span>
                        </div>
                        <div class="completion-stat-card highlight">
                            <span class="stat-big-number">${percentage}%</span>
                            <span class="stat-small-label">Stage 2 Score</span>
                        </div>
                    </div>

                    <!-- Key Takeaways Box -->
                    <div class="completion-takeaway-box">
                        <h4>Key Takeaways: Task Routing & Escalation</h4>
                        <ul>
                            <li>
                                <strong>Logical Handoffs:</strong> Workplace incidents must move in an orderly sequence from initial reporting and telemetry detection, through deep technical investigation, to deployment and verification.
                            </li>
                            <li>
                                <strong>Role Specialization:</strong> SOC Analysts assess active alerts, Cybersecurity Engineers lead technical containment, Backend Developers write patch code, and Network Engineers verify traffic pathways.
                            </li>
                            <li>
                                <strong>Verification Before Escalation:</strong> QA engineers verify fixes in staging before DevOps deploys to production and Engineering Managers finalize incident closure.
                            </li>
                        </ul>
                    </div>

                    <!-- Action Buttons -->
                    <div class="completion-actions">
                        <button class="btn btn-primary btn-lg" 
                                id="btn-continue-stage3"
                                onclick="App.goToStage(3)"
                                style="font-size: 1.05rem; padding: 14px 36px; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);">
                            Continue to Stage 3 &rarr;
                        </button>
                        <button class="btn btn-secondary btn-lg" 
                                onclick="Stage2.reviewScenarios()"
                                style="font-size: 1.05rem; padding: 14px 28px;">
                            Review Stage 2 Scenarios
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
        this.currentRoute = [];
        this.isSubmitted = false;
        this.renderCurrentScenario();
    }
};
