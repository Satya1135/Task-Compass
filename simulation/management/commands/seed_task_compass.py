from django.core.management.base import BaseCommand
from django.db import transaction
from simulation.models import Workplace, Role, Scenario, ScenarioOption


class Command(BaseCommand):
    help = 'Populates or updates complete Task Compass workplaces, roles, scenarios, and workflows safely without duplicates.'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("==================================================")
        self.stdout.write("TASK COMPASS: SEEDING COMPLETE DATA LAYER")
        self.stdout.write("==================================================")

        # ---------------------------------------------------------------------
        # 1. WORKPLACES
        # ---------------------------------------------------------------------
        workplaces_info = [
            {
                'name': 'Tech Company',
                'slug': 'tech-company',
                'key': 'tech-company',
                'category': 'Enterprise Technology',
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
                'key': 'startup',
                'category': 'Early Stage Venture',
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
                'key': 'corporate-office',
                'category': 'Corporate Governance',
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
                'key': 'hospital-healthcare',
                'category': 'Healthcare & Life Safety',
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
        for wp_def in workplaces_info:
            wp, created = Workplace.objects.update_or_create(
                slug=wp_def['slug'],
                defaults=wp_def
            )
            workplaces[wp.slug] = wp
            action = "Created" if created else "Updated"
            self.stdout.write(f"[{action}] Workplace: {wp.name} ({wp.key})")

        tech_wp = workplaces['tech-company']
        startup_wp = workplaces['startup']
        corp_wp = workplaces['corporate-office']
        hospital_wp = workplaces['hospital-healthcare']

        # ---------------------------------------------------------------------
        # 2. TECH COMPANY ROLES (EXACTLY 12 ROLES WITH CATEGORIES)
        # ---------------------------------------------------------------------
        tech_roles_definitions = [
            {
                'order': 1,
                'name': 'Product Manager',
                'slug': 'product-manager',
                'category': 'Product',
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
            },
            {
                'order': 2,
                'name': 'UX / UI Designer',
                'slug': 'ux-ui-designer',
                'category': 'Design',
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
            },
            {
                'order': 3,
                'name': 'Frontend Developer',
                'slug': 'frontend-developer',
                'category': 'Engineering',
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
            },
            {
                'order': 4,
                'name': 'Backend Developer',
                'slug': 'backend-developer',
                'category': 'Engineering',
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
            },
            {
                'order': 5,
                'name': 'QA / Test Engineer',
                'slug': 'qa-test-engineer',
                'category': 'Quality',
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
            },
            {
                'order': 6,
                'name': 'DevOps / Cloud Engineer',
                'slug': 'devops-cloud-engineer',
                'category': 'Infrastructure',
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
            },
            {
                'order': 7,
                'name': 'Network Engineer',
                'slug': 'network-engineer',
                'category': 'Infrastructure',
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
            },
            {
                'order': 8,
                'name': 'Cybersecurity Engineer',
                'slug': 'cybersecurity-engineer',
                'category': 'InfoSec & SecOps',
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
            },
            {
                'order': 9,
                'name': 'SOC Analyst',
                'slug': 'soc-analyst',
                'category': 'Security Operations',
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
            },
            {
                'order': 10,
                'name': 'Security Analyst',
                'slug': 'security-analyst',
                'category': 'GRC & Security',
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
            },
            {
                'order': 11,
                'name': 'Engineering Manager',
                'slug': 'engineering-manager',
                'category': 'Leadership',
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
            },
            {
                'order': 12,
                'name': 'Customer Support / IT',
                'slug': 'customer-support-it',
                'category': 'Operations & IT',
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
            },
        ]

        roles_by_wp = {tech_wp.slug: {}}
        for r_def in tech_roles_definitions:
            r_slug = r_def['slug']
            role, created = Role.objects.update_or_create(
                workplace=tech_wp,
                slug=r_slug,
                defaults=r_def
            )
            roles_by_wp[tech_wp.slug][r_slug] = role
            action = "Created" if created else "Updated"
            self.stdout.write(f"  [{action}] Tech Role [{role.order}]: {role.name} ({role.category})")

        # ---------------------------------------------------------------------
        # 3. OTHER WORKPLACES ROLES
        # ---------------------------------------------------------------------
        other_roles_definitions = [
            # Startup
            (startup_wp, 'Founder & CEO', 'founder-ceo', 'Leadership', 'Drives vision, fund-raising, and strategic product bets.', 1, False),
            (startup_wp, 'Full-Stack Developer', 'startup-fullstack', 'Engineering', 'Owns rapid feature delivery across the entire technical stack.', 2, False),
            (startup_wp, 'Growth Marketer', 'growth-marketer', 'Growth & Marketing', 'Expands customer acquisition channels and user analytics.', 3, False),
            (startup_wp, 'Operations Lead', 'operations-lead', 'Operations & Finance', 'Maintains runway, legal compliance, vendor relations, and cash flow.', 4, False),

            # Corporate Office
            (corp_wp, 'Project Director', 'project-director', 'Program Management', 'Oversees enterprise programs, capital projects, and multi-department governance.', 1, False),
            (corp_wp, 'Enterprise Business Analyst', 'business-analyst', 'Business Architecture', 'Documents enterprise requirements, process flows, and departmental SLAs.', 2, False),
            (corp_wp, 'Compliance & Risk Officer', 'compliance-officer', 'Governance & Risk', 'Audits regulatory requirements, internal controls, and data privacy policies.', 3, True),
            (corp_wp, 'Operations Manager', 'operations-manager', 'Departmental Operations', 'Supervises operational resources, vendor SLAs, and change management boards.', 4, False),

            # Hospital / Healthcare
            (hospital_wp, 'Chief Medical Officer', 'chief-medical-officer', 'Clinical Governance', 'Ensures clinical excellence, patient care safety, and physician workflow standards.', 1, False),
            (hospital_wp, 'Head Nurse / Floor Supervisor', 'head-nurse', 'Nursing & Operations', 'Directs patient triage, ward bed capacity, and emergency clinical response teams.', 2, False),
            (hospital_wp, 'Clinical Systems Administrator', 'clinical-systems-admin', 'Healthcare IT & Security', 'Secures Electronic Health Record (EHR) networks, HIPAA data, and server uptime.', 3, True),
            (hospital_wp, 'Biomedical Equipment Engineer', 'biomedical-engineer', 'Clinical Engineering', 'Maintains ICU patient monitors, telemetry hardware, and life-critical medical devices.', 4, False),
        ]

        for wp, name, slug, cat, tagline, order, is_sec in other_roles_definitions:
            if wp.slug not in roles_by_wp:
                roles_by_wp[wp.slug] = {}
            role, created = Role.objects.update_or_create(
                workplace=wp,
                slug=slug,
                defaults={
                    'name': name,
                    'category': cat,
                    'tagline': tagline,
                    'description': f"Core operational role within {wp.name}.",
                    'responsibilities': ['Operational execution', 'Cross-team communication and workflow handoff'],
                    'order': order,
                    'is_cybersecurity': is_sec,
                }
            )
            roles_by_wp[wp.slug][slug] = role

        # Helper lookups
        t_roles = roles_by_wp[tech_wp.slug]
        s_roles = roles_by_wp[startup_wp.slug]
        c_roles = roles_by_wp[corp_wp.slug]
        h_roles = roles_by_wp[hospital_wp.slug]

        # ---------------------------------------------------------------------
        # 4. SCENARIOS DEFINITION
        # ---------------------------------------------------------------------
        # Cleanly recreate scenarios to guarantee exact data structure and prevent duplicates
        Scenario.objects.all().delete()

        all_scenarios = [
            # =================================================================
            # TECH COMPANY - STAGE 1: WHO OWNS THIS?
            # =================================================================
            {
                'workplace': tech_wp,
                'stage': 1,
                'question_number': 1,
                'title': 'Phishing Attack',
                'situation': 'Several employees report receiving suspicious emails that appear to be from a trusted company service. One employee clicked a link and entered their credentials.',
                'task': 'Who should primarily own this situation?',
                'primary_owner': t_roles['soc-analyst'],
                'supporting_roles': [t_roles['cybersecurity-engineer'], t_roles['network-engineer']],
                'ideal_roles': ['SOC Analyst'],
                'explanation': (
                    'The SOC Analyst is the primary owner because the situation requires monitoring, investigating and responding '
                    'to a suspected security incident. The Cybersecurity Engineer can support containment and technical investigation, '
                    'while the Network Engineer can assist with network-level investigation.'
                ),
                'incident_type': 'Cybersecurity Incident / Phishing',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': 'SOC Analyst (Primary Owner) — Triage the reported email, inspect headers, and initiate alert containment.',
                        'recommended_role': t_roles['soc-analyst'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 20,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal: The SOC Analyst is the primary investigator for incoming threat telemetry and employee security reports. '
                            'They isolate suspicious URLs and trigger containment.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Customer Support / IT — Tell the employee to mark the email as spam and take no further technical action.',
                        'recommended_role': t_roles['customer-support-it'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Suboptimal: Frontline IT should escalate potential credential harvesters to SOC rather than brushing it off as ordinary spam.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Product Manager — Schedule a quarterly training seminar to address workplace email hygiene.',
                        'recommended_role': t_roles['product-manager'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 5,
                        'score_collaboration': 10,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Incorrect: Active threats require real-time technical triage, not future roadmap scheduling.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Frontend Developer — Check if our website login page is functioning properly.',
                        'recommended_role': t_roles['frontend-developer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Incorrect: An inbound phishing email targeting employee mailboxes has no relationship to public website frontend code.'
                        ),
                        'order': 4,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 1,
                'question_number': 2,
                'title': 'Web Application Vulnerability',
                'situation': 'A security assessment discovers a serious vulnerability in the company\'s web application that could allow unauthorized access to sensitive application data.',
                'task': 'Who should primarily own this situation?',
                'primary_owner': t_roles['cybersecurity-engineer'],
                'supporting_roles': [t_roles['backend-developer'], t_roles['devops-cloud-engineer'], t_roles['qa-test-engineer']],
                'ideal_roles': ['Cybersecurity Engineer'],
                'explanation': (
                    'The Cybersecurity Engineer should primarily own the security investigation and remediation coordination. '
                    'Backend Development can address application-level code changes, DevOps / Cloud can support infrastructure and deployment changes, '
                    'and QA / Test can verify that the vulnerability has been properly fixed.'
                ),
                'incident_type': 'Application Security / AppSec Vulnerability',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': 'Cybersecurity Engineer (Primary Owner) — Coordinate threat assessment, define remediation scope, and guide engineering on secure patch standards.',
                        'recommended_role': t_roles['cybersecurity-engineer'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal: The Cybersecurity Engineer owns overall vulnerability assessment and remediation coordination across engineering stakeholders.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'UX / UI Designer — Redesign the vulnerable page so users cannot find the affected form field.',
                        'recommended_role': t_roles['ux-ui-designer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Security through obscurity does not resolve application vulnerabilities. Direct backend code remediation is required.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'Backend Developer — Push an immediate untested hotfix directly to production servers without security review.',
                        'recommended_role': t_roles['backend-developer'],
                        'is_optimal': False,
                        'score_ownership': 10,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Risky: While backend devs implement the patch, doing so without coordination or QA validation risks service outages and incomplete fixes.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'Customer Support / IT — Tell users that the web application is undergoing routine scheduled maintenance.',
                        'recommended_role': t_roles['customer-support-it'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Misleading and ineffective: Falsifying maintenance notices fails to remediate the underlying flaw.'
                        ),
                        'order': 4,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 1,
                'question_number': 3,
                'title': 'Suspicious Network Traffic',
                'situation': 'The company detects unusual outbound network traffic from an internal system. The traffic pattern may indicate unauthorized communication with an external system.',
                'task': 'Who should primarily own this situation?',
                'primary_owner': t_roles['soc-analyst'],
                'supporting_roles': [t_roles['network-engineer'], t_roles['cybersecurity-engineer']],
                'ideal_roles': ['SOC Analyst'],
                'explanation': (
                    'The SOC Analyst should initially own the investigation because the event is a potential security incident. '
                    'The Network Engineer can investigate traffic and network infrastructure, while the Cybersecurity Engineer can support deeper security analysis and response.'
                ),
                'incident_type': 'Network Anomaly / Data Exfiltration',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': 'SOC Analyst (Primary Owner) — Triage the network telemetry alert, correlate flow logs, and determine potential compromise.',
                        'recommended_role': t_roles['soc-analyst'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 20,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Optimal: The SOC Analyst monitors continuous SIEM and IDS feeds, triage anomalies, and confirms whether traffic constitutes an incident.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Engineering Manager — Demand a written report from all developers explaining their recent download history.',
                        'recommended_role': t_roles['engineering-manager'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': (
                            'Ineffective: Interrogating developers manually without log telemetry analysis wastes time during an active anomaly.'
                        ),
                        'order': 2,
                    },
                    {
                        'option_text': 'QA / Test Engineer — Write an automated test case to see if the anomaly replicates itself.',
                        'recommended_role': t_roles['qa-test-engineer'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Misaligned: Live network anomalies require immediate operational triage, not regression test automation.'
                        ),
                        'order': 3,
                    },
                    {
                        'option_text': 'DevOps / Cloud Engineer — Power down all cloud servers across all availability zones immediately.',
                        'recommended_role': t_roles['devops-cloud-engineer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': (
                            'Disproportionate: Uncoordinated server shutdown destroys production business continuity and volatile forensic evidence in RAM.'
                        ),
                        'order': 4,
                    },
                ]
            },

            # =================================================================
            # TECH COMPANY - STAGE 2: TASK ROUTING
            # =================================================================
            {
                'workplace': tech_wp,
                'stage': 2,
                'question_number': 1,
                'title': 'Phishing Incident Response',
                'situation': 'A phishing email has been reported by an employee. The company needs to investigate the incident, coordinate the technical response and ensure the issue is properly escalated.',
                'task': 'Arrange the roles in the order they should handle this incident.',
                'primary_owner': t_roles['customer-support-it'],
                'workflow_route': [
                    'Customer Support / IT',
                    'SOC Analyst',
                    'Cybersecurity Engineer',
                    'Network Engineer',
                    'Engineering Manager',
                ],
                'explanation': (
                    'Customer Support / IT receives or records the initial employee report and routes the incident to the security operations team.\n\n'
                    'The SOC Analyst investigates the suspicious activity and determines whether the event represents a security incident.\n\n'
                    'The Cybersecurity Engineer supports technical investigation and containment.\n\n'
                    'The Network Engineer investigates relevant network activity and infrastructure.\n\n'
                    'The Engineering Manager coordinates escalation, resources and broader engineering response.'
                ),
                'incident_type': 'Incident Workflow / Phishing Triage',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': 'Customer Support / IT → SOC Analyst → Cybersecurity Engineer → Network Engineer → Engineering Manager',
                        'route_sequence': [
                            'Customer Support / IT',
                            'SOC Analyst',
                            'Cybersecurity Engineer',
                            'Network Engineer',
                            'Engineering Manager',
                        ],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Correct Workflow Order: Seamless escalation from frontline intake to telemetry triage, threat analysis, perimeter blocking, and management sign-off.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Engineering Manager → UX / UI Designer → Frontend Developer → Customer Support / IT → SOC Analyst',
                        'route_sequence': ['Engineering Manager', 'UX / UI Designer', 'Frontend Developer', 'Customer Support / IT', 'SOC Analyst'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': 'Flawed sequence: Involves UI design in an active security breach and delays SOC response.',
                        'order': 2,
                    },
                    {
                        'option_text': 'SOC Analyst → QA / Test Engineer → Product Manager → Network Engineer',
                        'route_sequence': ['SOC Analyst', 'QA / Test Engineer', 'Product Manager', 'Network Engineer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 10,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': 'Omission: Missing Cybersecurity Engineer and frontline IT containment.',
                        'order': 3,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 2,
                'question_number': 2,
                'title': 'Web Security Vulnerability',
                'situation': 'A serious vulnerability has been discovered in a web application. The company needs to investigate, fix, deploy and verify the solution.',
                'task': 'Arrange the roles in the order they should handle this situation.',
                'primary_owner': t_roles['cybersecurity-engineer'],
                'workflow_route': [
                    'Cybersecurity Engineer',
                    'Backend Developer',
                    'DevOps / Cloud Engineer',
                    'QA / Test Engineer',
                    'Engineering Manager',
                ],
                'explanation': (
                    'The Cybersecurity Engineer identifies and coordinates the security issue.\n\n'
                    'The Backend Developer addresses the vulnerable application code.\n\n'
                    'The DevOps / Cloud Engineer manages the deployment and infrastructure changes.\n\n'
                    'The QA / Test Engineer verifies that the vulnerability has been fixed and that the application continues to work correctly.\n\n'
                    'The Engineering Manager coordinates the final engineering response and delivery.'
                ),
                'incident_type': 'Vulnerability Patch Lifecycle',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': 'Cybersecurity Engineer → Backend Developer → DevOps / Cloud Engineer → QA / Test Engineer → Engineering Manager',
                        'route_sequence': [
                            'Cybersecurity Engineer',
                            'Backend Developer',
                            'DevOps / Cloud Engineer',
                            'QA / Test Engineer',
                            'Engineering Manager',
                        ],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Correct Workflow Order: Security specs the fix, Backend patches code, DevOps orchestrates deployment pipelines, QA verifies zero regressions, and EM authorizes release.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Backend Developer → Customer Support / IT → Product Manager → QA / Test Engineer',
                        'route_sequence': ['Backend Developer', 'Customer Support / IT', 'Product Manager', 'QA / Test Engineer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': 'Omits Cybersecurity guidance and cloud deployment infrastructure steps.',
                        'order': 2,
                    },
                    {
                        'option_text': 'DevOps / Cloud Engineer → UX / UI Designer → Frontend Developer → Engineering Manager',
                        'route_sequence': ['DevOps / Cloud Engineer', 'UX / UI Designer', 'Frontend Developer', 'Engineering Manager'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 5,
                        'score_workflow': 0,
                        'feedback_rationale': 'Misrouted: Web vulnerabilities in backend databases cannot be solved by UI design.',
                        'order': 3,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 2,
                'question_number': 3,
                'title': 'Suspicious Network Activity',
                'situation': 'The company detects unusual outbound network traffic from an internal system. The incident needs to be investigated and coordinated across security and infrastructure teams.',
                'task': 'Arrange the roles in the order they should handle this situation.',
                'primary_owner': t_roles['soc-analyst'],
                'workflow_route': [
                    'SOC Analyst',
                    'Cybersecurity Engineer',
                    'Network Engineer',
                    'DevOps / Cloud Engineer',
                    'Engineering Manager',
                ],
                'explanation': (
                    'The SOC Analyst detects and investigates the suspicious activity.\n\n'
                    'The Cybersecurity Engineer performs deeper security analysis and supports response actions.\n\n'
                    'The Network Engineer investigates the network infrastructure and traffic path.\n\n'
                    'The DevOps / Cloud Engineer checks affected infrastructure and deployment environments.\n\n'
                    'The Engineering Manager coordinates the broader response and resources.'
                ),
                'incident_type': 'Network Exfiltration Response',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': 'SOC Analyst → Cybersecurity Engineer → Network Engineer → DevOps / Cloud Engineer → Engineering Manager',
                        'route_sequence': [
                            'SOC Analyst',
                            'Cybersecurity Engineer',
                            'Network Engineer',
                            'DevOps / Cloud Engineer',
                            'Engineering Manager',
                        ],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Correct Workflow Order: Triage → Threat Analysis → Traffic Isolation → Infrastructure Rebuild → Leadership Governance.'
                        ),
                        'order': 1,
                    },
                    {
                        'option_text': 'Network Engineer → Customer Support / IT → Product Manager → Backend Developer',
                        'route_sequence': ['Network Engineer', 'Customer Support / IT', 'Product Manager', 'Backend Developer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': 'Bypasses SOC investigation and cloud infrastructure management.',
                        'order': 2,
                    },
                    {
                        'option_text': 'Customer Support / IT → QA / Test Engineer → Frontend Developer → Engineering Manager',
                        'route_sequence': ['Customer Support / IT', 'QA / Test Engineer', 'Frontend Developer', 'Engineering Manager'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Completely erroneous routing for network perimeter incidents.',
                        'order': 3,
                    },
                ]
            },

            # =================================================================
            # TECH COMPANY - STAGE 3: COLLABORATION CHALLENGE
            # =================================================================
            {
                'workplace': tech_wp,
                'stage': 3,
                'question_number': 1,
                'title': 'Ransomware Incident',
                'situation': (
                    'Multiple company systems suddenly become unavailable. Several files have been encrypted '
                    'and users report unusual activity across their machines. The company needs an immediate coordinated security response.'
                ),
                'task': 'Build the team that should collaborate to handle this incident.',
                'primary_owner': t_roles['soc-analyst'],
                'supporting_roles': [
                    t_roles['cybersecurity-engineer'],
                    t_roles['network-engineer'],
                    t_roles['devops-cloud-engineer'],
                ],
                'supporting_teams': [
                    'Cybersecurity Engineer',
                    'Network Engineer',
                    'DevOps / Cloud Engineer',
                ],
                'workflow_route': [
                    'SOC Analyst',
                    'Cybersecurity Engineer',
                    'Network Engineer',
                    'DevOps / Cloud Engineer',
                    'Engineering Manager',
                ],
                'communication_flow': [
                    'SOC Analyst',
                    'Cybersecurity Engineer',
                    'Network Engineer',
                    'DevOps / Cloud Engineer',
                    'Engineering Manager',
                ],
                'explanation': (
                    'The SOC Analyst coordinates the initial detection and investigation of the security incident.\n\n'
                    'The Cybersecurity Engineer supports incident response, containment and security analysis.\n\n'
                    'The Network Engineer investigates affected network segments and helps isolate suspicious systems.\n\n'
                    'The DevOps / Cloud Engineer investigates affected infrastructure, services and recovery environments.\n\n'
                    'The Engineering Manager coordinates resources, escalation and the broader engineering response.'
                ),
                'incident_type': 'High-Impact Threat / Ransomware',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': (
                            'Primary: SOC Analyst | Support: Cybersecurity Engineer, Network Engineer, DevOps / Cloud Engineer | '
                            'Workflow: SOC Analyst → Cybersecurity Engineer → Network Engineer → DevOps / Cloud Engineer → Engineering Manager'
                        ),
                        'route_sequence': [
                            'SOC Analyst',
                            'Cybersecurity Engineer',
                            'Network Engineer',
                            'DevOps / Cloud Engineer',
                            'Engineering Manager',
                        ],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Correct Collaboration Plan: Full multi-team synchronization containing lateral movement while safeguarding backup integrity.'
                        ),
                        'order': 1,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 3,
                'question_number': 2,
                'title': 'Major Security Vulnerability',
                'situation': (
                    'A critical vulnerability has been discovered in a production application. '
                    'The vulnerability could allow unauthorized access to sensitive company data and requires coordinated remediation.'
                ),
                'task': 'Build the team that should collaborate to handle this vulnerability.',
                'primary_owner': t_roles['cybersecurity-engineer'],
                'supporting_roles': [
                    t_roles['backend-developer'],
                    t_roles['devops-cloud-engineer'],
                    t_roles['qa-test-engineer'],
                    t_roles['engineering-manager'],
                ],
                'supporting_teams': [
                    'Backend Developer',
                    'DevOps / Cloud Engineer',
                    'QA / Test Engineer',
                    'Engineering Manager',
                ],
                'workflow_route': [
                    'Cybersecurity Engineer',
                    'Backend Developer',
                    'DevOps / Cloud Engineer',
                    'QA / Test Engineer',
                    'Engineering Manager',
                ],
                'communication_flow': [
                    'Cybersecurity Engineer',
                    'Backend Developer',
                    'DevOps / Cloud Engineer',
                    'QA / Test Engineer',
                    'Engineering Manager',
                ],
                'explanation': (
                    'The Cybersecurity Engineer coordinates the security investigation and remediation.\n\n'
                    'The Backend Developer modifies the vulnerable application code.\n\n'
                    'The DevOps / Cloud Engineer manages infrastructure and deployment changes.\n\n'
                    'The QA / Test Engineer validates the security fix and regression behavior.\n\n'
                    'The Engineering Manager coordinates delivery, resources and final escalation.'
                ),
                'incident_type': 'Vulnerability Remediation & Release',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': (
                            'Primary: Cybersecurity Engineer | Support: Backend Developer, DevOps / Cloud Engineer, QA / Test Engineer, Engineering Manager | '
                            'Workflow: Cybersecurity Engineer → Backend Developer → DevOps / Cloud Engineer → QA / Test Engineer → Engineering Manager'
                        ),
                        'route_sequence': [
                            'Cybersecurity Engineer',
                            'Backend Developer',
                            'DevOps / Cloud Engineer',
                            'QA / Test Engineer',
                            'Engineering Manager',
                        ],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Correct Collaboration Plan: Optimal cross-functional alignment balancing code modification, deployment, quality verification, and management oversight.'
                        ),
                        'order': 1,
                    },
                ]
            },
            {
                'workplace': tech_wp,
                'stage': 3,
                'question_number': 3,
                'title': 'Customer Data Security Incident',
                'situation': (
                    'The company suspects that customer information may have been exposed through a security incident. '
                    'Security, application and infrastructure teams must work together to investigate and contain the problem.'
                ),
                'task': 'Build the team that should collaborate to handle this incident.',
                'primary_owner': t_roles['cybersecurity-engineer'],
                'supporting_roles': [
                    t_roles['soc-analyst'],
                    t_roles['backend-developer'],
                    t_roles['network-engineer'],
                    t_roles['engineering-manager'],
                ],
                'supporting_teams': [
                    'SOC Analyst',
                    'Backend Developer',
                    'Network Engineer',
                    'Engineering Manager',
                ],
                'workflow_route': [
                    'SOC Analyst',
                    'Cybersecurity Engineer',
                    'Backend Developer',
                    'Network Engineer',
                    'Engineering Manager',
                ],
                'communication_flow': [
                    'SOC Analyst',
                    'Cybersecurity Engineer',
                    'Backend Developer',
                    'Network Engineer',
                    'Engineering Manager',
                ],
                'explanation': (
                    'The SOC Analyst performs the initial monitoring and investigation of suspicious activity.\n\n'
                    'The Cybersecurity Engineer leads the security investigation and coordinates containment.\n\n'
                    'The Backend Developer investigates application-level causes and potential data exposure.\n\n'
                    'The Network Engineer examines network activity and infrastructure.\n\n'
                    'The Engineering Manager coordinates the broader technical response and resources.'
                ),
                'incident_type': 'Customer Data Exposure Triage',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': (
                            'Primary: Cybersecurity Engineer | Support: SOC Analyst, Backend Developer, Network Engineer, Engineering Manager | '
                            'Workflow: SOC Analyst → Cybersecurity Engineer → Backend Developer → Network Engineer → Engineering Manager'
                        ),
                        'route_sequence': [
                            'SOC Analyst',
                            'Cybersecurity Engineer',
                            'Backend Developer',
                            'Network Engineer',
                            'Engineering Manager',
                        ],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': (
                            'Correct Collaboration Plan: Thorough triage, forensic investigation, application auditing, egress traffic inspection, and leadership governance.'
                        ),
                        'order': 1,
                    },
                ]
            },

            # =================================================================
            # STARTUP - STAGES 1, 2, 3
            # =================================================================
            {
                'workplace': startup_wp,
                'stage': 1,
                'question_number': 1,
                'title': 'Production Database Disk Full During Seed Pitch',
                'situation': 'The primary database disk space reaches 99.8% capacity right as angel investors are testing the live checkout flow.',
                'task': 'Identify who in the lean startup team owns immediate operational database containment.',
                'primary_owner': s_roles['startup-fullstack'],
                'supporting_roles': [s_roles['founder-ceo'], s_roles['operations-lead']],
                'ideal_roles': ['Full-Stack Developer'],
                'explanation': 'In an early-stage startup, the Full-Stack Developer directly owns infrastructure operations and database resizing.',
                'incident_type': 'Infrastructure Capacity Crisis',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': 'Full-Stack Developer — Purge temporary cache logs and resize the cloud volume with automated storage expansion.',
                        'recommended_role': s_roles['startup-fullstack'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 20,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': 'Direct ownership: Resolves the immediate storage bottleneck in minutes.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Operations Lead — Submit a purchase request for server hard drives next week.',
                        'recommended_role': s_roles['operations-lead'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Too bureaucratic for an active production crash.',
                        'order': 2,
                    },
                ]
            },
            {
                'workplace': startup_wp,
                'stage': 2,
                'question_number': 1,
                'title': 'Viral Traffic Spike & Payment Gateway Glitch',
                'situation': 'A social influencer shoutout drives 30,000 simultaneous visitors, causing Stripe payment webhooks to timeout.',
                'task': 'Route the incident across marketing communication, engineering throughput, and financial reconciliation.',
                'primary_owner': s_roles['growth-marketer'],
                'workflow_route': ['Growth Marketer', 'Full-Stack Developer', 'Operations Lead', 'Founder & CEO'],
                'explanation': 'Growth Marketer communicates status to incoming traffic, Full-Stack Dev resolves queue concurrency, Ops verifies failed transactions, and CEO aligns stakeholders.',
                'incident_type': 'Scaling & Traffic Bottleneck',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': 'Growth Marketer → Full-Stack Developer → Operations Lead → Founder & CEO',
                        'route_sequence': ['Growth Marketer', 'Full-Stack Developer', 'Operations Lead', 'Founder & CEO'],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Smooth cross-functional delegation keeping customers informed while fixing the infrastructure.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Founder & CEO → Operations Lead → Growth Marketer',
                        'route_sequence': ['Founder & CEO', 'Operations Lead', 'Growth Marketer'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': 'Omission: Ignores the developer needed to fix the broken webhook queue.',
                        'order': 2,
                    },
                ]
            },
            {
                'workplace': startup_wp,
                'stage': 3,
                'question_number': 1,
                'title': 'Strategic Pivot vs. Customer Support Crisis',
                'situation': 'With 3 months of cash runway remaining, the Founder wants to pivot to an AI copilot, but existing paying users demand critical bug fixes.',
                'task': 'Collaborate across the leadership and engineering team to balance runway extension with core customer retention.',
                'primary_owner': s_roles['founder-ceo'],
                'supporting_teams': ['Operations Lead', 'Growth Marketer', 'Full-Stack Developer'],
                'communication_flow': ['Operations Lead', 'Growth Marketer', 'Full-Stack Developer', 'Founder & CEO'],
                'explanation': 'Ops outlines remaining cash burn, Growth analyzes retention churn, Developer estimates pivot feasibility, and CEO leads unified decision.',
                'incident_type': 'Runway & Product Strategy Dilemma',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': 'Collaborative Strategy: Ops reviews runway burn; Growth evaluates user churn; Dev estimates micro-pivot MVP; Founder sets unified roadmap.',
                        'route_sequence': ['Operations Lead', 'Growth Marketer', 'Full-Stack Developer', 'Founder & CEO'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Balances commercial realities with pragmatic product innovation.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Founder unilaterally cancels all customer support and fires developers who question the pivot.',
                        'route_sequence': ['Founder & CEO'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Destructive leadership that guarantees startup failure.',
                        'order': 2,
                    },
                ]
            },

            # =================================================================
            # CORPORATE OFFICE - STAGES 1, 2, 3
            # =================================================================
            {
                'workplace': corp_wp,
                'stage': 1,
                'question_number': 1,
                'title': 'Unencrypted Customer PII in Legacy File Share',
                'situation': 'An internal compliance review uncovers 500,000 historical customer records stored in an unencrypted network share accessible across departments.',
                'task': 'Determine primary ownership and immediate regulatory containment protocol.',
                'primary_owner': c_roles['compliance-officer'],
                'supporting_roles': [c_roles['project-director'], c_roles['operations-manager']],
                'ideal_roles': ['Compliance & Risk Officer'],
                'explanation': 'Compliance & Risk Officer owns regulatory data governance, breach notification obligations, and formal data freezes.',
                'incident_type': 'Data Privacy & Regulatory Audit',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': 'Compliance & Risk Officer — Issue an immediate network isolation freeze and initiate formal GDPR/privacy remediation.',
                        'recommended_role': c_roles['compliance-officer'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 20,
                        'score_collaboration': 20,
                        'score_workflow': 25,
                        'feedback_rationale': 'Fulfills legal fiduciary duties and prevents further data exposure.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Operations Manager — Ignore the finding because the audit was only internal.',
                        'recommended_role': c_roles['operations-manager'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Severe compliance violation carrying massive regulatory penalties.',
                        'order': 2,
                    },
                ]
            },
            {
                'workplace': corp_wp,
                'stage': 2,
                'question_number': 1,
                'title': 'Critical Procurement SLA Delay for Enterprise Tools',
                'situation': 'Development teams are blocked because IDE licenses and cloud credits have been delayed in corporate procurement for 3 weeks.',
                'task': 'Route the escalation through appropriate corporate matrix governance channels.',
                'primary_owner': c_roles['operations-manager'],
                'workflow_route': ['Operations Manager', 'Enterprise Business Analyst', 'Compliance & Risk Officer', 'Project Director'],
                'explanation': 'Operations flags the SLA breach, Business Analyst calculates productivity impact, Compliance audits vendor terms, and Project Director secures executive waiver.',
                'incident_type': 'Corporate Matrix Workflow',
                'urgency_level': 'Medium',
                'options': [
                    {
                        'option_text': 'Operations Manager → Enterprise Business Analyst → Compliance & Risk Officer → Project Director',
                        'route_sequence': ['Operations Manager', 'Enterprise Business Analyst', 'Compliance & Risk Officer', 'Project Director'],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Navigates corporate governance channels effectively using structured business impact data.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Enterprise Business Analyst → Operations Manager',
                        'route_sequence': ['Enterprise Business Analyst', 'Operations Manager'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': 'Incomplete: Fails to escalate to decision-makers with budget authority.',
                        'order': 2,
                    },
                ]
            },
            {
                'workplace': corp_wp,
                'stage': 3,
                'question_number': 1,
                'title': 'Change Advisory Board (CAB) ERP Deployment Standoff',
                'situation': 'The CAB rejects an enterprise ERP migration 12 hours before cutover due to missing rollback verification tests from finance.',
                'task': 'Lead multi-department collaboration to resolve compliance requirements without missing the scheduled maintenance window.',
                'primary_owner': c_roles['project-director'],
                'supporting_teams': ['Enterprise Business Analyst', 'Compliance & Risk Officer', 'Operations Manager'],
                'communication_flow': ['Enterprise Business Analyst', 'Compliance & Risk Officer', 'Operations Manager', 'Project Director'],
                'explanation': 'Business Analyst provides synthetic test verification, Compliance validates regulatory audit trails, Operations prepares rollback triggers, and Project Director chairs emergency CAB approval.',
                'incident_type': 'Governance & Change Management Conflict',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': (
                            'Collaborative Resolution: Business Analyst furnishes test verification; Compliance validates auditability; '
                            'Operations stages rollback safeguards; Project Director reconvenes emergency CAB for signed approval.'
                        ),
                        'route_sequence': ['Enterprise Business Analyst', 'Compliance & Risk Officer', 'Operations Manager', 'Project Director'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Exemplifies mature corporate leadership and change governance.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Project Director deploys the software anyway in defiance of CAB governance rules.',
                        'route_sequence': ['Project Director'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Breaches corporate policy and creates enormous rollback liabilities.',
                        'order': 2,
                    },
                ]
            },

            # =================================================================
            # HOSPITAL / HEALTHCARE - STAGES 1, 2, 3
            # =================================================================
            {
                'workplace': hospital_wp,
                'stage': 1,
                'question_number': 1,
                'title': 'ICU Telemetry Network Ransomware Alert',
                'situation': 'Suspicious ransom notes appear on nursing station terminals monitoring ICU cardiac telemetry data.',
                'task': 'Designate the primary technical owner accountable for immediate clinical subnet isolation.',
                'primary_owner': h_roles['clinical-systems-admin'],
                'supporting_roles': [h_roles['biomedical-engineer'], h_roles['head-nurse']],
                'ideal_roles': ['Clinical Systems Administrator'],
                'explanation': (
                    'The Clinical Systems Administrator immediately isolates the hospital network switch to prevent malware spread, '
                    'while Biomedical Engineers and Nursing staff verify patient monitor continuity.'
                ),
                'incident_type': 'Clinical Cybersecurity Emergency',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': 'Clinical Systems Administrator — Isolate affected network VLANs immediately and engage clinical staff for manual telemetry backup.',
                        'recommended_role': h_roles['clinical-systems-admin'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 20,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Decisive technical ownership protecting human life and hospital telemetry.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Head Nurse — Power off all bedside heart monitors immediately without backup verification.',
                        'recommended_role': h_roles['head-nurse'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Life-threatening: Shutting down patient telemetry unmonitored risks patient mortality.',
                        'order': 2,
                    },
                ]
            },
            {
                'workplace': hospital_wp,
                'stage': 2,
                'question_number': 1,
                'title': 'Mass Casualty Triage and Acute Bed Allocation',
                'situation': 'A major multi-vehicle accident brings 25 acute trauma patients to an Emergency Department with only 8 open bays.',
                'task': 'Route the patient flow and equipment logistics according to clinical urgency protocols.',
                'primary_owner': h_roles['head-nurse'],
                'workflow_route': ['Head Nurse / Floor Supervisor', 'Biomedical Equipment Engineer', 'Clinical Systems Administrator', 'Chief Medical Officer'],
                'explanation': 'Head Nurse leads clinical triage color coding, Biomedical Engineer rushes portable ventilators, IT ensures rapid patient registration, and CMO coordinates surge capacity.',
                'incident_type': 'Life-Safety Clinical Triage',
                'urgency_level': 'Critical',
                'options': [
                    {
                        'option_text': 'Head Nurse / Floor Supervisor → Biomedical Equipment Engineer → Clinical Systems Administrator → Chief Medical Officer',
                        'route_sequence': ['Head Nurse / Floor Supervisor', 'Biomedical Equipment Engineer', 'Clinical Systems Administrator', 'Chief Medical Officer'],
                        'is_optimal': True,
                        'score_ownership': 20,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Seamless clinical protocol execution under life-or-death pressure.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Chief Medical Officer → Head Nurse / Floor Supervisor',
                        'route_sequence': ['Chief Medical Officer', 'Head Nurse / Floor Supervisor'],
                        'is_optimal': False,
                        'score_ownership': 5,
                        'score_delegation': 5,
                        'score_collaboration': 5,
                        'score_workflow': 5,
                        'feedback_rationale': 'Incomplete: Misses critical biomedical hardware and EHR system provisioning.',
                        'order': 2,
                    },
                ]
            },
            {
                'workplace': hospital_wp,
                'stage': 3,
                'question_number': 1,
                'title': 'Urgent Medical Device Security Patch vs. Surgical Schedule',
                'situation': 'A critical zero-day vulnerability in operating room infusion pumps requires urgent patching, but 8 major surgeries are scheduled for today.',
                'task': 'Lead multi-disciplinary collaboration between clinical surgery, nursing, biomedical engineering, and IT.',
                'primary_owner': h_roles['chief-medical-officer'],
                'supporting_teams': ['Clinical Systems Administrator', 'Biomedical Equipment Engineer', 'Head Nurse / Floor Supervisor'],
                'communication_flow': ['Clinical Systems Administrator', 'Biomedical Equipment Engineer', 'Head Nurse / Floor Supervisor', 'Chief Medical Officer'],
                'explanation': (
                    'IT provides threat risk window, Biomedical Engineering stages pre-patched reserve pumps for active surgeries, '
                    'Head Nurse coordinates staggered ward transitions, and Chief Medical Officer signs off on patient safety assurance.'
                ),
                'incident_type': 'Patient Safety vs. Device Cybersecurity',
                'urgency_level': 'High',
                'options': [
                    {
                        'option_text': (
                            'Collaborative Protocol: IT identifies safe patching window; Biomedical Engineer stages pre-verified reserve pumps; '
                            'Nursing coordinates room rotation; CMO authorizes surgical continuity without device risk.'
                        ),
                        'route_sequence': ['Clinical Systems Administrator', 'Biomedical Equipment Engineer', 'Head Nurse / Floor Supervisor', 'Chief Medical Officer'],
                        'is_optimal': True,
                        'score_ownership': 25,
                        'score_delegation': 25,
                        'score_collaboration': 25,
                        'score_workflow': 25,
                        'feedback_rationale': 'Harmonizes clinical life safety with device cybersecurity protection.',
                        'order': 1,
                    },
                    {
                        'option_text': 'Cancel all hospital operations for a month without clinical justification.',
                        'route_sequence': ['Clinical Systems Administrator'],
                        'is_optimal': False,
                        'score_ownership': 0,
                        'score_delegation': 0,
                        'score_collaboration': 0,
                        'score_workflow': 0,
                        'feedback_rationale': 'Disproportionate and catastrophic clinical failure.',
                        'order': 2,
                    },
                ]
            },
        ]

        # Populate Scenarios and ScenarioOptions
        for s_def in all_scenarios:
            options_data = s_def.pop('options', [])
            supporting_roles_list = s_def.pop('supporting_roles', [])

            scen = Scenario.objects.create(**s_def)
            if supporting_roles_list:
                scen.supporting_roles.set(supporting_roles_list)

            for opt_def in options_data:
                ScenarioOption.objects.create(scenario=scen, **opt_def)

            self.stdout.write(f"  [Created] {scen.workplace.name} | Stage {scen.stage} Q{scen.question_number}: {scen.title}")

        self.stdout.write("==================================================")
        self.stdout.write(self.style.SUCCESS("TASK COMPASS DATA LAYER POPULATED SUCCESSFULLY!"))
        self.stdout.write("==================================================")
