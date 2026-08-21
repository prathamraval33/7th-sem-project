// SuperAdmin mock data store — Phase 1 only (placeholder data, no real backend).
// Uses Zustand for reactive state so every action (add college, approve request,
// etc.) updates the UI live during review.
import { create } from "zustand";

// ---------- Seed Data ----------

const SEED_COLLEGES = [
  {
    id: "col-1",
    name: "Birla Vishvakarma Mahavidyalaya (BVM)",
    domain: "bvmengineering.ac.in",
    students: 1420,
    tpos: 3,
    drives: 48,
    applications: 950,
    status: "active",
    joinedAt: "2025-07-15T10:00:00Z",
    admin: { name: "Dr. Indrajit Patel", email: "admin@bvmengineering.ac.in" },
  },
  {
    id: "col-2",
    name: "Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT)",
    domain: "daiict.ac.in",
    students: 1180,
    tpos: 3,
    drives: 52,
    applications: 890,
    status: "active",
    joinedAt: "2025-09-02T08:30:00Z",
    admin: { name: "Prof. Amit Bhatt", email: "admin@daiict.ac.in" },
  },
  {
    id: "col-3",
    name: "Institute of Technology, Nirma University",
    domain: "nirmauni.ac.in",
    students: 1350,
    tpos: 4,
    drives: 45,
    applications: 820,
    status: "active",
    joinedAt: "2025-11-20T14:00:00Z",
    admin: { name: "Dr. Rajesh Patel", email: "admin@nirmauni.ac.in" },
  },
  {
    id: "col-4",
    name: "L.D. College of Engineering (LDCE Ahmedabad)",
    domain: "ldce.ac.in",
    students: 1650,
    tpos: 3,
    drives: 38,
    applications: 760,
    status: "active",
    joinedAt: "2026-01-10T09:15:00Z",
    admin: { name: "Prof. Meena Joshi", email: "admin@ldce.ac.in" },
  },
  {
    id: "col-5",
    name: "Pandit Deendayal Energy University (PDEU)",
    domain: "pdeu.ac.in",
    students: 1200,
    tpos: 3,
    drives: 40,
    applications: 710,
    status: "active",
    joinedAt: "2026-02-01T11:00:00Z",
    admin: { name: "Dr. Sunil Khedkar", email: "admin@pdeu.ac.in" },
  },
  {
    id: "col-6",
    name: "Sardar Vallabhbhai National Institute of Technology (SVNIT Surat)",
    domain: "svnit.ac.in",
    students: 1850,
    tpos: 5,
    drives: 62,
    applications: 1240,
    status: "active",
    joinedAt: "2026-03-05T11:45:00Z",
    admin: { name: "Dr. Priya Sharma", email: "admin@svnit.ac.in" },
  },
  {
    id: "col-7",
    name: "Sarvajanik College of Engineering and Technology (SCET Surat)",
    domain: "scet.ac.in",
    students: 650,
    tpos: 2,
    drives: 18,
    applications: 320,
    status: "suspended",
    joinedAt: "2026-04-12T14:00:00Z",
    admin: { name: "Dr. Anita Deshmukh", email: "admin@scet.ac.in" },
  },
];

const SEED_FEATURES = [
  { id: "feat-1", name: "Study Resources", description: "Curated study materials, past papers, and preparation guides for placement exams.", category: "Learning", targetRole: "Student" },
  { id: "feat-2", name: "Career Insights", description: "AI-powered career path recommendations and industry trend analysis.", category: "AI", targetRole: "Student" },
  { id: "feat-3", name: "Mock Interviews", description: "AI-driven mock interview practice with real-time feedback and scoring.", category: "AI", targetRole: "Student" },
  { id: "feat-4", name: "Resume Analyzer", description: "Automated resume scoring with actionable improvement suggestions.", category: "AI", targetRole: "Student" },
  { id: "feat-5", name: "Alumni Network", description: "Connect current students with alumni for mentorship and referrals.", category: "Networking", targetRole: "All Roles" },
  { id: "feat-6", name: "Instant Tests", description: "TPO-created timed assessments for aptitude and technical screening.", category: "Assessment", targetRole: "Student & TPO" },
  { id: "feat-7", name: "Company Research", description: "Detailed company profiles with interview experiences and salary data.", category: "Research", targetRole: "Student & TPO" },
];

const SEED_FEATURE_REQUESTS = [
  { id: "req-1", collegeId: "col-2", collegeName: "Dhirubhai Ambani Institute of Information and Communication Technology (DA-IICT)", featureId: "feat-2", featureName: "Career Insights", requestedAt: "2026-08-10T09:00:00Z", status: "pending", decidedAt: null },
  { id: "req-2", collegeId: "col-4", collegeName: "L.D. College of Engineering (LDCE Ahmedabad)", featureId: "feat-5", featureName: "Alumni Network", requestedAt: "2026-08-12T14:30:00Z", status: "pending", decidedAt: null },
  { id: "req-3", collegeId: "col-6", collegeName: "Sardar Vallabhbhai National Institute of Technology (SVNIT Surat)", featureId: "feat-7", featureName: "Company Research", requestedAt: "2026-08-15T11:00:00Z", status: "pending", decidedAt: null },
  { id: "req-4", collegeId: "col-1", collegeName: "Birla Vishvakarma Mahavidyalaya (BVM)", featureId: "feat-2", featureName: "Career Insights", requestedAt: "2026-07-20T08:00:00Z", status: "approved", decidedAt: "2026-07-22T10:00:00Z" },
  { id: "req-5", collegeId: "col-1", collegeName: "Birla Vishvakarma Mahavidyalaya (BVM)", featureId: "feat-5", featureName: "Alumni Network", requestedAt: "2026-06-15T12:00:00Z", status: "rejected", decidedAt: "2026-06-18T09:30:00Z" },
  { id: "req-6", collegeId: "col-6", collegeName: "Sardar Vallabhbhai National Institute of Technology (SVNIT Surat)", featureId: "feat-3", featureName: "Mock Interviews", requestedAt: "2026-07-05T10:00:00Z", status: "approved", decidedAt: "2026-07-07T16:00:00Z" },
];

const SEED_COLLEGE_FEATURES = {
  "col-1": ["feat-1", "feat-3", "feat-4", "feat-6", "feat-2"],
  "col-2": ["feat-1", "feat-3", "feat-4", "feat-6"],
  "col-3": ["feat-1", "feat-3", "feat-6"],
  "col-4": ["feat-1", "feat-3", "feat-4"],
  "col-5": ["feat-1", "feat-3", "feat-6"],
  "col-6": ["feat-1", "feat-3", "feat-4", "feat-6", "feat-3"],
  "col-7": ["feat-1"],
};

const SEED_ACTIVITY = [
  { id: "act-1", type: "college_added", text: "SVNIT Surat was added to the platform", time: "2026-03-05T11:45:00Z", color: "green" },
  { id: "act-2", type: "feature_requested", text: "DA-IICT requested Career Insights", time: "2026-08-10T09:00:00Z", color: "amber" },
  { id: "act-3", type: "feature_approved", text: "Career Insights approved for BVM Engineering College", time: "2026-07-22T10:00:00Z", color: "blue" },
  { id: "act-4", type: "college_suspended", text: "SCET Surat was suspended", time: "2026-08-01T16:30:00Z", color: "red" },
  { id: "act-5", type: "feature_requested", text: "LDCE Ahmedabad requested Alumni Network feature", time: "2026-08-12T14:30:00Z", color: "amber" },
  { id: "act-6", type: "feature_approved", text: "Mock Interviews approved for SVNIT Surat", time: "2026-07-07T16:00:00Z", color: "blue" },
  { id: "act-7", type: "feature_requested", text: "PDEU requested Company Research feature", time: "2026-08-15T11:00:00Z", color: "amber" },
];

const SEED_ANNOUNCEMENTS = [
  { id: "ann-1", text: "Scheduled maintenance on August 25th from 2 AM to 5 AM IST. All services will be temporarily unavailable.", sentAt: "2026-08-18T10:00:00Z" },
  { id: "ann-2", text: "New feature: Instant Tests module is now available for all colleges. Contact support for onboarding assistance.", sentAt: "2026-08-05T09:00:00Z" },
];

const SEED_AUDIT_LOG = [
  { id: "log-1", action: "College added", details: "Sardar Vallabhbhai National Institute of Technology (SVNIT)", timestamp: "2026-03-05T11:45:00Z" },
  { id: "log-2", action: "Feature approved", details: "Career Insights → Birla Vishvakarma Mahavidyalaya (BVM)", timestamp: "2026-07-22T10:00:00Z" },
  { id: "log-3", action: "Feature rejected", details: "Alumni Network → Birla Vishvakarma Mahavidyalaya (BVM)", timestamp: "2026-06-18T09:30:00Z" },
  { id: "log-4", action: "College suspended", details: "Sarvajanik College of Engineering and Technology (SCET)", timestamp: "2026-08-01T16:30:00Z" },
  { id: "log-5", action: "Feature approved", details: "Mock Interviews → SVNIT Surat", timestamp: "2026-07-07T16:00:00Z" },
  { id: "log-6", action: "Announcement sent", details: "Scheduled maintenance on August 25th…", timestamp: "2026-08-18T10:00:00Z" },
];

const SEED_COLLEGES_OVER_TIME = [
  { month: "Jul '25", count: 1 },
  { month: "Sep '25", count: 2 },
  { month: "Nov '25", count: 3 },
  { month: "Jan '26", count: 4 },
  { month: "Mar '26", count: 5 },
  { month: "May '26", count: 6 },
  { month: "Jul '26", count: 7 },
  { month: "Aug '26", count: 7 },
];

let nextCollegeNum = 8;
let nextReqNum = 7;
let nextActNum = 8;
let nextLogNum = 7;
let nextAnnNum = 3;
let nextFeatNum = 8;

export const useSuperAdminStore = create((set) => ({
  colleges: SEED_COLLEGES,
  features: SEED_FEATURES,
  featureRequests: SEED_FEATURE_REQUESTS,
  collegeFeatures: SEED_COLLEGE_FEATURES,
  activity: SEED_ACTIVITY,
  announcements: SEED_ANNOUNCEMENTS,
  auditLog: SEED_AUDIT_LOG,
  collegesOverTime: SEED_COLLEGES_OVER_TIME,
  toast: null,

  // Actions
  addCollege: ({ name, domain, adminName, adminEmail }) => {
    const id = `col-${nextCollegeNum++}`;
    const now = new Date().toISOString();
    const newCollege = {
      id,
      name,
      domain,
      students: 0,
      tpos: 0,
      drives: 0,
      applications: 0,
      status: "active",
      joinedAt: now,
      admin: { name: adminName, email: adminEmail },
    };
    set((s) => ({
      colleges: [newCollege, ...s.colleges],
      collegeFeatures: { ...s.collegeFeatures, [id]: [] },
      activity: [
        { id: `act-${nextActNum++}`, type: "college_added", text: `${name} was added to the platform`, time: now, color: "green" },
        ...s.activity,
      ],
      auditLog: [
        { id: `log-${nextLogNum++}`, action: "College added", details: name, timestamp: now },
        ...s.auditLog,
      ],
      toast: `${name} has been added successfully!`,
    }));
    setTimeout(() => set({ toast: null }), 4000);
  },

  toggleCollegeStatus: (collegeId) => {
    const now = new Date().toISOString();
    set((s) => {
      const college = s.colleges.find((c) => c.id === collegeId);
      if (!college) return s;
      const newStatus = college.status === "active" ? "suspended" : "active";
      const actionVerb = newStatus === "suspended" ? "suspended" : "reactivated";
      return {
        colleges: s.colleges.map((c) => (c.id === collegeId ? { ...c, status: newStatus } : c)),
        activity: [
          {
            id: `act-${nextActNum++}`,
            type: newStatus === "suspended" ? "college_suspended" : "college_added",
            text: `${college.name} was ${actionVerb}`,
            time: now,
            color: newStatus === "suspended" ? "red" : "green",
          },
          ...s.activity,
        ],
        auditLog: [
          { id: `log-${nextLogNum++}`, action: `College ${actionVerb}`, details: college.name, timestamp: now },
          ...s.auditLog,
        ],
        toast: `${college.name} has been ${actionVerb}.`,
      };
    });
    setTimeout(() => set({ toast: null }), 4000);
  },

  deleteCollege: (collegeId) => {
    const now = new Date().toISOString();
    set((s) => {
      const college = s.colleges.find((c) => c.id === collegeId);
      if (!college) return s;
      const { [collegeId]: _, ...remainingFeatures } = s.collegeFeatures;
      return {
        colleges: s.colleges.filter((c) => c.id !== collegeId),
        featureRequests: s.featureRequests.filter((r) => r.collegeId !== collegeId),
        collegeFeatures: remainingFeatures,
        activity: [
          {
            id: `act-${nextActNum++}`,
            type: "college_deleted",
            text: `${college.name} was removed from the platform`,
            time: now,
            color: "red",
          },
          ...s.activity,
        ],
        auditLog: [
          { id: `log-${nextLogNum++}`, action: "College deleted", details: college.name, timestamp: now },
          ...s.auditLog,
        ],
        toast: `${college.name} has been deleted.`,
      };
    });
    setTimeout(() => set({ toast: null }), 4000);
  },

  approveFeatureRequest: (requestId) => {
    const now = new Date().toISOString();
    set((s) => {
      const req = s.featureRequests.find((r) => r.id === requestId);
      if (!req) return s;
      const enabledIds = s.collegeFeatures[req.collegeId] || [];
      return {
        featureRequests: s.featureRequests.map((r) => (r.id === requestId ? { ...r, status: "approved", decidedAt: now } : r)),
        collegeFeatures: { ...s.collegeFeatures, [req.collegeId]: [...enabledIds, req.featureId] },
        activity: [
          { id: `act-${nextActNum++}`, type: "feature_approved", text: `${req.featureName} approved for ${req.collegeName}`, time: now, color: "blue" },
          ...s.activity,
        ],
        auditLog: [
          { id: `log-${nextLogNum++}`, action: "Feature approved", details: `${req.featureName} → ${req.collegeName}`, timestamp: now },
          ...s.auditLog,
        ],
        toast: `${req.featureName} approved for ${req.collegeName}.`,
      };
    });
    setTimeout(() => set({ toast: null }), 4000);
  },

  rejectFeatureRequest: (requestId) => {
    const now = new Date().toISOString();
    set((s) => {
      const req = s.featureRequests.find((r) => r.id === requestId);
      if (!req) return s;
      return {
        featureRequests: s.featureRequests.map((r) => (r.id === requestId ? { ...r, status: "rejected", decidedAt: now } : r)),
        activity: [
          { id: `act-${nextActNum++}`, type: "feature_rejected", text: `${req.featureName} rejected for ${req.collegeName}`, time: now, color: "red" },
          ...s.activity,
        ],
        auditLog: [
          { id: `log-${nextLogNum++}`, action: "Feature rejected", details: `${req.featureName} → ${req.collegeName}`, timestamp: now },
          ...s.auditLog,
        ],
        toast: `${req.featureName} rejected for ${req.collegeName}.`,
      };
    });
    setTimeout(() => set({ toast: null }), 4000);
  },

  addFeature: ({ name, description, category, targetRole }) => {
    const id = `feat-${nextFeatNum++}`;
    set((s) => ({
      features: [...s.features, { id, name, description, category, targetRole: targetRole || "Student" }],
      toast: `Feature "${name}" added to the catalog.`,
    }));
    setTimeout(() => set({ toast: null }), 4000);
  },

  deleteFeature: (featureId) => {
    set((s) => ({
      features: s.features.filter((f) => f.id !== featureId),
      toast: "Feature removed from catalog.",
    }));
    setTimeout(() => set({ toast: null }), 4000);
  },

  sendAnnouncement: (text) => {
    const now = new Date().toISOString();
    const id = `ann-${nextAnnNum++}`;
    set((s) => ({
      announcements: [{ id, text, sentAt: now }, ...s.announcements],
      auditLog: [
        { id: `log-${nextLogNum++}`, action: "Announcement sent", details: text.length > 60 ? text.slice(0, 60) + "…" : text, timestamp: now },
        ...s.auditLog,
      ],
      toast: "Announcement sent to all College Admins.",
    }));
    setTimeout(() => set({ toast: null }), 4000);
  },

  clearToast: () => set({ toast: null }),
}));
