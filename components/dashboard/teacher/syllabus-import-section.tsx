'use client';

import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('SyllabusImport');

interface SyllabusImportProps {
  teacherId: string;
  schoolId: string;
  classId?: string;
}

export function SyllabusImportSection({ teacherId, schoolId, classId }: SyllabusImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setSelectedFile(file);
      setUploadMessage(null);
    } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      setSelectedFile(file);
      setUploadMessage(null);
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      setSelectedFile(file);
      setUploadMessage(null);
    } else {
      setUploadMessage({
        type: 'error',
        text: 'Please upload a PDF, JSON, or text file'
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('teacherId', teacherId);
      formData.append('schoolId', schoolId);
      if (classId) formData.append('classId', classId);

      const response = await fetch('/api/teacher/syllabus/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setUploadMessage({
        type: 'success',
        text: `✅ Syllabus "${data.title}" imported successfully!`
      });
      setSelectedFile(null);
    } catch (error) {
      log.error('Failed to import syllabus:', error);
      setUploadMessage({
        type: 'error',
        text: '❌ Failed to import syllabus. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 border-2 border-dashed border-gray-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">📚 Import Syllabus</h3>
          <p className="text-gray-600 text-sm mt-1">Upload a syllabus document to organize your curriculum</p>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          
          <p className="text-gray-700 font-medium mb-2">
            Drag and drop your syllabus here
          </p>
          <p className="text-gray-500 text-sm mb-4">or</p>
          
          <input
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.json,.txt"
            className="hidden"
            id="syllabus-file"
            disabled={isUploading}
          />
          <label
            htmlFor="syllabus-file"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors disabled:bg-gray-400"
          >
            Browse Files
          </label>
          
          <p className="text-gray-500 text-xs mt-4">
            Supported formats: PDF, JSON, TXT
          </p>
        </div>
      </div>

      {selectedFile && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{selectedFile.name}</p>
              <p className="text-sm text-gray-600">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {uploadMessage && (
        <div
          className={`mt-6 p-4 rounded-lg text-sm font-medium ${
            uploadMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {uploadMessage.text}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
          <div className="text-2xl mb-2">📖</div>
          <p className="text-sm font-medium text-gray-700">View Existing</p>
        </button>
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
          <div className="text-2xl mb-2">🆕</div>
          <p className="text-sm font-medium text-gray-700">Create New</p>
        </button>
        <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-center">
          <div className="text-2xl mb-2">🔗</div>
          <p className="text-sm font-medium text-gray-700">Link to Class</p>
        </button>
      </div>
    </div>
  );
}
