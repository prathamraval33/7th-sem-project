import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { drivesApi } from "../../api/drives.api";
import { useAuth } from "../../auth/useAuth";
import Button from "../../components/common/Button";
import { Building2, Calendar, Users, GraduationCap, MapPin } from "lucide-react";

export default function DrivesListPage() {
  const [drives, setDrives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDrives = async () => {
      try {
        setIsLoading(true);
        const res = await drivesApi.getMatchedDrives();
        setDrives(res.data);
      } catch (err) {
        setError("Failed to fetch matched drives.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDrives();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Placement Drives</h1>
        <p className="text-slate-600 mt-1">Drives matching your profile criteria.</p>
      </div>

      {drives.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No matched drives right now</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            We couldn't find any open placement drives matching your current profile. We'll notify you when new opportunities arise.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drives.map((drive) => (
            <div key={drive.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-slate-600" />
                  </div>
                  {drive.status === "open" ? (
                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">Open</span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">Closed</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 font-heading line-clamp-1">{drive.role}</h3>
                <p className="text-slate-600 text-sm font-medium mb-4 line-clamp-1">{drive.company?.name || "Company Name"}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-slate-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    Deadline: {new Date(drive.deadline).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-slate-500">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Min CGPA: {drive.eligibility_criteria?.min_cgpa || "N/A"}
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <Link to={`/student/drives/${drive.id}`}>
                  <Button className="w-full" variant="outline">View Details</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
