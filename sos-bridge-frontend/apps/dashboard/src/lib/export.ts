/**
 * Export utilities for CSV/Excel export
 */

import type { RescueTicket, Rescuer, RewardTransaction } from '@sos-bridge/types';
import { STATUS_LABELS, PRIORITY_LABELS, VEHICLE_TYPE_NAMES } from '@sos-bridge/types';

// Format date for export
function formatExportDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Escape CSV value
function escapeCSV(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // If contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert array of objects to CSV string
function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string; format?: (row: T) => string }[]
): string {
  // Header row
  const headerRow = columns.map((col) => escapeCSV(col.header)).join(',');

  // Data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        if (col.format) {
          return escapeCSV(col.format(row));
        }
        const value = col.key.toString().includes('.')
          ? col.key.toString().split('.').reduce((obj, key) => obj?.[key], row as any)
          : row[col.key as keyof T];
        return escapeCSV(value);
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

// Download CSV file
function downloadCSV(csvContent: string, filename: string) {
  // Add BOM for UTF-8 encoding (helps Excel recognize Vietnamese characters)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ============ TICKETS EXPORT ============

export function exportTicketsToCSV(tickets: RescueTicket[], filename: string = 'tickets') {
  const columns = [
    { key: 'ticket_id', header: 'Mã yêu cầu' },
    { key: 'status', header: 'Trạng thái', format: (t: RescueTicket) => STATUS_LABELS[t.status] || t.status },
    { key: 'priority', header: 'Mức ưu tiên', format: (t: RescueTicket) => PRIORITY_LABELS[t.priority] || String(t.priority) },
    { key: 'location.address_text', header: 'Địa chỉ', format: (t: RescueTicket) => t.location.address_text },
    { key: 'location.lat', header: 'Vĩ độ', format: (t: RescueTicket) => String(t.location.lat) },
    { key: 'location.lng', header: 'Kinh độ', format: (t: RescueTicket) => String(t.location.lng) },
    { key: 'victim_info.phone', header: 'SĐT', format: (t: RescueTicket) => t.victim_info.phone },
    { key: 'victim_info.people_count', header: 'Số người', format: (t: RescueTicket) => String(t.victim_info.people_count) },
    { key: 'victim_info.has_elderly', header: 'Có người già', format: (t: RescueTicket) => t.victim_info.has_elderly ? 'Có' : 'Không' },
    { key: 'victim_info.has_children', header: 'Có trẻ em', format: (t: RescueTicket) => t.victim_info.has_children ? 'Có' : 'Không' },
    { key: 'victim_info.has_disabled', header: 'Có NKT', format: (t: RescueTicket) => t.victim_info.has_disabled ? 'Có' : 'Không' },
    { key: 'victim_info.note', header: 'Ghi chú', format: (t: RescueTicket) => t.victim_info.note || '' },
    { key: 'assigned_rescuer_id', header: 'Mã đội cứu hộ', format: (t: RescueTicket) => t.assigned_rescuer_id || '' },
    { key: 'created_at', header: 'Thời gian tạo', format: (t: RescueTicket) => formatExportDate(t.created_at) },
    { key: 'updated_at', header: 'Cập nhật', format: (t: RescueTicket) => t.updated_at ? formatExportDate(t.updated_at) : '' },
    { key: 'completed_at', header: 'Hoàn thành', format: (t: RescueTicket) => t.completed_at ? formatExportDate(t.completed_at) : '' },
  ];

  const csv = arrayToCSV(tickets, columns);
  downloadCSV(csv, `${filename}.csv`);
}

// ============ RESCUERS EXPORT ============

export function exportRescuersToCSV(rescuers: Rescuer[], filename: string = 'rescuers') {
  const columns = [
    { key: 'rescuer_id', header: 'Mã đội' },
    { key: 'name', header: 'Tên' },
    { key: 'phone', header: 'SĐT' },
    { key: 'status', header: 'Trạng thái' },
    { key: 'vehicle_type', header: 'Loại xe', format: (r: Rescuer) => VEHICLE_TYPE_NAMES[r.vehicle_type] || r.vehicle_type },
    { key: 'vehicle_capacity', header: 'Sức chứa', format: (r: Rescuer) => String(r.vehicle_capacity) },
    { key: 'rating', header: 'Đánh giá', format: (r: Rescuer) => r.rating.toFixed(1) },
    { key: 'completed_missions', header: 'Nhiệm vụ hoàn thành', format: (r: Rescuer) => String(r.completed_missions) },
    { key: 'wallet_address', header: 'Địa chỉ ví', format: (r: Rescuer) => r.wallet_address || '' },
    { key: 'location.lat', header: 'Vĩ độ', format: (r: Rescuer) => String(r.location.lat) },
    { key: 'location.lng', header: 'Kinh độ', format: (r: Rescuer) => String(r.location.lng) },
    { key: 'telegram_user_id', header: 'Telegram ID', format: (r: Rescuer) => r.telegram_user_id ? String(r.telegram_user_id) : '' },
    { key: 'created_at', header: 'Ngày đăng ký', format: (r: Rescuer) => formatExportDate(r.created_at) },
    { key: 'last_active_at', header: 'Hoạt động cuối', format: (r: Rescuer) => formatExportDate(r.last_active_at) },
  ];

  const csv = arrayToCSV(rescuers, columns);
  downloadCSV(csv, `${filename}.csv`);
}

// ============ TRANSACTIONS EXPORT ============

export function exportTransactionsToCSV(transactions: RewardTransaction[], filename: string = 'transactions') {
  const statusLabels: Record<string, string> = {
    PENDING: 'Đang chờ',
    SUBMITTED: 'Đã gửi',
    CONFIRMED: 'Xác nhận',
    FAILED: 'Thất bại',
  };

  const columns = [
    { key: 'tx_id', header: 'Mã GD' },
    { key: 'ticket_id', header: 'Mã yêu cầu' },
    { key: 'rescuer_id', header: 'Mã đội cứu hộ' },
    { key: 'rescuer_wallet', header: 'Địa chỉ ví' },
    { key: 'amount_usdc', header: 'Số tiền (USDC)', format: (t: RewardTransaction) => String(t.amount_usdc) },
    { key: 'status', header: 'Trạng thái', format: (t: RewardTransaction) => statusLabels[t.status] || t.status },
    { key: 'tx_hash', header: 'TX Hash', format: (t: RewardTransaction) => t.tx_hash || '' },
    { key: 'network', header: 'Mạng' },
    { key: 'created_at', header: 'Thời gian tạo', format: (t: RewardTransaction) => formatExportDate(t.created_at) },
    { key: 'confirmed_at', header: 'Xác nhận lúc', format: (t: RewardTransaction) => t.confirmed_at ? formatExportDate(t.confirmed_at) : '' },
  ];

  const csv = arrayToCSV(transactions, columns);
  downloadCSV(csv, `${filename}.csv`);
}

// ============ ANALYTICS EXPORT ============

export function exportAnalyticsReport(
  stats: any,
  tickets: RescueTicket[],
  rescuers: Rescuer[],
  transactions: RewardTransaction[],
  filename: string = 'report'
) {
  const lines: string[] = [];

  // Header
  lines.push('BÁO CÁO TỔNG HỢP SOS-BRIDGE');
  lines.push(`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`);
  lines.push('');

  // Summary stats
  lines.push('=== THỐNG KÊ TỔNG QUAN ===');
  lines.push(`Tổng yêu cầu: ${stats?.tickets?.total || tickets.length}`);
  lines.push(`Đang mở: ${stats?.tickets?.open || tickets.filter(t => t.status === 'OPEN').length}`);
  lines.push(`Hoàn thành: ${stats?.tickets?.completed || tickets.filter(t => t.status === 'COMPLETED').length}`);
  lines.push('');
  lines.push(`Tổng đội cứu hộ: ${stats?.rescuers?.total || rescuers.length}`);
  lines.push(`Online: ${stats?.rescuers?.online || rescuers.filter(r => r.status === 'ONLINE').length}`);
  lines.push('');
  lines.push(`Tổng giao dịch: ${transactions.length}`);
  lines.push(`Đã giải ngân: ${transactions.filter(t => t.status === 'CONFIRMED').reduce((sum, t) => sum + t.amount_usdc, 0)} USDC`);
  lines.push('');

  // Completion rate
  const total = stats?.tickets?.total || tickets.length;
  const completed = stats?.tickets?.completed || tickets.filter(t => t.status === 'COMPLETED').length;
  const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
  lines.push(`Tỷ lệ hoàn thành: ${completionRate}%`);
  lines.push('');

  // Top rescuers
  lines.push('=== TOP 5 ĐỘI CỨU HỘ ===');
  const topRescuers = [...rescuers]
    .sort((a, b) => b.completed_missions - a.completed_missions)
    .slice(0, 5);
  topRescuers.forEach((r, i) => {
    lines.push(`${i + 1}. ${r.name} - ${r.completed_missions} nhiệm vụ - ⭐${r.rating.toFixed(1)}`);
  });

  const content = lines.join('\n');
  downloadCSV(content, `${filename}.txt`);
}

