'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Users,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  Navigation,
  Edit,
  Image,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { AssignRescuerModal } from '@/components/modals/assign-rescuer-modal';
import { UpdateStatusModal } from '@/components/modals/update-status-modal';
import { ConfirmDialog } from '@/components/modals/confirm-dialog';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { TicketStatus } from '@sos-bridge/types';
import { STATUS_LABELS, PRIORITY_LABELS, VEHICLE_TYPE_NAMES } from '@sos-bridge/types';
import {
  StatusBadge,
  PriorityBadge,
  formatRelativeTime,
  formatPhone,
  formatDateTime,
  Spinner,
} from '@sos-bridge/ui';

export default function TicketDetailPage() {
  const t = useTranslations('ticketDetail');
  const tCommon = useTranslations('common');
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const queryClient = useQueryClient();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Timeline step definition with translations
  const timelineSteps: { status: TicketStatus; label: string }[] = [
    { status: 'OPEN', label: t('timeline.received') },
    { status: 'ASSIGNED', label: t('timeline.assigned') },
    { status: 'IN_PROGRESS', label: t('timeline.inProgress') },
    { status: 'VERIFIED', label: t('timeline.verified') },
    { status: 'COMPLETED', label: t('timeline.completed') },
  ];

  function getStepIndex(status: TicketStatus): number {
    const index = timelineSteps.findIndex((s) => s.status === status);
    return index >= 0 ? index : 0;
  }

  // Fetch ticket
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => apiClient.getTicket(ticketId),
    refetchInterval: 10000,
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () =>
      apiClient.updateTicket(ticketId, { status: 'CANCELLED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      setShowCancelDialog(false);
    },
  });

  const ticket = data?.data;

  if (isLoading) {
    return (
      <DashboardLayout title={t('title')} subtitle={tCommon('loading')}>
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" />
        </div>
      </DashboardLayout>
    );
  }

  if (!ticket) {
    return (
      <DashboardLayout title={t('title')} subtitle={t('notFound')}>
        <div className="py-12 text-center">
          <p className="text-muted-foreground">{t('notFoundMessage')}</p>
          <button
            onClick={() => router.push('/tickets')}
            className="mt-4 text-primary hover:underline"
          >
            {t('backToList')}
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const currentStepIndex = getStepIndex(ticket.status);
  const isCancelled = ticket.status === 'CANCELLED';
  const isCompleted = ticket.status === 'COMPLETED';
  const canAssign = ticket.status === 'OPEN';

  return (
    <DashboardLayout
      title={`Yêu cầu #${ticketId.slice(-6)}`}
      subtitle={ticket.location.address_text}
      onRefresh={() => refetch()}
    >
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon('back')}
        </button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Status Card */}
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                </div>
                <button
                  onClick={() => setShowUpdateStatusModal(true)}
                  disabled={isCompleted || isCancelled}
                  className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Edit className="h-4 w-4" />
                  {t('update')}
                </button>
              </div>

              {/* Timeline */}
              {!isCancelled && (
                <div className="mt-6">
                  <h3 className="mb-4 font-semibold">{t('progress')}</h3>
                  <div className="flex items-center">
                    {timelineSteps.map((step, index) => {
                      const isCompleted = index <= currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div key={step.status} className="flex flex-1 items-center">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                isCompleted
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                            >
                              {isCompleted ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <span
                              className={`mt-2 text-xs ${
                                isCompleted
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {index < timelineSteps.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 ${
                                index < currentStepIndex
                                  ? 'bg-green-500'
                                  : 'bg-muted'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cancelled notice */}
              {isCancelled && (
                <div className="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">{t('cancelledNotice')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Victim Info */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">{t('victimInfo')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Phone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('phoneNumber')}</p>
                    <a
                      href={`tel:${ticket.victim_info.phone}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {formatPhone(ticket.victim_info.phone)}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('peopleCount')}</p>
                    <p className="font-medium">
                      {t('peopleCountValue', { count: ticket.victim_info.people_count })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <MapPin className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('location')}</p>
                    <p className="font-medium">{ticket.location.address_text}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.location.lat.toFixed(6)},{' '}
                      {ticket.location.lng.toFixed(6)}
                    </p>
                    <button
                      onClick={() =>
                        window.open(
                          `https://www.google.com/maps/dir/?api=1&destination=${ticket.location.lat},${ticket.location.lng}`,
                          '_blank'
                        )
                      }
                      className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <Navigation className="h-4 w-4" />
                      {t('viewOnMap')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Special Needs */}
              {(ticket.victim_info.has_elderly ||
                ticket.victim_info.has_children ||
                ticket.victim_info.has_disabled) && (
                <div className="mt-4 border-t pt-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">
                    {t('specialNeeds')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ticket.victim_info.has_elderly && (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">
                        👴 {t('hasElderly')}
                      </span>
                    )}
                    {ticket.victim_info.has_children && (
                      <span className="rounded-full bg-pink-100 px-3 py-1 text-sm text-pink-700">
                        👶 {t('hasChildren')}
                      </span>
                    )}
                    {ticket.victim_info.has_disabled && (
                      <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                        ♿ {t('hasDisabled')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Note */}
              {ticket.victim_info.note && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <p className="text-sm">{ticket.victim_info.note}</p>
                </div>
              )}
            </div>

            {/* Verification */}
            {ticket.verification_image_url && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="mb-4 font-semibold">{t('verification')}</h3>
                <div className="flex gap-4">
                  <img
                    src={ticket.verification_image_url}
                    alt="Verification"
                    className="h-48 w-48 rounded-lg object-cover"
                  />
                  {ticket.verification_result && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle
                          className={`h-5 w-5 ${
                            ticket.verification_result.is_valid
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}
                        />
                        <span className="font-medium">
                          {ticket.verification_result.is_valid
                            ? t('verificationSuccess')
                            : t('verificationFailed')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('confidence')}:{' '}
                        {(ticket.verification_result.confidence_score * 100).toFixed(0)}%
                      </p>
                      {ticket.verification_result.notes && (
                        <p className="text-sm text-muted-foreground">
                          {ticket.verification_result.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Rescuer */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">{t('rescueTeam')}</h3>
              {ticket.assigned_rescuer ? (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <a
                        href={`/rescuers/${ticket.assigned_rescuer_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {ticket.assigned_rescuer.name}
                      </a>
                      <p className="text-sm text-muted-foreground">
                        {VEHICLE_TYPE_NAMES[ticket.assigned_rescuer.vehicle_type]}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">{t('phone')}:</span>{' '}
                      <a
                        href={`tel:${ticket.assigned_rescuer.phone}`}
                        className="text-primary hover:underline"
                      >
                        {formatPhone(ticket.assigned_rescuer.phone)}
                      </a>
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t('rating')}:</span>{' '}
                      ⭐ {ticket.assigned_rescuer.rating.toFixed(1)}
                    </p>
                    <p>
                      <span className="text-muted-foreground">{t('missions')}:</span>{' '}
                      {ticket.assigned_rescuer.completed_missions}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <User className="mx-auto mb-2 h-12 w-12 text-muted-foreground" />
                  <p className="mb-3 text-muted-foreground">{t('notAssigned')}</p>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    disabled={!canAssign}
                    className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('assignNow')}
                  </button>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">{t('time')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">{t('createdAt')}</p>
                    <p className="font-medium">{formatDateTime(ticket.created_at)}</p>
                  </div>
                </div>
                {ticket.updated_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">{t('updatedAt')}</p>
                      <p className="font-medium">
                        {formatDateTime(ticket.updated_at)}
                      </p>
                    </div>
                  </div>
                )}
                {ticket.completed_at && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-muted-foreground">{t('completedAt')}</p>
                      <p className="font-medium">
                        {formatDateTime(ticket.completed_at)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl border bg-card p-6">
              <h3 className="mb-4 font-semibold">{t('actions')}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowUpdateStatusModal(true)}
                  disabled={isCompleted || isCancelled}
                  className="w-full rounded-lg bg-muted py-2 text-sm font-medium hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('updateStatus')}
                </button>
                <button
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isCompleted || isCancelled}
                  className="w-full rounded-lg bg-red-100 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('cancelRequest')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Rescuer Modal */}
      <AssignRescuerModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        ticket={ticket}
        onSuccess={() => refetch()}
      />

      {/* Update Status Modal */}
      <UpdateStatusModal
        isOpen={showUpdateStatusModal}
        onClose={() => setShowUpdateStatusModal(false)}
        ticket={ticket}
        onSuccess={() => refetch()}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={() => cancelMutation.mutate()}
        title={t('cancelDialogTitle')}
        message={t('cancelDialogMessage', { id: ticket.ticket_id.slice(-6) })}
        confirmText={t('cancelRequest')}
        variant="danger"
        isLoading={cancelMutation.isPending}
      />
    </DashboardLayout>
  );
}
