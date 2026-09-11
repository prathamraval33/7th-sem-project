import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/common/StatCard";
import { showConfirm, showSuccess, showError } from "../../utils/swal";
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
} from "lucide-react";
import { format } from "date-fns";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Multi-template states
  const [templateFile, setTemplateFile] = useState(null);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [expandedOcrId, setExpandedOcrId] = useState(null);

  const { data: feeTemplates = [] } = useQuery({
    queryKey: ["adminFeeTemplates"],
    queryFn: () => adminApi.getFeeTemplates().then((res) => res.data),
  });

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
      queryClient.invalidateQueries(["adminFeeTemplate"]);
      setTemplateFile(null);
      setTemplateNameInput("");
      setIsAdding(false);
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
      queryClient.invalidateQueries(["adminFeeTemplate"]);
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
      queryClient.invalidateQueries(["adminFeeTemplate"]);
      showSuccess("Template Removed", "Reference fee receipt template has been permanently deleted.");
    },
    onError: (err) => {
      showError("Removal Failed", err.response?.data?.detail || "Could not remove template.");
    },
  });

  const { data: college, isLoading, isError } = useQuery({
    queryKey: ["adminCollegeInfo"],
    queryFn: () => adminApi.getCollegeInfo().then((res) => res.data),
    onSuccess: (data) => {
      if (!isEditing) {
        setDomainInput(data.domain || "");
      }
    },
  });

  const updateDomainMutation = useMutation({
    mutationFn: (newDomain) => adminApi.updateCollegeDomain(newDomain),
    onSuccess: (res) => {
      queryClient.invalidateQueries(["adminCollegeInfo"]);
      setIsEditing(false);
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

    const confirmed = await showConfirm(
      "Update Institution Domain?",
      `Changing the allowed domain to "${cleanDomain}" will immediately affect student signups. Only students with email addresses matching this domain will be able to register.`,
      "Yes, update domain"
    );

    if (confirmed) {
      updateDomainMutation.mutate(cleanDomain);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !college) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-3" />
        <h3 className="text-lg font-bold text-foreground">Institution Information Unavailable</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Unable to load institution details. Please verify your administrative permissions.
        </p>
      </div>
    );
  }

  const statusVariant = college.status === "active" ? "success" : "destructive";

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">{college.name}</h1>
              <p className="text-sm text-muted-foreground">
                Institution Governance & Campus Registration Settings
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant} className="text-sm px-3 py-1 font-medium capitalize">
            {college.status} Institution
          </Badge>
        </div>
      </div>

      {/* Campus Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Enrolled Students"
          value={college.students}
          icon={Users}
          description="Registered campus students"
        />
        <StatCard
          title="Placement Officers"
          value={college.tpos}
          icon={ShieldCheck}
          description="Active TPO accounts"
        />
        <StatCard
          title="Placement Drives"
          value={college.drives}
          icon={Briefcase}
          description="Total drives created"
        />
        <StatCard
          title="Drive Applications"
          value={college.applications}
          icon={FileCheck}
          description="Student job applications"
        />
      </div>

      {/* Domain Settings Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Allowed Student Email Domain</h2>
        </div>

        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-medium">How domain matching works:</p>
            <p>
              When students sign up on the portal, their email domain (the part after <strong>@</strong>) is matched
              against this registered domain. If it matches, their account is automatically provisioned under{" "}
              <strong>{college.name}</strong> with no manual campus selection required.
            </p>
            <p className="text-xs opacity-90">
              Only one institution on the platform can hold a specific email domain at any given time.
            </p>
          </div>
        </div>

        <form onSubmit={handleDomainSubmit} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Official Campus Email Domain
            </label>
            <div className="flex gap-3">
              <Input
                type="text"
                value={isEditing ? domainInput : college.domain}
                onChange={(e) => {
                  setIsEditing(true);
                  setDomainInput(e.target.value);
                }}
                placeholder="e.g. bvmengineering.ac.in"
                className="font-mono text-sm"
              />
              <Button
                type="submit"
                isLoading={updateDomainMutation.isPending}
                disabled={!isEditing || domainInput.trim().toLowerCase() === college.domain.toLowerCase()}
              >
                Save Domain
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Example format: <code className="text-xs bg-muted px-1 py-0.5 rounded">bvmengineering.ac.in</code> or{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">nirmauni.ac.in</code>
            </p>
          </div>
        </form>
      </div>

      {/* Fee Receipt Reference Templates Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Fee Receipt Verification Templates</h2>
              <p className="text-xs text-muted-foreground">
                Institutional reference samples for AI template-matched student receipt verification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-fit text-xs px-2.5 py-1 font-medium">
              {feeTemplates.filter((t) => t.is_active).length} Active {feeTemplates.filter((t) => t.is_active).length === 1 ? "Template" : "Templates"}
            </Badge>
          </div>
        </div>

        {/* Informative Guidance Banner - High-Contrast & Theme-Adaptive */}
        <div className="rounded-xl border border-border bg-slate-100/90 dark:bg-slate-900/80 p-5 shadow-xs flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-2.5 leading-relaxed flex-1">
            <h4 className="text-sm font-bold text-foreground">
              How template matching works:
            </h4>
            <p className="text-xs text-foreground/80 dark:text-slate-300 leading-relaxed">
              Upload authentic sample fee receipts from your institution (e.g. <strong>Tuition Fee</strong>, <strong>Hostel & Mess Fee</strong>, or <strong>Online Challan</strong>). The AI evaluates student uploads against your college&apos;s standard <strong>structural layout</strong>, letterhead, and fee-category phrasing.
            </p>
            <div className="rounded-lg border border-border/80 bg-background/90 p-3 text-xs text-foreground flex items-start gap-2.5 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="leading-normal">
                <span className="font-semibold text-foreground">Privacy note: </span>
                <span className="text-muted-foreground">
                  Personal details (student name, roll number, receipt number, date, amount) do not need to be real and can be redacted. Variable data is never penalized during matching.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Template Management Header */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Configured Templates ({feeTemplates.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage multiple accepted receipt formats for your campus.
            </p>
          </div>
          {!isAdding && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setIsAdding(true);
                setTemplateFile(null);
                setTemplateNameInput("");
              }}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Reference Template
            </Button>
          )}
        </div>

        {/* Add New Template Form */}
        {isAdding && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4 transition-all">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" /> Upload Reference Receipt Template
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setTemplateFile(null);
                  setTemplateNameInput("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Template Name / Category <span className="text-muted-foreground font-normal">(e.g. Tuition, Hostel)</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. B.Tech Tuition Fee Receipt"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Descriptive name to help differentiate receipt types in student verifications and TPO review.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Sample Document File (PDF, PNG, JPG — Max 5MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer border border-input rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdding(false);
                  setTemplateFile(null);
                  setTemplateNameInput("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (!templateFile) {
                    showError("No file chosen", "Please select a sample fee receipt file to upload.");
                    return;
                  }
                  uploadTemplateMutation.mutate({
                    file: templateFile,
                    templateName: templateNameInput,
                  });
                }}
                disabled={!templateFile}
                isLoading={uploadTemplateMutation.isPending}
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload & Extract OCR
              </Button>
            </div>
          </div>
        )}

        {/* Existing Templates List */}
        {feeTemplates.length === 0 && !isAdding ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mx-auto text-muted-foreground">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">No Reference Templates Configured</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Student submissions currently verify using general heuristic validation (Path A). Upload one or more sample templates to enable AI structural layout matching.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setIsAdding(true)}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Upload Reference Template
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {feeTemplates.map((template) => {
              const isExpanded = expandedOcrId === template.id;
              const fileUrl = `http://localhost:8000/uploads/${template.file_path.replace("uploads/", "").replace("uploads\\", "").replace("\\", "/")}?token=${getAccessToken() || ""}`;

              return (
                <div
                  key={template.id}
                  className={`rounded-xl border p-4 sm:p-5 transition-all space-y-3 ${
                    template.is_active
                      ? "border-border/80 bg-card shadow-xs"
                      : "border-border/50 bg-muted/30 opacity-75"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-muted/60 dark:bg-slate-800 rounded-lg border border-border shadow-2xs shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-foreground text-sm">
                            {template.template_name || template.original_filename || `Template #${template.id}`}
                          </h3>
                          <Badge variant={template.is_active ? "success" : "muted"} className="text-[11px] px-2 py-0.5">
                            {template.is_active ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          File: <span className="font-mono text-[11px]">{template.original_filename}</span> • Uploaded on{" "}
                          {template.created_at ? format(new Date(template.created_at), "PPP p") : "N/A"}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> OCR Extracted ({template.extracted_text ? template.extracted_text.length : 0} chars)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center flex-wrap gap-2 pt-2 md:pt-0">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors text-foreground shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Document
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate(template.id)}
                        isLoading={toggleActiveMutation.isPending && toggleActiveMutation.variables === template.id}
                        className="text-xs"
                      >
                        {template.is_active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          const confirmed = await showConfirm(
                            "Delete Template?",
                            `Are you sure you want to delete "${template.template_name || template.original_filename}"? This cannot be undone.`,
                            "Yes, delete"
                          );
                          if (confirmed) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                        isLoading={deleteTemplateMutation.isPending && deleteTemplateMutation.variables === template.id}
                        className="text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>

                  {/* OCR Extracted Text Accordion Preview */}
                  <div className="border-t border-border/50 pt-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedOcrId(isExpanded ? null : template.id)}
                      className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-0.5"
                    >
                      <span>
                        {isExpanded ? "Hide" : "Preview"} Extracted OCR Text (
                        {template.extracted_text ? `${template.extracted_text.length} chars` : "0 chars"})
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {template.extracted_text || "(No readable text extracted from document)"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Institution Metadata Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Institution Profile & Multi-Tenant Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-muted/40 rounded-lg">
            <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Institution ID</dt>
            <dd className="font-mono text-foreground font-semibold mt-1">#{college.id}</dd>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg">
            <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Institution Name</dt>
            <dd className="text-foreground font-semibold mt-1">{college.name}</dd>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg">
            <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Onboarding Date</dt>
            <dd className="text-foreground font-semibold mt-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              {college.created_at ? format(new Date(college.created_at), "PPP") : "N/A"}
            </dd>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg">
            <dt className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tenant Isolation</dt>
            <dd className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Scoped Database Security Active
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
