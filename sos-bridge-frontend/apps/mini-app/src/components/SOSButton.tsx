'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useHaptic } from '@/hooks/useTelegram';

interface SOSButtonProps {
  onActivate: () => void;
  disabled?: boolean;
  holdDuration?: number; // milliseconds
}

export function SOSButton({
  onActivate,
  disabled = false,
  holdDuration = 2000,
}: SOSButtonProps) {
  const t = useTranslations('sos');
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isActivated, setIsActivated] = useState(false);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const haptic = useHaptic();

  const startHold = useCallback(() => {
    if (disabled || isActivated) return;
    
    setIsHolding(true);
    setProgress(0);
    haptic.impact('medium');
    
    const startTime = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress >= 100) {
        clearInterval(progressIntervalRef.current!);
        haptic.notification('success');
        setIsActivated(true);
        onActivate();
      }
    }, 16);
    
    holdTimerRef.current = setTimeout(() => {
      // Completed
    }, holdDuration);
  }, [disabled, isActivated, holdDuration, haptic, onActivate]);

  const endHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    
    if (!isActivated) {
      setIsHolding(false);
      setProgress(0);
    }
  }, [isActivated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse rings */}
      <AnimatePresence>
        {!isActivated && (
          <>
            <motion.div
              className="absolute h-48 w-48 rounded-full bg-red-500/20"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="absolute h-40 w-40 rounded-full bg-red-500/30"
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 0.3, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.3,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Progress ring (SVG) */}
      <svg
        className="absolute h-36 w-36"
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#fca5a5"
          strokeWidth="4"
          opacity="0.3"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#ef4444"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 50 50)"
          style={{
            transition: isHolding ? 'none' : 'stroke-dashoffset 0.3s ease',
          }}
        />
      </svg>

      {/* Main button */}
      <motion.button
        className={`relative z-10 flex h-32 w-32 flex-col items-center justify-center rounded-full shadow-xl transition-all no-select ${
          isActivated
            ? 'bg-green-500 shadow-green-500/50'
            : disabled
            ? 'bg-gray-300'
            : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/50'
        }`}
        whileHover={!disabled && !isActivated ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isActivated ? { scale: 0.95 } : {}}
        onTouchStart={startHold}
        onTouchEnd={endHold}
        onTouchCancel={endHold}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onMouseLeave={endHold}
        disabled={disabled}
        aria-label={t('holdInstruction')}
      >
        <AnimatePresence mode="wait">
          {isActivated ? (
            <motion.div
              key="activated"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-white"
            >
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          ) : (
            <motion.div
              key="sos"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <span className="text-3xl font-black text-white">SOS</span>
              <span className="mt-1 text-xs font-medium text-white/80">
                {isHolding ? t('holding') : t('hold')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Instructions */}
      <AnimatePresence>
        {!isActivated && (
          <motion.p
            className="absolute -bottom-8 text-center text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {t('holdInstruction')}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
