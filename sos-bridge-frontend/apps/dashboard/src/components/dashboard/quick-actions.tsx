'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Send, UserPlus, AlertCircle, Map, Ticket } from 'lucide-react';
import { CreateTicketModal } from '@/components/modals/create-ticket-modal';
import { ConfirmDialog } from '@/components/modals/confirm-dialog';

interface QuickAction {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export function QuickActions() {
  const router = useRouter();
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);

  const actions: QuickAction[] = [
    {
      label: 'Tạo yêu cầu',
      icon: Plus,
      onClick: () => setShowCreateTicketModal(true),
    },
    {
      label: 'Xem bản đồ',
      icon: Map,
      onClick: () => router.push('/map'),
    },
    {
      label: 'Đội cứu hộ',
      icon: UserPlus,
      onClick: () => router.push('/rescuers'),
    },
    {
      label: 'Phát cảnh báo',
      icon: AlertCircle,
      onClick: () => setShowBroadcastDialog(true),
      variant: 'destructive',
    },
  ];

  const handleBroadcastAlert = async () => {
    // In a real implementation, this would send a broadcast to all rescuers
    // For now, we'll just show a success message
    console.log('Broadcasting emergency alert to all rescuers...');
    setShowBroadcastDialog(false);
    // You could integrate with a toast notification here
  };

  return (
    <>
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-4 font-semibold text-foreground">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                action.variant === 'destructive'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={showCreateTicketModal}
        onClose={() => setShowCreateTicketModal(false)}
        onSuccess={() => {
          setShowCreateTicketModal(false);
          // Optionally navigate to tickets page
          router.push('/tickets');
        }}
      />

      {/* Broadcast Alert Confirmation */}
      <ConfirmDialog
        isOpen={showBroadcastDialog}
        onClose={() => setShowBroadcastDialog(false)}
        onConfirm={handleBroadcastAlert}
        title="Phát cảnh báo khẩn cấp"
        message="Bạn có chắc muốn phát cảnh báo khẩn cấp đến tất cả đội cứu hộ? Tính năng này chỉ nên dùng trong trường hợp khẩn cấp thực sự."
        confirmText="Phát cảnh báo"
        variant="danger"
      />
    </>
  );
}
