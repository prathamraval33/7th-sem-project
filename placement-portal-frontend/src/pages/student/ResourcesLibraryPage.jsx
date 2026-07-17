import React, { useState, useEffect } from "react";
import { resourcesApi } from "../../api/resources.api";
import { BookOpen, Video, FileText, Search } from "lucide-react";

export default function ResourcesLibraryPage() {
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        const res = await resourcesApi.getResources();
        setResources(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchResources();
  }, []);

  const categories = [
    { value: "all", label: "All Topics" },
    { value: "aptitude", label: "Aptitude" },
    { value: "communication", label: "Communication" },
    { value: "os", label: "Operating Systems" },
    { value: "dbms", label: "DBMS" },
    { value: "cn", label: "Computer Networks" },
    { value: "java", label: "Java" },
    { value: "python", label: "Python" },
    { value: "interview_qna", label: "Interview Q&A" }
  ];

  const filteredResources = resources.filter(res => {
    if (filterCategory !== "all" && res.category !== filterCategory) return false;
    if (filterType !== "all" && res.content_type !== filterType) return false;
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case "video": return <Video className="w-5 h-5 text-red-500" />;
      case "blog": return <BookOpen className="w-5 h-5 text-blue-500" />;
      case "document": return <FileText className="w-5 h-5 text-amber-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-heading">Resource Library</h1>
        <p className="text-slate-600 mt-1">Study materials, technical revision, and interview prep.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Topic</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c.value}
                onClick={() => setFilterCategory(c.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                  filterCategory === c.value 
                    ? "bg-slate-800 text-white border-slate-800" 
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Type</label>
          <div className="flex space-x-2">
            {["all", "video", "blog", "document"].map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border capitalize transition-colors ${
                  filterType === t 
                    ? "bg-slate-100 text-slate-900 border-slate-300" 
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No resources found</h3>
          <p className="text-slate-500">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((res) => (
            <div key={res.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                    {res.category.replace('_', ' ')}
                  </span>
                  {getTypeIcon(res.content_type)}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 font-heading mb-2 line-clamp-2">{res.title}</h3>
                
                {res.content_type === "blog" || res.content_type === "document" ? (
                  <p className="text-sm text-slate-600 line-clamp-3">{res.content}</p>
                ) : null}
              </div>
              
              <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                {res.content_type === "video" && res.video_url ? (
                  <a href={res.video_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center justify-center">
                    Watch Video &rarr;
                  </a>
                ) : (
                  <button className="w-full text-sm font-medium text-slate-700 hover:text-slate-900 text-center">
                    Read More
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
