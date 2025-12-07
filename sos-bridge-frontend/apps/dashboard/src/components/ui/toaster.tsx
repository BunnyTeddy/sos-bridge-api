'use client';

import * as React from 'react';
import * as Toast from '@radix-ui/react-toast';
import { cn } from '@sos-bridge/ui';

export function Toaster() {
  return (
    <Toast.Provider>
      <Toast.Viewport className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px]" />
    </Toast.Provider>
  );
}








