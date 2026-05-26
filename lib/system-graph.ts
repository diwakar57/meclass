/**
 * AISchool System Integration Graph
 *
 * JSON-based data-flow graph describing how all major modules
 * communicate through the shared orchestration layer.
 *
 * Nodes: top-level services / subsystems
 * Edges: directional data flows
 *
 * This file is the canonical reference for system-level architecture.
 * It is consumed by monitoring dashboards and documentation generators.
 */

export const SYSTEM_GRAPH = {
  version: '2.0.0',
  description: 'AISchool extended architecture — 5-feature integration',

  nodes: [
    // ── Core ──────────────────────────────────────────────────────────────
    { id: 'User',              label: 'User (Student/Teacher/Admin/District)',  type: 'entity'    },
    { id: 'AuthEngine',        label: 'Auth & RBAC Engine (JWT / OAuth)',       type: 'service'   },
    { id: 'AIOrchestrator',    label: 'AI Orchestration Layer',                type: 'service'   },

    // ── Existing ───────────────────────────────────────────────────────────
    { id: 'CourseEngine',      label: 'Course Engine (AI-generated / teacher)', type: 'service'  },
    { id: 'CurriculumEngine',  label: 'Curriculum & Syllabus Engine',           type: 'service'  },
    { id: 'AssessmentSystem',  label: 'Assessment & Quiz System',               type: 'service'  },
    { id: 'AnalyticsEngine',   label: 'Analytics Engine',                       type: 'service'  },
    { id: 'NotificationSvc',   label: 'Notification Service',                   type: 'service'  },

    // ── Feature 1 ──────────────────────────────────────────────────────────
    { id: 'LiveSessionService',      label: 'Live Session Service (WebRTC/LiveKit)',    type: 'service' },
    { id: 'RealTimeInteractionLayer',label: 'Real-Time Interaction Layer (chat/AI)',    type: 'service' },
    { id: 'TranscriptionService',    label: 'Auto Transcription & Summary Service',     type: 'service' },

    // ── Feature 2 ──────────────────────────────────────────────────────────
    { id: 'DistrictAnalyticsSvc',  label: 'District Analytics Service',   type: 'service' },
    { id: 'DistrictDashboard',     label: 'District Dashboard (UI)',       type: 'ui'      },

    // ── Feature 3 ──────────────────────────────────────────────────────────
    { id: 'Marketplace',           label: 'AI Course Marketplace',         type: 'service' },
    { id: 'RecommendationEngine',  label: 'Recommendation Engine (AI)',    type: 'service' },

    // ── Feature 4 ──────────────────────────────────────────────────────────
    { id: 'OfflineSync',           label: 'Offline Sync Service',          type: 'service' },
    { id: 'ServiceWorker',         label: 'Service Worker (PWA)',           type: 'infra'   },
    { id: 'IndexedDB',             label: 'IndexedDB (Client Storage)',     type: 'storage' },

    // ── Feature 5 ──────────────────────────────────────────────────────────
    { id: 'ProctoringService',     label: 'Proctoring Service',            type: 'service' },
    { id: 'ExamIntegrityEngine',   label: 'Exam Integrity Engine (AI)',    type: 'service' },
    { id: 'AuditLog',              label: 'Tamper-Proof Audit Log',        type: 'storage' },

    // ── Data ───────────────────────────────────────────────────────────────
    { id: 'PostgreSQL',    label: 'PostgreSQL (Primary DB)',  type: 'storage' },
    { id: 'CDN',           label: 'CDN (Video / Assets)',    type: 'infra'   },
  ],

  edges: [
    // Auth flows
    { from: 'User',               to: 'AuthEngine',              label: 'authenticate'       },
    { from: 'AuthEngine',         to: 'AIOrchestrator',          label: 'authorized request' },

    // AI Orchestrator → all services
    { from: 'AIOrchestrator',     to: 'CourseEngine',            label: 'generate course'    },
    { from: 'AIOrchestrator',     to: 'CurriculumEngine',        label: 'build curriculum'   },
    { from: 'AIOrchestrator',     to: 'AssessmentSystem',        label: 'create assessment'  },
    { from: 'AIOrchestrator',     to: 'LiveSessionService',      label: 'AI in live class'   },
    { from: 'AIOrchestrator',     to: 'Marketplace',             label: 'AI course creation' },
    { from: 'AIOrchestrator',     to: 'RecommendationEngine',    label: 'personalize'        },
    { from: 'AIOrchestrator',     to: 'ExamIntegrityEngine',     label: 'behavior analysis'  },

    // Feature 1: Live Classroom
    { from: 'User',               to: 'LiveSessionService',         label: 'join/start session' },
    { from: 'LiveSessionService', to: 'RealTimeInteractionLayer',   label: 'media + chat'       },
    { from: 'LiveSessionService', to: 'TranscriptionService',       label: 'audio stream'       },
    { from: 'TranscriptionService', to: 'AIOrchestrator',           label: 'raw transcript'     },
    { from: 'AIOrchestrator',     to: 'TranscriptionService',       label: 'AI summary'         },
    { from: 'LiveSessionService', to: 'AnalyticsEngine',            label: 'session metrics'    },
    { from: 'LiveSessionService', to: 'CourseEngine',               label: 'link to course'     },
    { from: 'LiveSessionService', to: 'CDN',                        label: 'recording upload'   },

    // Feature 2: District Dashboard
    { from: 'DistrictAnalyticsSvc', to: 'AnalyticsEngine',         label: 'aggregate data'     },
    { from: 'AnalyticsEngine',      to: 'DistrictAnalyticsSvc',    label: 'school metrics'     },
    { from: 'DistrictAnalyticsSvc', to: 'AIOrchestrator',          label: 'dropout prediction' },
    { from: 'DistrictAnalyticsSvc', to: 'DistrictDashboard',       label: 'render insights'    },
    { from: 'User',                 to: 'DistrictDashboard',        label: 'district admin view'},

    // Feature 3: Marketplace
    { from: 'User',               to: 'Marketplace',               label: 'browse / enroll'    },
    { from: 'CourseEngine',       to: 'Marketplace',               label: 'publish course'     },
    { from: 'Marketplace',        to: 'CourseEngine',              label: 'enroll → activate'  },
    { from: 'Marketplace',        to: 'RecommendationEngine',      label: 'student history'    },
    { from: 'RecommendationEngine', to: 'User',                    label: 'suggestions'        },
    { from: 'Marketplace',        to: 'AnalyticsEngine',           label: 'purchase/progress'  },

    // Feature 4: Offline Mode
    { from: 'User',               to: 'ServiceWorker',             label: 'install PWA'        },
    { from: 'ServiceWorker',      to: 'IndexedDB',                 label: 'cache assets/data'  },
    { from: 'IndexedDB',          to: 'OfflineSync',               label: 'upload queue'       },
    { from: 'OfflineSync',        to: 'AssessmentSystem',          label: 'sync quiz answers'  },
    { from: 'OfflineSync',        to: 'CourseEngine',              label: 'sync progress'      },
    { from: 'OfflineSync',        to: 'User',                      label: 'sync confirmation'  },
    { from: 'ServiceWorker',      to: 'CDN',                       label: 'cache course media' },

    // Feature 5: Proctoring
    { from: 'User',               to: 'ProctoringService',          label: 'start exam'         },
    { from: 'ProctoringService',  to: 'ExamIntegrityEngine',        label: 'behavior stream'    },
    { from: 'ExamIntegrityEngine', to: 'AIOrchestrator',            label: 'anomaly analysis'   },
    { from: 'AIOrchestrator',     to: 'ExamIntegrityEngine',        label: 'risk score'         },
    { from: 'ExamIntegrityEngine', to: 'ProctoringService',         label: 'flag / score'       },
    { from: 'ProctoringService',  to: 'AnalyticsEngine',            label: 'exam metrics'       },
    { from: 'ProctoringService',  to: 'AuditLog',                   label: 'tamper-proof log'   },
    { from: 'ProctoringService',  to: 'NotificationSvc',            label: 'alert teacher'      },

    // Shared data layer
    { from: 'CourseEngine',       to: 'PostgreSQL',                 label: 'read/write courses' },
    { from: 'AssessmentSystem',   to: 'PostgreSQL',                 label: 'read/write exams'   },
    { from: 'AnalyticsEngine',    to: 'PostgreSQL',                 label: 'aggregate metrics'  },
    { from: 'LiveSessionService', to: 'PostgreSQL',                 label: 'persist sessions'   },
    { from: 'Marketplace',        to: 'PostgreSQL',                 label: 'listings / txns'    },
    { from: 'OfflineSync',        to: 'PostgreSQL',                 label: 'sync log + data'    },
    { from: 'ProctoringService',  to: 'PostgreSQL',                 label: 'events + reports'   },
  ],
} as const;

export default SYSTEM_GRAPH;
