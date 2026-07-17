import { Contact, MeetingNote, TaskReminder, MyselfProfile, Company } from '../types';

export const INITIAL_CONTACTS: Contact[] = [];
export const INITIAL_NOTES: MeetingNote[] = [];
export const INITIAL_TASKS: TaskReminder[] = [];
export const INITIAL_COMPANIES: Company[] = [];

export const DEFAULT_PROFILE: MyselfProfile = {
  name: '',
  position: '',
  company: '',
  personality: '',
  coreStrengths: '',
  communicationStyle: '',
  careerGoals: '',
  extraDetails: ''
};

export const DEMO_COMPANIES: Company[] = [
  {
    id: 'cp_demo_technorth',
    name: 'TechNorth',
    industry: 'Technology',
    website: 'www.technorth.io',
    description: 'A leading software development and cloud consulting firm based in Minneapolis, specializing in enterprise architecture and scaling cloud infrastructure.',
    historicalData: 'Partnership established in Q1 2025. Over the past year, they have migrated several core systems to AWS. Currently discussing a long-term strategy for AI integration and team expansion. Some minor project delays were reported in Q3, but overall client sentiment remains strong.'
  },
  {
    id: 'cp_demo_vertexlabs',
    name: 'Vertex Labs',
    industry: 'Biotech',
    website: 'www.vertexlabs.co',
    description: 'An innovative biotechnology company focusing on genomic research and advanced therapeutics.',
    historicalData: 'Initial contract signed in Oct 2024. Negotiation was strenuous due to strict data compliance and security requirements. They are highly protective of IP. Looking to scale their research data pipeline. Sentiment is warm but requires consistent, precise communication.'
  },
  {
    id: 'cp_demo_nexussolutions',
    name: 'Nexus Solutions',
    industry: 'Logistics',
    website: 'www.nexussolutions.com',
    description: 'Global supply chain logistics provider with integrated AI tracking and distribution hubs.',
    historicalData: 'Long-standing client. Partnered since 2022. Steady growth and consistent renewals. Seeking to modernize legacy tracking systems. Extremely high rapport with executive team.'
  }
];

export const DEMO_CONTACTS: Contact[] = [
  {
    id: 'c_demo_sarah',
    name: 'Sarah Jenkins',
    position: 'VP of Engineering',
    company: 'TechNorth',
    companyId: 'cp_demo_technorth',
    email: 'sarah.jenkins@technorth.io',
    phone: '+1 (612) 555-0143',
    relationStatus: 'Active',
    affiliation: 'External',
    status: 'Exceptional',
    linkedin: 'linkedin.com/in/sarah-jenkins-technorth',
    notes: 'Sarah is the primary decision-maker for engineering tooling and consulting contracts. Extremely technical, values brevity, direct communication, and data-backed proposals. Her primary goal this quarter is scaling her infra team.',
    tags: ['SaaS', 'Decision Maker', 'Enterprise'],
    supervisorId: undefined
  },
  {
    id: 'c_demo_marcus',
    name: 'Marcus Chen',
    position: 'Engineering Director',
    company: 'TechNorth',
    companyId: 'cp_demo_technorth',
    email: 'marcus.chen@technorth.io',
    phone: '+1 (612) 555-0182',
    relationStatus: 'Warm',
    affiliation: 'External',
    status: 'Good',
    linkedin: 'linkedin.com/in/marcus-chen-tech',
    notes: 'Reports directly to Sarah Jenkins. Oversees the core platform teams. More hands-on, focused on day-to-day agile execution and developer velocity. Highly collaborative and appreciates detailed architectural breakdowns.',
    tags: ['Agile', 'Platform Eng', 'Collaborator'],
    supervisorId: 'c_demo_sarah'
  },
  {
    id: 'c_demo_elena',
    name: 'Elena Rostova',
    position: 'Lead Cloud Architect',
    company: 'TechNorth',
    companyId: 'cp_demo_technorth',
    email: 'elena.rostova@technorth.io',
    phone: '+1 (612) 555-0199',
    relationStatus: 'Warm',
    affiliation: 'External',
    status: 'Good',
    linkedin: 'linkedin.com/in/elena-rostova-cloud',
    notes: 'Reports to Marcus Chen. Key technical influencer on the cloud migration squad. Deep expertise in Kubernetes and AWS. Often raises meticulous technical questions.',
    tags: ['Cloud', 'Kubernetes', 'Architect'],
    supervisorId: 'c_demo_marcus'
  },
  {
    id: 'c_demo_aris',
    name: 'Dr. Aris Thorne',
    position: 'Chief Scientific Officer',
    company: 'Vertex Labs',
    companyId: 'cp_demo_vertexlabs',
    email: 'a.thorne@vertexlabs.co',
    phone: '+1 (617) 555-0212',
    relationStatus: 'Neutral',
    affiliation: 'External',
    status: 'Neutral',
    linkedin: 'linkedin.com/in/aris-thorne-biotech',
    notes: 'Dr. Thorne leads scientific innovation at Vertex. Academic background, highly analytical, and skeptical of generic sales pitches. Needs to understand the scientific and security compliance underpinnings of any technology solution.',
    tags: ['Research', 'BioTech', 'IP Security'],
    supervisorId: undefined
  }
];

export const DEMO_NOTES: MeetingNote[] = [
  {
    id: 'n_demo_1',
    date: '2026-03-10',
    title: 'TechNorth Cloud Strategy Alignment',
    contactId: 'c_demo_sarah',
    attendeeIds: ['c_demo_marcus'],
    companyId: 'cp_demo_technorth',
    category: 'Strategy Sync',
    sentimentScore: 8,
    engagementLevel: 9,
    keyPoints: [
      "Confirmed TechNorth's goal to migrate their core transactional database by end of Q2.",
      "Sarah agreed to review our architectural proposal for the migration by next Wednesday.",
      "Marcus highlighted resource constraints in their DevOps squad, which might affect timeline."
    ],
    content: `Met with Sarah Jenkins and Marcus Chen to review the Q2 cloud infrastructure roadmap. Sarah kicked off by outlining their aggressive target for database migration to reduce latency across international hubs. Marcus walked through the bottleneck in their DevOps team, indicating that they only have two senior engineers capable of handling the cluster reconfiguration. I presented our team's capacity to supply external consulting to bridge this gap. Sarah was highly receptive but emphasized that any external consultants must have robust experience in zero-downtime PostgreSQL migrations. Marcus asked detailed questions about our onboarding time and whether we could commit to a 2-week lead time. We agreed to send a revised Statement of Work (SOW) highlighting our database migration credentials and pricing by Friday afternoon.`,
    insights: 'TechNorth is highly motivated to complete this database migration on time but is constrained by key personnel dependencies. The client is responsive to external support if we can demonstrate specialized technical credentials quickly.',
    coachingOpportunities: [
      'Proactively address Marcus\'s concerns about onboarding speed by providing a drafted transition plan with the SOW.',
      'Leverage Sarah\'s focus on zero-downtime database migrations by referencing our past high-availability case studies in the next deck.'
    ]
  },
  {
    id: 'n_demo_2',
    date: '2026-03-12',
    title: 'Vertex Labs Security Compliance Redline',
    contactId: 'c_demo_aris',
    companyId: 'cp_demo_vertexlabs',
    category: 'Negotiation',
    sentimentScore: 4,
    engagementLevel: 8,
    keyPoints: [
      "Dr. Thorne raised critical concerns about HIPAA compliance and patient data isolation.",
      "Vertex Labs requested a custom Business Associate Agreement (BAA) before moving forward.",
      "Agreed to escalate the security review to our legal and info-sec departments."
    ],
    content: `Had a structured, somewhat tense call with Dr. Aris Thorne regarding the software licensing agreement. Dr. Thorne immediately focused on security redlines, specifically asking for a comprehensive audit trail of our cloud servers and how we isolate clinical study patient data. He was critical of our standard terms of service, noting that they don't meet Vertex's strict regulatory guidelines. I tried to pivot to the analytics features, but he redirected back to the compliance requirements, stating that no software can be approved without an signed BAA and a completed SOC2 Type II report. I acknowledged his stance and agreed that safety is the top priority. I promised to coordinate with our internal legal counsel and InfoSec team to draft a custom BAA rider and provide the SOC2 documentation by early next week. The tone was professional but guarded, and we have a high hurdles to clear to secure their trust.`,
    insights: 'Negotiation is currently stalled on regulatory compliance. Dr. Thorne is highly risk-averse and analytical, requiring complete transparency and regulatory artifacts before discussing any business value.',
    coachingOpportunities: [
      'Avoid pivoting to feature value when a high-risk compliance blocker is raised. Continue showing complete alignment on security.',
      'Provide a dedicated direct line to our security/compliance lead to establish high-credibility peer communication with Dr. Thorne.'
    ]
  },
  {
    id: 'n_demo_3',
    date: '2026-03-15',
    title: 'TechNorth Platform Architecture Deep-Dive',
    contactId: 'c_demo_marcus',
    attendeeIds: ['c_demo_elena'],
    companyId: 'cp_demo_technorth',
    category: 'Demo',
    sentimentScore: 9,
    engagementLevel: 10,
    keyPoints: [
      "Demonstrated our automated infrastructure deployment templates and Terraform modules.",
      "Elena confirmed our approach aligns with their strict platform isolation policies.",
      "Marcus requested a sandboxed developer environment for Elena's team to run a 14-day proof of concept."
    ],
    content: `Conducted a technical walkthrough session with Marcus Chen and Elena Rostova. We focused exclusively on the Terraform configuration and automated recovery pipelines. Elena was highly active during the demo, probing our multi-region failover automation and asking about secrets management integration with HashiCorp Vault. I showed how our product handles Vault authorization out-of-the-box, which pleasantly surprised her. Marcus noted that seeing this level of technical readiness gives him high confidence in recommending us to Sarah. He asked if we could set up a sandboxed evaluation environment so Elena's team can run some simulated load tests. I agreed that this was an excellent next step and committed to provisioning the sandbox environment by tomorrow morning.`,
    insights: 'The technical evaluation was highly successful. The client\'s engineering team is highly enthusiastic, and establishing a successful proof of concept sandbox will practically guarantee Sarah\'s commercial sign-off.',
    coachingOpportunities: [
      'Now that the technical gatekeepers are fully aligned, use this momentum to schedule a brief commercial sync with Sarah to align on success criteria for the 14-day POC.',
      'Ensure Elena\'s sandbox setup is flawless and document her feedback daily to preempt any final platform security objections.'
    ]
  }
];
