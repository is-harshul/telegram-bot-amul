export interface StockStatus {
  isInStock: boolean;
  lastChecked: Date;
  price?: string | undefined;
  availability?: string | undefined;
  error?: string | undefined;
  soldOutAlert?: string | undefined;
}

export interface NotificationSettings {
  enabled: boolean;
  cooldownMinutes: number;
  lastNotification?: Date;
}

export interface BotConfig {
  telegramToken: string;
  chatId: string;
  checkIntervalMinutes: number;
  notificationCooldownMinutes: number;
}

export interface ProductInfo {
  name: string;
  price: string;
  availability: string;
  url: string;
  imageUrl?: string;
}

export interface AmulProduct {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  price?: string;
  imageUrl?: string;
}

export interface UserProductSelection {
  userId: string;
  selectedProductId: string;
  productName: string;
  productUrl: string;
  lastChecked?: Date;
  username?: string;
  firstName?: string;
  lastName?: string;
  isMonitoring: boolean;
}

export interface BotCommand {
  command: string;
  description: string;
  usage?: string;
}
