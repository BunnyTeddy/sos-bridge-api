/**
 * Integrations - Export all external integrations
 */

export {
  initBot,
  getBot,
  stopBot,
  notifyRescuerNewMission,
  notifyVictimStatus,
  notifyRewardSent,
} from './telegram-bot.js';

export type { TelegramBot } from './telegram-bot.js';

// Registration flow exports
export {
  startRegistration,
  handleRegistrationMessage,
  handleRegistrationCallback,
  isInRegistration,
  linkWallet,
  setRescuerOnline,
  setRescuerOffline,
  showRescuerProfile,
} from './registration-flow.js';

