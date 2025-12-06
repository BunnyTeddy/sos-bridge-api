'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Ticket,
  Users,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, LanguageSwitcher } from '@sos-bridge/ui';

export function Sidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();

  const navigation = [
    { name: t('overview'), href: '/', icon: LayoutDashboard },
    { name: t('map'), href: '/map', icon: Map },
    { name: t('rescueRequests'), href: '/tickets', icon: Ticket },
    { name: t('rescueTeams'), href: '/rescuers', icon: Users },
    { name: t('treasury'), href: '/treasury', icon: Wallet },
    { name: t('analytics'), href: '/analytics', icon: BarChart3 },
    { name: t('settings'), href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500">
          <AlertTriangle className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-foreground">SOS-Bridge</h1>
          <p className="text-xs text-muted-foreground">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Language Switcher */}
      <div className="border-t p-4">
        <LanguageSwitcher variant="pill" size="sm" className="w-full justify-center" />
      </div>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t('admin')}</p>
            <p className="text-xs text-muted-foreground">admin@sos-bridge.vn</p>
          </div>
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" title={t('logout')}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
