import type { Competency, ClusterMeta, ClusterKey } from "@/types";

// 7 competencies sourced from Synovate's Competency Map.
// Each competency has 3 proficiency levels with 4 indicators per level.

export const clusters: ClusterMeta[] = [
  { key: "thinking", label: "Thinking & decision making", description: "Cognitive and analytical competencies." },
  { key: "driving",  label: "Driving & delivering",       description: "Execution and ownership competencies." },
  { key: "engaging", label: "Engaging & influencing",     description: "Stakeholder and people competencies." },
  { key: "market",   label: "Market & business",          description: "Domain knowledge. May be sector-specific." },
];

export const clusterMeta = (key: ClusterKey): ClusterMeta | undefined =>
  clusters.find((c) => c.key === key);

export const dictionary: Competency[] = [
  {
    id: "stakeholder-management",
    name: "Stakeholder Management",
    definition: "Builds and maintains strong relationships with internal and external stakeholders to drive alignment, trust, and business outcomes.",
    cluster: "engaging",
    retailSpecific: false,
    sectorTags: ["generic"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Identifies the key stakeholders connected to their role and understands what each expects.",
          "Communicates updates clearly and on time, sharing information that stakeholders need to do their work.",
          "Responds promptly to stakeholder queries and follows through on commitments made in day-to-day interactions.",
          "Maintains a professional and respectful tone in all interactions, even when there are differences of opinion.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Anticipates stakeholder needs and proactively shares information, support, or context before being asked.",
          "Acts as an effective bridge between functions and teams, translating priorities in both directions.",
          "Handles disagreements and misalignments constructively, finding workable solutions without damaging relationships.",
          "Builds credibility with internal and external stakeholders through consistent delivery and transparent communication.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Builds long-term trust-based partnerships with senior stakeholders that influence organisational priorities.",
          "Navigates competing stakeholder interests and reaches alignment on complex, ambiguous, or high-stakes issues.",
          "Coaches managers on how to manage their own stakeholder relationships effectively.",
          "Leverages the stakeholder network to unlock cross-functional support, resources, and faster decision-making.",
        ],
      },
    ],
  },
  {
    id: "execution-excellence",
    name: "Execution Excellence",
    definition: "Ensures disciplined, timely, and consistent execution of operational plans, programs, and initiatives, with strong ownership of business results.",
    cluster: "driving",
    retailSpecific: false,
    sectorTags: ["generic"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Understands operational plans and ensures basic standard operating procedures are followed in their area.",
          "Tracks progress against assigned plans on a regular cadence and flags slippages to the manager.",
          "Closes routine execution gaps within agreed timelines.",
          "Demonstrates personal ownership of assigned tasks and follows through until closure.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Drives consistent, high-quality execution of programs and initiatives across the area of responsibility.",
          "Monitors leading indicators and proactively addresses execution gaps before they impact business results.",
          "Anticipates execution challenges and puts contingency plans in place.",
          "Holds teams accountable for operating standards and ensures uniform compliance.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Sets the execution rhythm and standards for the function, raising the bar on what 'good execution' looks like.",
          "Identifies systemic execution gaps and partners with relevant functions to fix root causes, not just symptoms.",
          "Institutionalises best practices and process improvements that scale across teams and functions.",
          "Delivers superior business outcomes consistently, even in challenging conditions or change scenarios.",
        ],
      },
    ],
  },
  {
    id: "people-management",
    name: "People Management",
    definition: "Leads, motivates, and develops teams through clear expectations, coaching, feedback, recognition, and performance management.",
    cluster: "engaging",
    retailSpecific: false,
    sectorTags: ["generic"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Sets clear day-to-day work expectations for direct reports and ensures they understand their roles.",
          "Provides regular feedback on tasks and behaviours, both reinforcing and corrective.",
          "Recognises good work in the moment and creates a positive day-to-day work environment.",
          "Addresses basic performance and discipline issues fairly and in line with company policy.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Sets stretch but achievable goals for teams and holds them accountable through structured reviews.",
          "Coaches team members on operational, people, and customer issues using on-the-job coaching moments.",
          "Manages underperformance actively through structured improvement plans, coaching, and timely tough conversations.",
          "Drives engagement and morale through recognition, listening, and visible care for the team's wellbeing.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Identifies high-potential talent and builds a deliberate pipeline of future leaders.",
          "Builds a strong leadership bench by giving stretch assignments, mentoring, and creating development opportunities.",
          "Shapes the culture of the team, making it a place where people want to work and grow.",
          "Influences talent decisions (hiring, promotions, deployment) to strengthen long-term organisational capability.",
        ],
      },
    ],
  },
  {
    id: "problem-solving-decision-making",
    name: "Problem Solving & Decision Making",
    definition: "Analyses issues, identifies root causes, and makes sound, timely decisions aligned with business objectives, balancing speed, quality, and risk.",
    cluster: "thinking",
    retailSpecific: false,
    sectorTags: ["generic"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Recognises that a problem exists and gathers basic facts before jumping to conclusions.",
          "Solves routine, well-defined operational issues using established procedures and checklists.",
          "Escalates issues that are beyond their authority or knowledge, with clear context and data.",
          "Takes ownership of decisions made within their scope and follows through on the outcomes.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Uses structured problem-solving approaches (5-Whys, fishbone, data triangulation) to get to root causes.",
          "Balances speed and accuracy \u2014 makes timely decisions on operational issues without waiting for perfect data.",
          "Weighs trade-offs across cost, customer, team, and compliance before deciding on a course of action.",
          "Anticipates downstream consequences of decisions and puts safeguards in place to prevent escalation.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Solves complex, ambiguous, or cross-functional problems where the root cause is not obvious.",
          "Makes confident decisions under uncertainty and incomplete information, and stands by them.",
          "Builds problem-solving capability across the team by coaching others to think before they act.",
          "Re-frames recurring problems into systemic opportunities for process or policy change.",
        ],
      },
    ],
  },
  {
    id: "analytical-skills",
    name: "Analytical Skills",
    definition: "Uses data, KPIs, and performance metrics to identify trends, generate insights, and drive informed decisions that improve performance.",
    cluster: "thinking",
    retailSpecific: false,
    sectorTags: ["generic"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Knows the core performance KPIs relevant to the role and understands what they mean.",
          "Reads standard daily and weekly reports and identifies obvious deviations from plan.",
          "Pulls together basic data needed to answer specific operational questions from the manager.",
          "Uses data points (and not just feelings) to back up day-to-day operational decisions.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Interprets KPI reports across the area of responsibility, spots patterns, and translates them into business priorities.",
          "Connects multiple data points to diagnose performance issues.",
          "Shares crisp data-backed insights with leaders and cross-functional partners to influence decisions.",
          "Coaches teams to read their own dashboards and act on insights, not just look at numbers.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Builds a performance narrative using data \u2014 past, present, and forward-looking \u2014 for senior leadership.",
          "Identifies non-obvious correlations and second-order patterns across multiple variables.",
          "Uses analytics to make bets on resource, manpower, and investment allocation.",
          "Drives a data-driven culture, where decisions at every level are anchored in evidence.",
        ],
      },
    ],
  },
  {
    id: "market-and-consumer-awareness",
    name: "Market and Consumer Awareness",
    definition: "Is aware of market realities, consumer needs, competitor activity, and the organisation's advantage, and uses this knowledge to win in the market.",
    cluster: "market",
    retailSpecific: true,
    sectorTags: ["retail"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Knows the basic profile of the target customer for the business.",
          "Is aware of nearby competitors and their broad offering.",
          "Notices changes in footfall, customer feedback, and basket patterns at the ground level.",
          "Articulates the core organisational advantage to teams and customers.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Studies tapped and untapped market potential in the catchment of the area of responsibility.",
          "Maps competitor strengths, weaknesses, pricing, and promotional moves and shares timely intelligence.",
          "Uses catchment analysis to recommend assortment, merchandising, and promotional tweaks for the business.",
          "Connects market and consumer insights to specific actions that strengthen the organisation's local positioning.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Reads structural shifts in the market (consumer behaviour, channel mix, category growth) and prepares the business for them.",
          "Influences central decisions on locations, formats, assortment, and pricing using ground intelligence.",
          "Builds a sustained competitive advantage by playing to the organisation's unique strengths.",
          "Develops the market and consumer awareness of frontline managers as a deliberate capability.",
        ],
      },
    ],
  },
  {
    id: "product-and-process-knowledge",
    name: "Product and Process Knowledge",
    definition: "Demonstrates deep knowledge of organisational processes, product categories, key terminology, merchandising, marketing, and customer service standards, and monitors adherence.",
    cluster: "market",
    retailSpecific: true,
    sectorTags: ["retail"],
    levels: [
      {
        level: 1,
        name: "Foundational",
        qualifier: "Demonstrates",
        description: "Demonstrates the core behaviours in routine, well-defined situations. Works within laid-down processes, with manager guidance on non-routine matters.",
        indicators: [
          "Knows the core organisational processes and key product categories.",
          "Identifies obvious process deviations during site visits and walk-throughs.",
          "Understands basic KPI terminology, merchandising standards, and current marketing campaigns.",
          "Articulates the key product differentiators of the organisation's offerings.",
        ],
      },
      {
        level: 2,
        name: "Proficient",
        qualifier: "Applies",
        description: "Applies the competency independently across the full scope of the role. Handles non-routine, ambiguous, and cross-functional situations effectively.",
        indicators: [
          "Audits process adherence consistently across the area of responsibility and ensures timely corrective action.",
          "Diagnoses the underlying reasons for process deviations (capability, intent, design) and addresses them.",
          "Uses deep product and category knowledge to drive better assortment planning, merchandising, and selling.",
          "Stays current on new procedures, product launches, and marketing initiatives, and cascades them effectively to teams.",
        ],
      },
      {
        level: 3,
        name: "Strategic",
        qualifier: "Shapes",
        description: "Shapes how the competency is practised across teams and beyond. Builds capability in others, influences systems, and delivers superior business outcomes.",
        indicators: [
          "Shapes and improves organisational processes by feeding back insights from the field to central functions.",
          "Is recognised as a go-to expert on operations, product, and process within the region.",
          "Uses product and process mastery to coach frontline managers and build their depth on the job.",
          "Drives compliance and excellence in product, process, and merchandising standards as a competitive differentiator.",
        ],
      },
    ],
  },
];

export const findCompetency = (id: string): Competency | undefined =>
  dictionary.find((c) => c.id === id);
