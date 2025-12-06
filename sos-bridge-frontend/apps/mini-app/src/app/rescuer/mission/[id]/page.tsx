'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Phone,
  Navigation,
  Camera,
  CheckCircle,
  Users,
  Clock,
  Upload,
  X,
} from 'lucide-react';
import { MiniMap } from '@/components/MiniMap';
import { useTelegram, useHaptic, useBackButton, useMainButton } from '@/hooks/useTelegram';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { RescueTicket } from '@sos-bridge/types';
import { STATUS_LABELS, PRIORITY_LABELS, PRIORITY_COLORS } from '@sos-bridge/types';
import { formatRelativeTime, formatPhone } from '@sos-bridge/ui';
import { Spinner, Button } from '@sos-bridge/ui';

export default function ActiveMissionPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { webApp } = useTelegram();
  const haptic = useHaptic();
  const backButton = useBackButton();
  const mainButton = useMainButton();
  const queryClient = useQueryClient();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [verificationImage, setVerificationImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch ticket
  const { data: ticketResponse, isLoading } = useQuery({
    queryKey: queryKeys.tickets.detail(ticketId),
    queryFn: () => apiClient.getTicket(ticketId),
    refetchInterval: 10000,
  });

  const ticket = ticketResponse?.data;

  // Complete mission mutation
  const completeMutation = useMutation({
    mutationFn: (imageUrl: string) => apiClient.completeMission(ticketId, imageUrl),
    onSuccess: (response) => {
      if (response.success) {
        haptic.notification('success');
        queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(ticketId) });
        setShowCompleteModal(false);
        // Show success message
        webApp?.showAlert('Nhiệm vụ đã hoàn thành! Phần thưởng sẽ được chuyển sau khi xác thực.');
      }
    },
    onError: () => {
      haptic.notification('error');
      webApp?.showAlert('Có lỗi xảy ra. Vui lòng thử lại.');
    },
  });

  // Back button
  useEffect(() => {
    backButton.show(() => {
      if (ticket?.status === 'ASSIGNED' || ticket?.status === 'IN_PROGRESS') {
        webApp?.showConfirm(
          'Bạn có chắc muốn thoát? Nhiệm vụ vẫn đang được giao cho bạn.',
          (confirmed) => {
            if (confirmed) router.push('/rescuer');
          }
        );
      } else {
        router.push('/rescuer');
      }
    });
    return () => backButton.hide();
  }, [backButton, router, ticket, webApp]);

  // Handle image capture
  const handleCaptureImage = () => {
    // In real implementation, use camera API or file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        // Convert to base64 for demo (in production, upload to storage)
        const reader = new FileReader();
        reader.onload = () => {
          setVerificationImage(reader.result as string);
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleComplete = () => {
    if (!verificationImage) {
      webApp?.showAlert('Vui lòng chụp ảnh xác nhận cứu hộ');
      return;
    }
    completeMutation.mutate(verificationImage);
  };

  // Open navigation
  const openNavigation = () => {
    if (!ticket) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${ticket.location.lat},${ticket.location.lng}`;
    webApp?.openLink(url);
  };

  // Call victim
  const callVictim = () => {
    if (!ticket) return;
    window.location.href = `tel:${ticket.victim_info.phone}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="mb-4 text-gray-500">Không tìm thấy nhiệm vụ</p>
        <button
          onClick={() => router.push('/rescuer')}
          className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const isCompleted = ticket.status === 'VERIFIED' || ticket.status === 'COMPLETED';
  const priorityColor = PRIORITY_COLORS[ticket.priority];

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <header
        className="px-4 py-4 text-white"
        style={{ background: `linear-gradient(135deg, ${priorityColor}, ${priorityColor}dd)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm">
                {PRIORITY_LABELS[ticket.priority]}
              </span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm">
                {STATUS_LABELS[ticket.status]}
              </span>
            </div>
            <h1 className="text-xl font-bold">Nhiệm vụ #{ticketId.slice(-6)}</h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{ticket.victim_info.people_count}</p>
            <p className="text-sm text-white/80">người</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 pb-32">
        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-gray-800">Vị trí nạn nhân</span>
              </div>
              <button
                onClick={openNavigation}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-600"
              >
                <Navigation className="h-4 w-4" />
                Chỉ đường
              </button>
            </div>
            <MiniMap
              lat={ticket.location.lat}
              lng={ticket.location.lng}
              className="h-[200px]"
            />
            <p className="mt-2 text-sm text-gray-600">
              {ticket.location.address_text}
            </p>
          </div>
        </motion.div>

        {/* Victim Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-800">Thông tin nạn nhân</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{formatPhone(ticket.victim_info.phone)}</span>
                </div>
                <button
                  onClick={callVictim}
                  className="rounded-lg bg-green-500 px-4 py-1.5 text-sm font-medium text-white"
                >
                  Gọi ngay
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>{ticket.victim_info.people_count} người cần cứu</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{formatRelativeTime(ticket.created_at)}</span>
              </div>
            </div>

            {/* Special Needs */}
            {(ticket.victim_info.has_elderly ||
              ticket.victim_info.has_children ||
              ticket.victim_info.has_disabled) && (
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Lưu ý đặc biệt:
                </p>
                <div className="flex flex-wrap gap-2">
                  {ticket.victim_info.has_elderly && (
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-700">
                      👴 Người già
                    </span>
                  )}
                  {ticket.victim_info.has_children && (
                    <span className="rounded-full bg-pink-100 px-3 py-1 text-sm text-pink-700">
                      👶 Trẻ em
                    </span>
                  )}
                  {ticket.victim_info.has_disabled && (
                    <span className="rounded-full bg-purple-100 px-3 py-1 text-sm text-purple-700">
                      ♿ Người khuyết tật
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Note */}
            {ticket.victim_info.note && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <p className="text-sm text-gray-600">{ticket.victim_info.note}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Completed Status */}
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-4 rounded-2xl bg-green-50 p-6 text-center"
          >
            <CheckCircle className="mx-auto mb-3 h-16 w-16 text-green-500" />
            <h2 className="mb-2 text-xl font-bold text-green-800">
              Nhiệm vụ hoàn thành!
            </h2>
            <p className="text-green-600">
              {ticket.status === 'VERIFIED'
                ? 'Đang xử lý phần thưởng...'
                : 'Phần thưởng đã được chuyển'}
            </p>
          </motion.div>
        )}
      </main>

      {/* Complete Mission Button */}
      {!isCompleted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg safe-bottom">
          <Button
            variant="sos"
            size="lg"
            className="w-full"
            onClick={() => setShowCompleteModal(true)}
          >
            <Camera className="mr-2 h-5 w-5" />
            Xác nhận hoàn thành cứu hộ
          </Button>
        </div>
      )}

      {/* Complete Mission Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
            onClick={() => setShowCompleteModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl bg-white p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Xác nhận cứu hộ
                </h2>
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="rounded-full bg-gray-100 p-2"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <p className="mb-4 text-sm text-gray-600">
                Chụp ảnh xác nhận đã cứu hộ thành công để hoàn thành nhiệm vụ và
                nhận thưởng.
              </p>

              {/* Image Preview / Upload Area */}
              <div className="mb-6">
                {verificationImage ? (
                  <div className="relative">
                    <img
                      src={verificationImage}
                      alt="Verification"
                      className="h-48 w-full rounded-xl object-cover"
                    />
                    <button
                      onClick={() => setVerificationImage(null)}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleCaptureImage}
                    disabled={isUploading}
                    className="flex h-48 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-blue-400 hover:bg-blue-50"
                  >
                    {isUploading ? (
                      <Spinner />
                    ) : (
                      <>
                        <Camera className="mb-2 h-10 w-10 text-gray-400" />
                        <span className="font-medium text-gray-500">
                          Chụp ảnh xác nhận
                        </span>
                        <span className="text-sm text-gray-400">
                          Chụp ảnh nạn nhân đã được cứu an toàn
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <Button
                variant="sos"
                size="lg"
                className="w-full"
                onClick={handleComplete}
                isLoading={completeMutation.isPending}
                disabled={!verificationImage || completeMutation.isPending}
              >
                <CheckCircle className="mr-2 h-5 w-5" />
                Hoàn thành nhiệm vụ
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}







