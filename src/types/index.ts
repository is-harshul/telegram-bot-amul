export interface StockStatus {
  isInStock: boolean;
  lastChecked: Date;
  price?: string | undefined;
  availability?: string | undefined;
  error?: string | undefined;
}

export interface NotificationSettings {
  enabled: boolean;
  cooldownMinutes: number;
  lastNotification?: Date;
}

export interface AmulCredentials {
  email: string;
  password: string;
}

export interface BotConfig {
  telegramToken: string;
  chatId: string;
  productUrl: string;
  checkIntervalMinutes: number;
  notificationCooldownMinutes: number;
  amulCredentials?: AmulCredentials | undefined;
}

export interface ProductInfo {
  name: string;
  price: string;
  availability: string;
  url: string;
  imageUrl?: string;
}

export type BotCommand = 'start' | 'status' | 'stop' | 'help' | 'addtocart';

export interface CartOperation {
  success: boolean;
  message: string;
  cartUrl?: string;
} 