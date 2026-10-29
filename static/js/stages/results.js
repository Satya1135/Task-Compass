/**
 * TASK COMPASS — STEP 11: FINAL RESULTS + REFLECTION CONTROLLER
 * Authoritative results dashboard, visual scorecard, learning summary,
 * role insights, strengths, areas to practice, reflection capture, and action controls.
 */

const Results = {
    resultsData: null,
    container: null,

    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    async render(container, resultsData) {
        this.container = container;
        this.resultsData = resultsData;
        State.resultsData = resultsData;

        if (!resultsData) {
            container.innerHTML = `
                <div class="final-results-container">
                    <div class="results-error-card" role="alert">
                        <h3>Results Unavailable</h3>
                        <p>We couldn't load your results right now. Please try again.</p>
                        <button class="btn btn-primary" onclick="App.goToResults()">Retry &rarr;</button>
                    </div>
                </div>
            `;
            return;
        }

        const s1 = resultsData.stage_1 || { correct: 0, total: 3, percentage: 0 };
        const s2 = resultsData.stage_2 || { correct: 0, total: 3, percentage: 0 };
        const s3 = resultsData.stage_3 || { correct: 0, total: 3, percentage: 0 };
        const overall = resultsData.overall || { correct: 0, total: 9, percentage: 0 };
        const strengths = resultsData.strengths || [];
        const areasToPractice = resultsData.areas_to_practice || [];
        const roleInsights = resultsData.role_insights || [];
        const learningSummary = resultsData.learning_summary || [];
        const reflection = resultsData.reflection || {};

        const hasExistingReflection = Boolean(
            reflection.ownership_reflection ||
            reflection.collaboration_reflection ||
            reflection.improvement_reflection
        );

        // Calculate circular progress dash offset (radius = 54, circumference = 2 * PI * 54 = 339.292)
        const radius = 54;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (overall.percentage / 100) * circumference;

        container.innerHTML = `
            <div class="final-results-container" role="main" aria-label="Final Simulation Results and Learning Summary">
                <!-- 1. FINAL RESULTS HEADER -->
                <div class="final-header-banner">
                    <div class="final-badge-pill">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        SIMULATION COMPLETE
                    </div>
                    <h1 class="final-heading">SIMULATION COMPLETE</h1>
                    <p class="final-subheading">Great work! You've completed the Tech Company simulation.</p>

                    <!-- Summary of the three stages -->
                    <div class="stage-completion-pills" role="region" aria-label="Stages Completed Summary">
                        <div class="stage-pill-item">
                            <span class="stage-pill-check">&#10003;</span>
                            <span class="stage-pill-text">Stage 1 &mdash; Who Owns This?</span>
                        </div>
                        <div class="stage-pill-item">
                            <span class="stage-pill-check">&#10003;</span>
                            <span class="stage-pill-text">Stage 2 &mdash; Task Routing</span>
                        </div>
                        <div class="stage-pill-item">
                            <span class="stage-pill-check">&#10003;</span>
                            <span class="stage-pill-text">Stage 3 &mdash; Collaboration Challenge</span>
                        </div>
                    </div>
                </div>

                <!-- 2. OVERALL SCORE & SCORE SUMMARY CARDS -->
                <div class="scorecard-section">
                    <!-- Prominent Overall Score Card with Circular SVG Progress Indicator -->
                    <div class="overall-score-hero-card">
                        <div class="overall-gauge-wrapper">
                            <svg class="score-circle-svg" width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
                                <circle class="circle-bg" cx="70" cy="70" r="${radius}" stroke-width="12"></circle>
                                <circle class="circle-progress" cx="70" cy="70" r="${radius}" stroke-width="12"
                                        stroke-dasharray="${circumference.toFixed(1)}"
                                        stroke-dashoffset="${strokeDashoffset.toFixed(1)}"
                                        transform="rotate(-90 70 70)"></circle>
                            </svg>
                            <div class="gauge-center-content">
                                <span class="gauge-pct-val">${overall.percentage}%</span>
                                <span class="gauge-pct-sub">Overall Score</span>
                            </div>
                        </div>

                        <div class="overall-score-details">
                            <span class="overall-card-tag">Authoritative Evaluation</span>
                            <h2 class="overall-score-title">OVERALL SCORE</h2>
                            <div class="overall-points-row">
                                <span class="overall-score-big">${overall.correct} / ${overall.total}</span>
                                <span class="overall-score-badge">Points Earned</span>
                            </div>
                            <p class="overall-score-desc">
                                Evaluated across ownership triage, task routing sequences, and cross-functional incident coordination.
                            </p>
                        </div>
                    </div>

                    <!-- 3 Individual Stage Score Cards -->
                    <div class="stage-cards-grid">
                        <!-- Stage 1 Card -->
                        <div class="stage-score-card">
                            <div class="stage-card-header">
                                <span class="stage-card-badge">STAGE 1</span>
                                <span class="stage-card-status">&#10003; Verified</span>
                            </div>
                            <h3 class="stage-card-title">Who Owns This?</h3>
                            <div class="stage-stat-row">
                                <div class="stage-stat-col">
                                    <span class="stage-stat-label">Correct:</span>
                                    <span class="stage-stat-val">${s1.correct} / ${s1.total}</span>
                                </div>
                                <div class="stage-stat-col">
                                    <span class="stage-stat-label">Score:</span>
                                    <span class="stage-stat-val highlight">${s1.percentage}%</span>
                                </div>
                            </div>
                            <div class="stage-progress-track">
                                <div class="stage-progress-fill" style="width: ${s1.percentage}%;"></div>
                            </div>
                        </div>

                        <!-- Stage 2 Card -->
                        <div class="stage-score-card">
                            <div class="stage-card-header">
                                <span class="stage-card-badge" style="background-color: #e0f2fe; color: #0284c7;">STAGE 2</span>
                                <span class="stage-card-status">&#10003; Verified</span>
                            </div>
                            <h3 class="stage-card-title">Task Routing</h3>
                            <div class="stage-stat-row">
                                <div class="stage-stat-col">
                                    <span class="stage-stat-label">Correct:</span>
                                    <span class="stage-stat-val">${s2.correct} / ${s2.total}</span>
                                </div>
                                <div class="stage-stat-col">
                                    <span class="stage-stat-label">Score:</span>
                                    <span class="stage-stat-val highlight">${s2.percentage}%</span>
                                </div>
                            </div>
                            <div class="stage-progress-track">
                                <div class="stage-progress-fill" style="width: ${s2.percentage}%; background-color: #0284c7;"></div>
                            </div>
                        </div>

                        <!-- Stage 3 Card -->
                        <div class="stage-score-card">
                            <div class="stage-card-header">
                                <span class="stage-card-badge" style="background-color: #ede9fe; color: #7c3aed;">STAGE 3</span>
                                <span class="stage-card-status">&#10003; Verified</span>
                            </div>
                            <h3 class="stage-card-title">Collaboration Challenge</h3>
                            <div class="stage-stat-row">
                                <div class="stage-stat-col">
                                    <span class="stage-stat-label">Correct:</span>
                                    <span class="stage-stat-val">${s3.correct} / ${s3.total}</span>
                                </div>
                                <div class="stage-stat-col">
                                    <span class="stage-stat-label">Score:</span>
                                    <span class="stage-stat-val highlight">${s3.percentage}%</span>
                                </div>
                            </div>
                            <div class="stage-progress-track">
                                <div class="stage-progress-fill" style="width: ${s3.percentage}%; background-color: #7c3aed;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. LEARNING SUMMARY ("WHAT YOU PRACTICED") -->
                <div class="final-content-card">
                    <div class="card-section-header">
                        <span class="section-tag">Competency Reflection</span>
                        <h2>WHAT YOU PRACTICED</h2>
                        <p class="section-desc">Practical organizational competencies developed through simulation scenarios.</p>
                    </div>

                    <div class="learning-summary-grid">
                        <div class="learning-item-card">
                            <div class="learning-num-badge">Stage 1</div>
                            <h3 class="learning-item-title">Ownership</h3>
                            <p class="learning-item-body">
                                "You practiced identifying which role should take primary responsibility for a workplace situation."
                            </p>
                        </div>

                        <div class="learning-item-card">
                            <div class="learning-num-badge" style="background: #e0f2fe; color: #0284c7;">Stage 2</div>
                            <h3 class="learning-item-title">Workflow Thinking</h3>
                            <p class="learning-item-body">
                                "You practiced routing tasks and incidents through the right sequence of roles."
                            </p>
                        </div>

                        <div class="learning-item-card">
                            <div class="learning-num-badge" style="background: #ede9fe; color: #7c3aed;">Stage 3</div>
                            <h3 class="learning-item-title">Collaboration</h3>
                            <p class="learning-item-body">
                                "You practiced building a team and coordinating multiple roles to solve a complex situation."
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 4. ROLE INSIGHTS, STRENGTHS & AREAS TO PRACTICE -->
                <div class="insights-columns-grid">
                    <!-- Role Insights -->
                    <div class="final-content-card insights-subcard">
                        <div class="card-section-header">
                            <span class="section-tag" style="background-color: var(--color-bg-soft-teal); color: var(--color-primary);">Incident Coordination</span>
                            <h2>ROLE INSIGHTS</h2>
                        </div>
                        <ul class="styled-bullet-list">
                            ${roleInsights.map(insight => `
                                <li>
                                    <span class="bullet-icon">&#10003;</span>
                                    <span>${insight}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <!-- Strengths & Practice Areas Container -->
                    <div class="final-content-card insights-subcard">
                        <!-- Strengths -->
                        <div style="margin-bottom: 24px;">
                            <div class="card-section-header">
                                <span class="section-tag" style="background-color: #ecfdf5; color: #059669;">Demonstrated Performance</span>
                                <h2>YOUR STRENGTHS</h2>
                            </div>
                            <ul class="styled-bullet-list">
                                ${strengths.map(s => `
                                    <li>
                                        <span class="bullet-icon bullet-success">&#9733;</span>
                                        <div>
                                            <strong>${s.title}</strong>
                                            <span style="display: block; font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">${s.description}</span>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>

                        <hr style="border: none; border-top: 1px solid var(--color-border-light); margin: 20px 0;">

                        <!-- Areas to Practice -->
                        <div>
                            <div class="card-section-header">
                                <span class="section-tag" style="background-color: #fffbeb; color: #b45309;">Continuous Growth</span>
                                <h2>AREAS TO PRACTICE</h2>
                            </div>
                            <ul class="styled-bullet-list">
                                ${areasToPractice.map(a => `
                                    <li>
                                        <span class="bullet-icon bullet-warning">&#8594;</span>
                                        <div>
                                            ${a.stage ? `<span class="badge badge-navy" style="font-size: 0.72rem; margin-bottom: 4px; display: inline-block;">${a.stage}</span>` : ''}
                                            <span style="display: block; font-size: 0.88rem; color: var(--color-navy); font-weight: 500;">${a.recommendation}</span>
                                        </div>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- 5. FINAL REFLECTION SECTION -->
                <div class="final-content-card reflection-section-card" id="reflection-card">
                    <div class="card-section-header">
                        <span class="section-tag" style="background-color: var(--color-bg-soft-teal); color: var(--color-primary);">FINAL REFLECTION</span>
                        <h2>Think About Your Experience</h2>
                        <p class="section-desc">Take a moment to reflect on what you learned from the simulation.</p>
                    </div>

                    <!-- Status Notification Message (Saved Feedback) -->
                    <div id="reflection-status-message" class="reflection-saved-banner" style="${hasExistingReflection ? 'display: flex;' : 'display: none;'}" role="status" aria-live="polite">
                        <div class="saved-icon-circle">&#10003;</div>
                        <div>
                            <strong>✓ Reflection Saved</strong>
                            <p>Your learning reflection has been saved.</p>
                        </div>
                    </div>

                    <form id="final-reflection-form" class="reflection-form-body" onsubmit="event.preventDefault(); Results.saveReflection();">
                        <!-- Question 1 -->
                        <div class="reflection-field-group">
                            <label for="refl-question-1" class="reflection-field-label">
                                <span class="refl-q-num">Question 1:</span>
                                Which role or responsibility became clearer to you during the simulation?
                            </label>
                            <p class="refl-field-hint">Optional: Share how your understanding of specific roles changed.</p>
                            <textarea id="refl-question-1"
                                      class="reflection-textarea"
                                      rows="3"
                                      placeholder="Your reflection..."
                                      aria-label="Which role or responsibility became clearer to you during the simulation?">${this.escapeHtml(reflection.ownership_reflection || '')}</textarea>
                        </div>

                        <!-- Question 2 -->
                        <div class="reflection-field-group">
                            <label for="refl-question-2" class="reflection-field-label">
                                <span class="refl-q-num">Question 2:</span>
                                What did you learn about how different teams depend on each other?
                            </label>
                            <p class="refl-field-hint">Optional: Describe cross-functional dependencies, handoffs, or multi-role coordination.</p>
                            <textarea id="refl-question-2"
                                      class="reflection-textarea"
                                      rows="3"
                                      placeholder="Your reflection..."
                                      aria-label="What did you learn about how different teams depend on each other?">${this.escapeHtml(reflection.collaboration_reflection || '')}</textarea>
                        </div>

                        <!-- Question 3 -->
                        <div class="reflection-field-group">
                            <label for="refl-question-3" class="reflection-field-label">
                                <span class="refl-q-num">Question 3:</span>
                                Which skill would you like to improve further?
                            </label>
                            <p class="refl-field-hint">Optional: Identify personal focus areas like ownership, workflow sequencing, or collaboration.</p>
                            <textarea id="refl-question-3"
                                      class="reflection-textarea"
                                      rows="3"
                                      placeholder="Your reflection..."
                                      aria-label="Which skill would you like to improve further?">${this.escapeHtml(reflection.improvement_reflection || '')}</textarea>
                        </div>

                        <div class="reflection-action-row">
                            <button type="submit" class="btn btn-primary btn-lg" id="btn-save-reflection" style="padding: 12px 32px; font-size: 1rem;">
                                Save Reflection
                            </button>
                        </div>
                    </form>
                </div>

                <!-- 6. COMPLETION MESSAGE & ACTION BUTTONS -->
                <div class="simulation-completion-footer-card">
                    <div class="completion-footer-icon" aria-hidden="true">&#10003;</div>
                    <span class="badge badge-teal" style="font-size: 0.85rem; font-weight: 700; padding: 6px 16px; margin-bottom: 12px;">SIMULATION COMPLETE</span>
                    <h2 class="completion-footer-heading">SIMULATION COMPLETE</h2>
                    <p class="completion-footer-p1">You've completed the Task Compass Tech Company simulation.</p>
                    <p class="completion-footer-p2">Keep practicing how people, tasks and teams connect in the workplace.</p>

                    <!-- Action Buttons -->
                    <div class="final-action-buttons-row">
                        ${overall.percentage >= 70 ? `
                        <button class="btn btn-primary btn-lg" id="btn-final-cert" onclick="App.openCertificate('${resultsData.session_id}')" style="background-color: var(--color-mint-light); color: var(--color-primary-dark); border: 2px solid var(--color-primary);">
                            &#127891; View Verified Certificate
                        </button>
                        ` : ''}
                        <button class="btn btn-primary btn-lg" id="btn-final-back-home" onclick="App.backToHome()">
                            Back to Home
                        </button>
                        <button class="btn btn-secondary btn-lg" id="btn-final-another-workplace" onclick="App.exploreWorkplaces()">
                            Try Another Workplace
                        </button>
                        <button class="btn btn-outline btn-lg" id="btn-final-try-again" onclick="App.tryAgain()">
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Submits reflection responses to backend.
     * Reflection answers are optional. Blank answers are permitted.
     */
    async saveReflection() {
        const btn = document.getElementById('btn-save-reflection');
        const statusMsg = document.getElementById('reflection-status-message');

        const q1 = document.getElementById('refl-question-1') ? document.getElementById('refl-question-1').value.trim() : '';
        const q2 = document.getElementById('refl-question-2') ? document.getElementById('refl-question-2').value.trim() : '';
        const q3 = document.getElementById('refl-question-3') ? document.getElementById('refl-question-3').value.trim() : '';

        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving Reflection...';
        }

        try {
            const payload = {
                ownership_reflection: q1,
                collaboration_reflection: q2,
                improvement_reflection: q3
            };

            const sessionId = State.session ? State.session.id : (this.resultsData ? this.resultsData.session_id : null);
            if (!sessionId) {
                throw new Error('Simulation session identifier is missing.');
            }

            const response = await API.submitReflection(sessionId, payload);

            if (statusMsg) {
                statusMsg.style.display = 'flex';
                statusMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save Reflection';
            }

            State.notify('Your learning reflection has been saved.', 'success');
        } catch (err) {
            console.error('Failed to save reflection:', err);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save Reflection';
            }
            State.notify('We could not save your reflection right now. Please try again.', 'danger');
        }
    }
};
