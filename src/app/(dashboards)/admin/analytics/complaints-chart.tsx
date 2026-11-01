"use client";
import { Card, CardHeader } from "@/components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";

interface Props {
  byCategory: { category: string; count: number }[];
  byBuilding: { buildingName: string | null; count: number }[];
  byStatus: { status: string; count: number }[];
  byPriority: { priority: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
}

const COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#ea580c", "#dc2626", "#b45309", "#0ea5e9", "#14b8a6", "#f59e0b", "#8b5cf6"];

export function ComplaintsChart({ byCategory, byBuilding, byStatus, byPriority, dailyTrend }: Props) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card padding="md">
        <CardHeader title="Complaints by Category" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byCategory.map((c) => ({ name: c.category.replace("_", " "), count: c.count }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="md">
        <CardHeader title="Complaints by Building" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byBuilding.map((b) => ({ name: b.buildingName || "Unknown", count: b.count }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
            <Tooltip />
            <Bar dataKey="count" fill="#0891b2" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="md">
        <CardHeader title="Status Distribution" />
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={byStatus}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(e: any) => `${e.status}: ${e.count}`}
            >
              {byStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="md">
        <CardHeader title="Priority Distribution" />
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={byPriority}
              dataKey="count"
              nameKey="priority"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(e: any) => `${e.priority}: ${e.count}`}
            >
              {byPriority.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card padding="md" className="lg:col-span-2">
        <CardHeader title="Daily Complaint Trend (Last 30 days)" />
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb" }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
