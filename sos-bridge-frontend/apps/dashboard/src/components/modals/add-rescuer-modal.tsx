'use client';

import * as React from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Phone,
  MapPin,
  Truck,
  Users,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './modal';
import { Button } from '@sos-bridge/ui';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { VehicleType } from '@sos-bridge/types';
import { VEHICLE_TYPE_NAMES } from '@sos-bridge/types';

export interface AddRescuerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  phone: string;
  lat: string;
  lng: string;
  vehicle_type: VehicleType;
  vehicle_capacity: number;
  wallet_address: string;
  telegram_user_id: string;
}

const initialFormData: FormData = {
  name: '',
  phone: '',
  lat: '',
  lng: '',
  vehicle_type: 'boat',
  vehicle_capacity: 4,
  wallet_address: '',
  telegram_user_id: '',
};

// Default location for Da Nang
const DEFAULT_LOCATION = {
  lat: 16.0544,
  lng: 108.2022,
};

export function AddRescuerModal({
  isOpen,
  onClose,
  onSuccess,
}: AddRescuerModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const queryClient = useQueryClient();

  // Create rescuer mutation
  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createRescuer({
        name: formData.name,
        phone: formData.phone,
        lat: parseFloat(formData.lat) || DEFAULT_LOCATION.lat,
        lng: parseFloat(formData.lng) || DEFAULT_LOCATION.lng,
        vehicle_type: formData.vehicle_type,
        vehicle_capacity: formData.vehicle_capacity,
        wallet_address: formData.wallet_address || undefined,
        telegram_user_id: formData.telegram_user_id
          ? parseInt(formData.telegram_user_id)
          : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rescuers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
      onSuccess?.();
      handleClose();
    },
  });

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên đội cứu hộ';
    }

    // Phone validation (Vietnamese phone format)
    if (!formData.phone) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Số điện thoại không hợp lệ';
    }

    // Capacity validation
    if (formData.vehicle_capacity < 1) {
      newErrors.vehicle_capacity = 'Sức chứa phải lớn hơn 0';
    }

    // Wallet address validation (optional but if provided, must be valid)
    if (formData.wallet_address && !/^0x[a-fA-F0-9]{40}$/.test(formData.wallet_address)) {
      newErrors.wallet_address = 'Địa chỉ ví không hợp lệ (phải là địa chỉ Ethereum/Aptos)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate();
    }
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Use current location
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleChange('lat', position.coords.latitude.toString());
          handleChange('lng', position.coords.longitude.toString());
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location
          handleChange('lat', DEFAULT_LOCATION.lat.toString());
          handleChange('lng', DEFAULT_LOCATION.lng.toString());
        }
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Thêm đội cứu hộ mới"
      subtitle="Nhập thông tin đội cứu hộ để đăng ký vào hệ thống"
      size="lg"
    >
      <ModalBody>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              Tên đội cứu hộ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="VD: Đội cứu hộ Sông Hương"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.name
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="0901234567"
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                errors.phone
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
            />
            {errors.phone && (
              <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Vị trí hiện tại
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-xs text-primary hover:underline"
              >
                Dùng vị trí hiện tại
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={formData.lat}
                onChange={(e) => handleChange('lat', e.target.value)}
                placeholder="Vĩ độ (VD: 16.0544)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                value={formData.lng}
                onChange={(e) => handleChange('lng', e.target.value)}
                placeholder="Kinh độ (VD: 108.2022)"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Để trống sẽ sử dụng vị trí mặc định (Đà Nẵng)
            </p>
          </div>

          {/* Vehicle type and capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Loại phương tiện <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => handleChange('vehicle_type', e.target.value as VehicleType)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(Object.entries(VEHICLE_TYPE_NAMES) as [VehicleType, string][]).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                Sức chứa (người) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.vehicle_capacity}
                onChange={(e) =>
                  handleChange('vehicle_capacity', parseInt(e.target.value) || 1)
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  errors.vehicle_capacity
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-border focus:border-primary focus:ring-primary'
                }`}
              />
              {errors.vehicle_capacity && (
                <p className="mt-1 text-xs text-red-500">{errors.vehicle_capacity}</p>
              )}
            </div>
          </div>

          {/* Wallet address */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Địa chỉ ví blockchain
            </label>
            <input
              type="text"
              value={formData.wallet_address}
              onChange={(e) => handleChange('wallet_address', e.target.value)}
              placeholder="0x..."
              className={`w-full rounded-lg border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 ${
                errors.wallet_address
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-border focus:border-primary focus:ring-primary'
              }`}
            />
            {errors.wallet_address && (
              <p className="mt-1 text-xs text-red-500">{errors.wallet_address}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Địa chỉ ví để nhận thưởng (tùy chọn)
            </p>
          </div>

          {/* Telegram ID */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Telegram User ID
            </label>
            <input
              type="text"
              value={formData.telegram_user_id}
              onChange={(e) => handleChange('telegram_user_id', e.target.value)}
              placeholder="VD: 123456789"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              ID Telegram để nhận thông báo nhiệm vụ (tùy chọn)
            </p>
          </div>

          {/* Error message */}
          {createMutation.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Có lỗi xảy ra khi thêm đội cứu hộ. Vui lòng thử lại.
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} isLoading={createMutation.isPending}>
          Thêm đội cứu hộ
        </Button>
      </ModalFooter>
    </Modal>
  );
}

