'use client';

import { 
  AlertTriangle, 
  CheckCircle, 
  UserPlus, 
  Truck, 
  DollarSign,
  Clock 
} from 'lucide-react';
import { formatRelativeTime } from '@sos-bridge/ui';
import type { RescueTicket, Rescuer, RewardTransaction } from '@sos-bridge/types';

type ActivityType = 'ticket_created' | 'ticket_assigned' | 'ticket_completed' | 'rescuer_online' | 'payout_sent';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

const activityIcons: Record<ActivityType, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  ticket_created: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  ticket_assigned: { icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100' },
  ticket_completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  rescuer_online: { icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-100' },
  payout_sent: { icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-100' },
};

interface ActivityFeedProps {
  activities: Activity[];
  maxItems?: number;
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold text-foreground">Hoạt động gần đây</h3>
        <button className="text-sm text-primary hover:underline">
          Xem tất cả
        </button>
      </div>
      <div className="divide-y">
        {displayActivities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Chưa có hoạt động nào
          </div>
        ) : (
          displayActivities.map((activity) => {
            const { icon: Icon, color, bg } = activityIcons[activity.type];
            return (
              <div key={activity.id} className="flex gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{activity.title}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatRelativeTime(activity.timestamp)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper function to create activities from system data
export function createActivitiesFromData(
  tickets: RescueTicket[],
  rescuers: Rescuer[],
  transactions: RewardTransaction[]
): Activity[] {
  const activities: Activity[] = [];

  // Add recent tickets
  tickets.slice(0, 5).forEach((ticket) => {
    if (ticket.status === 'OPEN') {
      activities.push({
        id: `ticket-${ticket.ticket_id}`,
        type: 'ticket_created',
        title: 'Yêu cầu cứu hộ mới',
        description: `${ticket.victim_info.people_count} người tại ${ticket.location.address_text}`,
        timestamp: ticket.created_at,
      });
    } else if (ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS') {
      activities.push({
        id: `assign-${ticket.ticket_id}`,
        type: 'ticket_assigned',
        title: 'Đã gán đội cứu hộ',
        description: ticket.location.address_text,
        timestamp: ticket.updated_at || ticket.created_at,
      });
    } else if (ticket.status === 'COMPLETED') {
      activities.push({
        id: `complete-${ticket.ticket_id}`,
        type: 'ticket_completed',
        title: 'Hoàn thành cứu hộ',
        description: `${ticket.victim_info.people_count} người đã được cứu`,
        timestamp: ticket.completed_at || ticket.updated_at || ticket.created_at,
      });
    }
  });

  // Add recent transactions
  transactions.slice(0, 3).forEach((tx) => {
    if (tx.status === 'CONFIRMED') {
      activities.push({
        id: `tx-${tx.tx_id}`,
        type: 'payout_sent',
        title: 'Đã chuyển thưởng',
        description: `${tx.amount_usdc} USDC cho đội cứu hộ`,
        timestamp: tx.confirmed_at || tx.created_at,
      });
    }
  });

  // Sort by timestamp descending
  return activities.sort((a, b) => b.timestamp - a.timestamp);
}






