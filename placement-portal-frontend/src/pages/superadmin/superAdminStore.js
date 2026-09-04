import { create } from "zustand";
import { superadminApi } from "../../api/superadmin.api";

const normalizeCollege = (row) => ({
  id: String(row.id),
  name: row.name,
  domain: row.domain,
  students: row.students ?? 0,
  tpos: row.tpos ?? 0,
  drives: row.drives ?? 0,
  applications: row.applications ?? 0,
  status: row.status,
  joinedAt: row.created_at ?? row.joinedAt ?? new Date().toISOString(),
  admin: {
    name: row.admin_name ?? "",
    email: row.admin_email ?? "",
  },
});

const normalizeFeature = (row) => ({
  id: String(row.id),
  code: row.code,
  name: row.name,
  description: row.description,
  category: row.category,
  targetRole: row.target_role ?? row.targetRole ?? "Student",
  price: row.price != null ? Number(row.price) : null,
  billingType: row.billing_type ?? row.billingType ?? "one_time",
  status: row.status ?? "active",
  createdAt: row.created_at ?? row.createdAt,
});

const normalizeFeatureCollegeStatus = (row) => ({
  collegeId: String(row.college_id),
  collegeName: row.college_name,
  requestId: row.request_id != null ? String(row.request_id) : null,
  status: row.status,
  date: row.date,
});

const normalizeFeatureRequest = (row) => ({
  id: String(row.id),
  collegeId: String(row.college_id),
  collegeName: row.college_name,
  featureId: String(row.feature_id),
  featureName: row.feature_name,
  status: row.status,
  requestedAt: row.requested_at,
  decidedAt: row.decided_at,
});

const normalizeAnnouncement = (row) => ({
  id: row.id,
  text: row.content,
  sentAt: row.created_at,
});

const normalizeAuditLog = (row) => ({
  id: row.id,
  action: row.action,
  details: row.details,
  performedBy: row.performed_by,
  performedByEmail: row.performed_by_email,
  timestamp: row.timestamp,
});

export const useSuperAdminStore = create((set, get) => ({
  colleges: [],
  features: [],
  featureRequests: [],
  collegeFeatures: {},
  featureCollegeStatus: {},
  activity: [],
  announcements: [],
  auditLog: [],
  collegesOverTime: [],
  dashboard: null,
  toast: null,

  hydrateSuperAdmin: async () => {
    try {
      const [dashboardRes, collegesRes, featuresRes, requestsRes, announcementsRes, auditLogRes] = await Promise.all([
        superadminApi.getDashboard(),
        superadminApi.getColleges(),
        superadminApi.getFeatures(),
        superadminApi.getFeatureRequests(),
        superadminApi.getAnnouncements(),
        superadminApi.getAuditLog(),
      ]);

      const colleges = (collegesRes.data || []).map(normalizeCollege);
      const features = (featuresRes.data || []).map(normalizeFeature);
      const featureRequests = (requestsRes.data || []).map(normalizeFeatureRequest);
      const announcements = (announcementsRes.data || []).map(normalizeAnnouncement);
      const auditLog = (auditLogRes.data || []).map(normalizeAuditLog);

      const collegeFeatures = {};
      for (const college of colleges) {
        collegeFeatures[college.id] = [];
      }
      for (const request of featureRequests) {
        if (request.status === "approved" || request.status === "active") {
          const collegeId = request.collegeId;
          const featureId = request.featureId;
          collegeFeatures[collegeId] = [...new Set([...(collegeFeatures[collegeId] || []), featureId])];
        }
      }

      set({
        colleges,
        features,
        featureRequests,
        announcements,
        auditLog,
        collegeFeatures,
        dashboard: dashboardRes.data,
        activity: auditLog.slice(0, 8).map((entry) => ({
          id: entry.id,
          type: entry.action.toLowerCase().replace(/\s+/g, "_"),
          text: `${entry.action}: ${entry.details || "Platform update"}`,
          time: entry.timestamp,
          color: entry.action.toLowerCase().includes("rejected") ? "red" : entry.action.toLowerCase().includes("approved") ? "blue" : entry.action.toLowerCase().includes("suspend") ? "red" : "green",
        })),
      });
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Failed to load SuperAdmin data." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  addCollege: async ({ name, domain, adminName, adminEmail, accessMethod }) => {
    try {
      const response = await superadminApi.createCollege({
        name,
        domain,
        admin_name: adminName,
        admin_email: adminEmail,
        admin_password: "Password@123",
        access_method: accessMethod || "invite",
      });
      const created = normalizeCollege(response.data);
      set((state) => ({
        colleges: [created, ...state.colleges],
        collegeFeatures: { ...state.collegeFeatures, [created.id]: [] },
        toast: `${name} was created and an OTP was sent to ${adminEmail}.`,
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to create college." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  deleteCollege: async (collegeId) => {
    const target = get().colleges.find((college) => college.id === collegeId);
    if (!target) return;
    try {
      await superadminApi.deleteCollege(collegeId);
      set((state) => {
        const { [collegeId]: _, ...collegeFeatures } = state.collegeFeatures;
        return {
          colleges: state.colleges.filter((college) => college.id !== collegeId),
          featureRequests: state.featureRequests.filter((request) => request.collegeId !== collegeId),
          collegeFeatures,
          toast: `${target.name} was deleted.`,
        };
      });
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to delete college." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  toggleCollegeStatus: async (collegeId) => {
    const target = get().colleges.find((college) => college.id === collegeId);
    if (!target) return;
    const nextStatus = target.status === "active" ? "suspended" : "active";
    try {
      const response = await superadminApi.updateCollegeStatus(collegeId, { status: nextStatus });
      set((state) => ({
        colleges: state.colleges.map((college) =>
          college.id === collegeId ? { ...college, status: nextStatus } : college
        ),
        toast: response.data?.message || `${target.name} status updated.`,
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to update college status." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  approveFeatureRequest: async (requestId) => {
    try {
      const response = await superadminApi.approveFeatureRequest(requestId);
      const newStatus = response.data?.status || "active";
      const request = get().featureRequests.find((item) => item.id === requestId);
      set((state) => ({
        featureRequests: state.featureRequests.map((item) =>
          item.id === requestId ? { ...item, status: newStatus, decidedAt: new Date().toISOString() } : item
        ),
        collegeFeatures: (newStatus === "active" && request) ? {
          ...state.collegeFeatures,
          [request.collegeId]: [...new Set([...(state.collegeFeatures[request.collegeId] || []), request.featureId])],
        } : state.collegeFeatures,
        toast: response.data?.message || `${request?.featureName || "Feature"} approved.`,
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to approve feature request." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  rejectFeatureRequest: async (requestId) => {
    try {
      const response = await superadminApi.rejectFeatureRequest(requestId);
      const request = get().featureRequests.find((item) => item.id === requestId);
      set((state) => ({
        featureRequests: state.featureRequests.map((item) =>
          item.id === requestId ? { ...item, status: "rejected", decidedAt: new Date().toISOString() } : item
        ),
        toast: response.data?.message || `${request.featureName} rejected for ${request.collegeName}.`,
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to reject feature request." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  addFeature: async ({ name, description, category, targetRole, price, billingType, status }) => {
    try {
      const response = await superadminApi.createFeature({
        code: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "feature",
        name,
        description,
        category: category || "General",
        target_role: targetRole || "Student",
        price: price ? Number(price) : null,
        billing_type: billingType || "one_time",
        status: status || "active",
      });
      const created = normalizeFeature(response.data);
      set((state) => ({
        features: [created, ...state.features],
        toast: `Feature "${name}" added to the catalog.`,
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to create feature." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  updateFeature: async (featureId, { name, description, category, targetRole, price, billingType, status }) => {
    try {
      const response = await superadminApi.updateFeature(featureId, {
        name,
        description,
        category: category || "General",
        target_role: targetRole || "Student",
        price: price ? Number(price) : null,
        billing_type: billingType || "one_time",
        status: status || "active",
      });
      const updated = normalizeFeature(response.data);
      set((state) => ({
        features: state.features.map((feature) => (feature.id === featureId ? updated : feature)),
        toast: `Feature "${updated.name}" updated.`,
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to update feature." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  deleteFeature: async (featureId) => {
    try {
      await superadminApi.deleteFeature(featureId);
      set((state) => ({
        features: state.features.filter((feature) => feature.id !== featureId),
        toast: "Feature removed from catalog.",
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to delete feature." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  fetchFeatureCollegeStatus: async (featureId) => {
    try {
      const response = await superadminApi.getFeatureCollegeStatus(featureId);
      const rows = (response.data || []).map(normalizeFeatureCollegeStatus);
      set((state) => ({
        featureCollegeStatus: { ...state.featureCollegeStatus, [featureId]: rows },
      }));
      return rows;
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to load college status for this feature." });
      setTimeout(() => set({ toast: null }), 4000);
      return [];
    }
  },

  grantFeatureToCollege: async (featureId, collegeId) => {
    try {
      const response = await superadminApi.grantFeatureToCollege(featureId, collegeId);
      await get().fetchFeatureCollegeStatus(featureId);
      set((state) => ({
        collegeFeatures: {
          ...state.collegeFeatures,
          [collegeId]: [...new Set([...(state.collegeFeatures[collegeId] || []), featureId])],
        },
        toast: response.data?.message || "Feature granted to college.",
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to grant this feature." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  revokeFeatureFromCollege: async (featureId, collegeId) => {
    try {
      const response = await superadminApi.revokeFeatureFromCollege(featureId, collegeId);
      await get().fetchFeatureCollegeStatus(featureId);
      set((state) => ({
        collegeFeatures: {
          ...state.collegeFeatures,
          [collegeId]: (state.collegeFeatures[collegeId] || []).filter((id) => id !== featureId),
        },
        toast: response.data?.message || "Feature revoked from college.",
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to revoke this feature." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  sendAnnouncement: async (text) => {
    try {
      const response = await superadminApi.createAnnouncement({ content: text });
      const created = normalizeAnnouncement(response.data);
      set((state) => ({
        announcements: [created, ...state.announcements],
        auditLog: [normalizeAuditLog({
          id: response.data.id,
          action: "Announcement sent",
          details: text,
          performed_by: response.data.created_by,
          performed_by_email: null,
          timestamp: response.data.created_at,
        }), ...state.auditLog],
        toast: "Announcement sent to all College Admins.",
      }));
      setTimeout(() => set({ toast: null }), 4000);
    } catch (error) {
      set({ toast: error?.response?.data?.detail || "Unable to send announcement." });
      setTimeout(() => set({ toast: null }), 4000);
    }
  },

  clearToast: () => set({ toast: null }),
}));
