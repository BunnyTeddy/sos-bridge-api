'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  Clock,
  MapPin,
  Phone,
  User,
  Navigation,
  Star,
  Truck,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { MiniMap } from '@/components/MiniMap';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import { useQuery } from '@tanstack/react-query';
import type { RescueTicket, TicketStatus } from '@sos-bridge/types';
import { STATUS_LABELS, VEHICLE_TYPE_EMOJIS, VEHICLE_TYPE_NAMES } from '@sos-bridge/types';
import { formatRelativeTime, formatPhone } from '@sos-bridge/ui';

// Timeline step definition
interface TimelineStep {
  status: TicketStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const timelineSteps: TimelineStep[] = [
  {
    status: 'OPEN',
    label: 'Đã tiếp nhận',
    description: 'Yêu cầu đang được xử lý',
    icon: <Clock className="h-4 w-4" />,
  },
  {
    status: 'ASSIGNED',
    label: 'Đã gán đội cứu hộ',
    description: 'Đội cứu hộ đã nhận nhiệm vụ',
    icon: <User className="h-4 w-4" />,
  },
  {
    status: 'IN_PROGRESS',
    label: 'Đang trên đường',
    description: 'Đội cứu hộ đang di chuyển đến bạn',
    icon: <Truck className="h-4 w-4" />,
  },
  {
    status: 'VERIFIED',
    label: 'Đã xác thực',
    description: 'Nhiệm vụ cứu hộ đã hoàn tất',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  {
    status: 'COMPLETED',
    label: 'Hoàn thành',
    description: 'Phần thưởng đã được chuyển',
    icon: <Star className="h-4 w-4" />,
  },
];

function getStepIndex(status: TicketStatus): number {
  const index = timelineSteps.findIndex((s) => s.status === status);
  return index >= 0 ? index : 0;
}

export default function TicketTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;
  const backButton = useBackButton();
  const { webApp } = useTelegram();

  console.log('[TicketPage] Rendering with ticketId:', ticketId);

  // Fetch ticket data with detailed error handling
  const {
    data: ticketResponse,
    isLoading,
    error,
    refetch,
    isRefetching,
    failureCount,
  } = useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: async () => {
      console.log('[TicketPage] Fetching ticket:', ticketId);
      const result = await apiClient.getTicket(ticketId);
      console.log('[TicketPage] Fetch result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch ticket');
      }
      return result;
    },
    refetchInterval: 10000, // Refetch every 10 seconds
    enabled: !!ticketId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const ticket = ticketResponse?.data;

  // Back button setup
  useEffect(() => {
    backButton.show(() => {
      router.push('/');
    });
    return () => backButton.hide();
  }, [backButton, router]);

  // Log errors
  useEffect(() => {
    if (error) {
      console.error('[TicketPage] Query error:', error);
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-red-200 border-t-red-500" />
          <p className="text-gray-500">Đang tải thông tin...</p>
          <p className="mt-2 text-xs text-gray-400">Mã: {ticketId}</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : ticketResponse?.error || 'Không tìm thấy yêu cầu cứu hộ';
    
    console.error('[TicketPage] Displaying error:', { error, ticketResponse, errorMessage });

    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-red-50 to-white">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          
          <h2 className="mb-2 text-lg font-bold text-gray-800">Có lỗi xảy ra</h2>
          
          <p className="mb-4 text-sm text-gray-600">
            {errorMessage}
          </p>
          
          <p className="mb-4 text-xs text-gray-400">
            Mã yêu cầu: {ticketId}
          </p>
          
          {failureCount > 0 && (
            <p className="mb-4 text-xs text-amber-600">
              Đã thử tải lại {failureCount} lần
            </p>
          )}
          
          <div className="flex flex-col gap-2">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Đang tải...' : 'Thử lại'}
            </button>
            
        <button
          onClick={() => router.push('/')}
              className="rounded-lg bg-gray-100 px-6 py-3 font-medium text-gray-700 hover:bg-gray-200"
        >
              Quay về trang chủ
        </button>
          </div>

          {/* Debug info for development */}
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-xs text-gray-400">Chi tiết lỗi (debug)</summary>
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs">
              {JSON.stringify({ error: errorMessage, ticketId, failureCount }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(ticket.status);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white safe-top safe-bottom">
      {/* Header */}
      <header className="bg-blue-50/90 px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Theo dõi cứu hộ</h1>
            <p className="text-sm text-gray-500">Mã: {ticket.ticket_id}</p>
          </div>
          <div className="rounded-full bg-blue-100 px-3 py-1">
            <span className="text-sm font-medium text-blue-700">
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-500" />
              <span className="font-semibold text-gray-800">Vị trí của bạn</span>
            </div>
            <MiniMap
              lat={ticket.location.lat}
              lng={ticket.location.lng}
              className="h-[180px]"
              markerLabel="Vị trí cần cứu hộ"
            />
            <p className="mt-2 text-sm text-gray-500">
              {ticket.location.address_text}
            </p>
          </div>
        </motion.div>

        {/* Assigned Rescuer Info */}
        <AnimatePresence>
          {ticket.assigned_rescuer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-4 text-white shadow-lg">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-green-100">
                    Đội cứu hộ của bạn
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                    {VEHICLE_TYPE_EMOJIS[ticket.assigned_rescuer.vehicle_type]}{' '}
                    {VEHICLE_TYPE_NAMES[ticket.assigned_rescuer.vehicle_type]}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold">
                      {ticket.assigned_rescuer.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-green-100">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{ticket.assigned_rescuer.rating.toFixed(1)}</span>
                      <span>•</span>
                      <span>
                        {ticket.assigned_rescuer.completed_missions} nhiệm vụ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <a
                    href={`tel:${ticket.assigned_rescuer.phone}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white py-2.5 font-medium text-green-600"
                  >
                    <Phone className="h-4 w-4" />
                    Gọi điện
                  </a>
                  <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/20 py-2.5 font-medium text-white">
                    <Navigation className="h-4 w-4" />
                    Chỉ đường
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="mb-4 font-semibold text-gray-800">Tiến trình</h3>

            <div className="relative space-y-4">
              {timelineSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.status} className="relative flex gap-3">
                    {/* Connector line */}
                    {index < timelineSteps.length - 1 && (
                      <div
                        className={`absolute left-3 top-7 h-[calc(100%+8px)] w-0.5 ${
                          index < currentStepIndex
                            ? 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-4 ${isCurrent ? '' : 'opacity-60'}`}>
                      <p
                        className={`font-medium ${
                          isCompleted ? 'text-gray-800' : 'text-gray-500'
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-sm text-gray-500">{step.description}</p>
                      {isCurrent && (
                        <p className="mt-1 text-xs text-blue-500">
                          {formatRelativeTime(ticket.updated_at || ticket.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Ticket Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-800">Thông tin yêu cầu</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Số điện thoại</span>
                <span className="font-medium text-gray-800">
                  {formatPhone(ticket.victim_info.phone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số người</span>
                <span className="font-medium text-gray-800">
                  {ticket.victim_info.people_count} người
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tạo lúc</span>
                <span className="font-medium text-gray-800">
                  {new Date(ticket.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
              {ticket.victim_info.note && (
                <div className="border-t pt-3">
                  <span className="text-gray-500">Ghi chú:</span>
                  <p className="mt-1 text-gray-800">{ticket.victim_info.note}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Emergency Contact */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Cần hỗ trợ khẩn cấp? Gọi{' '}
            <a href="tel:113" className="font-bold text-red-500">
              113
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}





