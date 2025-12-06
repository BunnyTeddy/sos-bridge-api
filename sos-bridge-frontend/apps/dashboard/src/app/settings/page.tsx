'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Settings,
  Bell,
  Shield,
  Database,
  Users,
  Wallet,
  Globe,
  Save,
  Key,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@sos-bridge/ui';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: t('tabs.general'), icon: Settings },
    { id: 'notifications', label: t('tabs.notifications'), icon: Bell },
    { id: 'security', label: t('tabs.security'), icon: Shield },
    { id: 'blockchain', label: t('tabs.blockchain'), icon: Wallet },
    { id: 'api', label: t('tabs.api'), icon: Key },
  ];

  return (
    <DashboardLayout
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'general' && <GeneralSettings t={t} />}
          {activeTab === 'notifications' && <NotificationSettings t={t} />}
          {activeTab === 'security' && <SecuritySettings t={t} />}
          {activeTab === 'blockchain' && <BlockchainSettings t={t} />}
          {activeTab === 'api' && <ApiSettings t={t} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function GeneralSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('general.systemInfo')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('general.systemName')}</label>
            <input
              type="text"
              defaultValue="SOS-Bridge"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('general.operatingRegion')}</label>
            <input
              type="text"
              defaultValue="Vietnam"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('general.timezone')}</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option>Asia/Ho_Chi_Minh (UTC+7)</option>
              <option>Asia/Bangkok (UTC+7)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('general.rescueConfig')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('general.rewardPerMission')}
            </label>
            <input
              type="number"
              defaultValue="5"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('general.searchRadius')}
            </label>
            <input
              type="number"
              defaultValue="10"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('general.maxMissionsPerDay')}
            </label>
            <input
              type="number"
              defaultValue="5"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}

function NotificationSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('notifications.telegramBot')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('notifications.botToken')}</label>
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('notifications.webhookUrl')}</label>
            <input
              type="text"
              placeholder="https://your-domain.com/api/telegram/webhook"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('notifications.config')}</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">{t('notifications.newRequest')}</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">{t('notifications.missionComplete')}</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">{t('notifications.transaction')}</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">{t('notifications.systemAlert')}</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}

function SecuritySettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('security.administrators')}</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted p-3">
            <div>
              <p className="font-medium">admin@sos-bridge.vn</p>
              <p className="text-sm text-muted-foreground">Super Admin</p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
              Active
            </span>
          </div>
        </div>
        <button className="mt-3 text-sm text-primary hover:underline">
          + {t('security.addAdmin')}
        </button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('security.title')}</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">{t('security.enable2FA')}</span>
            <input type="checkbox" className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">{t('security.reloginAfter24h')}</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}

function BlockchainSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('blockchain.config')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('blockchain.network')}</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="base_sepolia">Base Sepolia (Testnet)</option>
              <option value="base_mainnet">Base Mainnet</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('blockchain.rpcUrl')}</label>
            <input
              type="text"
              defaultValue="https://sepolia.base.org"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('blockchain.usdcContract')}
            </label>
            <input
              type="text"
              defaultValue="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
              className="w-full font-mono rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('blockchain.treasuryWallet')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('blockchain.privateKey')}
            </label>
            <input
              type="password"
              defaultValue="••••••••••••••••••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              ⚠️ {t('blockchain.privateKeyWarning')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}

function ApiSettings({ t }: { t: any }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('api.apiKeys')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('api.googleApiKey')}</label>
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t('api.googleApiKeyDesc')}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">{t('api.database')}</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('api.databaseUrl')}</label>
            <input
              type="text"
              defaultValue="postgresql://user:pass@localhost:5432/sosbridge"
              className="w-full font-mono rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-green-700">{t('api.connectionSuccess')}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          {t('saveChanges')}
        </Button>
      </div>
    </div>
  );
}






