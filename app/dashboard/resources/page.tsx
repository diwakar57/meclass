'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { createLogger } from '@/lib/logger';

const log = createLogger('Resources');

interface Resource {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: 'pdf' | 'video' | 'presentation' | 'document' | 'link';
  url?: string;
  fileSize?: string;
  uploadedBy: string;
  uploadedDate: string;
  downloads: number;
  views: number;
  gradeLevel?: string;
  tags: string[];
}

interface ResourceCollection {
  categories: Array<{ name: string; count: number }>;
  resources: Resource[];
  recentResources: Resource[];
  popularResources: Resource[];
  stats: {
    totalResources: number;
    totalDownloads: number;
    averageRating: number;
  };
}

export default function ResourcesPage() {
  const [resourceData, setResourceData] = useState<ResourceCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'downloads'>('recent');

  useEffect(() => {
    fetchResources();
  }, [selectedCategory, searchQuery, sortBy]);

  async function fetchResources() {
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
      });
      const response = await fetch(`/api/resources?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      setResourceData(data.data);
    } catch (err) {
      log.error('Failed to load resources', err);
    } finally {
      setLoading(false);
    }
  }

  async function downloadResource(resourceId: string) {
    try {
      const response = await fetch(`/api/resources/${resourceId}/download`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to download resource');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resource-${resourceId}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      log.error('Failed to download resource', err);
    }
  }

  const getTypeIcon = (type: string) => {
    const icons: any = {
      pdf: '📄',
      video: '🎥',
      presentation: '📊',
      document: '📝',
      link: '🔗',
    };
    return icons[type] || '📦';
  };

  const getTypeColor = (type: string) => {
    const colors: any = {
      pdf: 'bg-red-100 text-red-800',
      video: 'bg-purple-100 text-purple-800',
      presentation: 'bg-blue-100 text-blue-800',
      document: 'bg-green-100 text-green-800',
      link: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout title="Resources" subtitle="Learning materials library">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="text-center py-12">Loading resources library...</div>
        </main>
      </DashboardLayout>
    );
  }

  if (!resourceData) {
    return (
      <DashboardLayout title="Resources" subtitle="Learning materials library">
        <main className="min-h-screen bg-gray-50 px-6 py-10">
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-600">Unable to load resources.</p>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  const filteredResources = searchQuery
    ? resourceData.resources.filter((r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : resourceData.resources;

  return (
    <DashboardLayout title="Resources" subtitle="Comprehensive learning materials library">
      <main className="min-h-screen bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-7xl space-y-8">

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Resources</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{resourceData.stats.totalResources}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Downloads</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {(resourceData.stats.totalDownloads / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">
                {resourceData.stats.averageRating.toFixed(1)}⭐
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{resourceData.categories.length}</p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resources by title, subject, or topic..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base"
            />
            <div className="flex gap-4 flex-wrap">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="recent">Most Recent</option>
                  <option value="popular">Most Popular</option>
                  <option value="downloads">Most Downloaded</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="all">All Categories</option>
                  {resourceData.categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Featured Resources */}
          <div className="space-y-6">
            <div>
              <p className="text-lg font-bold text-gray-900 mb-4">📌 Featured Resources</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {resourceData.recentResources.slice(0, 3).map((resource) => (
                  <div key={resource.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">{getTypeIcon(resource.type)}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(resource.type)}`}>
                          {resource.type.toUpperCase()}
                        </span>
                      </div>
                      <p className="font-bold text-gray-900 mb-2">{resource.title}</p>
                      <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                        <span>📊 {resource.views} views</span>
                        <span>⬇️ {resource.downloads} downloads</span>
                      </div>
                      <button
                        onClick={() => downloadResource(resource.id)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Resources */}
            <div>
              <p className="text-lg font-bold text-gray-900 mb-4">⭐ Popular Resources</p>
              <div className="bg-white rounded-lg shadow">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Subject</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Type</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Views</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Downloads</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resourceData.popularResources.map((resource) => (
                        <tr key={resource.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{resource.title}</td>
                          <td className="px-6 py-3 text-gray-600">
                            <span className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">
                              {resource.subject}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(resource.type)}`}>
                              {resource.type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center text-gray-700">{resource.views}</td>
                          <td className="px-6 py-3 text-center text-gray-700">{resource.downloads}</td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => downloadResource(resource.id)}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Download
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* All Resources */}
            <div>
              <p className="text-lg font-bold text-gray-900 mb-4">All Resources ({filteredResources.length})</p>
              <div className="bg-white rounded-lg shadow">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Title</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Subject</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Grade</th>
                        <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Type</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Uploaded</th>
                        <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResources.map((resource) => (
                        <tr key={resource.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-3">
                            <div>
                              <p className="font-medium text-gray-900">{resource.title}</p>
                              <p className="text-xs text-gray-600">{resource.description.substring(0, 50)}...</p>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            <span className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">
                              {resource.subject}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{resource.gradeLevel || 'All'}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTypeColor(resource.type)}`}>
                              {resource.type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-center text-sm text-gray-600">
                            {new Date(resource.uploadedDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <button
                              onClick={() => downloadResource(resource.id)}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                            >
                              {resource.fileSize ? '⬇️ Download' : 'Open'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
