'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Wallet,
  Star,
  Award,
  ChevronRight,
  Truck,
  Edit3,
  LogOut,
  Copy,
  Check,
  DollarSign,
} from 'lucide-react';
import { useTelegram, useHaptic, useBackButton } from '@/hooks/useTelegram';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { Rescuer } from '@sos-bridge/types';
import { VEHICLE_TYPE_NAMES, VEHICLE_TYPE_EMOJIS } from '@sos-bridge/types';
import { formatCurrency, truncateAddress } from '@sos-bridge/ui';
import { Spinner, Button } from '@sos-bridge/ui';

export default function RescuerProfilePage() {
  const router = useRouter();
  const { user, webApp } = useTelegram();
  const haptic = useHaptic();
  const backButton = useBackButton();
  const [copiedWallet, setCopiedWallet] = useState(false);

  // Fetch rescuer profile
  const { data: rescuerData, isLoading, refetch } = useQuery({
    queryKey: queryKeys.rescuers.byTelegram(user?.id || 0),
    queryFn: () => apiClient.getRescuerByTelegramId(user?.id || 0),
    enabled: !!user?.id,
  });

  const rescuer = rescuerData?.data;

  // Back button
  useEffect(() => {
    backButton.show(() => router.push('/rescuer'));
    return () => backButton.hide();
  }, [backButton, router]);

  // Copy wallet address
  const handleCopyWallet = () => {
    if (rescuer?.wallet_address) {
      navigator.clipboard.writeText(rescuer.wallet_address);
      setCopiedWallet(true);
      haptic.notification('success');
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  // Handle wallet link
  const handleLinkWallet = () => {
    webApp?.showAlert(
      'Tính năng liên kết ví sẽ được cập nhật. Hiện tại hãy sử dụng lệnh /wallet trong chat bot.'
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Not registered yet
  if (!rescuer) {
    return <RegisterPrompt router={router} webApp={webApp} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-top safe-bottom">
      {/* Header with Profile Card */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 pb-8 pt-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Hồ sơ</h1>
          <button className="rounded-full bg-white/20 p-2">
            <Edit3 className="h-5 w-5 text-white" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white p-4 shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{rescuer.name}</h2>
              <p className="text-sm text-gray-500">
                {VEHICLE_TYPE_EMOJIS[rescuer.vehicle_type]}{' '}
                {VEHICLE_TYPE_NAMES[rescuer.vehicle_type]} •{' '}
                {rescuer.vehicle_capacity} người
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-yellow-500">
                <Star className="h-5 w-5 fill-yellow-400" />
                <span className="text-lg font-bold">{rescuer.rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-400">Đánh giá</p>
            </div>
          </div>
        </motion.div>
      </div>

      <main className="px-4 py-4">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 grid grid-cols-2 gap-3"
        >
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Award className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {rescuer.completed_missions}
            </p>
            <p className="text-sm text-gray-500">Nhiệm vụ hoàn thành</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(rescuer.completed_missions * 5).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">USDC đã nhận</p>
          </div>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 rounded-xl bg-white p-4 shadow-sm"
        >
          <h3 className="mb-3 font-semibold text-gray-800">Thông tin liên hệ</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Phone className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Số điện thoại</p>
                <p className="font-medium text-gray-900">{rescuer.phone}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Wallet */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4 rounded-xl bg-white p-4 shadow-sm"
        >
          <h3 className="mb-3 font-semibold text-gray-800">Ví nhận thưởng</h3>
          {rescuer.wallet_address ? (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-500" />
                <span className="font-mono text-sm text-gray-700">
                  {truncateAddress(rescuer.wallet_address, 8, 6)}
                </span>
              </div>
              <button
                onClick={handleCopyWallet}
                className="rounded-lg bg-gray-200 p-2"
              >
                {copiedWallet ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-500" />
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={handleLinkWallet}
              className="flex w-full items-center justify-between rounded-lg border-2 border-dashed border-gray-300 p-3 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
            >
              <span className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Liên kết ví để nhận thưởng
              </span>
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Phần thưởng USDC sẽ được chuyển tự động sau mỗi nhiệm vụ
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-2"
        >
          <button
            onClick={() => router.push('/rescuer/leaderboard')}
            className="flex w-full items-center justify-between rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <span className="font-medium text-gray-800">Bảng xếp hạng</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>

          <button
            onClick={() => router.push('/history')}
            className="flex w-full items-center justify-between rounded-xl bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <Truck className="h-5 w-5 text-gray-600" />
              </div>
              <span className="font-medium text-gray-800">Lịch sử nhiệm vụ</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </button>
        </motion.div>
      </main>
    </div>
  );
}

function RegisterPrompt({ router, webApp }: { router: any; webApp: any }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
          <Truck className="h-12 w-12 text-blue-500" />
        </div>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Đăng ký đội cứu hộ
        </h1>
        <p className="mb-6 text-gray-600">
          Tham gia đội ngũ cứu hộ tình nguyện và nhận thưởng USDC cho mỗi nhiệm
          vụ hoàn thành.
        </p>

        <div className="mb-6 rounded-xl bg-white p-4 text-left shadow-sm">
          <h3 className="mb-2 font-semibold text-gray-800">Quyền lợi:</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Nhận 5 USDC cho mỗi nhiệm vụ hoàn thành
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Xếp hạng trên bảng vinh danh
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Tích lũy điểm uy tín
            </li>
          </ul>
        </div>

        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={() => {
            webApp?.showAlert(
              'Để đăng ký, hãy gửi lệnh /register trong chat với bot SOS-Bridge.'
            );
          }}
        >
          Đăng ký ngay
        </Button>

        <button
          onClick={() => router.push('/rescuer')}
          className="mt-4 text-sm text-gray-500"
        >
          Quay lại
        </button>
      </motion.div>
    </div>
  );
}







