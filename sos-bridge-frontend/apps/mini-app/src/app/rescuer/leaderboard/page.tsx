'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Award, Crown } from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useQuery } from '@tanstack/react-query';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { Rescuer } from '@sos-bridge/types';
import { VEHICLE_TYPE_EMOJIS } from '@sos-bridge/types';
import { Spinner } from '@sos-bridge/ui';

export default function LeaderboardPage() {
  const router = useRouter();
  const { user } = useTelegram();
  const backButton = useBackButton();

  // Back button
  useEffect(() => {
    backButton.show(() => router.push('/rescuer'));
    return () => backButton.hide();
  }, [backButton, router]);

  // Fetch all rescuers
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.rescuers.all,
    queryFn: () => apiClient.getRescuers({ limit: 50 }),
  });

  // Sort by completed missions
  const rescuers = (data?.data?.data || []).sort(
    (a, b) => b.completed_missions - a.completed_missions
  );

  // Get current user's rescuer
  const { data: myRescuerData } = useQuery({
    queryKey: queryKeys.rescuers.byTelegram(user?.id || 0),
    queryFn: () => apiClient.getRescuerByTelegramId(user?.id || 0),
    enabled: !!user?.id,
  });

  const myRescuer = myRescuerData?.data;
  const myRank = rescuers.findIndex(
    (r) => r.rescuer_id === myRescuer?.rescuer_id
  ) + 1;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white safe-top safe-bottom">
      {/* Header */}
      <header className="px-4 py-6 text-center">
        <Trophy className="mx-auto mb-2 h-12 w-12 text-yellow-500" />
        <h1 className="text-2xl font-bold text-gray-900">Bảng Vinh Danh</h1>
        <p className="text-sm text-gray-500">
          Những người hùng cứu hộ hàng đầu
        </p>
      </header>

      {/* My Rank Card */}
      {myRescuer && myRank > 0 && (
        <div className="px-4 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <span className="text-xl font-bold">#{myRank}</span>
                </div>
                <div>
                  <p className="font-semibold">{myRescuer.name}</p>
                  <p className="text-sm text-blue-100">Xếp hạng của bạn</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {myRescuer.completed_missions}
                </p>
                <p className="text-sm text-blue-100">nhiệm vụ</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Top 3 Podium */}
      <div className="px-4 mb-6">
        <div className="flex items-end justify-center gap-2">
          {/* 2nd Place */}
          {rescuers[1] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex w-24 flex-col items-center"
            >
              <div className="mb-2 text-center">
                <Medal className="mx-auto h-6 w-6 text-gray-400" />
                <p className="mt-1 truncate text-sm font-medium text-gray-700">
                  {rescuers[1].name}
                </p>
                <p className="text-xs text-gray-500">
                  {rescuers[1].completed_missions} NV
                </p>
              </div>
              <div className="h-20 w-full rounded-t-lg bg-gray-200 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-500">2</span>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {rescuers[0] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex w-28 flex-col items-center"
            >
              <div className="mb-2 text-center">
                <Crown className="mx-auto h-8 w-8 text-yellow-500" />
                <p className="mt-1 truncate text-sm font-bold text-gray-900">
                  {rescuers[0].name}
                </p>
                <p className="text-xs text-gray-500">
                  {rescuers[0].completed_missions} NV
                </p>
              </div>
              <div className="h-28 w-full rounded-t-lg bg-gradient-to-b from-yellow-400 to-yellow-500 flex items-center justify-center shadow-md">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {rescuers[2] && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex w-24 flex-col items-center"
            >
              <div className="mb-2 text-center">
                <Medal className="mx-auto h-6 w-6 text-amber-600" />
                <p className="mt-1 truncate text-sm font-medium text-gray-700">
                  {rescuers[2].name}
                </p>
                <p className="text-xs text-gray-500">
                  {rescuers[2].completed_missions} NV
                </p>
              </div>
              <div className="h-16 w-full rounded-t-lg bg-amber-200 flex items-center justify-center">
                <span className="text-2xl font-bold text-amber-700">3</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Full List */}
      <main className="px-4 pb-8">
        <h2 className="mb-3 font-semibold text-gray-700">Tất cả đội cứu hộ</h2>
        <div className="space-y-2">
          {rescuers.map((rescuer, index) => (
            <motion.div
              key={rescuer.rescuer_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ${
                rescuer.rescuer_id === myRescuer?.rescuer_id
                  ? 'ring-2 ring-blue-400'
                  : ''
              }`}
            >
              {/* Rank */}
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  index === 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : index === 1
                    ? 'bg-gray-100 text-gray-600'
                    : index === 2
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-50 text-gray-500'
                }`}
              >
                {index + 1}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">
                    {rescuer.name}
                  </span>
                  <span className="text-sm">
                    {VEHICLE_TYPE_EMOJIS[rescuer.vehicle_type]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{rescuer.rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Missions */}
              <div className="text-right">
                <p className="font-bold text-gray-800">
                  {rescuer.completed_missions}
                </p>
                <p className="text-xs text-gray-400">nhiệm vụ</p>
              </div>
            </motion.div>
          ))}

          {rescuers.length === 0 && (
            <div className="py-12 text-center text-gray-500">
              Chưa có đội cứu hộ nào
            </div>
          )}
        </div>
      </main>
    </div>
  );
}






