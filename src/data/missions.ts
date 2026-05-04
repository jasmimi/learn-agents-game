import type { ConceptDelta, Mission } from "../types";

const c = (concept: ConceptDelta["concept"], points: number): ConceptDelta => ({ concept, points });

export const missions: Mission[] = [
  {
    id: "m1-command-basics",
    title: "Command Centre 101",
    festivalPhase: "Orientation",
    estimateMinutes: 15,
    difficulty: 1,
    tagline: "Learn what an agent is by triaging the first festival operations requests.",
    brief:
      "You have joined the Vineshift Festival command centre, a fictional R&V-style New Year event on the east coast. Your first job is to decide which jobs deserve an agent, which need simple automation, and which must stay with humans.",
    learningGoals: [
      "Distinguish agents from chatbots, scripts, and human workflows.",
      "Match autonomy level to operational risk.",
      "Use clear goals, tools, and escalation rules from the start."
    ],
    concepts: ["agent-basics", "agent-fit", "instructions", "human-loop"],
    agentSlots: [
      {
        id: "ops-advisor",
        label: "Ops Advisor",
        recommendedRole: "Festival operations triage agent",
        starterObjective:
          "Classify incoming festival operations requests, recommend the next action, and escalate safety or brand-risk decisions to the human duty manager.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["checklist", "outcome-bound"],
          minTools: 2,
          requiredTools: ["ops-runbook", "schedule-board"],
          guardrails: [
            "Ask for missing critical context before acting",
            "Use verified tool data before sending operational updates"
          ],
          handoffs: ["Hand off unresolved incidents to the human duty manager"],
          evals: ["Check outcome against the mission success criteria"]
        }
      }
    ],
    tools: [
      {
        id: "ops-runbook",
        name: "Ops runbook",
        type: "lookup",
        description: "Festival escalation rules, response owners, and risk levels.",
        outputTitle: "Runbook excerpt",
        output:
          "Low-risk guest questions can be answered directly. Safety, legal, media, police, artist contract, and irreversible public communications require human approval.",
        teaches: ["agent-fit", "human-loop"]
      },
      {
        id: "schedule-board",
        name: "Schedule board",
        type: "lookup",
        description: "Current stage times, venue zones, and known clashes.",
        outputTitle: "Schedule snapshot",
        output:
          "Main Vines opens at 4:00pm. Ridge Stage soundcheck is delayed by 20 minutes. Transport gates have separate queues for campers and day guests.",
        teaches: ["tools"]
      },
      {
        id: "faq-inbox",
        name: "Guest FAQ inbox",
        type: "comms",
        description: "A sample of repetitive guest questions and unusual operational tickets.",
        outputTitle: "Inbox pattern",
        output:
          "Most messages are simple FAQs, but 18 percent ask for context-sensitive help involving accessibility, weather, or transport disruption.",
        teaches: ["agent-basics"]
      }
    ],
    events: [
      {
        id: "m1-e1",
        title: "The first request wave",
        time: "Day -21, 9:10am",
        narrative:
          "Three hundred guest messages arrive after the first festival app notification. Some ask when gates open. Others mention medical access, artist meet-and-greet rumors, and refunds.",
        pressure: "low",
        toolHint: "The runbook and inbox show which work is repetitive and which work needs judgment.",
        choices: [
          {
            id: "agent-triage",
            label: "Deploy a triage agent with tools and escalation",
            description:
              "Let the agent classify messages, answer simple verified FAQs, and route sensitive issues to humans.",
            rationale:
              "Agents are useful when a task needs judgment, tool use, and escalation. This is more than a static FAQ but not safe for full autonomy.",
            expert: true,
            needsTool: ["ops-runbook", "faq-inbox"],
            effect: {
              metrics: { guest: 8, reliability: 7, trust: 5, safety: 2 },
              concepts: [c("agent-basics", 8), c("agent-fit", 8), c("human-loop", 5)]
            },
            toolBonus: {
              note: "Using the runbook prevents the agent from answering sensitive tickets directly.",
              metrics: { safety: 4, trust: 3 },
              concepts: [c("tools", 4)]
            }
          },
          {
            id: "script-only",
            label: "Use a scripted FAQ for everything",
            description: "Route every message through fixed answers written last season.",
            rationale:
              "Scripts are reliable for narrow, stable flows, but fail when the question requires context or judgment.",
            effect: {
              metrics: { guest: 1, reliability: 2, trust: -3, safety: -4 },
              concepts: [c("agent-fit", 3)]
            }
          },
          {
            id: "full-autonomy",
            label: "Let a general assistant reply without approval",
            description: "Tell it to keep guests happy and answer everything quickly.",
            rationale:
              "High autonomy without tools, boundaries, or escalation creates confident mistakes.",
            effect: {
              metrics: { guest: -7, reliability: -9, trust: -8, safety: -8, budget: -3 },
              concepts: [c("guardrails", 2)]
            }
          }
        ]
      },
      {
        id: "m1-e2",
        title: "The refund rumor",
        time: "Day -20, 2:40pm",
        narrative:
          "A rumor spreads that late campers get automatic refunds. The agent can answer from policy, ask for approval, or improvise a guest-friendly response.",
        pressure: "medium",
        toolHint: "The runbook defines which public policy claims need approval.",
        choices: [
          {
            id: "draft-for-approval",
            label: "Draft a response and request approval",
            description:
              "Use verified policy, include confidence, and wait for the comms lead before posting publicly.",
            rationale:
              "Public policy claims are irreversible enough to require human-in-the-loop review.",
            expert: true,
            needsTool: ["ops-runbook"],
            effect: {
              metrics: { trust: 8, reliability: 5, guest: 3, safety: 1 },
              concepts: [c("human-loop", 7), c("instructions", 5)]
            },
            toolBonus: {
              note: "The runbook flags refund policy as a comms approval item.",
              metrics: { budget: 4, trust: 2 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "answer-private-only",
            label: "Answer private messages only",
            description: "Reply one by one and avoid a public correction.",
            rationale:
              "This lowers immediate risk but misses the system-level goal: stop the rumor source.",
            effect: {
              metrics: { guest: 2, reliability: -2, trust: -2 },
              concepts: [c("planning", 2)]
            }
          },
          {
            id: "promise-refunds",
            label: "Promise refunds to keep guests calm",
            description: "Use a generous interpretation to reduce complaints.",
            rationale:
              "A plausible answer is not enough. Agents need policy boundaries.",
            effect: {
              metrics: { budget: -12, trust: -9, reliability: -8 },
              concepts: [c("guardrails", 3)]
            }
          }
        ]
      },
      {
        id: "m1-e3",
        title: "First debrief",
        time: "Day -20, 5:00pm",
        narrative:
          "The duty manager asks what the agent should remember tomorrow. You need to choose the memory policy before the next shift.",
        pressure: "low",
        toolHint: "Use the request types to separate useful context from sensitive data.",
        choices: [
          {
            id: "scoped-memory",
            label: "Store scoped summaries and decisions",
            description:
              "Remember approved policies, open issues, and handoff notes. Do not store private guest details broadly.",
            rationale:
              "Good memory preserves operational continuity without turning every interaction into permanent context.",
            expert: true,
            effect: {
              metrics: { reliability: 7, trust: 4, safety: 2 },
              concepts: [c("memory", 8), c("observability", 3)]
            }
          },
          {
            id: "remember-everything",
            label: "Store every message forever",
            description: "Maximize context by saving all guest and artist messages.",
            rationale:
              "More memory is not always better. Sensitive data and stale context can reduce reliability.",
            effect: {
              metrics: { trust: -8, safety: -5, reliability: -3 },
              concepts: [c("memory", 3), c("guardrails", 2)]
            }
          },
          {
            id: "no-memory",
            label: "Wipe all context after every reply",
            description: "Avoid privacy risk by forgetting everything.",
            rationale:
              "No memory is safe in narrow tasks, but this operation needs shift continuity.",
            effect: {
              metrics: { reliability: -5, guest: -3, safety: 1 },
              concepts: [c("memory", 3)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 65,
      minSafety: 58,
      requiredConcepts: ["agent-basics", "agent-fit"]
    },
    debrief: {
      win:
        "You separated agent-suitable work from scripts and human decisions. The command centre now has a safe first agent.",
      lose:
        "The command centre felt fast, but the agent design blurred tool use, autonomy, and approval. Re-run with clearer boundaries.",
      expertTakeaway:
        "An agent is a system that can pursue a goal, use tools, make decisions within boundaries, and escalate when the task exceeds those boundaries."
    }
  },
  {
    id: "m2-lineup-tools",
    title: "Lineup Lockdown",
    festivalPhase: "Pre-festival planning",
    estimateMinutes: 18,
    difficulty: 2,
    tagline: "Give an agent the right tools and output format before artist changes hit the schedule.",
    brief:
      "An international act lands late, a local opener is flexible, and production needs a clean change request. Your agent must use tools and produce structured outputs that humans can approve quickly.",
    learningGoals: [
      "Connect tools to specific decisions instead of handing agents raw vibes.",
      "Use structured outputs to make recommendations reviewable.",
      "Prevent agents from inventing schedule facts."
    ],
    concepts: ["tools", "structured-outputs", "instructions", "reliability"],
    agentSlots: [
      {
        id: "lineup-planner",
        label: "Lineup Planner",
        recommendedRole: "Artist schedule planning agent",
        starterObjective:
          "Recommend safe schedule adjustments using verified artist, stage, and production data, then return a structured change request for human approval.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["checklist", "outcome-bound"],
          minTools: 3,
          requiredTools: ["artist-itinerary", "stage-constraints", "change-schema"],
          guardrails: [
            "Use verified tool data before sending operational updates",
            "Ask for missing critical context before acting"
          ],
          handoffs: [
            "Summarize context, decision, and confidence during every handoff",
            "Request approval before irreversible public comms"
          ],
          evals: [
            "Verify tool evidence is cited in the response",
            "Check outcome against the mission success criteria"
          ]
        }
      }
    ],
    tools: [
      {
        id: "artist-itinerary",
        name: "Artist itinerary",
        type: "lookup",
        description: "Travel, hospitality, and contractual timing constraints.",
        outputTitle: "Artist movement",
        output:
          "The delayed act can arrive side-of-stage by 8:25pm. Their contract requires 25 minutes changeover and no overlap with the livestream sponsor slot.",
        teaches: ["tools"]
      },
      {
        id: "stage-constraints",
        name: "Stage constraints",
        type: "analysis",
        description: "Stage capacity, crew availability, soundcheck windows, and curfew.",
        outputTitle: "Production constraints",
        output:
          "Main Vines has a hard 11:00pm curfew. Ridge Stage can absorb a 15 minute delay. Cellar Door has spare crew from 7:30pm to 8:10pm.",
        teaches: ["reliability"]
      },
      {
        id: "change-schema",
        name: "Change request schema",
        type: "control",
        description: "Required fields for schedule changes.",
        outputTitle: "Schema",
        output:
          "Required fields: affected act, proposed time, evidence, guest impact, crew impact, approval owner, rollback plan.",
        teaches: ["structured-outputs"]
      }
    ],
    events: [
      {
        id: "m2-e1",
        title: "A late flight",
        time: "Day -14, 11:30am",
        narrative:
          "The headline support act will arrive later than planned. Social comms wants an answer, production wants a schedule, and the artist liaison wants confidence.",
        pressure: "medium",
        toolHint: "The itinerary and stage constraints reveal the viable windows.",
        choices: [
          {
            id: "structured-change",
            label: "Generate a structured change request",
            description:
              "Use itinerary and stage tools, cite evidence, identify approval owner, and include a rollback plan.",
            rationale:
              "Tool-grounded structured outputs make agent recommendations auditable and fast to review.",
            expert: true,
            needsTool: ["artist-itinerary", "stage-constraints", "change-schema"],
            effect: {
              metrics: { reliability: 9, trust: 6, guest: 3, budget: 2 },
              concepts: [c("tools", 7), c("structured-outputs", 8), c("reliability", 5)]
            },
            toolBonus: {
              note: "The schema forces the agent to include evidence and a rollback plan.",
              metrics: { reliability: 4, trust: 3 },
              concepts: [c("instructions", 3)]
            }
          },
          {
            id: "ask-model",
            label: "Ask for the best schedule by intuition",
            description: "Tell the assistant to find the least disruptive option.",
            rationale:
              "Without tools, the answer may sound reasonable but cannot know current constraints.",
            effect: {
              metrics: { reliability: -8, trust: -6, guest: -2 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "human-only",
            label: "Send it all to production manually",
            description: "Skip the agent and wait for a human spreadsheet pass.",
            rationale:
              "Human ownership is safe, but the task has enough structure for an agent to prepare the decision.",
            effect: {
              metrics: { reliability: 1, trust: 1, guest: -4, budget: -2 },
              concepts: [c("agent-fit", 3)]
            }
          }
        ]
      },
      {
        id: "m2-e2",
        title: "Sponsor slot conflict",
        time: "Day -14, 1:15pm",
        narrative:
          "A proposed swap collides with a livestream sponsor obligation. The agent can hide the conflict, escalate it, or annotate the recommendation.",
        pressure: "medium",
        toolHint: "The itinerary includes a sponsor constraint that changes the decision.",
        choices: [
          {
            id: "annotate-confidence",
            label: "Annotate conflict and request approval",
            description:
              "Mark the sponsor clash, propose two compliant alternatives, and route to comms and production.",
            rationale:
              "Good agents do not just answer; they expose uncertainty and route decisions to owners.",
            expert: true,
            needsTool: ["artist-itinerary"],
            effect: {
              metrics: { trust: 8, reliability: 7, budget: 3 },
              concepts: [c("human-loop", 5), c("structured-outputs", 5)]
            },
            toolBonus: {
              note: "Tool evidence identifies the sponsor slot before comms publishes the wrong time.",
              metrics: { budget: 3, reliability: 3 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "bury-conflict",
            label: "Hide the conflict to keep the plan simple",
            description: "Recommend the cleanest timetable and leave sponsor details out.",
            rationale:
              "Omitting constraints breaks reviewability and creates downstream surprises.",
            effect: {
              metrics: { trust: -9, budget: -7, reliability: -6 },
              concepts: [c("observability", 2)]
            }
          },
          {
            id: "decline-all",
            label: "Decline to recommend anything",
            description: "Say the issue is too risky for agent assistance.",
            rationale:
              "Refusal is sometimes correct, but here the agent can still prepare bounded options.",
            effect: {
              metrics: { reliability: -1, guest: -3, trust: 1 },
              concepts: [c("agent-fit", 2)]
            }
          }
        ]
      },
      {
        id: "m2-e3",
        title: "Production asks for proof",
        time: "Day -14, 3:50pm",
        narrative:
          "The production lead wants to know why the agent picked the recommended window. The response can be a trace, a paragraph, or a confident one-liner.",
        pressure: "low",
        toolHint: "The schema names the fields needed for review.",
        choices: [
          {
            id: "trace-summary",
            label: "Show evidence, assumptions, and rollback",
            description:
              "Return the source data used, unresolved assumptions, approval owner, and fallback.",
            rationale:
              "A traceable recommendation is much easier to debug and approve.",
            expert: true,
            needsTool: ["change-schema"],
            effect: {
              metrics: { reliability: 8, trust: 6, safety: 1 },
              concepts: [c("observability", 6), c("structured-outputs", 6)]
            },
            toolBonus: {
              note: "The output schema keeps the explanation short and complete.",
              metrics: { trust: 2 },
              concepts: [c("evals", 2)]
            }
          },
          {
            id: "paragraph",
            label: "Send a persuasive paragraph",
            description: "Explain the recommendation in natural language only.",
            rationale:
              "A paragraph may be readable, but it is harder to validate under time pressure.",
            effect: {
              metrics: { trust: 1, reliability: -3 },
              concepts: [c("structured-outputs", 2)]
            }
          },
          {
            id: "one-liner",
            label: "Reply that the agent is confident",
            description: "Avoid detail and emphasize confidence.",
            rationale:
              "Confidence without evidence is not operational reliability.",
            effect: {
              metrics: { trust: -7, reliability: -6 },
              concepts: [c("reliability", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 68,
      minSafety: 58,
      requiredConcepts: ["tools", "structured-outputs"]
    },
    debrief: {
      win:
        "The schedule change stayed reviewable because your agent used tools and returned a structured decision package.",
      lose:
        "The lineup process exposed a common failure: fluent recommendations without verified data or a reviewable shape.",
      expertTakeaway:
        "Tool use and structured outputs turn an agent from a plausible writer into an operational component."
    }
  },
  {
    id: "m3-vendor-memory",
    title: "Vendor Village",
    festivalPhase: "Pre-festival planning",
    estimateMinutes: 18,
    difficulty: 2,
    tagline: "Use memory carefully while coordinating food trucks, merch, and site services.",
    brief:
      "Vendor onboarding is repetitive but messy. The agent needs to remember decisions across shifts while protecting sensitive commercial and contact information.",
    learningGoals: [
      "Choose memory scope based on task continuity and risk.",
      "Separate reusable operational facts from sensitive records.",
      "Create handoff summaries that humans and agents can trust."
    ],
    concepts: ["memory", "handoffs", "guardrails", "observability"],
    agentSlots: [
      {
        id: "vendor-coordinator",
        label: "Vendor Coordinator",
        recommendedRole: "Vendor operations coordination agent",
        starterObjective:
          "Track vendor readiness, summarize open blockers, protect sensitive vendor details, and route unresolved logistics to the correct owner.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["scoped"],
          instructionStyle: ["checklist", "outcome-bound"],
          minTools: 2,
          requiredTools: ["vendor-crm", "site-map"],
          guardrails: [
            "Keep private attendee and artist data out of broad memory",
            "Ask for missing critical context before acting"
          ],
          handoffs: [
            "Summarize context, decision, and confidence during every handoff",
            "Hand off unresolved incidents to the human duty manager"
          ],
          evals: [
            "Verify tool evidence is cited in the response",
            "Check outcome against the mission success criteria"
          ]
        }
      }
    ],
    tools: [
      {
        id: "vendor-crm",
        name: "Vendor CRM",
        type: "lookup",
        description: "Readiness, contract status, power needs, and contact owners.",
        outputTitle: "Vendor readiness",
        output:
          "Noodle North is missing power confirmation. Vinyl Tent has a signed contract but no vehicle pass. Sunrise Coffee has private contact notes that should not enter shared memory.",
        teaches: ["memory"]
      },
      {
        id: "site-map",
        name: "Site map",
        type: "lookup",
        description: "Festival zones, power drops, vehicle gates, and service lanes.",
        outputTitle: "Site constraints",
        output:
          "Food lane B has two 32A power drops. Service lane closes to vehicles at 3:30pm. Merch loading is separate from camper check-in.",
        teaches: ["tools"]
      },
      {
        id: "handoff-log",
        name: "Handoff log",
        type: "comms",
        description: "Shift notes and open decisions from the last coordinator.",
        outputTitle: "Open blockers",
        output:
          "Three blockers remain: confirm Noodle North power, approve Vinyl Tent vehicle pass, and ask site ops whether coffee cart graywater can use lane B.",
        teaches: ["handoffs", "observability"]
      }
    ],
    events: [
      {
        id: "m3-e1",
        title: "Shift handover",
        time: "Day -10, 8:00am",
        narrative:
          "The night coordinator left long notes. The agent must decide what to store for the morning shift.",
        pressure: "low",
        toolHint: "The CRM and handoff log separate reusable blockers from private details.",
        choices: [
          {
            id: "scoped-summary",
            label: "Store scoped blockers and owners",
            description:
              "Save open decisions, evidence, and next owner, while excluding private contact notes.",
            rationale:
              "Scoped memory keeps continuity without leaking sensitive vendor data.",
            expert: true,
            needsTool: ["vendor-crm", "handoff-log"],
            effect: {
              metrics: { reliability: 8, trust: 7, safety: 2 },
              concepts: [c("memory", 9), c("handoffs", 5), c("guardrails", 4)]
            },
            toolBonus: {
              note: "The CRM identifies exactly which notes are sensitive.",
              metrics: { trust: 3 },
              concepts: [c("observability", 3)]
            }
          },
          {
            id: "all-notes",
            label: "Store all notes to maximize context",
            description: "Keep every vendor message and private detail in shared memory.",
            rationale:
              "Memory that is too broad creates privacy and stale-context risk.",
            effect: {
              metrics: { trust: -10, reliability: -3, safety: -5 },
              concepts: [c("memory", 3), c("guardrails", 3)]
            }
          },
          {
            id: "fresh-start",
            label: "Ignore old notes and ask everyone again",
            description: "Avoid memory risk by restarting every conversation.",
            rationale:
              "This is safe but inefficient; agents should preserve verified operational state.",
            effect: {
              metrics: { guest: -3, budget: -5, reliability: -5 },
              concepts: [c("memory", 2)]
            }
          }
        ]
      },
      {
        id: "m3-e2",
        title: "Power drop clash",
        time: "Day -10, 10:35am",
        narrative:
          "Two vendors request the same power drop. The agent can decide, recommend with evidence, or create a public thread with all vendor details.",
        pressure: "medium",
        toolHint: "The site map shows the real constraint; the CRM shows contract priority.",
        choices: [
          {
            id: "recommend-owner",
            label: "Recommend an allocation and route approval",
            description:
              "Use contract and power data, then send a concise approval request to site ops.",
            rationale:
              "The agent prepares a decision but lets the accountable owner approve resource allocation.",
            expert: true,
            needsTool: ["vendor-crm", "site-map"],
            effect: {
              metrics: { reliability: 8, budget: 4, trust: 5 },
              concepts: [c("tools", 5), c("human-loop", 4), c("handoffs", 5)]
            },
            toolBonus: {
              note: "The site map reveals a second power drop nearby, avoiding a false conflict.",
              metrics: { budget: 3, guest: 2 },
              concepts: [c("reliability", 4)]
            }
          },
          {
            id: "agent-decides",
            label: "Let the agent allocate power directly",
            description: "Pick the vendor that sounds more urgent.",
            rationale:
              "Resource allocation can carry contract and safety implications; approval matters.",
            effect: {
              metrics: { reliability: -4, budget: -5, trust: -5 },
              concepts: [c("human-loop", 2)]
            }
          },
          {
            id: "open-thread",
            label: "Put every vendor detail in one shared thread",
            description: "Increase transparency by exposing all notes to everyone.",
            rationale:
              "Transparency is not the same as safe information handling.",
            effect: {
              metrics: { trust: -9, safety: -3, reliability: -2 },
              concepts: [c("guardrails", 3)]
            }
          }
        ]
      },
      {
        id: "m3-e3",
        title: "What should the next shift see?",
        time: "Day -10, 5:55pm",
        narrative:
          "The vendor desk is closing. You need a handoff that another human or agent can continue tomorrow.",
        pressure: "low",
        toolHint: "The handoff log shows the fields needed for continuity.",
        choices: [
          {
            id: "decision-log",
            label: "Write a decision log with evidence and confidence",
            description:
              "Include decisions made, source tools, unresolved blockers, owner, confidence, and next action.",
            rationale:
              "Observable handoffs make future agent behavior debuggable.",
            expert: true,
            needsTool: ["handoff-log"],
            effect: {
              metrics: { reliability: 8, trust: 6, guest: 2 },
              concepts: [c("observability", 7), c("handoffs", 6)]
            },
            toolBonus: {
              note: "The log format prevents tomorrow's agent from re-opening settled decisions.",
              metrics: { reliability: 3 },
              concepts: [c("memory", 3)]
            }
          },
          {
            id: "chat-dump",
            label: "Attach the whole chat transcript",
            description: "Let the next person read everything if needed.",
            rationale:
              "Raw transcripts bury the signal and can expose private information.",
            effect: {
              metrics: { reliability: -4, trust: -4 },
              concepts: [c("observability", 2)]
            }
          },
          {
            id: "done-only",
            label: "Mark everything done",
            description: "Close the loop without details because no incidents are active.",
            rationale:
              "Agents need traceable state, especially when a task crosses shifts.",
            effect: {
              metrics: { reliability: -7, trust: -3, budget: -2 },
              concepts: [c("handoffs", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 70,
      minSafety: 60,
      requiredConcepts: ["memory", "handoffs"]
    },
    debrief: {
      win:
        "Your vendor agent preserved useful state while keeping sensitive data out of broad memory.",
      lose:
        "The vendor workflow suffered from either too much memory, too little continuity, or unclear handoffs.",
      expertTakeaway:
        "Memory is a design choice, not a storage reflex. Store the minimum useful state with ownership, source, and expiry."
    }
  },
  {
    id: "m4-transport-planning",
    title: "The Shuttle Surge",
    festivalPhase: "Arrival operations",
    estimateMinutes: 20,
    difficulty: 3,
    tagline: "Break a messy crowd movement problem into plans, tools, and handoffs.",
    brief:
      "Camper arrivals spike after a highway delay. Transport, gates, camping, and comms all need coordinated updates. Your agent must plan without pretending one agent can do every job.",
    learningGoals: [
      "Decompose complex goals into agent-sized tasks.",
      "Use handoffs between specialist workflows.",
      "Keep humans in charge of high-impact crowd movement decisions."
    ],
    concepts: ["planning", "handoffs", "tools", "human-loop", "reliability"],
    agentSlots: [
      {
        id: "transport-planner",
        label: "Transport Planner",
        recommendedRole: "Arrival transport planning agent",
        starterObjective:
          "Monitor arrivals, recommend queue and shuttle adjustments, and hand off public updates or safety decisions to the responsible lead.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["outcome-bound", "checklist"],
          minTools: 3,
          requiredTools: ["bus-feed", "gate-counter", "zone-map"],
          guardrails: [
            "Escalate safety or legal risks to a human lead",
            "Use verified tool data before sending operational updates"
          ],
          handoffs: [
            "Route specialist tasks to the agent with the matching tool",
            "Summarize context, decision, and confidence during every handoff"
          ],
          evals: [
            "Measure false alarms and missed incidents",
            "Check outcome against the mission success criteria"
          ]
        }
      }
    ],
    tools: [
      {
        id: "bus-feed",
        name: "Bus location feed",
        type: "monitor",
        description: "Live shuttle counts, delays, and turnaround estimates.",
        outputTitle: "Transport feed",
        output:
          "Five buses are queued offsite. Turnaround time rose from 18 to 32 minutes. One accessible shuttle is available at north gate.",
        teaches: ["tools", "planning"]
      },
      {
        id: "gate-counter",
        name: "Gate counter",
        type: "monitor",
        description: "Entry scan rate and queue length by gate.",
        outputTitle: "Gate pressure",
        output:
          "Camper gate is at 82 percent capacity and slowing. Day guest gate has spare scanner staff for the next 40 minutes.",
        teaches: ["reliability"]
      },
      {
        id: "zone-map",
        name: "Zone map",
        type: "lookup",
        description: "Walking routes, service lanes, accessibility paths, and closed areas.",
        outputTitle: "Movement constraints",
        output:
          "The west service lane cannot open to pedestrians. North overflow can absorb 700 people if security opens the barrier.",
        teaches: ["guardrails"]
      }
    ],
    events: [
      {
        id: "m4-e1",
        title: "Queue pressure rises",
        time: "Day -1, 1:05pm",
        narrative:
          "Arrival queues grow quickly. The agent has enough data to recommend a plan, but opening overflow requires a human site lead.",
        pressure: "high",
        toolHint: "Use gate counts and the zone map before touching crowd routes.",
        choices: [
          {
            id: "plan-handoff",
            label: "Create a staged plan with human approval points",
            description:
              "Recommend scanner reallocation, overflow trigger, accessible shuttle protection, and approval owners.",
            rationale:
              "Planning agents should break the problem into reversible steps and escalation points.",
            expert: true,
            needsTool: ["bus-feed", "gate-counter", "zone-map"],
            effect: {
              metrics: { safety: 9, guest: 7, reliability: 8, trust: 5, budget: 1 },
              concepts: [c("planning", 9), c("handoffs", 6), c("human-loop", 5)]
            },
            toolBonus: {
              note: "Live feeds let the agent protect accessible transport while easing the main queue.",
              metrics: { safety: 4, guest: 3 },
              concepts: [c("tools", 4)]
            }
          },
          {
            id: "open-everything",
            label: "Tell teams to open every route now",
            description: "Maximize flow by using all lanes and gates immediately.",
            rationale:
              "Optimizing one metric without constraints can create safety incidents.",
            effect: {
              metrics: { guest: 3, safety: -12, reliability: -8, trust: -5 },
              concepts: [c("guardrails", 3)]
            }
          },
          {
            id: "wait",
            label: "Wait for the queue to self-correct",
            description: "Avoid unnecessary changes until the next bus cycle.",
            rationale:
              "Monitoring is not useful unless thresholds trigger action.",
            effect: {
              metrics: { guest: -9, reliability: -5, trust: -3, safety: -2 },
              concepts: [c("planning", 2)]
            }
          }
        ]
      },
      {
        id: "m4-e2",
        title: "Comms wants a push notification",
        time: "Day -1, 1:30pm",
        narrative:
          "The comms team asks the agent for a guest-facing update. Some details are confirmed, others depend on site lead approval.",
        pressure: "medium",
        toolHint: "The transport plan needs a public-comms approval gate.",
        choices: [
          {
            id: "draft-with-state",
            label: "Draft confirmed guidance and hold unapproved claims",
            description:
              "Send confirmed arrival tips, mark pending decisions, and route final notification to comms lead.",
            rationale:
              "Agents can accelerate communication without publishing unapproved operational claims.",
            expert: true,
            needsTool: ["gate-counter"],
            effect: {
              metrics: { guest: 7, trust: 7, reliability: 4 },
              concepts: [c("human-loop", 6), c("structured-outputs", 4)]
            },
            toolBonus: {
              note: "Gate data keeps the public update specific and current.",
              metrics: { guest: 3 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "auto-send",
            label: "Let the agent send a push notification",
            description: "Publish the clearest route and tell guests where to go.",
            rationale:
              "Irreversible public crowd instructions need approval and current evidence.",
            effect: {
              metrics: { guest: -4, safety: -8, trust: -6, reliability: -5 },
              concepts: [c("human-loop", 2)]
            }
          },
          {
            id: "no-comms",
            label: "Do not communicate until everything is settled",
            description: "Avoid confusion by staying silent.",
            rationale:
              "Silence can create more pressure. The agent can communicate bounded, verified guidance.",
            effect: {
              metrics: { guest: -7, trust: -4, safety: -2 },
              concepts: [c("agent-fit", 2)]
            }
          }
        ]
      },
      {
        id: "m4-e3",
        title: "Did the plan work?",
        time: "Day -1, 2:20pm",
        narrative:
          "The first shuttle cycle after the intervention is complete. The agent can evaluate with metrics, celebrate, or keep changing things.",
        pressure: "medium",
        toolHint: "Compare queue pressure and turnaround time before changing again.",
        choices: [
          {
            id: "measure-then-adjust",
            label: "Measure outcome before the next adjustment",
            description:
              "Compare queue length, scan rate, and shuttle turnaround against the trigger thresholds.",
            rationale:
              "Reliable agents need feedback loops, not constant activity.",
            expert: true,
            needsTool: ["bus-feed", "gate-counter"],
            effect: {
              metrics: { reliability: 9, safety: 5, trust: 4, budget: 2 },
              concepts: [c("evals", 5), c("reliability", 7), c("observability", 4)]
            },
            toolBonus: {
              note: "The feeds show the queue is improving, so the agent avoids unnecessary extra changes.",
              metrics: { budget: 3, trust: 2 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "keep-changing",
            label: "Keep changing routes until no queue remains",
            description: "Treat every queue as a failure and continue optimizing.",
            rationale:
              "Optimization without thresholds can destabilize operations.",
            effect: {
              metrics: { safety: -5, budget: -5, reliability: -6 },
              concepts: [c("evals", 2)]
            }
          },
          {
            id: "declare-success",
            label: "Declare success from one positive anecdote",
            description: "A staff member says things look better, so stop monitoring.",
            rationale:
              "Anecdotes are useful signals, not enough evidence for system reliability.",
            effect: {
              metrics: { reliability: -5, trust: -2 },
              concepts: [c("observability", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 72,
      minSafety: 65,
      requiredConcepts: ["planning", "handoffs"]
    },
    debrief: {
      win:
        "Your transport agent decomposed the surge into monitored steps, human approval gates, and measurable outcomes.",
      lose:
        "The shuttle surge showed why planning needs thresholds, owners, and evidence, not just confident instructions.",
      expertTakeaway:
        "Agent planning is most useful when it turns a messy goal into monitored steps with clear owners and stop conditions."
    }
  },
  {
    id: "m5-weather-pivot",
    title: "Weather Pivot",
    festivalPhase: "Festival morning",
    estimateMinutes: 18,
    difficulty: 3,
    tagline: "Design escalation and guardrails when weather threatens the opening day.",
    brief:
      "A fast coastal weather change threatens one stage and two queues. Your agent needs to monitor signals, avoid panic, and escalate safety decisions before the festival opens.",
    learningGoals: [
      "Use monitoring tools with thresholds.",
      "Set guardrails for safety-critical autonomy.",
      "Balance speed with approval in high-risk conditions."
    ],
    concepts: ["guardrails", "human-loop", "tools", "observability", "reliability"],
    agentSlots: [
      {
        id: "weather-watch",
        label: "Weather Watch",
        recommendedRole: "Weather and site risk monitoring agent",
        starterObjective:
          "Monitor weather, site readiness, and guest exposure, then recommend mitigations with explicit thresholds and safety escalations.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["outcome-bound", "checklist"],
          minTools: 3,
          requiredTools: ["weather-feed", "site-risk", "incident-log"],
          guardrails: [
            "Escalate safety or legal risks to a human lead",
            "Use verified tool data before sending operational updates"
          ],
          handoffs: [
            "Hand off unresolved incidents to the human duty manager",
            "Request approval before irreversible public comms"
          ],
          evals: [
            "Measure false alarms and missed incidents",
            "Review cost, latency, and escalation rate"
          ]
        }
      }
    ],
    tools: [
      {
        id: "weather-feed",
        name: "Weather feed",
        type: "monitor",
        description: "Wind, rain, lightning, and confidence by time window.",
        outputTitle: "Weather alert",
        output:
          "Wind gust probability above stage threshold rises to 42 percent between 3:00pm and 4:15pm. Lightning risk remains low.",
        teaches: ["tools", "observability"]
      },
      {
        id: "site-risk",
        name: "Site risk board",
        type: "analysis",
        description: "Structures, queues, drainage, and temporary shelter status.",
        outputTitle: "Site exposure",
        output:
          "Ridge Stage banners are wind-sensitive. South entry queue has limited shelter. Covered chill zones can absorb 1,200 guests.",
        teaches: ["guardrails"]
      },
      {
        id: "incident-log",
        name: "Incident log",
        type: "comms",
        description: "Current incidents, open mitigations, and owner notes.",
        outputTitle: "Open mitigations",
        output:
          "Site ops is already lowering two banners. Security has spare staff for queue movement. Medical reports no weather injuries.",
        teaches: ["human-loop"]
      }
    ],
    events: [
      {
        id: "m5-e1",
        title: "Wind threshold warning",
        time: "Day 1, 10:10am",
        narrative:
          "Wind risk is rising but not certain. The agent needs to recommend action without overreacting or waiting too long.",
        pressure: "high",
        toolHint: "Weather and site tools reveal threshold and exposed assets.",
        choices: [
          {
            id: "threshold-plan",
            label: "Recommend threshold-based mitigations",
            description:
              "Lower exposed assets now, define trigger thresholds, and escalate stage changes to the safety lead.",
            rationale:
              "Safety agents should be proactive inside reversible bounds and escalate irreversible decisions.",
            expert: true,
            needsTool: ["weather-feed", "site-risk", "incident-log"],
            effect: {
              metrics: { safety: 10, reliability: 8, trust: 5, budget: 1 },
              concepts: [c("guardrails", 8), c("human-loop", 6), c("observability", 5)]
            },
            toolBonus: {
              note: "Tool data shows which mitigations are reversible and which need safety approval.",
              metrics: { safety: 4, budget: 2 },
              concepts: [c("tools", 4)]
            }
          },
          {
            id: "ignore-uncertain",
            label: "Ignore the warning until probability exceeds 70 percent",
            description: "Avoid unnecessary disruption until risk is more certain.",
            rationale:
              "Waiting for certainty can be unsafe when preparation time is part of the risk.",
            effect: {
              metrics: { safety: -10, reliability: -5, trust: -3 },
              concepts: [c("guardrails", 2)]
            }
          },
          {
            id: "cancel-stage",
            label: "Cancel the Ridge Stage immediately",
            description: "Eliminate weather risk with a decisive action.",
            rationale:
              "Maximum caution can still be a poor agent action if it ignores proportionality and approval.",
            effect: {
              metrics: { safety: 2, guest: -12, budget: -8, trust: -4 },
              concepts: [c("human-loop", 3)]
            }
          }
        ]
      },
      {
        id: "m5-e2",
        title: "Guest shelter question",
        time: "Day 1, 11:05am",
        narrative:
          "Comms asks whether to tell guests to move to covered chill zones. The decision affects crowd flow and guest trust.",
        pressure: "medium",
        toolHint: "Site risk tells you shelter capacity; incident log tells you staff availability.",
        choices: [
          {
            id: "bounded-guidance",
            label: "Draft bounded guidance with capacity limits",
            description:
              "Recommend moving vulnerable guests first, cite capacity, and ask comms lead to approve wording.",
            rationale:
              "Safety communication should be specific, evidence-based, and approved.",
            expert: true,
            needsTool: ["site-risk", "incident-log"],
            effect: {
              metrics: { safety: 8, guest: 5, trust: 7, reliability: 4 },
              concepts: [c("human-loop", 5), c("structured-outputs", 4), c("guardrails", 5)]
            },
            toolBonus: {
              note: "Capacity data prevents the agent from sending too many guests to one zone.",
              metrics: { safety: 3, guest: 3 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "send-everyone",
            label: "Tell everyone to move under cover now",
            description: "Prioritize protection from wind and rain.",
            rationale:
              "A safe-sounding message can become unsafe if it creates crowding.",
            effect: {
              metrics: { safety: -8, guest: -4, trust: -5 },
              concepts: [c("guardrails", 2)]
            }
          },
          {
            id: "say-nothing",
            label: "Avoid public guidance to prevent panic",
            description: "Let staff handle guests in person.",
            rationale:
              "Withholding verified guidance can reduce trust and increase uneven crowd movement.",
            effect: {
              metrics: { guest: -6, trust: -5, safety: -3 },
              concepts: [c("human-loop", 2)]
            }
          }
        ]
      },
      {
        id: "m5-e3",
        title: "Escalation audit",
        time: "Day 1, 12:30pm",
        narrative:
          "The safety lead asks why the agent escalated some items and not others. You need to show the decision policy.",
        pressure: "medium",
        toolHint: "Incident and weather traces can explain thresholds and owners.",
        choices: [
          {
            id: "show-policy-trace",
            label: "Show threshold policy and trace",
            description:
              "List signals, thresholds, agent actions, escalations, and human approvals.",
            rationale:
              "Observability lets humans audit whether the agent followed its safety policy.",
            expert: true,
            needsTool: ["weather-feed", "incident-log"],
            effect: {
              metrics: { reliability: 8, trust: 7, safety: 3 },
              concepts: [c("observability", 8), c("evals", 4), c("reliability", 5)]
            },
            toolBonus: {
              note: "The incident log confirms every escalation had an owner.",
              metrics: { trust: 3 },
              concepts: [c("human-loop", 3)]
            }
          },
          {
            id: "summarize-feeling",
            label: "Explain that the agent was being cautious",
            description: "Give a general explanation without trace detail.",
            rationale:
              "Intent is not enough. Operators need evidence of policy compliance.",
            effect: {
              metrics: { trust: -4, reliability: -4 },
              concepts: [c("observability", 2)]
            }
          },
          {
            id: "disable-agent",
            label: "Disable the agent after the audit request",
            description: "Treat the audit as a sign the agent is too risky.",
            rationale:
              "Audits are part of reliable operation, not an automatic failure.",
            effect: {
              metrics: { reliability: -5, trust: -1, guest: -2 },
              concepts: [c("evals", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 73,
      minSafety: 70,
      requiredConcepts: ["guardrails", "human-loop"]
    },
    debrief: {
      win:
        "The weather agent acted inside reversible safety bounds and escalated higher-risk choices with evidence.",
      lose:
        "The weather pivot exposed weak safety design: either too much autonomy, too little action, or poor traceability.",
      expertTakeaway:
        "In safety-sensitive work, the agent's job is to monitor, recommend, prepare reversible mitigations, and escalate decisions with clear evidence."
    }
  },
  {
    id: "m6-crowd-safety",
    title: "Crowd Safety Watch",
    festivalPhase: "Festival day",
    estimateMinutes: 20,
    difficulty: 4,
    tagline: "Keep autonomy bounded when live incidents and ambiguous signals arrive together.",
    brief:
      "The main stage crowd is dense, social posts are noisy, and staff reports conflict. Your safety agent must avoid false certainty while still acting quickly.",
    learningGoals: [
      "Design agents for ambiguous, high-impact signals.",
      "Use guardrails and escalation without freezing the workflow.",
      "Measure missed incidents and false alarms."
    ],
    concepts: ["guardrails", "observability", "evals", "human-loop", "reliability"],
    agentSlots: [
      {
        id: "safety-watch",
        label: "Safety Watch",
        recommendedRole: "Crowd safety monitoring agent",
        starterObjective:
          "Monitor crowd signals, identify incidents that need human review, and recommend bounded mitigations without issuing direct crowd commands.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["outcome-bound", "checklist"],
          minTools: 3,
          requiredTools: ["crowd-density", "staff-radio", "medical-feed"],
          guardrails: [
            "Escalate safety or legal risks to a human lead",
            "Use verified tool data before sending operational updates"
          ],
          handoffs: [
            "Hand off unresolved incidents to the human duty manager",
            "Summarize context, decision, and confidence during every handoff"
          ],
          evals: [
            "Measure false alarms and missed incidents",
            "Compare agent recommendation with human supervisor decision"
          ]
        }
      }
    ],
    tools: [
      {
        id: "crowd-density",
        name: "Crowd density map",
        type: "monitor",
        description: "Zone density estimates and trend direction.",
        outputTitle: "Density trend",
        output:
          "Main Vines front-left is trending high, but still below emergency threshold. Ridge exit flow is improving after barrier adjustment.",
        teaches: ["observability"]
      },
      {
        id: "staff-radio",
        name: "Staff radio digest",
        type: "comms",
        description: "Summarized staff reports with confidence and source.",
        outputTitle: "Radio reports",
        output:
          "Two staff report pressure near front-left. One report is second-hand. Security supervisor requests a camera check before moving barriers.",
        teaches: ["human-loop"]
      },
      {
        id: "medical-feed",
        name: "Medical feed",
        type: "monitor",
        description: "Medical call volume, location, and incident severity.",
        outputTitle: "Medical pattern",
        output:
          "Medical volume is normal for time of day. No cluster in front-left, but dehydration calls are increasing near south water station.",
        teaches: ["evals"]
      }
    ],
    events: [
      {
        id: "m6-e1",
        title: "Conflicting signals",
        time: "Day 1, 7:15pm",
        narrative:
          "A viral post says the main stage is unsafe. Staff reports pressure, but the density map is below emergency threshold.",
        pressure: "critical",
        toolHint: "Compare social noise against density, radio, and medical feeds.",
        choices: [
          {
            id: "verify-escalate",
            label: "Verify signals and escalate a bounded mitigation",
            description:
              "Ask safety lead for camera confirmation, move spare staff near the zone, and monitor medical trend.",
            rationale:
              "The agent acts on reversible support steps while escalating the high-impact decision.",
            expert: true,
            needsTool: ["crowd-density", "staff-radio", "medical-feed"],
            effect: {
              metrics: { safety: 10, reliability: 8, trust: 6, guest: 2 },
              concepts: [c("guardrails", 7), c("human-loop", 7), c("observability", 5)]
            },
            toolBonus: {
              note: "Multiple feeds prevent both panic and dismissal.",
              metrics: { safety: 4, reliability: 3 },
              concepts: [c("evals", 3)]
            }
          },
          {
            id: "dismiss-post",
            label: "Dismiss the post because tools look mostly normal",
            description: "Assume the viral report is exaggeration.",
            rationale:
              "Low confidence is not no risk. Ambiguous safety signals still need bounded action.",
            effect: {
              metrics: { safety: -11, trust: -7, reliability: -6 },
              concepts: [c("guardrails", 2)]
            }
          },
          {
            id: "broadcast-danger",
            label: "Broadcast that the area is dangerous",
            description: "Warn all guests immediately.",
            rationale:
              "Unverified public alarm can create crowd movement risk.",
            effect: {
              metrics: { safety: -8, guest: -9, trust: -8, reliability: -7 },
              concepts: [c("human-loop", 2)]
            }
          }
        ]
      },
      {
        id: "m6-e2",
        title: "Water station stress",
        time: "Day 1, 8:05pm",
        narrative:
          "Medical calls rise near a water station. The agent can redirect volunteers, request a push notification, or ignore it because it is not a main stage incident.",
        pressure: "high",
        toolHint: "Medical feed shows a cluster; radio can confirm volunteer availability.",
        choices: [
          {
            id: "reversible-support",
            label: "Recommend reversible support and monitor",
            description:
              "Route volunteers, ask medical lead to confirm, and prepare a hydration message for approval.",
            rationale:
              "Bounded actions can reduce risk while the human lead owns medical decisions.",
            expert: true,
            needsTool: ["medical-feed", "staff-radio"],
            effect: {
              metrics: { safety: 9, guest: 5, reliability: 6, trust: 4 },
              concepts: [c("human-loop", 5), c("guardrails", 5), c("planning", 4)]
            },
            toolBonus: {
              note: "Radio availability lets the agent recommend support without stripping staff from the main stage.",
              metrics: { safety: 3, budget: 1 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "auto-push-hydrate",
            label: "Auto-send a hydration push notification",
            description: "Tell everyone to go to the south water station.",
            rationale:
              "Even helpful messages can worsen bottlenecks if not capacity-aware.",
            effect: {
              metrics: { guest: 1, safety: -6, trust: -3 },
              concepts: [c("guardrails", 2)]
            }
          },
          {
            id: "ignore-side-issue",
            label: "Ignore it and focus on the main stage",
            description: "Keep the agent on its original incident.",
            rationale:
              "Agents need priorities, but they should not miss adjacent safety patterns.",
            effect: {
              metrics: { safety: -8, reliability: -5, trust: -4 },
              concepts: [c("evals", 2)]
            }
          }
        ]
      },
      {
        id: "m6-e3",
        title: "Post-incident eval",
        time: "Day 1, 9:00pm",
        narrative:
          "Safety asks whether the agent helped or just added noise. You need to choose the evaluation lens.",
        pressure: "medium",
        toolHint: "Compare reports, actions, and outcomes rather than only final crowd mood.",
        choices: [
          {
            id: "false-missed",
            label: "Evaluate false alarms, missed incidents, and latency",
            description:
              "Compare agent alerts against supervisor decisions and incident outcomes.",
            rationale:
              "Safety evals must measure both overreaction and missed risk.",
            expert: true,
            needsTool: ["crowd-density", "staff-radio", "medical-feed"],
            effect: {
              metrics: { reliability: 9, trust: 7, safety: 4 },
              concepts: [c("evals", 8), c("observability", 5), c("reliability", 5)]
            },
            toolBonus: {
              note: "The three feeds create a balanced eval dataset.",
              metrics: { reliability: 3 },
              concepts: [c("structured-outputs", 2)]
            }
          },
          {
            id: "count-alerts",
            label: "Count how many alerts the agent sent",
            description: "More alerts means the agent was more active.",
            rationale:
              "Activity is not quality. An agent can be noisy and harmful.",
            effect: {
              metrics: { reliability: -5, trust: -3 },
              concepts: [c("evals", 2)]
            }
          },
          {
            id: "guest-vibes",
            label: "Use guest sentiment as the only score",
            description: "If guests felt fine, the agent did fine.",
            rationale:
              "Sentiment matters, but safety reliability needs operational ground truth.",
            effect: {
              metrics: { reliability: -4, safety: -2, trust: -1 },
              concepts: [c("evals", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 75,
      minSafety: 72,
      requiredConcepts: ["guardrails", "evals"]
    },
    debrief: {
      win:
        "Your safety agent handled ambiguous signals with bounded action, human escalation, and a meaningful evaluation plan.",
      lose:
        "The crowd scenario punished both overconfidence and paralysis. Safety agents need calibrated autonomy and strong evals.",
      expertTakeaway:
        "High-stakes agents should be measured on missed incidents, false alarms, latency, escalation quality, and human agreement."
    }
  },
  {
    id: "m7-debugging-observability",
    title: "Comms Recovery",
    festivalPhase: "Live operations",
    estimateMinutes: 17,
    difficulty: 4,
    tagline: "Debug a bad agent recommendation using traces, evals, and rollback.",
    brief:
      "A guest comms agent gave confusing gate advice. The issue is recoverable, but only if you diagnose the failure instead of guessing at a prompt tweak.",
    learningGoals: [
      "Use traces to find whether failure came from tools, instructions, memory, or autonomy.",
      "Rollback safely before changing behavior.",
      "Create targeted evals for the failure mode."
    ],
    concepts: ["observability", "evals", "instructions", "tools", "reliability"],
    agentSlots: [
      {
        id: "comms-debugger",
        label: "Comms Debugger",
        recommendedRole: "Agent reliability and comms recovery specialist",
        starterObjective:
          "Diagnose confusing guest guidance, identify the failure source, roll back unsafe behavior, and add targeted evals before relaunch.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["checklist", "outcome-bound"],
          minTools: 3,
          requiredTools: ["trace-viewer", "tool-status", "eval-harness"],
          guardrails: [
            "Use verified tool data before sending operational updates",
            "Ask for missing critical context before acting"
          ],
          handoffs: [
            "Summarize context, decision, and confidence during every handoff",
            "Request approval before irreversible public comms"
          ],
          evals: [
            "Verify tool evidence is cited in the response",
            "Run a red-team prompt before festival day"
          ]
        }
      }
    ],
    tools: [
      {
        id: "trace-viewer",
        name: "Trace viewer",
        type: "analysis",
        description: "Agent steps, tool calls, memory reads, and final messages.",
        outputTitle: "Trace finding",
        output:
          "The agent used yesterday's gate map from memory after the live map tool timed out. The final answer did not cite source freshness.",
        teaches: ["observability"]
      },
      {
        id: "tool-status",
        name: "Tool status",
        type: "monitor",
        description: "Health and latency for the live map, schedule, and comms tools.",
        outputTitle: "Tool health",
        output:
          "Live map had a six minute timeout window. Schedule API is healthy. Comms publish tool is paused pending approval.",
        teaches: ["tools", "reliability"]
      },
      {
        id: "eval-harness",
        name: "Eval harness",
        type: "analysis",
        description: "Regression tests for common guest guidance scenarios.",
        outputTitle: "Eval gaps",
        output:
          "No eval currently checks stale map fallback. Existing tests only verify tone and inclusion of gate names.",
        teaches: ["evals"]
      }
    ],
    events: [
      {
        id: "m7-e1",
        title: "Find the failure source",
        time: "Day 1, 10:15pm",
        narrative:
          "Guests were sent toward a closed gate. The fastest-looking fix is to rewrite the prompt, but the trace may show a deeper issue.",
        pressure: "high",
        toolHint: "Use trace and tool status before changing instructions.",
        choices: [
          {
            id: "trace-first",
            label: "Inspect trace, tool health, and memory read",
            description:
              "Identify whether the wrong answer came from stale memory, tool timeout, instruction ambiguity, or autonomy.",
            rationale:
              "Debugging agents requires seeing the actual path to the answer.",
            expert: true,
            needsTool: ["trace-viewer", "tool-status"],
            effect: {
              metrics: { reliability: 9, trust: 6, guest: 4, safety: 3 },
              concepts: [c("observability", 9), c("tools", 5), c("reliability", 5)]
            },
            toolBonus: {
              note: "The trace proves stale memory was used after a tool timeout.",
              metrics: { reliability: 4, trust: 3 },
              concepts: [c("memory", 3)]
            }
          },
          {
            id: "prompt-tweak",
            label: "Make the prompt more careful",
            description: "Add a line that says the agent should avoid mistakes.",
            rationale:
              "Generic prompt hardening rarely fixes a specific tool or memory failure.",
            effect: {
              metrics: { reliability: -5, trust: -3, guest: -2 },
              concepts: [c("instructions", 2)]
            }
          },
          {
            id: "blame-users",
            label: "Tell guests to check signs instead",
            description: "Avoid changing the system and shift responsibility to guests.",
            rationale:
              "Recovery needs system diagnosis and a clear correction.",
            effect: {
              metrics: { trust: -8, guest: -6, reliability: -4 },
              concepts: [c("reliability", 2)]
            }
          }
        ]
      },
      {
        id: "m7-e2",
        title: "Safe rollback",
        time: "Day 1, 10:25pm",
        narrative:
          "The agent can keep answering, be disabled completely, or fall back to approved static guidance until the tool recovers.",
        pressure: "high",
        toolHint: "Tool status tells you which capabilities are safe right now.",
        choices: [
          {
            id: "fallback-mode",
            label: "Switch to approved fallback mode",
            description:
              "Pause dynamic gate advice, answer only verified static FAQs, and route gate questions to human comms.",
            rationale:
              "Rollback should reduce risk while preserving safe value.",
            expert: true,
            needsTool: ["tool-status"],
            effect: {
              metrics: { safety: 8, reliability: 8, trust: 5, guest: 2 },
              concepts: [c("guardrails", 5), c("human-loop", 5), c("reliability", 5)]
            },
            toolBonus: {
              note: "Tool health shows dynamic map advice should stay paused.",
              metrics: { reliability: 3 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "disable-all",
            label: "Disable every comms assistant",
            description: "Stop all automated guest support.",
            rationale:
              "A complete shutdown may be necessary in severe incidents, but here a bounded fallback is better.",
            effect: {
              metrics: { safety: 2, guest: -8, reliability: -3, trust: -1 },
              concepts: [c("guardrails", 2)]
            }
          },
          {
            id: "keep-running",
            label: "Keep the agent running while you fix it",
            description: "Avoid support backlog by leaving behavior live.",
            rationale:
              "Known bad behavior should be contained before repair.",
            effect: {
              metrics: { safety: -8, guest: -5, reliability: -8, trust: -7 },
              concepts: [c("reliability", 2)]
            }
          }
        ]
      },
      {
        id: "m7-e3",
        title: "Regression eval",
        time: "Day 1, 10:50pm",
        narrative:
          "Before relaunch, the team asks what eval would catch this next time.",
        pressure: "medium",
        toolHint: "The eval harness names what is currently missing.",
        choices: [
          {
            id: "stale-tool-eval",
            label: "Add stale-tool fallback evals",
            description:
              "Test live-map timeout, stale memory, source freshness, and approval routing before relaunch.",
            rationale:
              "Targeted evals should reproduce the failure mode and prevent regression.",
            expert: true,
            needsTool: ["eval-harness", "trace-viewer"],
            effect: {
              metrics: { reliability: 10, trust: 6, safety: 3 },
              concepts: [c("evals", 9), c("observability", 5), c("memory", 3)]
            },
            toolBonus: {
              note: "The eval harness confirms tone tests were not enough.",
              metrics: { reliability: 3 },
              concepts: [c("structured-outputs", 2)]
            }
          },
          {
            id: "tone-eval",
            label: "Add more tone and friendliness evals",
            description: "Make sure future messages sound calm and helpful.",
            rationale:
              "Tone matters, but it would not catch stale map advice.",
            effect: {
              metrics: { guest: 2, reliability: -5, trust: -2 },
              concepts: [c("evals", 2)]
            }
          },
          {
            id: "manual-review-only",
            label: "Require manual review forever",
            description: "Avoid eval work by routing all future answers to humans.",
            rationale:
              "Manual review can be part of the solution, but it does not teach the system to avoid repeat failures.",
            effect: {
              metrics: { safety: 3, guest: -5, reliability: -3, budget: -3 },
              concepts: [c("human-loop", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 74,
      minSafety: 68,
      requiredConcepts: ["observability", "evals"]
    },
    debrief: {
      win:
        "You debugged the agent from trace to rollback to targeted eval, which is the reliability loop builders need.",
      lose:
        "The comms recovery stayed fragile because the fix did not address the actual failure path.",
      expertTakeaway:
        "Agent debugging starts with traces and ends with a test that would have caught the failure before users did."
    }
  },
  {
    id: "m8-multi-agent",
    title: "Festival Swarm",
    festivalPhase: "Multi-agent operations",
    estimateMinutes: 22,
    difficulty: 5,
    tagline: "Coordinate specialist agents without creating loops, duplicated work, or hidden risk.",
    brief:
      "The festival now has several useful agents. Your challenge is orchestration: deciding who owns what, how agents hand off, and when a human becomes the coordinator.",
    learningGoals: [
      "Design multi-agent systems around ownership, not novelty.",
      "Prevent circular delegation and duplicate actions.",
      "Use traces and evals across agent boundaries."
    ],
    concepts: ["multi-agent", "handoffs", "observability", "guardrails", "evals"],
    agentSlots: [
      {
        id: "orchestrator",
        label: "Orchestrator",
        recommendedRole: "Festival operations orchestration agent",
        starterObjective:
          "Route tasks to specialist agents, maintain a single owner for each incident, and escalate conflicts or high-risk decisions to the human command lead.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["scoped"],
          instructionStyle: ["outcome-bound", "checklist"],
          minTools: 3,
          requiredTools: ["ownership-board", "agent-traces", "risk-router"],
          guardrails: [
            "Stop delegation loops after one failed handoff",
            "Escalate safety or legal risks to a human lead"
          ],
          handoffs: [
            "Route specialist tasks to the agent with the matching tool",
            "Create a trace note when another agent takes ownership"
          ],
          evals: [
            "Review cost, latency, and escalation rate",
            "Measure false alarms and missed incidents"
          ]
        }
      },
      {
        id: "specialist-router",
        label: "Specialist Router",
        recommendedRole: "Agent routing and handoff specialist",
        starterObjective:
          "Choose the correct specialist for each task, summarize context, and prevent duplicate actions across transport, comms, safety, and vendor workflows.",
        expertPattern: {
          autonomy: ["assist", "recommend"],
          memory: ["session", "scoped"],
          instructionStyle: ["checklist", "outcome-bound"],
          minTools: 2,
          requiredTools: ["ownership-board", "agent-traces"],
          guardrails: [
            "Stop delegation loops after one failed handoff",
            "Use verified tool data before sending operational updates"
          ],
          handoffs: [
            "Summarize context, decision, and confidence during every handoff",
            "Create a trace note when another agent takes ownership"
          ],
          evals: [
            "Review cost, latency, and escalation rate",
            "Verify tool evidence is cited in the response"
          ]
        }
      }
    ],
    tools: [
      {
        id: "ownership-board",
        name: "Ownership board",
        type: "control",
        description: "Single owner, status, and next action for every active incident.",
        outputTitle: "Ownership conflicts",
        output:
          "Three agents currently claim the south gate update. Safety owns risk assessment; comms owns public wording; transport owns shuttle routing.",
        teaches: ["multi-agent", "handoffs"]
      },
      {
        id: "agent-traces",
        name: "Agent traces",
        type: "analysis",
        description: "Cross-agent handoffs, retries, loops, and final actions.",
        outputTitle: "Trace warning",
        output:
          "Vendor agent handed a vehicle issue to transport, which handed it back because no owner was assigned. Loop count is two.",
        teaches: ["observability"]
      },
      {
        id: "risk-router",
        name: "Risk router",
        type: "analysis",
        description: "Routes incidents by safety, legal, brand, budget, and reversibility.",
        outputTitle: "Routing policy",
        output:
          "Safety and legal decisions go to human command. Reversible operational recommendations go to specialist agents. Public comms requires comms approval.",
        teaches: ["guardrails", "human-loop"]
      }
    ],
    events: [
      {
        id: "m8-e1",
        title: "Three agents claim the gate update",
        time: "Day 2, 2:00pm",
        narrative:
          "Safety, transport, and comms agents all generated different south gate recommendations. The command lead wants one decision package.",
        pressure: "high",
        toolHint: "The ownership board and risk router define who owns which part.",
        choices: [
          {
            id: "single-owner",
            label: "Assign one owner per decision boundary",
            description:
              "Safety owns risk, transport owns routing, comms owns wording, and the orchestrator packages the approval.",
            rationale:
              "Multi-agent systems need explicit ownership more than more messages.",
            expert: true,
            needsTool: ["ownership-board", "risk-router"],
            effect: {
              metrics: { reliability: 10, safety: 7, trust: 6, guest: 4 },
              concepts: [c("multi-agent", 9), c("handoffs", 7), c("guardrails", 5)]
            },
            toolBonus: {
              note: "The ownership board resolves duplicated work without hiding specialist input.",
              metrics: { reliability: 4, trust: 2 },
              concepts: [c("observability", 3)]
            }
          },
          {
            id: "vote",
            label: "Let the agents vote",
            description: "Choose the recommendation that two agents agree with.",
            rationale:
              "Voting does not replace ownership, evidence, or risk policy.",
            effect: {
              metrics: { reliability: -7, safety: -5, trust: -4 },
              concepts: [c("multi-agent", 2)]
            }
          },
          {
            id: "human-everything",
            label: "Route every agent conflict to the command lead",
            description: "Avoid autonomous orchestration whenever agents disagree.",
            rationale:
              "Humans should own high-risk decisions, not every routine conflict.",
            effect: {
              metrics: { safety: 3, reliability: -4, guest: -5, budget: -3 },
              concepts: [c("human-loop", 2)]
            }
          }
        ]
      },
      {
        id: "m8-e2",
        title: "Delegation loop",
        time: "Day 2, 2:25pm",
        narrative:
          "A vehicle pass issue bounced between vendor and transport agents. The system can retry, stop the loop, or create a new coordinator agent.",
        pressure: "medium",
        toolHint: "Agent traces show repeated handoffs without an owner.",
        choices: [
          {
            id: "stop-assign",
            label: "Stop the loop and assign an owner",
            description:
              "Freeze retries, summarize the evidence, assign transport ownership, and alert the human duty manager if unresolved.",
            rationale:
              "Delegation needs stop rules. More agents can make loops harder to see.",
            expert: true,
            needsTool: ["agent-traces", "ownership-board"],
            effect: {
              metrics: { reliability: 9, budget: 5, trust: 5 },
              concepts: [c("handoffs", 7), c("observability", 6), c("multi-agent", 5)]
            },
            toolBonus: {
              note: "The trace reveals the exact loop and prevents another retry cycle.",
              metrics: { budget: 3, reliability: 2 },
              concepts: [c("guardrails", 3)]
            }
          },
          {
            id: "retry",
            label: "Let the agents retry with clearer wording",
            description: "Ask each agent to try harder to resolve the issue.",
            rationale:
              "Retries without ownership or new information usually amplify loops.",
            effect: {
              metrics: { reliability: -6, budget: -6, trust: -3 },
              concepts: [c("handoffs", 2)]
            }
          },
          {
            id: "new-agent",
            label: "Create another coordinator agent",
            description: "Add a special agent to mediate this handoff.",
            rationale:
              "Adding agents can mask a missing ownership rule.",
            effect: {
              metrics: { reliability: -4, budget: -5, trust: -2 },
              concepts: [c("multi-agent", 2)]
            }
          }
        ]
      },
      {
        id: "m8-e3",
        title: "Cross-agent eval",
        time: "Day 2, 3:15pm",
        narrative:
          "You need to evaluate whether the multi-agent system is better than a single agent plus humans.",
        pressure: "medium",
        toolHint: "Use traces, ownership, and risk routing to measure system behavior.",
        choices: [
          {
            id: "system-eval",
            label: "Evaluate end-to-end outcomes and coordination cost",
            description:
              "Measure latency, duplicate actions, escalation quality, owner clarity, and incident outcomes.",
            rationale:
              "Multi-agent systems should earn their complexity with measurable improvements.",
            expert: true,
            needsTool: ["agent-traces", "ownership-board", "risk-router"],
            effect: {
              metrics: { reliability: 10, trust: 6, budget: 3, safety: 3 },
              concepts: [c("evals", 8), c("multi-agent", 7), c("reliability", 5)]
            },
            toolBonus: {
              note: "Cross-agent traces make coordination cost visible.",
              metrics: { reliability: 3 },
              concepts: [c("observability", 3)]
            }
          },
          {
            id: "agent-count",
            label: "Score by number of specialist agents used",
            description: "More specialists means more advanced orchestration.",
            rationale:
              "More agents are not automatically better; complexity has a cost.",
            effect: {
              metrics: { reliability: -6, budget: -5 },
              concepts: [c("multi-agent", 2)]
            }
          },
          {
            id: "final-answer-quality",
            label: "Score only the final recommendation",
            description: "Ignore the path if the final answer looks correct.",
            rationale:
              "Final answer quality hides loops, duplicated work, and unsafe handoffs.",
            effect: {
              metrics: { reliability: -5, trust: -2, safety: -2 },
              concepts: [c("observability", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 76,
      minSafety: 70,
      requiredConcepts: ["multi-agent", "handoffs"]
    },
    debrief: {
      win:
        "Your multi-agent system used ownership, routing policy, traces, and evals instead of relying on agent chatter.",
      lose:
        "The swarm created avoidable confusion. Multi-agent work needs ownership, loop stops, and system-level evals.",
      expertTakeaway:
        "Multi-agent design is orchestration design: ownership, handoff contracts, shared state, stop rules, and measurable system value."
    }
  },
  {
    id: "m9-capstone",
    title: "New Year Command",
    festivalPhase: "Capstone",
    estimateMinutes: 30,
    difficulty: 5,
    tagline: "Design and operate the full festival agent system under live pressure.",
    brief:
      "It is New Year's Eve. Weather, artists, transport, safety, vendors, and comms all move at once. This capstone asks you to design a multi-agent command system and prove it can operate safely.",
    learningGoals: [
      "Design a complete agent system from goals to evals.",
      "Coordinate multiple agents under changing constraints.",
      "Recover from failures using traces, rollback, and human oversight."
    ],
    concepts: [
      "capstone",
      "multi-agent",
      "guardrails",
      "evals",
      "observability",
      "human-loop",
      "reliability"
    ],
    agentSlots: [
      {
        id: "command-orchestrator",
        label: "Command Orchestrator",
        recommendedRole: "Festival command orchestration agent",
        starterObjective:
          "Maintain the operational picture, route work to specialist agents, keep one owner per decision, and escalate safety, legal, and public-comms decisions.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["scoped"],
          instructionStyle: ["outcome-bound", "checklist"],
          minTools: 4,
          requiredTools: ["live-ops-board", "risk-router-capstone", "trace-hub", "eval-dashboard"],
          guardrails: [
            "Escalate safety or legal risks to a human lead",
            "Stop delegation loops after one failed handoff"
          ],
          handoffs: [
            "Route specialist tasks to the agent with the matching tool",
            "Create a trace note when another agent takes ownership"
          ],
          evals: [
            "Review cost, latency, and escalation rate",
            "Compare agent recommendation with human supervisor decision"
          ]
        }
      },
      {
        id: "safety-comms",
        label: "Safety Comms",
        recommendedRole: "Safety and guest communications agent",
        starterObjective:
          "Prepare evidence-based guest communications for approval, protect crowd safety, and avoid unverified public instructions.",
        expertPattern: {
          autonomy: ["recommend", "act-with-approval"],
          memory: ["session", "scoped"],
          instructionStyle: ["checklist", "outcome-bound"],
          minTools: 3,
          requiredTools: ["guest-comms", "safety-feed", "risk-router-capstone"],
          guardrails: [
            "Use verified tool data before sending operational updates",
            "Escalate safety or legal risks to a human lead"
          ],
          handoffs: [
            "Request approval before irreversible public comms",
            "Summarize context, decision, and confidence during every handoff"
          ],
          evals: [
            "Measure false alarms and missed incidents",
            "Verify tool evidence is cited in the response"
          ]
        }
      },
      {
        id: "reliability-lead",
        label: "Reliability Lead",
        recommendedRole: "Agent reliability and evaluation agent",
        starterObjective:
          "Monitor agent traces, detect stale tools or loops, trigger fallback modes, and run evals before restoring capabilities.",
        expertPattern: {
          autonomy: ["assist", "recommend"],
          memory: ["session", "scoped"],
          instructionStyle: ["outcome-bound", "checklist"],
          minTools: 3,
          requiredTools: ["trace-hub", "tool-health", "eval-dashboard"],
          guardrails: [
            "Ask for missing critical context before acting",
            "Stop delegation loops after one failed handoff"
          ],
          handoffs: [
            "Hand off unresolved incidents to the human duty manager",
            "Create a trace note when another agent takes ownership"
          ],
          evals: [
            "Run a red-team prompt before festival day",
            "Review cost, latency, and escalation rate"
          ]
        }
      }
    ],
    tools: [
      {
        id: "live-ops-board",
        name: "Live ops board",
        type: "control",
        description: "Single operational picture across stages, gates, vendors, safety, and comms.",
        outputTitle: "Live pressure",
        output:
          "Main Vines is on time. Ridge exit is slowing. Vendor lane B has a vehicle pass issue. Transport queue is stable but close to trigger threshold.",
        teaches: ["multi-agent", "planning"]
      },
      {
        id: "risk-router-capstone",
        name: "Risk router",
        type: "analysis",
        description: "Policy for safety, legal, brand, budget, reversibility, and approval.",
        outputTitle: "Capstone routing",
        output:
          "Safety, legal, public comms, and artist contract changes require human approval. Reversible staffing recommendations can be prepared by agents.",
        teaches: ["guardrails", "human-loop"]
      },
      {
        id: "trace-hub",
        name: "Trace hub",
        type: "analysis",
        description: "Cross-agent traces, loops, stale context, and final actions.",
        outputTitle: "Trace hub",
        output:
          "The transport agent and vendor agent both touched lane B. One ownership note is missing. Comms agent has no stale-tool warnings.",
        teaches: ["observability"]
      },
      {
        id: "eval-dashboard",
        name: "Eval dashboard",
        type: "analysis",
        description: "Mission-level evals, regression checks, incident quality, and reliability scores.",
        outputTitle: "Eval dashboard",
        output:
          "Current weak spots: owner clarity on lane incidents, latency after tool timeout, and public-comms evidence citation.",
        teaches: ["evals", "reliability"]
      },
      {
        id: "guest-comms",
        name: "Guest comms",
        type: "comms",
        description: "Draft, approval, and publishing workflow for guest-facing messages.",
        outputTitle: "Comms queue",
        output:
          "Two draft messages are pending approval: Ridge exit routing and hydration reminder. Both need source evidence before publish.",
        teaches: ["structured-outputs", "human-loop"]
      },
      {
        id: "safety-feed",
        name: "Safety feed",
        type: "monitor",
        description: "Crowd, medical, weather, and security signals.",
        outputTitle: "Safety state",
        output:
          "No emergency threshold breached. Ridge exit density is trending upward. Medical calls are normal. Wind remains below action level.",
        teaches: ["guardrails", "observability"]
      },
      {
        id: "tool-health",
        name: "Tool health",
        type: "monitor",
        description: "Availability, latency, freshness, and fallback status for every agent tool.",
        outputTitle: "Tool status",
        output:
          "Live ops board is fresh. Vendor CRM latency is high. Trace hub is healthy. Guest comms publish requires manual approval.",
        teaches: ["tools", "reliability"]
      }
    ],
    events: [
      {
        id: "m9-e1",
        title: "Build the command system",
        time: "New Year's Eve, 4:00pm",
        narrative:
          "Before peak time, the command lead asks how your agents will divide responsibility. The wrong design will either centralize everything or let agents collide.",
        pressure: "high",
        toolHint: "Use live ops, risk routing, traces, and evals to define boundaries.",
        choices: [
          {
            id: "bounded-system",
            label: "Run a bounded multi-agent command system",
            description:
              "Use an orchestrator, specialist safety comms, and reliability lead with owner clarity, traces, guardrails, and evals.",
            rationale:
              "Expert agent systems combine autonomy, tooling, oversight, and measurable reliability.",
            expert: true,
            needsTool: ["live-ops-board", "risk-router-capstone", "trace-hub", "eval-dashboard"],
            effect: {
              metrics: { reliability: 11, safety: 8, trust: 7, guest: 5, budget: 2 },
              concepts: [c("capstone", 8), c("multi-agent", 8), c("guardrails", 6), c("evals", 5)]
            },
            toolBonus: {
              note: "Your tools cover state, risk policy, traceability, and measurement.",
              metrics: { reliability: 4, safety: 3, trust: 2 },
              concepts: [c("observability", 4), c("tools", 3)]
            }
          },
          {
            id: "one-super-agent",
            label: "Create one super-agent for all operations",
            description: "Give a single agent every tool and let it coordinate everything.",
            rationale:
              "A single agent can become a hidden bottleneck and unsafe concentration of autonomy.",
            effect: {
              metrics: { reliability: -8, safety: -7, trust: -5, budget: -3 },
              concepts: [c("multi-agent", 2), c("guardrails", 2)]
            }
          },
          {
            id: "many-agents",
            label: "Create a specialist agent for every small task",
            description: "Maximize specialization across all festival functions.",
            rationale:
              "Too many agents increase coordination cost and ownership confusion.",
            effect: {
              metrics: { reliability: -6, budget: -7, trust: -3 },
              concepts: [c("multi-agent", 2)]
            }
          }
        ]
      },
      {
        id: "m9-e2",
        title: "Ridge exit squeeze",
        time: "New Year's Eve, 7:45pm",
        narrative:
          "Ridge exit density trends up while a vendor vehicle is stuck near lane B. Safety, vendor, and transport actions overlap.",
        pressure: "critical",
        toolHint: "Live ops, safety feed, and trace hub show owner boundaries and current risk.",
        choices: [
          {
            id: "incident-package",
            label: "Create an incident package with one owner per action",
            description:
              "Assign safety to crowd risk, transport to routing, vendor to vehicle owner, and command lead to approve public movement guidance.",
            rationale:
              "Capstone-level orchestration makes dependencies explicit without hiding risk.",
            expert: true,
            needsTool: ["live-ops-board", "safety-feed", "trace-hub", "risk-router-capstone"],
            effect: {
              metrics: { safety: 11, reliability: 9, guest: 5, trust: 6 },
              concepts: [c("multi-agent", 7), c("handoffs", 6), c("human-loop", 6), c("observability", 4)]
            },
            toolBonus: {
              note: "The trace hub catches the missing lane B ownership note before agents duplicate work.",
              metrics: { reliability: 4, safety: 3 },
              concepts: [c("guardrails", 3)]
            }
          },
          {
            id: "let-specialists-work",
            label: "Let each specialist agent handle its part independently",
            description: "Trust the agents to coordinate through their normal channels.",
            rationale:
              "Independent specialists still need shared ownership and conflict handling.",
            effect: {
              metrics: { reliability: -7, safety: -8, guest: -3, trust: -4 },
              concepts: [c("handoffs", 2)]
            }
          },
          {
            id: "command-takes-over",
            label: "Have the human command lead take over all details",
            description: "Pause agent participation during the incident.",
            rationale:
              "Human command owns the high-risk decision, but agents can still prepare evidence and track work.",
            effect: {
              metrics: { safety: 4, reliability: -4, guest: -5, budget: -2 },
              concepts: [c("human-loop", 2)]
            }
          }
        ]
      },
      {
        id: "m9-e3",
        title: "Tool latency spike",
        time: "New Year's Eve, 9:20pm",
        narrative:
          "Vendor CRM latency spikes during a vehicle pass issue. The system can continue, fall back, or ignore vendor data because it seems minor.",
        pressure: "high",
        toolHint: "Tool health and trace hub reveal freshness and affected agents.",
        choices: [
          {
            id: "fallback-trace",
            label: "Trigger fallback and record affected decisions",
            description:
              "Stop stale vendor recommendations, use approved static policy, and run evals before restoring dynamic behavior.",
            rationale:
              "Reliability design includes degraded modes, not just happy-path automation.",
            expert: true,
            needsTool: ["tool-health", "trace-hub", "eval-dashboard"],
            effect: {
              metrics: { reliability: 10, trust: 6, safety: 4, budget: 2 },
              concepts: [c("reliability", 8), c("observability", 6), c("evals", 6)]
            },
            toolBonus: {
              note: "Tool health makes the failure visible before stale data reaches public operations.",
              metrics: { reliability: 4 },
              concepts: [c("tools", 3)]
            }
          },
          {
            id: "keep-dynamic",
            label: "Keep dynamic recommendations running",
            description: "Avoid slowing operations for a minor tool issue.",
            rationale:
              "Stale data can spread through handoffs and become a larger operational failure.",
            effect: {
              metrics: { reliability: -9, trust: -5, budget: -4 },
              concepts: [c("reliability", 2)]
            }
          },
          {
            id: "ignore-vendor",
            label: "Ignore the vendor issue during peak time",
            description: "Focus only on safety and guest flow.",
            rationale:
              "Lower-priority issues still need safe containment and ownership.",
            effect: {
              metrics: { budget: -5, reliability: -5, trust: -3 },
              concepts: [c("planning", 2)]
            }
          }
        ]
      },
      {
        id: "m9-e4",
        title: "Final proof of expertise",
        time: "New Year's Eve, 11:40pm",
        narrative:
          "Before the midnight set, the festival director asks why this agent system should stay live. You need to present the final operating proof.",
        pressure: "critical",
        toolHint: "The eval dashboard and traces prove whether the system is reliable.",
        choices: [
          {
            id: "expert-operating-proof",
            label: "Present outcome, trace, eval, and rollback proof",
            description:
              "Show success metrics, key incidents, human approvals, eval gaps, fallback triggers, and what remains out of scope.",
            rationale:
              "Experts do not claim agents are magic; they prove where the system works and where it needs oversight.",
            expert: true,
            needsTool: ["eval-dashboard", "trace-hub", "risk-router-capstone"],
            effect: {
              metrics: { reliability: 12, trust: 9, safety: 5, guest: 4, budget: 2 },
              concepts: [
                c("capstone", 10),
                c("evals", 7),
                c("observability", 7),
                c("human-loop", 5),
                c("reliability", 6)
              ]
            },
            toolBonus: {
              note: "The final proof links system design to measured outcomes and residual risks.",
              metrics: { trust: 4, reliability: 3 },
              concepts: [c("multi-agent", 4)]
            }
          },
          {
            id: "demo-highlights",
            label: "Show the best agent answers from the night",
            description: "Use impressive examples to prove value.",
            rationale:
              "Great examples are not enough. Operating proof needs metrics, failures, and controls.",
            effect: {
              metrics: { guest: 2, trust: -4, reliability: -5 },
              concepts: [c("evals", 2)]
            }
          },
          {
            id: "claim-no-failures",
            label: "Say the system had no failures",
            description: "Emphasize confidence and avoid discussing limitations.",
            rationale:
              "Hiding limitations destroys trust and prevents safe operation.",
            effect: {
              metrics: { trust: -10, reliability: -8, safety: -4 },
              concepts: [c("observability", 2)]
            }
          }
        ]
      }
    ],
    success: {
      minAverage: 80,
      minSafety: 76,
      requiredConcepts: ["capstone", "multi-agent", "evals", "guardrails"]
    },
    debrief: {
      win:
        "You delivered a complete festival agent system: bounded autonomy, specialist tools, human oversight, traces, evals, fallback, and operating proof.",
      lose:
        "The capstone needs tighter ownership, safety boundaries, tool fallback, and evaluation before the festival should rely on it.",
      expertTakeaway:
        "Agent expertise means knowing how to design, operate, measure, and constrain the system, especially when the real world changes."
    }
  }
];

export function getMissionById(id: string) {
  return missions.find((mission) => mission.id === id) ?? missions[0];
}

export function getNextMissionId(id: string) {
  const index = missions.findIndex((mission) => mission.id === id);
  return missions[Math.min(index + 1, missions.length - 1)]?.id ?? missions[0].id;
}
