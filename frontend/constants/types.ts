export interface Product {
  url: string;
  featured_image: {
    url: string;
    alt: string;
  };
  title: string;
  price: string;
  variants: {
    id: string;
  }[];
}

// Props related to chat
export interface DBMessage {
  id: number;
  type: string;
  content: string;
  isAISender: boolean;
  clientId: string;
  timestamp: Date;
}
// Messages after FormattedMessage
export interface FormattedMessage {
  id?: number;
  type: string;
  isAISender: boolean;
  content: string;
}
export interface ChatMessage {
  type: "text" | "img" | "url";

  text?: string;
  imgSrc?: string;
  url?: string;
}

export interface ChatBubbleProps {
  key: number;
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
