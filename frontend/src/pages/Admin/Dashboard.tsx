import React, { useEffect, useState } from "react";
import { DashboardStats } from "../../types/admin";
import { AdminService } from "../../services/admin.service";

const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  change?: number;
}> = ({ title, value, icon, change }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {change !== undefined && (
          <p
            className={`text-sm ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </p>
        )}
      </div>
      {icon && <div className="text-gray-400">{icon}</div>}
    </div>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await AdminService.getDashboardStats();
        setStats(data);
      } catch (err) {
        setError("Failed to load dashboard statistics");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const attendanceSuccessRate =
    (stats.attendanceStats.present / stats.attendanceStats.total) * 100;
  const suspiciousRate =
    (stats.attendanceStats.suspicious / stats.attendanceStats.total) * 100;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Classrooms" value={stats.totalClassrooms} />
        <StatCard title="Total Users" value={stats.totalUsers} />
        <StatCard
          title="Attendance Success Rate"
          value={`${attendanceSuccessRate.toFixed(1)}%`}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Attendance Overview
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Success Rate</span>
              <span>{attendanceSuccessRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${attendanceSuccessRate}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Suspicious Activity</span>
              <span>{suspiciousRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${suspiciousRate}%` }}
              />
            </div>
          </div>
          <div className="pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Attendance</p>
                <p className="text-xl font-semibold text-gray-900">
                  {stats.attendanceStats.total}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Present</p>
                <p className="text-xl font-semibold text-green-600">
                  {stats.attendanceStats.present}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Suspicious</p>
                <p className="text-xl font-semibold text-yellow-500">
                  {stats.attendanceStats.suspicious}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
