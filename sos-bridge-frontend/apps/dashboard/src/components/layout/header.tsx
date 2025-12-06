'use client';

import { Bell, Search, RefreshCw, AlertTriangle, CheckCircle, Ticket, User, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import { formatRelativeTime } from '@sos-bridge/ui';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
}

interface Notification {
  id: string;
  type: 'ticket_new' | 'ticket_completed' | 'rescuer_online' | 'alert';
  title: string;
  message: string;
  time: number;
  read: boolean;
  link?: string;
}

export function Header({ title, subtitle, onRefresh }: HeaderProps) {
  const t = useTranslations('header');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Fetch recent data for notifications
  const { data: ticketsData } = useQuery({
    queryKey: queryKeys.tickets.list({ limit: 5 }),
    queryFn: () => apiClient.getTickets({ limit: 5 }),
    refetchInterval: 30000,
  });

  const { data: statsData } = useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => apiClient.getStats(),
    refetchInterval: 30000,
  });

  // Generate notifications from recent data
  const notifications: Notification[] = [];
  
  const recentTickets = ticketsData?.data?.data || [];
  const stats = statsData?.data;

  // Add notifications for recent open tickets
  recentTickets
    .filter((tk) => tk.status === 'OPEN')
    .slice(0, 3)
    .forEach((ticket) => {
      notifications.push({
        id: `ticket-${ticket.ticket_id}`,
        type: 'ticket_new',
        title: t('newRequest'),
        message: `#${ticket.ticket_id.slice(-6)} - ${ticket.location.address_text.slice(0, 30)}...`,
        time: ticket.created_at,
        read: false,
        link: `/tickets/${ticket.ticket_id}`,
      });
    });

  // Add notification for completed tickets
  recentTickets
    .filter((tk) => tk.status === 'COMPLETED')
    .slice(0, 2)
    .forEach((ticket) => {
      notifications.push({
        id: `completed-${ticket.ticket_id}`,
        type: 'ticket_completed',
        title: t('missionComplete'),
        message: t('missionCompleteMessage', { id: ticket.ticket_id.slice(-6) }),
        time: ticket.completed_at || ticket.updated_at,
        read: true,
        link: `/tickets/${ticket.ticket_id}`,
      });
    });

  // Sort by time
  notifications.sort((a, b) => b.time - a.time);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link);
    }
    setShowNotifications(false);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'ticket_new':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'ticket_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rescuer_online':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Ticket className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        {showSearch ? (
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="h-9 w-64 rounded-lg border bg-background pl-10 pr-8 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        {/* Refresh */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-12 z-20 w-80 rounded-xl border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <h3 className="font-semibold">{t('notifications')}</h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      {t('newCount', { count: unreadCount })}
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Bell className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p className="text-sm">{t('noNotifications')}</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted ${
                            !notification.read ? 'bg-blue-50/50' : ''
                          }`}
                        >
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                              {notification.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatRelativeTime(notification.time)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t p-2">
                  <button
                    onClick={() => {
                      router.push('/tickets');
                      setShowNotifications(false);
                    }}
                    className="w-full rounded-lg py-2 text-center text-sm text-primary hover:bg-muted"
                  >
                    {t('viewAllRequests')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
