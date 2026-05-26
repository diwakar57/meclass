/**
 * Parent Monitoring Dashboard
 * Parents can view child's focus status and alerts during class
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Mark this page as dynamic to prevent static prerendering
export const dynamic = 'force-dynamic';

interface MonitoringData {
  timestamp: string;
  focusStatus: 'focused' | 'unfocused';
  alertTriggered: boolean;
  tabSwitchCount: number;
  faceDetected: boolean;
}

interface MonitoringStats {
  totalLogs: number;
  averageFocusTime: number;
  alertCount: number;
  tabSwitchCount: number;
  faceDetectionRate: number;
}

interface ChildInfo {
  id: string;
  name: string;
  currentClass: string;
  focusStatus: 'focused' | 'unfocused';
}

export default function ParentMonitoringDashboard() {
  const { data: session } = useSession();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<MonitoringData[]>([]);
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('today'); // today, week, month

  useEffect(() => {
    if (session?.user?.role === 'parent') {
      fetchChildren();
    }
  }, [session]);

  useEffect(() => {
    if (selectedChild) {
      fetchMonitoringData();
    }
  }, [selectedChild, dateRange]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/parent/children');
      const data = await response.json();
      setChildren(data);
      if (data.length > 0) {
        setSelectedChild(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonitoringData = async () => {
    if (!selectedChild) return;

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const response = await fetch(
        `/api/student-monitoring?studentId=${selectedChild}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      setMonitoringData(data.logs);
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const endDate = now.toISOString();
    let startDate: string;

    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'today':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    }

    return { startDate, endDate };
  };

  const chartData = monitoringData.map((item, idx) => ({
    time: new Date(item.timestamp).toLocaleTimeString().slice(0, 5),
    focused: item.focusStatus === 'focused' ? 1 : 0,
    alert: item.alertTriggered ? 1 : 0,
    tabSwitch: item.tabSwitchCount,
  }));

  const currentChild = children.find((c) => c.id === selectedChild);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Student Learning Monitor</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">Select Child</label>
          <select
            value={selectedChild || ''}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">Choose child...</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Time Period</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="today">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
      </div>

      {currentChild && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">{currentChild.name}</h2>
              <p className="text-gray-600">Current Class: {currentChild.currentClass}</p>
            </div>
            <div className={`px-4 py-2 rounded text-white font-medium ${
              currentChild.focusStatus === 'focused' ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {currentChild.focusStatus === 'focused' ? '✓ Focused' : '⚠ Unfocused'}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 border rounded-lg">
            <div className="text-gray-600 text-sm">Focus Time</div>
            <div className="text-3xl font-bold text-green-600">{stats.averageFocusTime}%</div>
          </div>

          <div className="bg-white p-4 border rounded-lg">
            <div className="text-gray-600 text-sm">Alerts</div>
            <div className="text-3xl font-bold text-red-600">{stats.alertCount}</div>
          </div>

          <div className="bg-white p-4 border rounded-lg">
            <div className="text-gray-600 text-sm">Tab Switches</div>
            <div className="text-3xl font-bold text-orange-600">{stats.tabSwitchCount}</div>
          </div>

          <div className="bg-white p-4 border rounded-lg">
            <div className="text-gray-600 text-sm">Face Detection</div>
            <div className="text-3xl font-bold text-blue-600">{stats.faceDetectionRate}%</div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Focus Timeline */}
        <div className="bg-white p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Focus Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="focused" stroke="#22c55e" name="Focused" />
              <Line type="monotone" dataKey="alert" stroke="#ef4444" name="Alerts" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tab Switches */}
        <div className="bg-white p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Tab Switches Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="tabSwitch" fill="#f97316" name="Tab Switches" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="mt-6 bg-white p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {monitoringData.slice(0, 10).map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm p-2 border-b">
              <span className="text-gray-600">{new Date(item.timestamp).toLocaleTimeString()}</span>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  item.focusStatus === 'focused' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.focusStatus}
                </span>
                {item.alertTriggered && (
                  <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Alert</span>
                )}
                {item.tabSwitchCount > 0 && (
                  <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                    {item.tabSwitchCount} switches
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
