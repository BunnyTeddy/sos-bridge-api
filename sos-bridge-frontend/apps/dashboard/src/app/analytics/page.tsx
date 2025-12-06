'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Users,
  Ticket,
  DollarSign,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { StatsCard } from '@/components/dashboard/stats-card';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import { Spinner } from '@sos-bridge/ui';
import { exportAnalyticsReport, exportTicketsToCSV, exportRescuersToCSV } from '@/lib/export';

// Mock data for charts (in production, this would come from the API)
const ticketsByDay = [
  { date: '28/11', open: 12, completed: 8 },
  { date: '29/11', open: 15, completed: 12 },
  { date: '30/11', open: 20, completed: 18 },
  { date: '01/12', open: 25, completed: 22 },
  { date: '02/12', open: 18, completed: 15 },
  { date: '03/12', open: 22, completed: 20 },
  { date: '04/12', open: 16, completed: 14 },
];

const rescuerPerformance = [
  { name: 'Nguyễn Văn A', missions: 45, rating: 4.8 },
  { name: 'Trần Văn B', missions: 38, rating: 4.7 },
  { name: 'Lê Văn C', missions: 32, rating: 4.9 },
  { name: 'Phạm Văn D', missions: 28, rating: 4.6 },
  { name: 'Hoàng Văn E', missions: 25, rating: 4.5 },
];

const statusDistribution = [
  { name: 'Hoàn thành', value: 65, color: '#22c55e' },
  { name: 'Đang xử lý', value: 15, color: '#eab308' },
  { name: 'Đã gán', value: 12, color: '#f97316' },
  { name: 'Đang mở', value: 8, color: '#ef4444' },
];

const responseTimeData = [
  { time: '0-5 phút', count: 45 },
  { time: '5-15 phút', count: 32 },
  { time: '15-30 phút', count: 18 },
  { time: '30-60 phút', count: 8 },
  { time: '>60 phút', count: 3 },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d');

  // Fetch stats
  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => apiClient.getStats(),
  });

  // Fetch data for export
  const { data: ticketsData } = useQuery({
    queryKey: queryKeys.tickets.all,
    queryFn: () => apiClient.getTickets({ limit: 1000 }),
  });

  const { data: rescuersData } = useQuery({
    queryKey: queryKeys.rescuers.all,
    queryFn: () => apiClient.getRescuers({ limit: 1000 }),
  });

  const { data: transactionsData } = useQuery({
    queryKey: queryKeys.transactions.all,
    queryFn: () => apiClient.getTransactions({ limit: 1000 }),
  });

  const stats = statsData?.data;
  const tickets = ticketsData?.data?.data || [];
  const rescuers = rescuersData?.data?.data || [];
  const transactions = transactionsData?.data?.data || [];

  const handleExportReport = () => {
    exportAnalyticsReport(
      stats,
      tickets,
      rescuers,
      transactions,
      `sos-bridge-report-${new Date().toISOString().split('T')[0]}`
    );
  };

  return (
    <DashboardLayout
      title="Phân tích & Báo cáo"
      subtitle="Thống kê hiệu suất hệ thống"
      onRefresh={() => refetch()}
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border-none bg-transparent text-sm focus:outline-none"
              >
                <option value="7d">7 ngày qua</option>
                <option value="30d">30 ngày qua</option>
                <option value="90d">90 ngày qua</option>
                <option value="all">Tất cả</option>
              </select>
            </div>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" />
              Xuất báo cáo
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Tổng yêu cầu"
              value={stats?.tickets.total || 0}
              subtitle="Trong khoảng thời gian"
              icon={Ticket}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
              trend={{ value: 15, isPositive: true }}
            />
            <StatsCard
              title="Tỷ lệ hoàn thành"
              value={`${stats?.tickets.total ? Math.round((stats.tickets.completed / stats.tickets.total) * 100) : 0}%`}
              subtitle="Nhiệm vụ thành công"
              icon={TrendingUp}
              iconColor="text-green-600"
              iconBg="bg-green-100"
              trend={{ value: 5, isPositive: true }}
            />
            <StatsCard
              title="Thời gian phản hồi TB"
              value="12 phút"
              subtitle="Từ tạo đến gán"
              icon={Clock}
              iconColor="text-yellow-600"
              iconBg="bg-yellow-100"
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title="Tổng giải ngân"
              value={`${stats?.transactions.total_disbursed_usdc || 0} USDC`}
              subtitle={`${stats?.transactions.confirmed || 0} giao dịch`}
              icon={DollarSign}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Tickets Over Time */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">Yêu cầu theo ngày</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ticketsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="open"
                      stroke="#ef4444"
                      name="Mới mở"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke="#22c55e"
                      name="Hoàn thành"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">Phân bố trạng thái</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Response Time Distribution */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">Thời gian phản hồi</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="time" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Rescuers */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Top đội cứu hộ</h3>
                <button
                  onClick={() => exportRescuersToCSV(rescuers, `rescuers-${new Date().toISOString().split('T')[0]}`)}
                  className="text-xs text-primary hover:underline"
                >
                  Xuất danh sách
                </button>
              </div>
              <div className="space-y-4">
                {(rescuers.length > 0
                  ? [...rescuers].sort((a, b) => b.completed_missions - a.completed_missions).slice(0, 5)
                  : rescuerPerformance
                ).map((rescuer, index) => (
                  <div
                    key={rescuer.name}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-700'
                          : index === 1
                          ? 'bg-gray-100 text-gray-600'
                          : index === 2
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{rescuer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ⭐ {rescuer.rating.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {'completed_missions' in rescuer ? rescuer.completed_missions : rescuer.missions}
                      </p>
                      <p className="text-xs text-muted-foreground">nhiệm vụ</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-700">Hiệu suất tốt</p>
                  <p className="text-2xl font-bold text-green-800">
                    92% yêu cầu được xử lý trong 30 phút
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-700">Đội ngũ hoạt động</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {stats?.rescuers.online || 0} đội online trung bình
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-gradient-to-br from-purple-50 to-violet-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-3">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-700">Giải ngân hiệu quả</p>
                  <p className="text-2xl font-bold text-purple-800">
                    100% giao dịch thành công
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
