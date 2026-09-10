import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api/admin.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/common/StatCard";
import { showConfirm, showSuccess, showError } from "../../utils/swal";
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
} from "lucide-react";
import { format } from "date-fns";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [domainInput, setDomainInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);

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
