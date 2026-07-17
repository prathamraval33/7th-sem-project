import React, { useRef, useState } from "react";
import { Upload, X, FileText } from "lucide-react";
import Button from "../common/Button";

export default function FileUploadInput({ 
  label, 
  error, 
  accept, 
  helperText, 
  onChange, 
  value = null,
  className = "" 
}) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.preventDefault();
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      
      {!value ? (
        <div 
          className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors bg-slate-50
            ${dragActive ? "border-slate-500 bg-slate-100" : "border-slate-300"} 
            ${error ? "border-red-500" : "hover:bg-slate-100"}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-slate-400" />
            <p className="mb-2 text-sm text-slate-500">
              <span className="font-semibold text-slate-700 cursor-pointer">Click to upload</span> or drag and drop
            </p>
            {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
          </div>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept={accept} 
            onChange={handleChange}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 border border-slate-300 rounded-lg bg-white">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-slate-100 rounded">
              <FileText className="w-5 h-5 text-slate-500" />
            </div>
            <span className="text-sm font-medium text-slate-700 truncate">
              {value.name}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove} className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
