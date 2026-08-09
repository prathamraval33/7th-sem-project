import React from "react";
import { 
  Building2, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  FileText, 
  AlertCircle, 
  ShieldCheck, 
  ExternalLink,
  MapPin,
  Tag
} from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function DriveDetailsView({ drive, company }) {
  if (!drive) return null;

  const comp = company || drive.company;

  const ctcDisplay = drive.min_ctc && drive.max_ctc 
    ? `₹${drive.min_ctc} - ₹${drive.max_ctc} LPA`
    : drive.min_ctc 
      ? `₹${drive.min_ctc} LPA`
      : drive.max_ctc 
        ? `Up to ₹${drive.max_ctc} LPA`
        : "Not Specified";

  return (
    <div className="space-y-6">
      {/* 2-Column Grid for Announcement, Salary & Bond */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Job Announcement */}
        <Card className="border-t-4 border-t-accent shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-heading">
                <Briefcase size={16} className="text-accent" /> Job Announcement
              </h3>
              {drive.placement_type && (
                <span className="px-2.5 py-0.5 bg-accent/10 text-accent font-semibold rounded-full text-xs">
                  {drive.placement_type}
                </span>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Job Announcement Title</p>
                <p className="font-semibold text-slate-900 mt-0.5 text-base">{drive.role}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Company Name</p>
                <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Building2 size={14} className="text-slate-400" />
                  {comp?.name || "Partner Company"}
                </p>
              </div>

              {comp?.industry_type && (
                <div>
                  <p className="text-xs text-slate-500">Industry Type</p>
                  <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <Tag size={14} className="text-slate-400" />
                    {comp.industry_type}
                  </p>
                </div>
              )}

              {comp?.location && (
                <div>
                  <p className="text-xs text-slate-500">Job Location / City</p>
                  <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    {comp.location}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500">Registration Last Date</p>
                <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  {new Date(drive.deadline).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Salary Information */}
        <Card className="border-t-4 border-t-emerald-500 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-heading">
                <DollarSign size={16} className="text-emerald-600" /> Salary Information
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 mb-2">
                <p className="text-xs text-emerald-800 font-medium">Offered CTC Range</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{ctcDisplay}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500">CTC Minimum</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {drive.min_ctc ? `₹${drive.min_ctc} LPA` : "Not Specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">CTC Maximum</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {drive.max_ctc ? `₹${drive.max_ctc} LPA` : "Not Specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: Bond & Agreement Information */}
        <Card className="border-t-4 border-t-amber-500 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 font-heading">
                <ShieldCheck size={16} className="text-amber-600" /> Bond Information
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-500">Service Agreement / Bond Terms</p>
                <p className="font-medium text-slate-800 mt-1 whitespace-pre-line leading-relaxed">
                  {drive.bond_details || "No service bond or agreement required."}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Card 4: Eligibility Information */}
      <Card className="border-t-4 border-t-indigo-500 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2 font-heading">
          <GraduationCap size={16} className="text-indigo-600" /> Eligibility Information
        </h3>

        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-2">Eligible Branches / Departments</p>
            <div className="flex flex-wrap gap-2">
              {drive.eligibility_criteria?.department_list?.map((dept, idx) => (
                <span key={idx} className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold px-3 py-1 rounded-xl text-xs">
                  {dept}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500">Min Degree CGPA</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{drive.eligibility_criteria?.min_cgpa ?? "N/A"}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500">Max Backlogs Allowed</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{drive.eligibility_criteria?.max_backlogs ?? "N/A"}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500">Min 10th %</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{drive.eligibility_criteria?.min_tenth ? `${drive.eligibility_criteria.min_tenth}%` : "N/A"}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <p className="text-xs text-slate-500">Min 12th %</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">{drive.eligibility_criteria?.min_twelfth ? `${drive.eligibility_criteria.min_twelfth}%` : "N/A"}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <p className="text-xs text-slate-500">Min Competitive %ile</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {drive.eligibility_criteria?.min_percentile !== null && drive.eligibility_criteria?.min_percentile !== undefined
                  ? `${drive.eligibility_criteria.min_percentile}%`
                  : "Optional / None"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Card 5: Instruction For Student (Highlighted Callout) */}
      {drive.student_instructions && (
        <div className="bg-amber-50/80 border-l-4 border-l-amber-500 border border-amber-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-amber-600" />
            <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider font-heading">
              Instruction For Student
            </h3>
          </div>
          <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed font-medium">
            {drive.student_instructions}
          </p>
        </div>
      )}

      {/* Card 6: Job Announcement Description */}
      <Card className="border-t-4 border-t-slate-700 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2 font-heading">
          <FileText size={16} className="text-slate-700" /> Job Announcement Description
        </h3>
        <div className="prose prose-slate text-sm max-w-none leading-relaxed text-slate-700 whitespace-pre-line">
          {drive.jd_text || "No description provided."}
        </div>

        {comp?.about && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">About {comp.name}</h4>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{comp.about}</p>
            {comp.website && (
              <a 
                href={comp.website} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-accent text-xs font-semibold hover:underline mt-2"
              >
                Visit Company Website <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
