// Shared, app-wide constants (role identifiers, storage keys). Kept minimal —
// this is Phase 5 foundation, not feature-specific logic.

export const ROLES = Object.freeze({
  STUDENT: "student",
  TPO: "tpo",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
});

export const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: "placement_portal_access_token",
  REFRESH_TOKEN: "placement_portal_refresh_token",
});
