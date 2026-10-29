from django.core.management.base import BaseCommand
from django.db import transaction
from simulation.models import Workplace, Role, Scenario, ScenarioOption


class Command(BaseCommand):
    help = 'Seeds initial simulation data: 4 Workplaces, 12 Tech Roles, scenarios for Stages 1-3'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Starting Task Compass seed process...")

        # ---------------------------------------------------------------------
        # 1. WORKPLACES
        # ---------------------------------------------------------------------
        workplaces_data = [
            {
                'name': 'Tech Company',
                'slug': 'tech-company',
                'tagline': 'SaaS enterprise with high-velocity releases & rigorous cybersecurity defenses.',
                'description': (
                    'A fast-paced cloud software organization balancing continuous delivery with strict '
                    'threat monitoring, zero-trust network boundaries, and an active Security Operations Center (SOC).'
                ),
                'icon': 'terminal',
                'theme_color': '#3b82f6',
                'order': 1,
            },
            {
                'name': 'Startup',
                'slug': 'startup',
                'tagline': 'High-growth early-stage venture where agility and broad ownership are vital.',
                'description': (
                    'A dynamic startup environment with a small, cross-disciplinary team moving quickly to achieve '
                    'product-market fit while managing scarce resources and rapid feature iteration.'
                ),
                'icon': 'rocket',
                'theme_color': '#8b5cf6',
                'order': 2,
            },
            {
                'name': 'Corporate Office',
                'slug': 'corporate-office',
                'tagline': 'Multinational enterprise driven by governance, compliance, and matrix hierarchies.',
                'description': (
                    'An established corporate firm characterized by formal change-management boards, departmental '
                    'hand-offs, regulatory reporting, and cross-functional steering committees.'
                ),
                'icon': 'briefcase',
                'theme_color': '#0ea5e9',
                'order': 3,
            },
            {
                'name': 'Hospital / Healthcare',
                'slug': 'hospital-healthcare',
                'tagline': 'Critical medical center balancing clinical urgency, patient safety, and HIPAA compliance.',
                'description': (
                    'A 24/7 healthcare ecosystem where clinical decisions, patient telemetry systems, Electronic Health '
                    'Records (EHR), and patient privacy intersect with immediate life-safety consequences.'
                ),
                'icon': 'heart-pulse',
                'theme_color': '#10b981',
                'order': 4,
            },
        ]

        workplaces = {}
        for wp_data in workplaces_data:
            wp, created = Workplace.objects.update_or_create(
                slug=wp_data['slug'],
                defaults=wp_data
            )
            workplaces[wp.slug] = wp
            action = "Created" if created else "Updated"
            self.stdout.write(f"  {action} Workplace: {wp.name}")

        tech_wp = workplaces['tech-company']
        startup_wp = workplaces['startup']
        corp_wp = workplaces['corporate-office']
        hospital_wp = workplaces['hospital-healthcare']

        # ---------------------------------------------------------------------
        # 2. TECH COMPANY ROLES (EXACTLY 12 ROLES IN 3 ROWS x 4 COLUMNS ORDER)
        # ---------------------------------------------------------------------
        tech_roles_data = [
            # ROW 1
            {
                'name': 'Product Manager',
                'slug': 'product-manager',
                'tagline': 'Defines product vision, feature priorities, and business trade-offs.',
                'description': (
                    'Bridges business strategy, customer needs, and technical execution. Responsible for defining '
                    'roadmaps, writing acceptance criteria, and prioritizing security/stability versus market velocity.'
                ),
                'responsibilities': [
                    'Roadmap definition & feature backlog grooming',
                    'User journey validation and stakeholder alignment',
                    'Release scope sign-off and ROI prioritization',
                    'Balancing technical debt against new feature shipping'
                ],
                'key_collaborators': ['Engineering Manager', 'UX / UI Designer', 'Cybersecurity Engineer'],
                'is_cybersecurity': False,
                'order': 1,
            },
            {
                'name': 'UX / UI Designer',
                'slug': 'ux-ui-designer',
                'tagline': 'Crafts intuitive, accessible, and human-centered digital experiences.',
                'description': (
                    'Translates complex user workflows into clean, accessible interfaces. Ensures security friction '
                    '(like MFA and session expiry warnings) does not degrade user adoption and compliance.'
                ),
                'responsibilities': [
                    'User research and wireframe prototyping',
                    'Design system component consistency',
                    'Usability testing for security workflows (e.g. 2FA, password recovery)',
                    'Accessibility (WCAG 2.1) compliance'
                ],
                'key_collaborators': ['Product Manager', 'Frontend Developer'],
                'is_cybersecurity': False,
                'order': 2,
            },
            {
                'name': 'Frontend Developer',
                'slug': 'frontend-developer',
                'tagline': 'Builds responsive client-side web architectures and interactive UIs.',
                'description': (
                    'Implements modern user interfaces with pure HTML/CSS/JS or component frameworks. Defends against '
                    'client-side attack vectors such as Cross-Site Scripting (XSS) and Content Security Policy (CSP) violations.'
                ),
                'responsibilities': [
                    'Client-side view implementation and state orchestration',
                    'Responsive layout rendering and cross-browser stability',
                    'Sanitizing user inputs to prevent client-side script injection',
                    'Integrating RESTful backend endpoints smoothly'
                ],
                'key_collaborators': ['UX / UI Designer', 'Backend Developer', 'QA / Test Engineer'],
                'is_cybersecurity': False,
                'order': 3,
            },
            {
                'name': 'Backend Developer',
                'slug': 'backend-developer',
                'tagline': 'Architects business logic, APIs, database transactions, and data security.',
                'description': (
                    'Constructs scalable server-side systems, data storage, and authenticated APIs. Safeguards against '
                    'SQL injection, Broken Object Level Authorization (BOLA), and race conditions in business logic.'
                ),
                'responsibilities': [
                    'API endpoint development and database schema migrations',
                    'Implementing secure authentication & granular authorization policies',
                    'Data encryption at rest and in transit',
                    'Patching vulnerable third-party dependencies in backend code'
                ],
                'key_collaborators': ['Frontend Developer', 'DevOps / Cloud Engineer', 'Cybersecurity Engineer'],
                'is_cybersecurity': False,
                'order': 4,
            },

            # ROW 2
            {
                'name': 'QA / Test Engineer',
                'slug': 'qa-test-engineer',
                'tagline': 'Validates quality, edge cases, regression suites, and security flaws.',
                'description': (
                    'Ensures system reliability and functional correctness. Designs automated testing pipelines, '
                    'executes regression suites, and performs dynamic testing to catch security edge cases before release.'
                ),
                'responsibilities': [
                    'Automated integration and end-to-end test execution',
                    'Edge-case discovery and bug triage documentation',
                    'Verifying security patches and boundary condition stability',
                    'Load testing and performance regression benchmarking'
                ],
                'key_collaborators': ['Backend Developer', 'Frontend Developer', 'Engineering Manager'],
                'is_cybersecurity': False,
                'order': 5,
            },
            {
                'name': 'DevOps / Cloud Engineer',
                'slug': 'devops-cloud-engineer',
                'tagline': 'Manages CI/CD pipelines, container orchestration, and cloud infrastructure.',
                'description': (
                    'Oversees Kubernetes clusters, cloud environments (AWS/GCP/Azure), and automated deployment pipelines. '
                    'Enforces infrastructure-as-code, secrets management, and automated vulnerability scanning.'
                ),
                'responsibilities': [
                    'CI/CD pipeline maintenance and zero-downtime rollouts',
                    'Cloud resource provisioning via Terraform / IaC',
                    'Secrets rotation and IAM role least-privilege scoping',
                    'System observability, log aggregation, and metric alerting'
                ],
                'key_collaborators': ['Backend Developer', 'Network Engineer', 'Cybersecurity Engineer'],
                'is_cybersecurity': False,
                'order': 6,
            },
            {
                'name': 'Network Engineer',
                'slug': 'network-engineer',
                'tagline': 'Protects network topology, VPC routing, firewalls, and data transport.',
                'description': (
                    'Designs and defends the physical and virtual network topology. Manages subnets, VPN gateways, '
                    'BGP routing, firewall access control lists (ACLs), and traffic scrubbing against volumetric DDoS attacks.'
                ),
                'responsibilities': [
                    'VPC design, subnetting, and network gateway configuration',
                    'Hardware and software firewall policy management',
                    'DDoS mitigation and edge traffic load balancing',
                    'Site-to-site VPN encryption and network packet analysis'
                ],
                'key_collaborators': ['DevOps / Cloud Engineer', 'SOC Analyst', 'Cybersecurity Engineer'],
                'is_cybersecurity': True,
                'order': 7,
            },
            {
                'name': 'Cybersecurity Engineer',
                'slug': 'cybersecurity-engineer',
                'tagline': 'Engineers threat defenses, application hardening, and secure architectures.',
                'description': (
                    'Leads application security (AppSec) and system hardening. Performs threat modeling, architectural '
                    'security reviews, cryptographic validation, and remediates critical CVEs across all engineering stacks.'
                ),
                'responsibilities': [
                    'Threat modeling for new architecture and API specifications',
                    'SAST/DAST pipeline integration and vulnerability triage',
                    'Incident response playbooks and forensic root cause analysis',
                    'Penetration testing and security code reviews'
                ],
                'key_collaborators': ['Backend Developer', 'SOC Analyst', 'Security Analyst', 'DevOps / Cloud Engineer'],
                'is_cybersecurity': True,
                'order': 8,
            },

            # ROW 3
            {
                'name': 'SOC Analyst',
                'slug': 'soc-analyst',
                'tagline': 'Monitors 24/7 SIEM feeds, investigates telemetry anomalies, and contains active threats.',
                'description': (
                    'Acts as the first line of defense in the Security Operations Center. Investigates SIEM alerts, '
                    'analyzes endpoint detection signals (EDR), tracks indicators of compromise (IOCs), and executes containment protocols.'
                ),
                'responsibilities': [
                    'Real-time SIEM event triage and anomaly verification',
                    'Containing active host infections and revoking compromised credentials',
                    'Phishing analysis and malicious payload reverse engineering',
                    'Escalating confirmed high-severity incidents to engineering teams'
                ],
                'key_collaborators': ['Cybersecurity Engineer', 'Network Engineer', 'Customer Support / IT'],
                'is_cybersecurity': True,
                'order': 9,
            },
            {
                'name': 'Security Analyst',
                'slug': 'security-analyst',
                'tagline': 'Conducts risk assessments, vendor audits, compliance checks, and security governance.',
                'description': (
                    'Evaluates organizational security risk, regulatory compliance (SOC 2, ISO 27001, GDPR), '
                    'third-party vendor certifications, and coordinates customer security questionnaires and pen-test attestations.'
                ),
                'responsibilities': [
                    'SOC 2, ISO 27001, and regulatory compliance audits',
                    'Vendor third-party risk assessments (TPRM)',
                    'Employee security awareness training and simulated phishing',
                    'Answering customer security due-diligence questionnaires'
                ],
                'key_collaborators': ['Cybersecurity Engineer', 'Product Manager', 'Engineering Manager'],
                'is_cybersecurity': True,
                'order': 10,
            },
            {
                'name': 'Engineering Manager',
                'slug': 'engineering-manager',
                'tagline': 'Guides team delivery, unblocks engineers, and balances velocity with security.',
                'description': (
                    'Leads engineering squads, allocates sprint capacity, manages incident on-call rotations, '
                    'and resolves cross-functional priority conflicts between feature velocity and technical/security health.'
                ),
                'responsibilities': [
                    'Sprint resource allocation and engineering velocity governance',
                    'Resolving cross-team dependencies and developer bottlenecks',
                    'Leading post-incident retrospectives and blameless reviews',
                    'Championing engineering culture, mentorship, and security standards'
                ],
                'key_collaborators': ['Product Manager', 'Cybersecurity Engineer', 'DevOps / Cloud Engineer'],
                'is_cybersecurity': False,
                'order': 11,
            },
            {
                'name': 'Customer Support / IT',
                'slug': 'customer-support-it',
                'tagline': 'Resolves employee IT issues, endpoint security, and front-line customer escalations.',
                'description': (
                    'Manages internal workplace hardware/software provisioning (Identity & Access Management, MDM), '
                    'resolves endpoint security alerts, and triages urgent bug reports coming directly from end-users.'
                ),
                'responsibilities': [
                    'Employee laptop onboarding, MDM enrollment, and IAM provisioning',
                    'Front-line triage of user-reported software glitches and login issues',
                    'Identifying potential social engineering and phishing attempts targeting staff',
                    'Escalating verified production issues to engineering on-call'
                ],
                'key_collaborators': ['SOC Analyst', 'Engineering Manager', 'Frontend Developer'],
                'is_cybersecurity': False,
                'order': 12,
            },
        ]

        tech_roles = {}
        for r_data in tech_roles_data:
            role, created = Role.objects.update_or_create(
                workplace=tech_wp,
                slug=r_data['slug'],
                defaults=r_data
            )
            tech_roles[role.slug] = role
            action = "Created" if created else "Updated"
            self.stdout.write(f"    {action} Tech Role: [{role.order}] {role.name}")

        # ---------------------------------------------------------------------
        # 3. OTHER WORKPLACES' ROLES
        # ---------------------------------------------------------------------
        other_roles = [
            # Startup
            (startup_wp, 'Founder & CEO', 'founder-ceo', 'Drives vision, funding, and high-stakes prioritization.', 1, False),
            (startup_wp, 'Full-Stack Developer', 'startup-fullstack', 'Owns rapid feature development from database to UI.', 2, False),
            (startup_wp, 'Growth Marketer', 'growth-marketer', 'Expands customer acquisition and user analytics.', 3, False),
            (startup_wp, 'Operations Lead', 'operations-lead', 'Maintains cash runway, vendors, and regulatory legal basics.', 4, False),

            # Corporate Office
            (corp_wp, 'Project Director', 'project-director', 'Oversees enterprise programs and cross-department governance.', 1, False),
            (corp_wp, 'Enterprise Business Analyst', 'business-analyst', 'Documents technical requirements and process workflows.', 2, False),
            (corp_wp, 'Compliance & Risk Officer', 'compliance-officer', 'Enforces regulatory policies and internal audits.', 3, True),
            (corp_wp, 'Operations Manager', 'operations-manager', 'Maintains departmental SLAs and resource planning.', 4, False),

            # Hospital
            (hospital_wp, 'Chief Medical Officer', 'chief-medical-officer', 'Oversees clinical care standards and patient safety policies.', 1, False),
            (hospital_wp, 'Head Nurse / Floor Supervisor', 'head-nurse', 'Coordinates triage, patient workflows, and emergency responses.', 2, False),
            (hospital_wp, 'Clinical Systems Administrator', 'clinical-systems-admin', 'Secures Electronic Health Record (EHR) databases and HIPAA compliance.', 3, True),
            (hospital_wp, 'Biomedical Equipment Engineer', 'biomedical-engineer', 'Maintains medical telemetry hardware and IoT infusion pumps.', 4, False),
        ]

        for wp, name, slug, tagline, order, is_sec in other_roles:
            Role.objects.update_or_create(
                workplace=wp,
                slug=slug,
                defaults={
                    'name': name,
                    'tagline': tagline,
                    'description': f"Key operational role within {wp.name}.",
                    'responsibilities': ['Operational execution', 'Cross-team communication'],
                    'order': order,
                    'is_cybersecurity': is_sec,
                }
            )

        # ---------------------------------------------------------------------
        # 4. SCENARIOS & OPTIONS (STAGES 1, 2, 3)
        # ---------------------------------------------------------------------

        # Clear existing scenarios to ensure clean deterministic seeding
        Scenario.objects.filter(workplace=tech_wp).delete()
        Scenario.objects.filter(workplace=startup_wp).delete()
        Scenario.objects.filter(workplace=corp_wp).delete()
        Scenario.objects.filter(workplace=hospital_wp).delete()

        # TECH COMPANY SCENARIOS
        tech_scenarios = [
            # -----------------------------------------------------------------
            # STAGE 1: WHO OWNS THIS? (Ownership Focus)
            # -----------------------------------------------------------------
            {
                'workplace': tech_wp,
                'stage': 1,
                'title': 'Critical CVE-2026 Authentication Bypass in Production JWT Dependency',
                'description': (
                    'An automated Software Composition Analysis (SCA) alert sounds an alarm: an open-source JWT '
                    'library used across all authentication microservices has a critical Remote Code Execution vulnerability '
                    'exploited in the wild. Public exploit code was published 2 hours ago. Who owns primary remediation accountability?'
                ),
                'incident_type': 'Cybersecurity Incident / Dependency Vulnerability',
                'urgency_level': 'Critical',
                'context_data': {
                    'CVE_ID': 'CVE-2026-4401',
                    'CVSS_Score': '9.8 (Critical)',
                    'Component': 'core-auth-service',
                    'Affected_Version': 'v2.1.4',
                },
                'order': 1,
                'options': [
                    {
                        'option_text': 'Backend Developer: Own the upgrade path, regression test token issuance, and coordinate patch deployment.',
                        'recommended_role': tech_roles['backend-developer'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 15,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal Ownership: The Backend Developer directly owns the authentication service codebase and '
                            'dependency tree. They must verify backward compatibility, update the package, and test authentication logic.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Customer Support: Start notifying customers that logins might be insecure and ask them to log out.',
                        'recommended_role': tech_roles['customer-support-it'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Severe Misdirection: Customer support has no ability to patch code, and premature public notification '
                            'induces unnecessary panic before technical containment is verified.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'UX / UI Designer: Create a warning banner on the login screen informing users of potential token flaws.',
                        'recommended_role': tech_roles['ux-ui-designer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 5,
                        'score_collaboration': 10,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Flawed Attribution: A backend RCE vulnerability is not a front-end user experience concern. '
                            'A warning banner does not mitigate remote code execution.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Cybersecurity Engineer: Lead the threat assessment, advise the backend team on safe patch versions, and verify mitigation.',
                        'recommended_role': tech_roles['cybersecurity-engineer'],
                        'is_optimal': False,
                        'score_ownership': 20,
                        'score_delegation': 20,
                        'score_collaboration': 25,
                        'score_workflow': 20,
                        'feedback_rationale': (
                            'Strong Collaborative Step, but the actual code modification and service rebuild must be owned by '
                            'Backend Engineering. Security provides verification and oversight.'
                        ),
                        'order': 4,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 1,
                'title': 'Anomalous Spikes in Tor Exit Node Traffic Targeting API Gateways',
                'description': (
                    'The Security Information and Event Management (SIEM) dashboard flashes orange: an orchestrated '
                    'credential stuffing attack is generating 45,000 requests per minute from disparate Tor nodes against '
                    'the `/api/v1/auth/login` endpoint. Account lockouts are starting to trigger. Who owns primary incident containment?'
                ),
                'incident_type': 'SOC Incident / Credential Stuffing',
                'urgency_level': 'High',
                'context_data': {
                    'Threat_Vector': 'Distributed Credential Stuffing',
                    'Origin': 'Tor Exit Nodes & Rotating Proxy Botnet',
                    'Rate': '45k req/min',
                },
                'order': 2,
                'options': [
                    {
                        'option_text': 'SOC Analyst: Verify telemetry, activate the credential-stuffing incident playbook, and apply immediate WAF rate-limiting.',
                        'recommended_role': tech_roles['soc-analyst'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 20,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal Ownership: Real-time SIEM event triage, threat telemetry verification, and active incident response '
                            'containment are core duties of the SOC Analyst.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'QA / Test Engineer: Run load tests to verify if the API gateway can withstand the traffic without crashing.',
                        'recommended_role': tech_roles['qa-test-engineer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 10,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Misplaced Focus: This is an active adversarial cyberattack, not an internal benchmark. Testing capacity during '
                            'an active attack exacerbates network load.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Product Manager: Schedule an emergency backlog refinement meeting for next week to brainstorm CAPTCHA integrations.',
                        'recommended_role': tech_roles['product-manager'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 10,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Dangerous Delay: An active security incident requires containment within minutes, not a sprint planning '
                            'discussion next week.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Network Engineer: Coordinate with SOC to implement edge-level IP drop rules and geo-filtering on perimeter routers.',
                        'recommended_role': tech_roles['network-engineer'],
                        'is_optimal': False,
                        'score_ownership': 20,
                        'score_delegation': 15,
                        'score_collaboration': 25,
                        'score_workflow': 20,
                        'feedback_rationale': (
                            'Excellent Collaboration: Network Engineers play a crucial support role in edge firewall rules, '
                            'though the SOC Analyst initiates and coordinates the incident response.'
                        ),
                        'order': 4,
                    },
                ]
            },

            # -----------------------------------------------------------------
            # STAGE 2: TASK ROUTING (Delegation Focus)
            # -----------------------------------------------------------------
            {
                'workplace': tech_wp,
                'stage': 2,
                'title': 'Enterprise Customer Demands Custom SAML 2.0 Single Sign-On and SOC 2 Type II Attestation',
                'description': (
                    'A Fortune 500 prospect is ready to close an annual $750k contract, but their procurement department '
                    'submits a mandatory 150-page Vendor Security Questionnaire, requires SAML 2.0 / Okta integration, '
                    'and demands our latest third-party penetration testing report within 48 hours. How should this multi-faceted task be routed?'
                ),
                'incident_type': 'Governance, Compliance & Architecture Task',
                'urgency_level': 'High',
                'context_data': {
                    'Contract_Value': '$750,000 ARR',
                    'Requirements': ['SAML 2.0 SSO', 'SOC 2 Type II Report', 'Clean Pen-Test Attestation'],
                    'Deadline': '48 hours',
                },
                'order': 1,
                'options': [
                    {
                        'option_text': 'Route the questionnaire & audit reports to the Security Analyst; route SAML integration scoping to Product Manager & Backend Dev.',
                        'recommended_role': tech_roles['security-analyst'],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal Delegation: Security Analysts specialize in compliance audits, SOC 2 reports, and risk questionnaires. '
                            'Product and Backend teams appropriately estimate and schedule SAML engineering work.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Dump the entire 150-page questionnaire onto the Junior Frontend Developer to answer between coding sprints.',
                        'recommended_role': tech_roles['frontend-developer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Harmful Delegation: Frontend developers are not trained in corporate compliance frameworks or legal liabilities. '
                            'Inaccurate answers on legal security attestations create massive breach liability.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Have Customer Support fill in arbitrary boilerplate answers so the contract gets signed as quickly as possible.',
                        'recommended_role': tech_roles['customer-support-it'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 5,
                        'score_collaboration': 0,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Severe Compliance Breach: Falsifying or guessing answers on compliance questionnaires violates '
                            'legal fraud statutes and enterprise trust.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Route only to the Engineering Manager to write custom code overnight for SAML single sign-on.',
                        'recommended_role': tech_roles['engineering-manager'],
                        'is_optimal': False,
                        'score_ownership': 10,
                        'score_delegation': 10,
                        'score_collaboration': 10,
                        'score_workflow': 10,
                        'feedback_rationale': (
                            'Suboptimal: An Engineering Manager should delegate implementation to specialists, and this ignores '
                            'the compliance audit aspects entirely.'
                        ),
                        'order': 4,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 2,
                'title': 'Automated CI/CD Pipeline Blocked: DAST Security Scan Detects Exposed Secrets in Repo',
                'description': (
                    'The production deployment pipeline halted unexpectedly. A static secret-detection hook flagged that a '
                    'developer inadvertently committed a staging AWS secret key and unencrypted database credentials into a feature branch. '
                    'The sprint release is blocked. How do you route this critical blocker?'
                ),
                'incident_type': 'DevOps & Secrets Leak',
                'urgency_level': 'High',
                'context_data': {
                    'Pipeline': 'GitHub Actions / Production Deploy',
                    'Detection': 'TruffleHog / AWS IAM Key detected in git commit history',
                    'Status': 'Build Blocked',
                },
                'order': 2,
                'options': [
                    {
                        'option_text': 'Route immediately to DevOps & Cybersecurity Engineer to revoke/rotate the leaked AWS credentials, rewrite git history, and re-run pipeline.',
                        'recommended_role': tech_roles['devops-cloud-engineer'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal Delegation & Workflow Thinking: Once a secret is committed, it is considered compromised. '
                            'DevOps and Security must immediately revoke the credential in AWS IAM, scrub git history, and verify secrets rotation.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Temporarily disable the secret scanning check in the CI/CD configuration file to force the build through.',
                        'recommended_role': tech_roles['devops-cloud-engineer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Catastrophic Decision: Disabling security scanners directly enables production breaches and cloud account hijacking.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Route to the UX Designer to redesign the CI/CD error notification modal.',
                        'recommended_role': tech_roles['ux-ui-designer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Absurd Routing: Leaked cloud credentials require immediate cryptographic revocation, not cosmetic UI redesign.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Route to QA to see if the leaked key can be used to log in manually before deciding whether to take action.',
                        'recommended_role': tech_roles['qa-test-engineer'],
                        'is_optimal': False,
                        'score_ownership': 10,
                        'score_delegation': 10,
                        'score_collaboration': 10,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Inefficient: Testing if a leaked key works wastes precious minutes. Standard operating procedure dictates '
                            'instant revocation upon detection.'
                        ),
                        'order': 4,
                    },
                ]
            },

            # -----------------------------------------------------------------
            # STAGE 3: COLLABORATION CHALLENGE (Collaboration & Workflow Focus)
            # -----------------------------------------------------------------
            {
                'workplace': tech_wp,
                'stage': 3,
                'title': 'The Zero-Day vs. Major Release Deadline Conflict',
                'description': (
                    'The company annual user summit is tomorrow morning at 9:00 AM, where the CEO is scheduled to publicly demo '
                    'the new analytics dashboard. At 6:00 PM tonight, the Cybersecurity Engineer discovers a privilege escalation '
                    'flaw in that exact module: any logged-in user can modify other tenants’ analytics data. '
                    'The Product Manager wants to ship as-is and patch next week. How do stakeholders collaborate to resolve this crisis?'
                ),
                'incident_type': 'Cross-Functional Conflict / Critical Trade-off',
                'urgency_level': 'Critical',
                'context_data': {
                    'Summit_Demo': 'Tomorrow 9:00 AM',
                    'Vulnerability': 'Broken Object Level Authorization (BOLA) in Analytics module',
                    'Impact': 'Tenant Data Tampering',
                },
                'order': 1,
                'options': [
                    {
                        'option_text': 'Convene an emergency sync (PM, Sec Engineer, Backend Dev, EM): wrap the vulnerable analytics editing feature behind a feature-flag (read-only mode), demo the UI safely at the summit, and ship the backend patch before general availability.',
                        'recommended_role': tech_roles['engineering-manager'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Mastery of Collaboration & Workflow Thinking: Neither reckless shipping nor pure project cancellation is required. '
                            'By feature-flagging the vulnerable mutation API, the executive demo succeeds visually without exposing customer tenant data to breach.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'The PM insists on release; the Cybersecurity Engineer stealthily disables the production database servers at 8:30 AM to protect data.',
                        'recommended_role': tech_roles['cybersecurity-engineer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Sabotage & Failure of Collaboration: Stealth unilateral action destroys organizational trust and '
                            'causes public executive embarrassment without solving the root issue.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Ignore the security engineer’s warning completely to ensure the release bonus is secured, hoping attackers do not notice.',
                        'recommended_role': tech_roles['product-manager'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Gross Negligence: Knowingly shipping a multi-tenant data leak creates severe regulatory penalties and brand ruin.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Cancel the entire product release and public summit demo without offering leadership or engineering any middle ground.',
                        'recommended_role': tech_roles['product-manager'],
                        'is_optimal': False,
                        'score_ownership': 10,
                        'score_delegation': 10,
                        'score_collaboration': 10,
                        'score_workflow': 10,
                        'feedback_rationale': (
                            'Rigid Thinking: Total cancellation ignores creative engineering workflows like canary releases, '
                            'feature flags, or mock demos.'
                        ),
                        'order': 4,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 3,
                'title': 'The Blameless Retrospective: Sustained 4-Hour Edge Gateway Outage',
                'description': (
                    'Following an aggressive botnet attack that congested the edge network and degraded services for 4 hours, '
                    'the Network Engineer and DevOps Engineer are in a heated argument: DevOps blames improper BGP route filtering; '
                    'Network blames lack of container auto-scaling. The Engineering Manager leads the post-incident review. '
                    'How does the team conduct this collaboration session?'
                ),
                'incident_type': 'Post-Mortem & Blameless Culture',
                'urgency_level': 'Medium',
                'context_data': {
                    'Outage_Duration': '4 hours 12 minutes',
                    'Root_Cause': 'Dual failure: Edge scrubber rate-limit saturation + backend thread exhaustion',
                },
                'order': 2,
                'options': [
                    {
                        'option_text': 'Host a structured blameless post-mortem: map timeline facts, identify defense-in-depth gaps (both Cloudflare edge scrubbing AND Kubernetes HPA limits), and commit action items across both teams into the next sprint.',
                        'recommended_role': tech_roles['engineering-manager'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Exemplary Leadership & Collaborative Culture: A blameless review avoids scapegoating, focuses on system '
                            'redundancy, and turns cross-functional tension into concrete resilience upgrades.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Pick whichever engineer has less seniority and assign them full formal blame in the incident report.',
                        'recommended_role': tech_roles['engineering-manager'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Toxic Management: Scapegoating discourages transparent reporting and guarantees future repeat failures.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Close the incident ticket with no action items since the outage already ended and the servers are currently green.',
                        'recommended_role': tech_roles['devops-cloud-engineer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Lack of Workflow Thinking: Without architectural post-mortems and hardening, the very next botnet wave '
                            'will cause an identical outage.'
                        ),
                        'order': 3,
                    },
                ]
            },
        ]

        # Seed Tech Scenarios
        for s_data in tech_scenarios:
            options_data = s_data.pop('options')
            scen = Scenario.objects.create(**s_data)
            for opt_data in options_data:
                ScenarioOption.objects.create(scenario=scen, **opt_data)
            self.stdout.write(f"    Created Stage {scen.stage} Scenario: {scen.title[:50]}...")

        # ---------------------------------------------------------------------
        # 5. SEED SCENARIOS FOR STARTUP, CORPORATE, HOSPITAL
        # ---------------------------------------------------------------------
        other_workplace_scenarios = [
            # Startup Stage 1
            {
                'workplace': startup_wp,
                'stage': 1,
                'title': 'Production Database Runs Out of Disk Space During Investor Pitch Day',
                'description': 'The startup production database disk hits 99.8% capacity, causing checkout transactions to fail right as seed investors are testing the live app.',
                'incident_type': 'Infrastructure Capacity Crisis',
                'urgency_level': 'Critical',
                'order': 1,
                'options': [
                    ('Full-Stack Developer: Clean temporary audit logs, resize the cloud storage volume immediately, and configure auto-expansion.', True, 25, 20, 20, 25, 'Decisive ownership in a lean startup where engineers manage their own infrastructure.'),
                    ('Operations Lead: Draft a proposal to request vendor quotes for new hard drives next month.', False, 0, 5, 0, 5, 'Too slow for an active emergency.'),
                ]
            },
            # Startup Stage 2
            {
                'workplace': startup_wp,
                'stage': 2,
                'title': 'Viral Social Media Influx: 20,000 Sign-ups in 1 Hour with Stripe Webhook Bottlenecks',
                'description': 'A TikTok influencer mentioned the app. Signups are spiking, but users complain of delayed confirmation emails and failed subscriptions.',
                'incident_type': 'Scaling & Funnel Triage',
                'urgency_level': 'High',
                'order': 1,
                'options': [
                    ('Route traffic load shedding to Full-Stack Dev; Growth Marketer posts a cheerful status page notice and prepares onboarding welcome batch.', True, 25, 25, 25, 25, 'Excellent cross-functional alignment between engineering throughput and public user sentiment.'),
                    ('Turn off user registration completely until next week.', False, 0, 0, 0, 0, 'Destroys viral growth momentum.'),
                ]
            },
            # Startup Stage 3
            {
                'workplace': startup_wp,
                'stage': 3,
                'title': 'Pivot vs. Polish: 3 Months of Runway Remaining',
                'description': 'The Founder wants to completely pivot to an AI chatbot, but the existing e-commerce tool has 50 paying customers who need bug fixes.',
                'incident_type': 'Strategic Alignment Dilemma',
                'urgency_level': 'High',
                'order': 1,
                'options': [
                    ('Founder, Dev, and Growth lead conduct a 2-day sprint to evaluate conversion metrics; maintain cash-flow from current customers while testing an AI micro-pilot.', True, 25, 25, 25, 25, 'Balances pragmatic revenue survival with innovative exploration.'),
                    ('Developer quits in frustration without speaking to the founder.', False, 0, 0, 0, 0, 'Total breakdown of collaboration.'),
                ]
            },

            # Corporate Office Stage 1
            {
                'workplace': corp_wp,
                'stage': 1,
                'title': 'GDPR Compliance Audit Flags Unencrypted Customer PII in Legacy Archive',
                'description': 'An internal compliance review uncovers 500,000 historical customer records stored in an unencrypted network share accessible across departments.',
                'incident_type': 'Regulatory & Data Governance',
                'urgency_level': 'Critical',
                'order': 1,
                'options': [
                    ('Compliance & Risk Officer: Issue an immediate data isolation freeze, initiate formal remediation, and notify the Data Protection Officer.', True, 25, 20, 25, 25, 'Direct regulatory accountability within corporate governance.'),
                    ('Ignore the finding because the audit was only internal.', False, 0, 0, 0, 0, 'Severe breach of compliance fiduciary duty.'),
                ]
            },
            # Corporate Stage 2
            {
                'workplace': corp_wp,
                'stage': 2,
                'title': 'Departmental SLA Breach: Procurement vs. Engineering Tool Licensing',
                'description': 'Engineers cannot access crucial IDE licenses because the procurement approval matrix has been pending executive signatures for 3 weeks.',
                'incident_type': 'Workflow & Matrix Delegation',
                'urgency_level': 'Medium',
                'order': 1,
                'options': [
                    ('Operations Manager initiates emergency procurement waiver; Project Director escalates directly to VP for single-day signoff.', True, 20, 25, 25, 25, 'Navigates corporate matrix processes effectively using official escalation channels.'),
                    ('Tell developers to write code using Notepad until the 6-month budget cycle renews.', False, 0, 0, 0, 0, 'Paralyzes engineering output.'),
                ]
            },
            # Corporate Stage 3
            {
                'workplace': corp_wp,
                'stage': 3,
                'title': 'Change Advisory Board (CAB) Rejection 12 Hours Before Global ERP Cutover',
                'description': 'The CAB rejects the ERP migration change request due to missing rollback verification tests from the finance sub-team.',
                'incident_type': 'Cross-Functional Stakeholder Negotiation',
                'urgency_level': 'High',
                'order': 1,
                'options': [
                    ('Project Director convenes an emergency CAB review: finance lead provides synthetic rollback validation data; joint signoff achieved before cutover window.', True, 25, 25, 25, 25, 'Respects compliance guardrails while actively unblocking business outcomes.'),
                    ('Deploy the ERP change anyway without CAB authorization.', False, 0, 0, 0, 0, 'Violates corporate policy and risks enterprise rollback disaster.'),
                ]
            },

            # Hospital Stage 1
            {
                'workplace': hospital_wp,
                'stage': 1,
                'title': 'Telemetry Monitor Ransomware Alert on Intensive Care Unit Network',
                'description': 'Three cardiac monitoring workstations in the ICU display suspicious encrypted desktop notes. Who owns the immediate response?',
                'incident_type': 'Clinical Cybersecurity Emergency',
                'urgency_level': 'Critical',
                'order': 1,
                'options': [
                    ('Clinical Systems Admin immediately isolates the ICU subnet at the network switch, while Head Nurse switches affected patients to standalone analog backup monitors.', True, 25, 25, 25, 25, 'Flawless intersection of clinical patient safety and cybersecurity containment.'),
                    ('Wait for the morning IT shift to report the issue in a ticketing queue.', False, 0, 0, 0, 0, 'Risk to human life and total hospital infection.'),
                ]
            },
            # Hospital Stage 2
            {
                'workplace': hospital_wp,
                'stage': 2,
                'title': 'Mass Casualty Incident Influx: Emergency Department Triage Overload',
                'description': 'A major highway accident brings 30 trauma patients into an Emergency Department with only 12 acute beds available.',
                'incident_type': 'Clinical Resource Triage',
                'urgency_level': 'Critical',
                'order': 1,
                'options': [
                    ('Head Nurse executes Mass Casualty Protocol: triage color-tagging, discharge stable ward patients, and route surgical trauma to open operating suites.', True, 25, 25, 25, 25, 'Gold standard in life-critical delegation and triage routing.'),
                    ('Admit patients on a strict first-come first-served basis regardless of injury severity.', False, 0, 0, 0, 0, 'Catastrophic failure of medical triage.'),
                ]
            },
            # Hospital Stage 3
            {
                'workplace': hospital_wp,
                'stage': 3,
                'title': 'Mandatory EHR System Downtime for Security Patching During Peak Surgery Hours',
                'description': 'IT needs to patch a critical medical IoT vulnerability that requires 90 minutes of EHR downtime, but surgeons have 6 scheduled operations.',
                'incident_type': 'Patient Safety vs. Infrastructure Hardening',
                'urgency_level': 'High',
                'order': 1,
                'options': [
                    ('Chief Medical Officer, Head Nurse, and Clinical Systems Admin reschedule downtime to 3:00 AM; pre-print paper clinical charts and station IT staff on surgical floors during cutover.', True, 25, 25, 25, 25, 'Preserves both surgical patient life safety and critical system security hygiene.'),
                    ('Cancel all surgeries for the week without clinical justification.', False, 5, 0, 0, 5, 'Disproportionate clinical disruption.'),
                ]
            },
        ]

        for s_data in other_workplace_scenarios:
            options_tuples = s_data.pop('options')
            scen = Scenario.objects.create(**s_data)
            for idx, (text, is_opt, o, d, c, w, rationale) in enumerate(options_tuples, start=1):
                ScenarioOption.objects.create(
                    scenario=scen,
                    option_text=text,
                    is_optimal=is_opt,
                    score_ownership=o,
                    score_delegation=d,
                    score_collaboration=c,
                    score_workflow=w,
                    feedback_rationale=rationale,
                    order=idx,
                )
            self.stdout.write(f"    Created [{scen.workplace.name}] Stage {scen.stage} Scenario: {scen.title[:45]}...")

        self.stdout.write(self.style.SUCCESS("Successfully seeded Task Compass database!"))
