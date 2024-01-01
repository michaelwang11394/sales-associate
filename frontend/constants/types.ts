export enum SenderType {
  AI = "ai",
  USER = "user",
  SYSTEM = "system", // Generated greetings, noninteractive
}

export enum MessageSource {
  EMBED = "embed", // Pop up greeting in app embed
  CHAT = "chat", // Conversation/thread with customer
}

// Hallucination severity in decreasing order
export enum HalluctinationCheckSeverity {
  FAIL = 4, // If any detected fail and do not retry
  RETRY = 3, // If any detected retry
  FILTER = 2, // Filter out any hallucinated entries
  NONE = 1, // Do not do any checks
}

export interface Product {
  featured_image: {
    url: string;
    alt: string;
  };
  title: string;
  price: string;
  variants: {
    id: string;
  }[];
  url?: string;
}

// Props related to chat
export interface DBMessage {
  id: number;
  type: string;
  content: string;
  sender: SenderType;
  clientId: string;
  timestamp: Date;
}
// Messages after FormattedMessage
export interface FormattedMessage {
  id?: number;
  type: string;
  sender: SenderType;
  content: string;
}
export interface ChatMessage {
  type: "text" | "img" | "url";

  text?: string;
  imgSrc?: string;
  url?: string;
}

export interface ChatBubbleProps {
  key?: number;
  type: string;
  isAISender: boolean;
  content: string;
}

export interface TextMessageProps {
  text: string;
}
export interface ImageMessageProps {
  src: string;
}

export interface LinkMessageProps {
  name: string;
  handle: string;
  price: string;
  image: string;
}

// Keep this synced with api/pages/api/v*/supabase/_helpers where response expected
export interface ApiResponse {
  body: any;
  query: any;
  message: string;
}
