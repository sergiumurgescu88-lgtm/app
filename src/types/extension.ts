export type EventType = 
  | 'tip' 
  | 'chat_message' 
  | 'status_change' 
  | 'user_join' 
  | 'vip_detected'
  | 'ping';

export interface BotEventPayload {
  id?: string;
  type: EventType;
  model: string;
  timestamp: string;
  data: {
    tipper?: string;
    tokens?: number;
    message?: string;
    sender?: string;
    userLevel?: 'broadcaster' | 'mod' | 'fanclub' | 'dark_blue' | 'purple' | 'light_blue' | 'regular';
    status?: 'online' | 'offline' | 'away' | 'private';
    viewersCount?: number;
    roomSubject?: string;
    isVip?: boolean;
    tags?: string[];
  };
}

export interface ExtensionSettings {
  botToken: string;
  backendUrl: string;
  modelUsername: string;
  enableTipTracking: boolean;
  enableVipDetection: boolean;
  vipThreshold: number;
  enableAutoThank: boolean;
  autoThankTemplate: string;
  autoThankMinTokens: number;
  enableAutoWelcome: boolean;
  autoWelcomeVipOnly: boolean;
  autoWelcomeTemplate: string;
  enableOnScreenHud: boolean;
  enableAutoGoalSubject?: boolean;
  goalTokensThreshold?: number;
  goalReachedSubjectTemplate?: string;
  // Sound Alerts
  enableSoundAlerts?: boolean;
  soundAlertThreshold?: number;
  soundAlertAudioUrl?: string;
  soundAlertVolume?: number;
  vipSoundAlertAudioUrl?: string;
  enableVipCustomSound?: boolean;
}

export interface QueueItem {
  id: string;
  payload: BotEventPayload;
  addedAt: number;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
}

export interface BackendStats {
  totalTokensToday: number;
  totalTipsCount: number;
  activeViewers: number;
  topTippers: Array<{
    username: string;
    tokens: number;
    isVip: boolean;
    lastTipTime: string;
  }>;
  recentEvents: BotEventPayload[];
}
