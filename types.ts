
export enum UserRole {
  SUPERADMIN = 'superadmin',
  RESELLER = 'reseller',
  ADMIN = 'admin',
  TEAM_MEMBER = 'team_member'
}

export enum Permission {
  MANAGE_INSTANCES = 'manage_instances',
  VIEW_CHATS = 'view_chats',
  SEND_BULK = 'send_bulk',
  MANAGE_AUTO_RESPONDER = 'manage_auto_responder',
  MANAGE_TEAM = 'manage_team',
  MANAGE_CONTACTS = 'manage_contacts',
  MANAGE_TEMPLATES = 'manage_templates'
}

export enum PlanInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  interval: PlanInterval;
  dailyLimit: number; // 0 for unlimited
  monthlyLimit: number;
  yearlyLimit: number; // New: Yearly quota
  maxInstances: number;
  rateLimitPerMin: number; // Protection against bans
  features: string[];
  assignedTo?: string; // New: Optional ID of a reseller if this is a custom plan for them
  description?: string; // New: Plan description
  icon?: string; // New: Lucide icon name string
}

export interface Subscription {
  planId: string;
  status: 'active' | 'expired' | 'suspended';
  startDate: string;
  expiryDate: string;
  messagesSentToday: number;
  messagesSentThisMonth: number;
  messagesSentThisYear: number; // New: Tracking yearly usage
  customMaxInstances?: number;
  customDailyLimit?: number;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  mobile?: string;
  password?: string; // Stored for mock auth, hidden in UI
  role: UserRole;
  parentId?: string; // Links Admin to Reseller
  apiKey: string;
  accessToken: string; // For rotating auth
  tokenExpiresAt: string; // For security
  createdAt: string;
  subscription: Subscription;
  permissions?: Permission[]; // New: Granular permissions
}

export enum InstanceStatus {
  CONNECTING = 'connecting',
  QR_REQUIRED = 'qr_required',
  OPEN = 'open',
  CLOSED = 'closed',
  ERROR = 'error',
  SUSPENDED = 'suspended'
}

export interface WhatsAppInstance {
  id: string;
  userId: string; // Tenant Owner ID
  name: string;
  status: InstanceStatus;
  qrCode?: string;
  phoneNumber?: string;
  createdAt: string;
  lastUsed?: string;
  isVisible?: boolean; // New: For the hide function
  webhookUrl?: string; // New: For incoming webhooks
  aiEnabled?: boolean;
  provider?: string;
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'document';
  userId: string;
  createdAt: string;
}

export interface InteractiveButton {
  id: string;
  type: 'reply' | 'url' | 'call';
  displayText: string;
  url?: string;
  phoneNumber?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  mediaUrl?: string;
  buttons?: InteractiveButton[]; // New: Support for buttons
  createdAt: string;
  isTemporary?: boolean; // New: Support for temporary templates
}

export interface Contact {
  id: string;
  number: string;
  original: string;
  isVerified: boolean;
  exists: boolean;
}

export interface ContactGroup {
  id: string;
  name: string;
  contacts: Contact[];
  createdAt: string;
}

export interface AutoResponderRule {
  id: string;
  instanceId: string;
  triggerKeyword: string; // The keyword that triggers this response
  responseMessage: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document';
  parentId?: string; // Used for sub-menus
  buttons?: InteractiveButton[];
  isActive: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  instanceId: string;
  remoteJid: string;
  fromMe: boolean;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'document' | 'gif';
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read';
  quotedMsgId?: string;
  quotedMsg?: {
    text: string;
    mediaType?: string;
  };
}

export interface ChatLabel {
  id: string;
  name: string;
  color: string;
}

export interface ChatSession {
  remoteJid: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  labels?: ChatLabel[];
}
