'use client';

import { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Chung', icon: Settings },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'blockchain', label: 'Blockchain', icon: Wallet },
    { id: 'api', label: 'API', icon: Key },
  ];

  return (
    <DashboardLayout
      title="Cài đặt hệ thống"
      subtitle="Quản lý cấu hình ứng dụng"
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
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'security' && <SecuritySettings />}
          {activeTab === 'blockchain' && <BlockchainSettings />}
          {activeTab === 'api' && <ApiSettings />}
        </div>
      </div>
    </DashboardLayout>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Thông tin hệ thống</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tên hệ thống</label>
            <input
              type="text"
              defaultValue="SOS-Bridge"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Khu vực hoạt động</label>
            <input
              type="text"
              defaultValue="Việt Nam"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Múi giờ</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option>Asia/Ho_Chi_Minh (UTC+7)</option>
              <option>Asia/Bangkok (UTC+7)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Cấu hình cứu hộ</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Phần thưởng mỗi nhiệm vụ (USDC)
            </label>
            <input
              type="number"
              defaultValue="5"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Bán kính tìm kiếm đội cứu hộ (km)
            </label>
            <input
              type="number"
              defaultValue="10"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Số nhiệm vụ tối đa/ngày/đội
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
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Telegram Bot</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Bot Token</label>
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Webhook URL</label>
            <input
              type="text"
              placeholder="https://your-domain.com/api/telegram/webhook"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Cấu hình thông báo</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Thông báo yêu cầu mới</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Thông báo nhiệm vụ hoàn thành</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Thông báo giao dịch</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Cảnh báo hệ thống</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Quản trị viên</h3>
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
          + Thêm quản trị viên
        </button>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Bảo mật</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Bật xác thực 2 lớp (2FA)</span>
            <input type="checkbox" className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Yêu cầu đăng nhập lại sau 24h</span>
            <input type="checkbox" defaultChecked className="rounded" />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}

function BlockchainSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Cấu hình Blockchain</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Mạng</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option value="base_sepolia">Base Sepolia (Testnet)</option>
              <option value="base_mainnet">Base Mainnet</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">RPC URL</label>
            <input
              type="text"
              defaultValue="https://sepolia.base.org"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              USDC Contract Address
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
        <h3 className="mb-4 font-semibold">Ví ngân quỹ</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Treasury Private Key
            </label>
            <input
              type="password"
              defaultValue="••••••••••••••••••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              ⚠️ Không chia sẻ private key với bất kỳ ai
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}

function ApiSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">API Keys</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Google API Key</label>
            <input
              type="password"
              defaultValue="••••••••••••••••"
              className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Dùng cho Gemini AI và Geocoding
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 font-semibold">Database</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Database URL</label>
            <input
              type="text"
              defaultValue="postgresql://user:pass@localhost:5432/sosbridge"
              className="w-full font-mono rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-sm text-green-700">Kết nối thành công</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}






