'use client';

import * as React from 'react';
import { cn } from '../utils';
import { Badge } from './Badge';
import type { PriorityLevel } from '@sos-bridge/types';
import { PRIORITY_LABELS } from '@sos-bridge/types';

export interface PriorityBadgeProps {
  priority: PriorityLevel;
  className?: string;
}

const priorityStyles: Record<PriorityLevel, string> = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-lime-100 text-lime-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800 animate-pulse',
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge className={cn(priorityStyles[priority], className)}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}






