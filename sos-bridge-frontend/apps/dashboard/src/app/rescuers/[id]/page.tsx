'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Star,
  Wallet,
  Calendar,
  Clock,
  Edit,
  Ban,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Trophy,
  Ticket,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ConfirmDialog } from '@/components/modals/confirm-dialog';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescuerStatus } from '@sos-bridge/types';
import { VEHICLE_TYPE_NAMES, VEHICLE_TYPE_EMOJIS, STATUS_LABELS } from '@sos-bridge/types';
import {
  StatusBadge,
  formatPhone,
  formatDateTime,
  formatRelativeTime,
  truncateAddress,
  Spinner,
  Button,
} from '@sos-bridge/ui';

export default function RescuerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rescuerId = params.id as string;
  const queryClient = useQueryClient();

  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);

  // Fetch rescuer
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.rescuers.detail(rescuerId),
    queryFn: () => apiClient.getRescuer(rescuerId),
    refetchInterval: 30000,
  });

  // Fetch tickets assigned to this rescuer
  const { data: ticketsData } = useQuery({
    queryKey: queryKeys.tickets.list({ rescuer_id: rescuerId }),
    queryFn: () => apiClient.getTickets({ limit: 100 }),
    enabled: !!rescuerId,
  });

  // Get rescuer's tickets
  const rescuer = data?.data;
  const allTickets = ticketsData?.data?.data || [];
  const rescuerTickets = allTickets.filter(
    (t) => t.assigned_rescuer_id === rescuerId
  );
  const completedTickets = rescuerTickets.filter((t) => t.status === 'COMPLETED');
  const activeTicket = rescuerTickets.find(
    (t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS'
  );

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: (status: RescuerStatus) =>
      apiClient.updateRescuerStatus(rescuerId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rescuers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rescuers.detail(rescuerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      setShowSuspendDialog(false);
      setShowActivateDialog(false);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Chi tiết đội cứu hộ" subtitle="Đang tải...">
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!rescuer) {
    return (
      <DashboardLayout title="Chi tiết đội cứu hộ" subtitle="Không tìm thấy">
        <div className="py-12 text-center">
          <User className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
          <p className="text-lg text-muted-foreground">Không tìm thấy đội cứu hộ này</p>
          <button
            onClick={() => router.push('/rescuers')}
            className="mt-4 text-primary hover:underline"
          >
            Quay lại danh sách
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = rescuer.status !== 'OFFLINE';
  const isSuspended = rescuer.registration_status === 'suspended';

  return (
    <DashboardLayout
      title={rescuer.name}
      subtitle={`${VEHICLE_TYPE_EMOJIS[rescuer.vehicle_type]} ${VEHICLE_TYPE_NAMES[rescuer.vehicle_type]}`}
      onRefresh={() => refetch()}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Profile Card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-8 w-8 text-blue-600" />
                    </div>
                    {isActive && !isSuspended && (
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-3 border-white bg-green-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">{rescuer.name}</h2>
                    <p className="text-muted-foreground">
                      ID: {rescuer.rescuer_id.slice(-8)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={rescuer.status} />
                      {isSuspended && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Đã tạm ngưng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isSuspended ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActivateDialog(true)}
                    >
                      <CheckCircle className="mr-1 h-4 w-4" />
                      Kích hoạt lại
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuspendDialog(true)}
                    >
                      <Ban className="mr-1 h-4 w-4" />
                      Tạm ngưng
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Trophy className="mx-auto mb-1 h-5 w-5 text-yellow-500" />
                  <p className="text-2xl font-bold text-foreground">
                    {rescuer.completed_missions}
                  </p>
                  <p className="text-xs text-muted-foreground">Nhiệm vụ</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Star className="mx-auto mb-1 h-5 w-5 text-yellow-500" />
                  <p className="text-2xl font-bold text-foreground">
                    {rescuer.rating.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Đánh giá</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <User className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                  <p className="text-2xl font-bold text-foreground">
                    {rescuer.vehicle_capacity}
                  </p>
                  <p className="text-xs text-muted-foreground">Sức chứa</p>
                </div>
                <div className="rounded-lg bg-muted p-3 text-center">
                  <Ticket className="mx-auto mb-1 h-5 w-5 text-green-500" />
                  <p className="text-2xl font-bold text-foreground">
                    {rescuerTickets.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Tổng ticket</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Thông tin liên hệ</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Số điện thoại</p>
                    <a
                      href={`tel:${rescuer.phone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {formatPhone(rescuer.phone)}
                    </a>
                  </div>
                </div>

                {rescuer.telegram_user_id && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telegram ID</p>
                      <p className="font-medium">{rescuer.telegram_user_id}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vị trí hiện tại</p>
                    <p className="font-medium">
                      {rescuer.location.lat.toFixed(6)}, {rescuer.location.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cập nhật: {formatRelativeTime(rescuer.location.last_updated)}
                    </p>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps?q=${rescuer.location.lat},${rescuer.location.lng}`,
                          '_blank'
                        )
                      }
                      className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Navigation className="h-3 w-3" />
                      Xem trên bản đồ
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Mission */}
            {activeTicket && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="h-5 w-5" />
                  <h3 className="font-semibold">Đang thực hiện nhiệm vụ</h3>
                </div>
                <div className="mt-3">
                  <a
                    href={`/tickets/${activeTicket.ticket_id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    #{activeTicket.ticket_id.slice(-6)}
                  </a>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeTicket.location.address_text}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activeTicket.victim_info.people_count} người cần cứu
                  </p>
                </div>
              </div>
            )}

            {/* Mission History */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Lịch sử nhiệm vụ</h3>
              {rescuerTickets.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Chưa có nhiệm vụ nào
                </p>
              ) : (
                <div className="space-y-3">
                  {rescuerTickets.slice(0, 10).map((ticket) => (
                    <div
                      key={ticket.ticket_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <StatusBadge status={ticket.status} />
                        <div>
                          <a
                            href={`/tickets/${ticket.ticket_id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            #{ticket.ticket_id.slice(-6)}
                          </a>
                          <p className="text-sm text-muted-foreground">
                            {ticket.location.address_text}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(ticket.created_at)}
                      </span>
                    </div>
                  ))}
                  {rescuerTickets.length > 10 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Và {rescuerTickets.length - 10} nhiệm vụ khác...
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Vehicle Info */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Phương tiện</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Loại xe</span>
                  <span className="font-medium">
                    {VEHICLE_TYPE_EMOJIS[rescuer.vehicle_type]}{' '}
                    {VEHICLE_TYPE_NAMES[rescuer.vehicle_type]}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Sức chứa</span>
                  <span className="font-medium">{rescuer.vehicle_capacity} người</span>
                </div>
              </div>
            </div>

            {/* Wallet Info */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Ví blockchain</h3>
              {rescuer.wallet_address ? (
                <div>
                  <p className="break-all font-mono text-sm">
                    {rescuer.wallet_address}
                  </p>
                  <a
                    href={`https://sepolia.basescan.org/address/${rescuer.wallet_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Xem trên Explorer
                  </a>
                </div>
              ) : (
                <p className="text-muted-foreground">Chưa cấu hình</p>
              )}
            </div>

            {/* Timestamps */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Thông tin hệ thống</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Ngày đăng ký</p>
                    <p className="font-medium">{formatDateTime(rescuer.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Hoạt động cuối</p>
                    <p className="font-medium">{formatRelativeTime(rescuer.last_active_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold text-foreground">Thao tác</h3>
              <div className="space-y-2">
                <a
                  href={`tel:${rescuer.phone}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600"
                >
                  <Phone className="h-4 w-4" />
                  Gọi điện
                </a>
                <button
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps?q=${rescuer.location.lat},${rescuer.location.lng}`,
                      '_blank'
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600"
                >
                  <Navigation className="h-4 w-4" />
                  Xem vị trí
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Dialog */}
      <ConfirmDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={() => updateStatusMutation.mutate('OFFLINE')}
        title="Tạm ngưng đội cứu hộ"
        message={`Bạn có chắc muốn tạm ngưng đội cứu hộ "${rescuer.name}"? Họ sẽ không nhận được nhiệm vụ mới cho đến khi được kích hoạt lại.`}
        confirmText="Tạm ngưng"
        variant="danger"
        isLoading={updateStatusMutation.isPending}
      />

      {/* Activate Dialog */}
      <ConfirmDialog
        isOpen={showActivateDialog}
        onClose={() => setShowActivateDialog(false)}
        onConfirm={() => updateStatusMutation.mutate('ONLINE')}
        title="Kích hoạt đội cứu hộ"
        message={`Bạn có chắc muốn kích hoạt lại đội cứu hộ "${rescuer.name}"? Họ sẽ có thể nhận nhiệm vụ mới.`}
        confirmText="Kích hoạt"
        variant="success"
        isLoading={updateStatusMutation.isPending}
      />
    </DashboardLayout>
  );
}

