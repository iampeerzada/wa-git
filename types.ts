
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
  MANAGE_TEMPLATES = 'manage_templates',
  MANAGE_VISIBILITY = 'manage_visibility'
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
  allowedProviders?: 'baileys' | 'meta' | 'both';
  metaSetupFee?: number;
}

export interface Subscription {
  planId: string;
  status: 'active' | 'expired' | 'suspended';
  startDate: string;
  expiryDate: string;
  messagesSentToday: number;
  messagesSentThisMonth: number;
  messagesSentThisYear: number; // New: Tracking yearly usage
  undeliveredToday?: number;
  undeliveredTotal?: number;
  customMaxInstances?: number;
  customDailyLimit?: number;
  metaSetupWaived?: boolean;
  customMetaSetupFee?: number;
}

export interface User {
  id: string;
  username: string;
  fullName?: string;
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
  geminiApiKey?: string;
  openaiApiKey?: string;
  defaultAiPrompt?: string;
  defaultAiProvider?: 'gemini' | 'openai';
  defaultAiModel?: string;
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
  instanceKey?: string;
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
  aiProvider?: 'gemini' | 'openai';
  aiApiKey?: string;
  aiModel?: string;
  aiSystemPrompt?: string;
  aiTemperature?: number;
  aiAutoReplyGroups?: boolean;
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
  caption?: string;
  tag?: string;
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
  mediaType?: 'image' | 'video' | 'document' | 'audio' | 'voice' | 'gif' | 'flow_response';
  fileName?: string;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  quotedMsgId?: string;
  quotedMsg?: {
    text: string;
    mediaType?: string;
  };
  templateDetails?: {
    name: string;
    header?: string | null;
    body?: string | null;
    footer?: string | null;
    buttons?: any[];
  };
}

export interface ChatLabel {
  id: string;
  name: string;
  color: string;
}

export interface ChatSession {
  remoteJid: string;
  contactName?: string | null;
  lastMessage?: ChatMessage;
  unreadCount: number;
  labels?: ChatLabel[];
  lastInboundTimestamp?: string | null;
  isWindowActive?: boolean;
  remainingMs?: number;
}

export interface ScheduledCampaign {
  id: string;
  userId: string;
  instanceId: string;
  name: string;
  message: string;
  mediaUrl?: string;
  mediaType?: string;
  buttons?: InteractiveButton[];
  numbers: string[];
  options?: any;
  totalRecipients: number;
  scheduledAt: string;
  status: 'scheduled' | 'processing' | 'completed' | 'cancelled' | 'failed';
  createdAt: string;
  executedAt?: string;
  error?: string;
}

export const normalizePhoneNumber = (input: string): string => {
  if (!input) return '';
  let digits = String(input).trim().replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // 1. Bangladesh numbers (CC: 880)
  // Full CC: 88013xxxxxxx .. 88019xxxxxxx (13 digits starting with 88013..88019)
  if (digits.startsWith('880') && digits.length >= 12) {
    return digits;
  }
  // Local BD 11 digits: 013xxxxxxx .. 019xxxxxxx
  if (digits.length === 11 && /^01[3-9]/.test(digits)) {
    return '880' + digits.substring(1);
  }
  // Local BD 10 digits: 13xxxxxxx .. 19xxxxxxx
  if (digits.length === 10 && /^1[3-9]/.test(digits)) {
    return '880' + digits;
  }

  // 2. India numbers (CC: 91)
  // Full CC: 916xxxxxxxxx .. 919xxxxxxxxx (12 digits starting with 91)
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  // Local India 10 digits starting with 6, 7, 8, 9
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return '91' + digits;
  }
  // Local India 11 digits starting with 06, 07, 08, 09
  if (digits.length === 11 && /^0[6-9]/.test(digits)) {
    return '91' + digits.substring(1);
  }

  // 3. UAE numbers (CC: 971)
  if (digits.startsWith('971') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 10 && /^05/.test(digits)) {
    return '971' + digits.substring(1);
  }

  // 4. Saudi Arabia numbers (CC: 966)
  if (digits.startsWith('966') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 10 && /^05/.test(digits)) {
    return '966' + digits.substring(1);
  }

  // 5. Pakistan numbers (CC: 92)
  if (digits.startsWith('92') && digits.length >= 11) {
    return digits;
  }
  if (digits.length === 11 && /^03/.test(digits)) {
    return '92' + digits.substring(1);
  }

  // 6. US / Canada (CC: 1)
  if (digits.startsWith('1') && digits.length === 11) {
    return digits;
  }

  // 7. UK (CC: 44)
  if (digits.startsWith('44') && digits.length >= 11) {
    return digits;
  }

  // 8. Other international numbers (length >= 11)
  if (digits.length >= 11) {
    if (digits.startsWith('0')) {
      return digits.substring(1);
    }
    return digits;
  }

  return digits;
};
