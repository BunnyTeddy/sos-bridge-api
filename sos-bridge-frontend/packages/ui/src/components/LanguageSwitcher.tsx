'use client';

import { useState, useEffect, useCallback } from 'react';

export type Locale = 'en' | 'vi';

interface LanguageSwitcherProps {
  /** Custom class name */
  className?: string;
  /** Variant style */
  variant?: 'default' | 'minimal' | 'pill';
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  /** Show full language name */
  showFullName?: boolean;
}

const languageNames: Record<Locale, { short: string; full: string; flag: string }> = {
  en: { short: 'EN', full: 'English', flag: '🇺🇸' },
  vi: { short: 'VI', full: 'Tiếng Việt', flag: '🇻🇳' },
};

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

export function LanguageSwitcher({
  className = '',
  variant = 'default',
  size = 'md',
  showFullName = false,
}: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useState<Locale>('en');
  const [isOpen, setIsOpen] = useState(false);

  // Get initial locale from cookie
  useEffect(() => {
    const savedLocale = getCookie('locale') as Locale | undefined;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'vi')) {
      setCurrentLocale(savedLocale);
    }
  }, []);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    if (newLocale !== currentLocale) {
      setCookie('locale', newLocale);
      setCurrentLocale(newLocale);
      // Refresh the page to apply new locale
      window.location.reload();
    }
    setIsOpen(false);
  }, [currentLocale]);

  const toggleLocale = useCallback(() => {
    const newLocale: Locale = currentLocale === 'en' ? 'vi' : 'en';
    handleLocaleChange(newLocale);
  }, [currentLocale, handleLocaleChange]);

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  // Variant: minimal - just a toggle button
  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleLocale}
        className={`flex items-center gap-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${sizeClasses[size]} ${className}`}
        title={`Switch to ${currentLocale === 'en' ? 'Vietnamese' : 'English'}`}
        aria-label={`Current language: ${languageNames[currentLocale].full}. Click to switch.`}
      >
        <span>{languageNames[currentLocale].flag}</span>
        <span className="font-medium">{languageNames[currentLocale].short}</span>
      </button>
    );
  }

  // Variant: pill - styled toggle between two options
  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex rounded-full bg-gray-100 dark:bg-gray-800 p-0.5 ${className}`}
        role="radiogroup"
        aria-label="Language selection"
      >
        {(['en', 'vi'] as Locale[]).map((locale) => (
          <button
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className={`flex items-center gap-1 rounded-full transition-all ${sizeClasses[size]} ${
              currentLocale === locale
                ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            role="radio"
            aria-checked={currentLocale === locale}
          >
            <span>{languageNames[locale].flag}</span>
            <span>{showFullName ? languageNames[locale].full : languageNames[locale].short}</span>
          </button>
        ))}
      </div>
    );
  }

  // Variant: default - dropdown
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${sizeClasses[size]}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span>{languageNames[currentLocale].flag}</span>
        <span className="font-medium">
          {showFullName ? languageNames[currentLocale].full : languageNames[currentLocale].short}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <ul
            className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border bg-white dark:bg-gray-800 py-1 shadow-lg"
            role="listbox"
          >
            {(['en', 'vi'] as Locale[]).map((locale) => (
              <li key={locale}>
                <button
                  onClick={() => handleLocaleChange(locale)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    currentLocale === locale ? 'bg-gray-50 dark:bg-gray-700 font-medium' : ''
                  }`}
                  role="option"
                  aria-selected={currentLocale === locale}
                >
                  <span>{languageNames[locale].flag}</span>
                  <span>{languageNames[locale].full}</span>
                  {currentLocale === locale && (
                    <svg className="ml-auto h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Hook to get current locale on client side
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const savedLocale = getCookie('locale') as Locale | undefined;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'vi')) {
      setLocale(savedLocale);
    }
  }, []);

  return locale;
}

// Utility to change locale programmatically
export function setLocale(locale: Locale) {
  setCookie('locale', locale);
  window.location.reload();
}

