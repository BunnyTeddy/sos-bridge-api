/**
 * User Language Preference Store
 * Simple in-memory store for user language preferences
 * In production, this should be stored in the database
 */

import { Language } from './messages.js';

// In-memory store for user language preferences
const userLanguages = new Map<string, Language>();

// Default language
const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Get user's preferred language
 */
export function getUserLanguage(userId: string | number): Language {
  const key = String(userId);
  return userLanguages.get(key) ?? DEFAULT_LANGUAGE;
}

/**
 * Set user's preferred language
 */
export function setUserLanguage(userId: string | number, lang: Language): void {
  const key = String(userId);
  userLanguages.set(key, lang);
  console.log(`[i18n] User ${key} language set to: ${lang}`);
}

/**
 * Check if language is valid
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang === 'en' || lang === 'vi';
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): Language[] {
  return ['en', 'vi'];
}


