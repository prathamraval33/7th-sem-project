import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import { branchesApi } from "../../api/branches.api";
import { curriculumApi } from "../../api/curriculum.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/common/StatCard";
import Card from "../../components/ui/Card";
import SubscriptionBannerCard from "../../components/admin/SubscriptionBannerCard";
import { showConfirm, showSuccess, showError, showToast } from "../../utils/swal";
import { getAccessToken } from "../../utils/tokenStorage";
import {
  Building2,
  Globe,
  Users,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Calendar,
  Briefcase,
  FileCheck,
  FileText,
  Trash2,
  Upload,
  ChevronDown,
  ChevronUp,
  Plus,
  ExternalLink,
  GraduationCap,
  Layers,
  UploadCloud,
  BookOpen,
  Sparkles,
  Clock,
  CreditCard,
  UserCheck,
  Phone,
} from "lucide-react";
import { format } from "date-fns";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: ?tab=profile (default), ?tab=branches, ?tab=fees
  const activeTab = searchParams.get("tab") || "profile";
  const handleTabChange = (tabKey) => {
    setSearchParams({ tab: tabKey });
  };

  // --- College Info & Domain State ---
  const [domainInput, setDomainInput] = useState("");
  const [isEditingDomain, setIsEditingDomain] = useState(false);

  // --- College Profile & Administrative Contact State ---
  const [collegeNameInput, setCollegeNameInput] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [contactMobileInput, setContactMobileInput] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const contactSectionRef = React.useRef(null);
  const focusParam = searchParams.get("focus");

  // --- Academic Branches State ---
  const [showBranchModal, setShowBranchModal] = useState(false);

  // --- Curriculum Setup State ---
  const [selectedCurriculumFile, setSelectedCurriculumFile] = useState(null);
  const [draftData, setDraftData] = useState(null);
  const [activeCurriculumBranchIdx, setActiveCurriculumBranchIdx] = useState(0);

  // --- Multi-Template Fee State ---
  const [templateFile, setTemplateFile] = useState(null);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [expandedOcrId, setExpandedOcrId] = useState(null);

  // ==========================================
  // QUERIES
  // ==========================================
  const { data: college, isLoading: isCollegeLoading, isError: isCollegeError } = useQuery({
    queryKey: ["adminCollegeInfo"],
    queryFn: () => adminApi.getCollegeInfo().then((res) => res.data),
  });

  React.useEffect(() => {
    if (college) {
      if (!isEditingDomain) {
        setDomainInput(college.domain || "");
      }
      if (!isEditingProfile) {
        setCollegeNameInput(college.name || "");
        setContactNameInput(college.contact_name || "");
        setContactMobileInput(college.contact_mobile || "");
      }
    }
  }, [college, isEditingDomain, isEditingProfile]);

  React.useEffect(() => {
    if (focusParam === "contact" || focusParam === "profile") {
      setTimeout(() => {
        if (contactSectionRef.current) {
          contactSectionRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);
    }
  }, [focusParam, activeTab]);

  const { data: branches = [], isLoading: isBranchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.getBranches().then((res) => res.data),
  });

  const { data: latestUpload, isLoading: isCurriculumLoading } = useQuery({
    queryKey: ["latestCurriculumUpload"],
    queryFn: async () => {
      const res = await curriculumApi.getLatestUpload();
      if (res.data && res.data.raw_extracted_data && !draftData) {
        setDraftData(res.data.raw_extracted_data);
      }
      return res.data;
    },
  });

  const { data: activeSubjects = [] } = useQuery({
    queryKey: ["curriculumSubjects"],
    queryFn: () => curriculumApi.getSubjects().then((res) => res.data),
  });

  const { data: feeTemplates = [], isLoading: isTemplatesLoading } = useQuery({
    queryKey: ["adminFeeTemplates"],
    queryFn: () => adminApi.getFeeTemplates().then((res) => res.data),
  });

  // ==========================================
  // MUTATIONS: DOMAIN
  // ==========================================
  const updateDomainMutation = useMutation({
    mutationFn: (newDomain) => adminApi.updateCollegeDomain(newDomain),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["adminCollegeInfo"]);
      setIsEditingDomain(false);
      showSuccess("Domain Updated", `Institution email domain successfully updated to "${res.data.domain}".`);
    },
    onError: (err) => {
      showError("Domain Update Failed", err.response?.data?.detail || "Could not update institution domain.");
    },
  });

  const handleDomainSubmit = async (e) => {
    e.preventDefault();
    const cleanDomain = domainInput.trim().toLowerCase();
    if (!cleanDomain || cleanDomain.length < 3 || !cleanDomain.includes(".")) {
      showError("Invalid Domain", "Please provide a valid domain name (e.g., college.edu or bvmengineering.ac.in).");
      return;
    }

    const confirmed = await showConfirm({
      title: "Update Institution Domain?",
      text: `Changing the allowed domain to "${cleanDomain}" will immediately affect student signups. Only students with matching email addresses can register.`,
      confirmButtonText: "Yes, update domain",
    });

    if (confirmed) {
      updateDomainMutation.mutate(cleanDomain);
    }
  };

  // ==========================================
  // MUTATIONS: PROFILE & CONTACT DETAILS
  // ==========================================
  const updateProfileMutation = useMutation({
    mutationFn: (payload) => adminApi.updateCollegeProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminCollegeInfo"]);
      queryClient.invalidateQueries(["collegeSetupChecklist"]);
      setIsEditingProfile(false);
      showSuccess(
        "Profile Saved",
        "Institution details and primary administrative contact updated successfully."
      );
    },
    onError: (err) => {
      showError("Profile Update Failed", err.response?.data?.detail || "Could not update institution profile.");
    },
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!collegeNameInput.trim()) {
      showError("Validation Error", "Institution name is required.");
      return;
    }
    if (!contactNameInput.trim()) {
      showError(
        "Contact Person Required",
        "Please enter the primary administrative contact person name to complete your college profile."
      );
      return;
    }
    updateProfileMutation.mutate({
      name: collegeNameInput.trim(),
      contact_name: contactNameInput.trim(),
      contact_mobile: contactMobileInput.trim() || null,
    });
  };

  // ==========================================
  // MUTATIONS: BRANCHES
  // ==========================================
  const createBranchMutation = useMutation({
    mutationFn: (newBranch) => branchesApi.createBranch(newBranch),
    onSuccess: () => {
      queryClient.invalidateQueries(["branches"]);
      setShowBranchModal(false);
      showToast("Academic branch added successfully");
    },
    onError: (err) => {
      showError("Add Branch Failed", err.response?.data?.detail || "Failed to add branch.");
    },
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (branchId) => branchesApi.deleteBranch(branchId),
    onSuccess: () => {
      queryClient.invalidateQueries(["branches"]);
      showToast("Branch deactivated");
    },
    onError: (err) => {
      showError("Action Failed", err.response?.data?.detail || "Failed to delete branch.");
    },
  });

  const handleCreateBranch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    createBranchMutation.mutate({
      code: formData.get("code").toUpperCase().trim(),
      name: formData.get("name").trim(),
    });
  };

  const handleDeleteBranch = async (branch) => {
    const confirmed = await showConfirm({
      title: "Deactivate Branch?",
      text: `Are you sure you want to deactivate branch ${branch.code} (${branch.name})?`,
      confirmButtonText: "Yes, deactivate",
      confirmButtonColor: "#dc2626",
    });
    if (confirmed) {
      deleteBranchMutation.mutate(branch.id);
    }
  };

  // ==========================================
  // MUTATIONS: CURRICULUM
  // ==========================================
  const uploadCurriculumMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append("file", file);
      return curriculumApi.uploadCurriculum(fd);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(["latestCurriculumUpload"]);
      setSelectedCurriculumFile(null);
      if (res.data.raw_extracted_data) {
        setDraftData(res.data.raw_extracted_data);
      }
      showSuccess(
        "Extraction Complete",
        "AI has parsed the syllabus structure. Review and make any needed adjustments below before confirming."
      );
    },
    onError: (err) => {
      showError("Curriculum Upload Failed", err.response?.data?.detail || "Could not parse syllabus PDF.");
    },
  });

  const confirmCurriculumMutation = useMutation({
    mutationFn: (payload) => curriculumApi.confirmCurriculum(latestUpload.id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["latestCurriculumUpload"]);
      queryClient.invalidateQueries(["curriculumSubjects"]);
      queryClient.invalidateQueries(["curriculumBranches"]);
      showSuccess("Curriculum Confirmed", res.data.message);
    },
    onError: (err) => {
      showError("Confirmation Failed", err.response?.data?.detail || "Could not confirm curriculum structure.");
    },
  });

  const handleCurriculumFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        showError("Invalid File", "Only PDF curriculum files are supported.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        showError("File Too Large", "Maximum syllabus file size is 15MB.");
        return;
      }
      setSelectedCurriculumFile(file);
    }
  };

  const handleCurriculumUploadSubmit = (e) => {
    e.preventDefault();
    if (!selectedCurriculumFile) return;
    uploadCurriculumMutation.mutate(selectedCurriculumFile);
  };

  const handleAddCurriculumBranch = () => {
    const name = prompt("Enter Branch Name (e.g. Information Technology, Mechanical Engineering):");
    if (!name || !name.trim()) return;
    const newBranches = [...(draftData?.branches || [])];
    newBranches.push({
      name: name.trim(),
      semesters: [
        { number: 1, subjects: [] },
        { number: 2, subjects: [] },
      ],
    });
    setDraftData({ branches: newBranches });
    setActiveCurriculumBranchIdx(newBranches.length - 1);
  };

  const handleRemoveCurriculumBranch = (bIdx) => {
    const newBranches = [...(draftData?.branches || [])];
    newBranches.splice(bIdx, 1);
    setDraftData({ branches: newBranches });
    if (activeCurriculumBranchIdx >= newBranches.length) {
      setActiveCurriculumBranchIdx(Math.max(0, newBranches.length - 1));
    }
  };

  const handleAddSemester = (bIdx) => {
    const branch = draftData.branches[bIdx];
    const maxSem = branch.semesters.reduce((m, s) => Math.max(m, s.number), 0);
    const newBranches = [...draftData.branches];
    newBranches[bIdx].semesters.push({ number: maxSem + 1, subjects: [] });
    setDraftData({ branches: newBranches });
  };

  const handleAddSubject = (bIdx, sIdx) => {
    const name = prompt("Enter Subject Name (e.g. Database Management Systems):");
    if (!name || !name.trim()) return;
    const newBranches = [...draftData.branches];
    newBranches[bIdx].semesters[sIdx].subjects.push(name.trim());
    setDraftData({ branches: newBranches });
  };

  const handleRemoveSubject = (bIdx, sIdx, subjIdx) => {
    const newBranches = [...draftData.branches];
    newBranches[bIdx].semesters[sIdx].subjects.splice(subjIdx, 1);
    setDraftData({ branches: newBranches });
  };

  const handleConfirmCurriculumSubmit = async () => {
    if (!draftData || !draftData.branches || draftData.branches.length === 0) {
      showError("Empty Curriculum", "Curriculum must contain at least one branch.");
      return;
    }

    const confirmed = await showConfirm({
      title: "Confirm Curriculum Structure?",
      text: "This will establish the official subject catalog for your college. Any previous curriculum data will be replaced.",
      confirmButtonText: "Yes, confirm curriculum",
    });

    if (confirmed) {
      confirmCurriculumMutation.mutate(draftData);
    }
  };

  // ==========================================
  // MUTATIONS: FEE TEMPLATES
  // ==========================================
  const uploadTemplateMutation = useMutation({
    mutationFn: ({ file, templateName }) => {
      const fd = new FormData();
      fd.append("file", file);
      if (templateName && templateName.trim()) {
        fd.append("template_name", templateName.trim());
      }
      return adminApi.uploadFeeTemplate(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminFeeTemplates"]);
      setTemplateFile(null);
      setTemplateNameInput("");
      setIsAddingTemplate(false);
      showSuccess("Sample Uploaded", "Reference fee receipt uploaded and OCR text extracted successfully.");
    },
    onError: (err) => {
      showError("Upload Failed", err.response?.data?.detail || "Could not process fee receipt template.");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (templateId) => adminApi.toggleFeeTemplateActive(templateId),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["adminFeeTemplates"]);
      const statusText = res.data.is_active ? "activated" : "disabled";
      showSuccess("Status Updated", `Template has been ${statusText}.`);
    },
    onError: (err) => {
      showError("Update Failed", err.response?.data?.detail || "Could not update template status.");
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => adminApi.deleteFeeTemplateById(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminFeeTemplates"]);
      showSuccess("Template Removed", "Reference fee receipt template has been permanently deleted.");
    },
    onError: (err) => {
      showError("Removal Failed", err.response?.data?.detail || "Could not remove template.");
    },
  });

  if (isCollegeLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isCollegeError || !college) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center max-w-2xl mx-auto mt-8">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
        <h3 className="text-lg font-bold text-foreground">Institution Information Unavailable</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Unable to load institution details. Please verify your administrative permissions.
        </p>
      </div>
    );
  }

  const isCurriculumConfirmed = latestUpload?.extraction_status === "confirmed";
  const curriculumBranches = draftData?.branches || [];
  const currentCurriculumBranch = curriculumBranches[activeCurriculumBranchIdx] || null;

  return (
    <div className="space-y-5 w-full pb-10">
      {/* ── Header Banner & Tab Switcher ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent font-bold">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">
                {college.name}
              </h1>
              <Badge variant={college.status === "active" ? "success" : "destructive"}>
                {college.status}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Institution Governance, Academic Branches, Curriculum & Fee Verification Settings
            </p>
          </div>
        </div>

        {/* 3 Tabs */}
        <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 shadow-inner self-start md:self-auto flex-wrap">
          <button
            onClick={() => handleTabChange("profile")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "profile"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Building2 size={15} className={activeTab === "profile" ? "text-accent" : "text-slate-400"} />
            Profile & Domain
          </button>
          <button
            onClick={() => handleTabChange("branches")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "branches"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <GraduationCap size={15} className={activeTab === "branches" ? "text-accent" : "text-slate-400"} />
            Branches & Curriculum
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {branches.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("fees")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "fees"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <FileCheck size={15} className={activeTab === "fees" ? "text-accent" : "text-slate-400"} />
            Fee OCR Templates
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {feeTemplates.filter((t) => t.is_active).length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange("subscription")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "subscription"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            <Sparkles size={15} className={activeTab === "subscription" ? "text-accent" : "text-slate-400"} />
            License & Subscription
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                college?.is_subscription_expired
                  ? "bg-rose-100 text-rose-700 font-bold"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {college?.is_subscription_expired ? "Expired" : "Active"}
            </span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: INSTITUTION PROFILE & DOMAIN */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Enrolled Students"
              value={college.students?.toString() || "0"}
              icon={Users}
              accent="brand"
            />
            <StatCard
              label="Placement Officers"
              value={college.tpos?.toString() || "0"}
              icon={ShieldCheck}
              accent="accent"
            />
            <StatCard
              label="Placement Drives"
              value={college.drives?.toString() || "0"}
              icon={Briefcase}
              accent="success"
            />
            <StatCard
              label="Drive Applications"
              value={college.applications?.toString() || "0"}
              icon={FileCheck}
              accent="warning"
            />
          </div>

          {/* Missing Contact Attention Alert */}
          {!college.contact_name && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-900 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold">Action Required: Complete Basic College Profile</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Primary administrative contact details are currently missing. Please enter the <strong>Contact Person Name</strong> below and save to satisfy the <strong>Basic College Profile</strong> requirement on your setup checklist.
                </p>
              </div>
            </div>
          )}

          {/* Institutional Profile & Administrative Contact Card */}
          <div
            ref={contactSectionRef}
            className={`rounded-xl border bg-card p-6 shadow-sm transition-all ${
              focusParam === "contact" || focusParam === "profile"
                ? "ring-2 ring-indigo-500 border-indigo-400"
                : !college.contact_name
                ? "border-amber-300"
                : "border-border"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 font-heading">
                    Institutional Profile & Administrative Contact
                  </h2>
                  <p className="text-xs text-slate-500">
                    Official institutional identity and designated administrative contact details.
                  </p>
                </div>
              </div>
              <div>
                {college.contact_name ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Details Confirmed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Setup Required
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* College Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Institution Official Name <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={collegeNameInput}
                    onChange={(e) => {
                      setIsEditingProfile(true);
                      setCollegeNameInput(e.target.value);
                    }}
                    placeholder="e.g. Birla Vishvakarma Mahavidyalaya (BVM)"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    The legal or registered name of the educational institution.
                  </p>
                </div>

                {/* Primary Contact Person Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>Primary Contact Person Name <span className="text-rose-500">*</span></span>
                    {!college.contact_name && (
                      <span className="text-[10px] text-amber-600 font-bold uppercase">Missing</span>
                    )}
                  </label>
                  <Input
                    type="text"
                    value={contactNameInput}
                    onChange={(e) => {
                      setIsEditingProfile(true);
                      setContactNameInput(e.target.value);
                    }}
                    placeholder="e.g. Dr. Indrajit Patel / Admin Name"
                    className={!contactNameInput.trim() ? "border-amber-400 focus:border-amber-500 bg-amber-50/20" : ""}
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Principal, Dean, or Placement Director name responsible for this portal.
                  </p>
                </div>

                {/* Primary Contact Mobile */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Administrative Phone / Mobile
                  </label>
                  <Input
                    type="text"
                    value={contactMobileInput}
                    onChange={(e) => {
                      setIsEditingProfile(true);
                      setContactMobileInput(e.target.value);
                    }}
                    placeholder="e.g. +91 9876543210"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Official contact number for critical platform notifications and audits.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="submit"
                  isLoading={updateProfileMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
                >
                  <UserCheck className="w-4 h-4" /> Save Institutional Profile
                </Button>
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setCollegeNameInput(college.name || "");
                      setContactNameInput(college.contact_name || "");
                      setContactMobileInput(college.contact_mobile || "");
                      setIsEditingProfile(false);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Domain Settings Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="h-5 w-5 text-accent" />
              <h2 className="text-base font-bold text-slate-900 font-heading">
                Allowed Student Email Domain
              </h2>
            </div>

            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs sm:text-sm text-blue-900 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-semibold">Automatic student campus provisioning:</p>
                <p>
                  When students sign up on the portal, their email domain (the part after <strong>@</strong>)
                  is matched against this registered domain. If it matches, their account is automatically
                  bound to <strong>{college.name}</strong> without requiring manual approval.
                </p>
              </div>
            </div>

            <form onSubmit={handleDomainSubmit} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Official Campus Email Domain
                </label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    value={isEditingDomain ? domainInput : college.domain || ""}
                    onChange={(e) => {
                      setIsEditingDomain(true);
                      setDomainInput(e.target.value);
                    }}
                    placeholder="e.g. bvmengineering.ac.in"
                    className="font-mono text-sm"
                  />
                  <Button
                    type="submit"
                    isLoading={updateDomainMutation.isPending}
                    disabled={
                      !isEditingDomain ||
                      domainInput.trim().toLowerCase() === (college.domain || "").toLowerCase()
                    }
                  >
                    Save Domain
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  Example: <code className="bg-slate-100 px-1 py-0.5 rounded">bvmengineering.ac.in</code>
                </p>
              </div>
            </form>
          </div>

          {/* Institution Metadata Card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 font-heading mb-4">
              Institution Profile & Multi-Tenant Details
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <dt className="text-xs text-slate-400 font-medium uppercase tracking-wider">Institution ID</dt>
                <dd className="font-mono text-slate-900 font-semibold mt-1">#{college.id}</dd>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <dt className="text-xs text-slate-400 font-medium uppercase tracking-wider">Institution Name</dt>
                <dd className="text-slate-900 font-semibold mt-1">{college.name}</dd>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <dt className="text-xs text-slate-400 font-medium uppercase tracking-wider">Registration Date</dt>
                <dd className="text-slate-900 font-semibold mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {college.created_at ? format(new Date(college.created_at), "PPP") : "N/A"}
                </dd>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60">
                <dt className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tenant Isolation</dt>
                <dd className="text-emerald-600 font-semibold mt-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Scoped Tenant Security Active
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: ACADEMIC BRANCHES & CURRICULUM */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "branches" && (
        <div className="space-y-8">
          {/* Section 1: Academic Branches Management */}
          <div className="bg-white rounded-xl shadow-sm border border-border p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <GraduationCap className="text-accent" size={18} /> Academic Branches Directory
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standardized departments configured for student profiles, eligibility criteria, and drive filters.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="brand">{branches.length} Active Branches</Badge>
                <Button size="sm" onClick={() => setShowBranchModal(true)} className="flex items-center gap-1.5 text-xs">
                  <Plus size={14} /> Add Academic Branch
                </Button>
              </div>
            </div>

            {branches.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <GraduationCap size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm">No academic branches defined yet. Add your first branch above.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 pt-2">
                {branches.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-800 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <span className="font-bold text-accent">{b.code}</span>
                    <span className="text-slate-500 font-normal">({b.name})</span>
                    <button
                      onClick={() => handleDeleteBranch(b)}
                      className="text-slate-400 hover:text-red-500 ml-1.5 transition-colors text-lg leading-none"
                      title="Deactivate Branch"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Curriculum & Syllabus AI Ingestion */}
          <div className="bg-white rounded-xl shadow-sm border border-border p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <BookOpen className="text-accent" size={18} /> Institutional Curriculum & Subject Catalog
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload syllabus PDF. The AI engine automatically parses branches, semesters, and subjects.
                </p>
              </div>
              {isCurriculumConfirmed && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 size={12} /> Confirmed ({activeSubjects.length} Subjects)
                </Badge>
              )}
            </div>

            {/* Upload PDF Form */}
            <form onSubmit={handleCurriculumUploadSubmit} className="space-y-4">
              <div className="p-5 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Upload Curriculum / Syllabus Document</p>
                    <p className="text-xs text-slate-500">Supported formats: PDF (up to 15MB)</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleCurriculumFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer border border-border rounded-lg bg-white"
                  />
                  <Button
                    type="submit"
                    disabled={!selectedCurriculumFile || uploadCurriculumMutation.isPending}
                    isLoading={uploadCurriculumMutation.isPending}
                    className="shrink-0 text-xs py-2"
                  >
                    {uploadCurriculumMutation.isPending ? "Parsing AI..." : "Parse Syllabus"}
                  </Button>
                </div>
              </div>
            </form>

            {/* Review Draft Section */}
            {draftData && curriculumBranches.length > 0 && (
              <div className="rounded-xl border border-border bg-slate-50/50 p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Draft Curriculum Review & Confirmation
                    </h3>
                    <p className="text-xs text-slate-500">
                      Edit structure before committing to the official institution catalog.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleAddCurriculumBranch} className="text-xs">
                      <Plus size={12} className="mr-1" /> Add Branch
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmCurriculumSubmit}
                      isLoading={confirmCurriculumMutation.isPending}
                      className="text-xs"
                    >
                      <CheckCircle2 size={12} className="mr-1" /> Confirm Structure
                    </Button>
                  </div>
                </div>

                {/* Branch Nav Pills */}
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
                  {curriculumBranches.map((b, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveCurriculumBranchIdx(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                        activeCurriculumBranchIdx === idx
                          ? "bg-accent text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-border"
                      }`}
                    >
                      <Layers size={12} />
                      {b.name}
                    </button>
                  ))}
                </div>

                {/* Active Branch Semesters */}
                {currentCurriculumBranch && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-border">
                      <p className="text-xs font-bold text-slate-800">
                        {currentCurriculumBranch.name} —{" "}
                        <span className="font-normal text-slate-500">
                          {currentCurriculumBranch.semesters.reduce((acc, s) => acc + s.subjects.length, 0)} subjects across{" "}
                          {currentCurriculumBranch.semesters.length} semesters
                        </span>
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSemester(activeCurriculumBranchIdx)}
                          className="text-[11px] py-1 h-7"
                        >
                          <Plus size={11} className="mr-1" /> Add Semester
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveCurriculumBranch(activeCurriculumBranchIdx)}
                          disabled={curriculumBranches.length <= 1}
                          className="text-[11px] py-1 h-7"
                        >
                          <Trash2 size={11} className="mr-1" /> Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentCurriculumBranch.semesters.map((sem, sIdx) => (
                        <div key={sIdx} className="rounded-lg border border-border bg-white p-3 space-y-2">
                          <div className="flex items-center justify-between border-b border-border/80 pb-1.5">
                            <span className="font-bold text-xs text-slate-800">Semester {sem.number}</span>
                            <button
                              onClick={() => handleAddSubject(activeCurriculumBranchIdx, sIdx)}
                              className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
                            >
                              <Plus size={11} /> Add Subject
                            </button>
                          </div>

                          {sem.subjects.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic py-1">No subjects listed.</p>
                          ) : (
                            <ul className="space-y-1">
                              {sem.subjects.map((subj, subjIdx) => (
                                <li
                                  key={subjIdx}
                                  className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-slate-50 text-xs text-slate-700"
                                >
                                  <span className="truncate font-medium">{subj}</span>
                                  <button
                                    onClick={() => handleRemoveSubject(activeCurriculumBranchIdx, sIdx, subjIdx)}
                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                  >
                                    &times;
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: FEE VERIFICATION & OCR TEMPLATES */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "fees" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-heading">
                  Fee Receipt Verification Reference Templates
                </h2>
                <p className="text-xs text-slate-500">
                  Institutional reference samples for AI structural matching on student fee receipts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {feeTemplates.filter((t) => t.is_active).length} Active Template(s)
              </Badge>
              {!isAddingTemplate && (
                <Button size="sm" onClick={() => setIsAddingTemplate(true)} className="text-xs">
                  <Plus size={14} className="mr-1" /> Add Reference Template
                </Button>
              )}
            </div>
          </div>

          {/* Add Template Form */}
          {isAddingTemplate && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Upload size={14} className="text-accent" /> Upload Reference Receipt
                </h3>
                <button
                  onClick={() => setIsAddingTemplate(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Template Name / Category
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. B.Tech Tuition Fee Receipt"
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sample Document (PDF, PNG, JPG — Max 5MB)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer border border-border rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setIsAddingTemplate(false)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!templateFile) {
                      showError("No file chosen", "Please select a sample fee receipt file.");
                      return;
                    }
                    uploadTemplateMutation.mutate({
                      file: templateFile,
                      templateName: templateNameInput,
                    });
                  }}
                  disabled={!templateFile}
                  isLoading={uploadTemplateMutation.isPending}
                  className="text-xs"
                >
                  <Upload size={13} className="mr-1" /> Upload & Extract OCR
                </Button>
              </div>
            </div>
          )}

          {/* Templates Roster */}
          {feeTemplates.length === 0 && !isAddingTemplate ? (
            <div className="py-12 text-center text-slate-400">
              <FileCheck size={36} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm">No reference receipt templates uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeTemplates.map((template) => {
                const isExpanded = expandedOcrId === template.id;
                const fileUrl = `http://localhost:8000/uploads/${template.file_path
                  .replace("uploads/", "")
                  .replace("uploads\\", "")
                  .replace("\\", "/")}?token=${getAccessToken() || ""}`;

                return (
                  <div
                    key={template.id}
                    className={`rounded-xl border p-4 transition-all space-y-2 ${
                      template.is_active ? "bg-white border-border shadow-xs" : "bg-slate-50 border-slate-200 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-700 shrink-0">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900 text-sm">
                              {template.template_name || template.original_filename || `Template #${template.id}`}
                            </p>
                            <Badge variant={template.is_active ? "success" : "outline"} className="text-[10px]">
                              {template.is_active ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Uploaded: {template.created_at ? format(new Date(template.created_at), "PPP") : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white border border-border rounded-lg hover:bg-slate-50 text-slate-700 shadow-2xs"
                        >
                          <ExternalLink size={12} /> View File
                        </a>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate(template.id)}
                          isLoading={
                            toggleActiveMutation.isPending &&
                            toggleActiveMutation.variables === template.id
                          }
                          className="text-xs"
                        >
                          {template.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={async () => {
                            const confirmed = await showConfirm({
                              title: "Delete Template?",
                              text: `Delete "${template.template_name || template.original_filename}"?`,
                              confirmButtonText: "Yes, delete",
                              confirmButtonColor: "#dc2626",
                            });
                            if (confirmed) {
                              deleteTemplateMutation.mutate(template.id);
                            }
                          }}
                          isLoading={
                            deleteTemplateMutation.isPending &&
                            deleteTemplateMutation.variables === template.id
                          }
                          className="text-xs p-2"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>

                    {/* OCR Text Accordion */}
                    <div className="border-t border-border/50 pt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedOcrId(isExpanded ? null : template.id)}
                        className="flex items-center justify-between w-full text-xs text-slate-500 hover:text-slate-800"
                      >
                        <span>
                          {isExpanded ? "Hide" : "Preview"} OCR Text (
                          {template.extracted_text ? `${template.extracted_text.length} chars` : "0 chars"})
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                          {template.extracted_text || "(No readable text extracted)"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: CAMPUS LICENSE & SUBSCRIPTION */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          <SubscriptionBannerCard collegeData={college} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h4 className="text-sm font-bold text-slate-900 font-heading mb-3 flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={18} /> Plan Coverage & Entitlements
              </h4>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Campus-wide student signup isolation under allowed domain</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Unlimited placement drive postings & multi-round workflow</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>AI Resume scoring & mock interview preparation simulator</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Multi-template OCR receipt matching & eligibility gates</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>SuperAdmin priority review queue & platform compliance</span>
                </li>
              </ul>
            </Card>

            <Card className="p-6">
              <h4 className="text-sm font-bold text-slate-900 font-heading mb-3 flex items-center gap-2">
                <Clock className="text-indigo-600" size={18} /> Renewal Policy
              </h4>
              <div className="space-y-2.5 text-xs text-slate-600">
                <p>
                  <strong>30-Day Cycle:</strong> Each subscription payment extends your institutional license for 30 consecutive calendar days.
                </p>
                <p>
                  <strong>Pay Button Lock:</strong> While your 30-day period is active, the Pay button remains locked. It automatically unlocks the moment your subscription time ends.
                </p>
                <p>
                  <strong>Zero Interruption:</strong> Live student tests and current drives remain accessible during renewal periods.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal: Add Academic Branch */}
      {showBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
              <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <GraduationCap className="text-accent" size={18} /> Add Academic Branch
              </h2>
              <button
                onClick={() => setShowBranchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <Input label="Branch Code (e.g. IT, CS, ME)" name="code" required placeholder="Short abbreviation" />
              <Input label="Full Branch Name" name="name" required placeholder="e.g. Information Technology" />

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setShowBranchModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createBranchMutation.isPending}>
                  Add Branch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
