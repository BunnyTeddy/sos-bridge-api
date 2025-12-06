'use client';

import * as React from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Phone,
  MapPin,
  Users,
  AlertTriangle,
  FileText,
  User,
} from 'lucide-react';
import { Modal, ModalBody, ModalFooter } from './modal';
import { Button } from '@sos-bridge/ui';
import { apiClient, queryKeys } from '@sos-bridge/api-client';
import type { PriorityLevel } from '@sos-bridge/types';
import { PRIORITY_LABELS } from '@sos-bridge/types';

export interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  phone: string;
  lat: string;
  lng: string;
  address_text: string;
  people_count: number;
  priority: PriorityLevel;
  note: string;
  has_elderly: boolean;
  has_children: boolean;
  has_disabled: boolean;
}

const initialFormData: FormData = {
  phone: '',
  lat: '',
  lng: '',
  address_text: '',
  people_count: 1,
  priority: 3,
  note: '',
  has_elderly: false,
  has_children: false,
  has_disabled: false,
};

// Default location for central Vietnam (Huế)
const DEFAULT_LOCATION = {
  lat: 16.4637,
  lng: 107.5909,
};

export function CreateTicketModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTicketModalProps) {
  const t = useTranslations('modal.createTicket');
  const tc = useTranslations('common');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const queryClient = useQueryClient();

  // Create ticket mutation
  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.createTicket({
        phone: formData.phone,
        lat: parseFloat(formData.lat) || DEFAULT_LOCATION.lat,
        lng: parseFloat(formData.lng) || DEFAULT_LOCATION.lng,
        address_text: formData.address_text || `${formData.lat}, ${formData.lng}`,
        people_count: formData.people_count,
        priority: formData.priority,
        note: formData.note,
        has_elderly: formData.has_elderly,
        has_children: formData.has_children,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
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

    // Phone validation (Vietnamese phone format)
    if (!formData.phone) {
      newErrors.phone = t('phoneRequired');
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = t('phoneInvalid');
    }

    // Location validation
    if (!formData.lat || !formData.lng) {
      newErrors.lat = t('locationRequired');
    } else {
      const lat = parseFloat(formData.lat);
      const lng = parseFloat(formData.lng);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        newErrors.lat = t('latInvalid');
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        newErrors.lng = t('lngInvalid');
      }
    }

    // People count validation
    if (formData.people_count < 1) {
      newErrors.people_count = t('peopleCountRequired');
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
      title={t('title')}
      subtitle={t('subtitle')}
      size="lg"
    >
      <ModalBody>
        <div className="space-y-4">
          {/* Phone */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {t('phone')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder={t('phonePlaceholder')}
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
                {t('location')} <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-xs text-primary hover:underline"
              >
                {t('useCurrentLocation')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="text"
                  value={formData.lat}
                  onChange={(e) => handleChange('lat', e.target.value)}
                  placeholder={t('latPlaceholder')}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.lat
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-border focus:border-primary focus:ring-primary'
                  }`}
                />
                {errors.lat && (
                  <p className="mt-1 text-xs text-red-500">{errors.lat}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  value={formData.lng}
                  onChange={(e) => handleChange('lng', e.target.value)}
                  placeholder={t('lngPlaceholder')}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                    errors.lng
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-border focus:border-primary focus:ring-primary'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {t('addressDetail')}
            </label>
            <input
              type="text"
              value={formData.address_text}
              onChange={(e) => handleChange('address_text', e.target.value)}
              placeholder={t('addressPlaceholder')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* People count and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-muted-foreground" />
                {t('peopleCount')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.people_count}
                onChange={(e) => handleChange('people_count', parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                {t('priority')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', parseInt(e.target.value) as PriorityLevel)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {([1, 2, 3, 4, 5] as PriorityLevel[]).map((level) => (
                  <option key={level} value={level}>
                    {PRIORITY_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Special needs */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              {t('specialNeeds')}
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.has_elderly}
                  onChange={(e) => handleChange('has_elderly', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>👴 {t('hasElderly')}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.has_children}
                  onChange={(e) => handleChange('has_children', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>👶 {t('hasChildren')}</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.has_disabled}
                  onChange={(e) => handleChange('has_disabled', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>♿ {t('hasDisabled')}</span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {t('additionalNote')}
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleChange('note', e.target.value)}
              placeholder={t('notePlaceholder')}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Error message */}
          {createMutation.isError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {t('createError')}
            </div>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          {tc('cancel')}
        </Button>
        <Button onClick={handleSubmit} isLoading={createMutation.isPending}>
          {t('createButton')}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

