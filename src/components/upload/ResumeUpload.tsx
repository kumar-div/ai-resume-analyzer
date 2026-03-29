'use client';

import { useRef } from 'react';

interface ResumeUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  loading?: boolean;
  onFileError?: () => void;
}

export default function ResumeUpload({
  onFileSelect,
  disabled,
  loading,
  onFileError,
}: ResumeUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
    } else if (file) {
      onFileError?.();
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-100">
        Upload Resume (PDF)
      </label>
      <div
        onClick={handleClick}
        className={`border border-slate-700 rounded-xl p-6 text-center cursor-pointer transition bg-slate-800 ${
          disabled || loading
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:border-blue-500 hover:bg-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled || loading}
          className="hidden"
        />
        <div className="text-gray-300">
          <p className="text-lg font-medium">
            {loading ? 'Processing...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-sm text-gray-400">PDF files only</p>
        </div>
      </div>
    </div>
  );
}
