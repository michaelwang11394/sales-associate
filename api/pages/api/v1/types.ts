// Keep this synced with frontend/constants/types
export interface ApiResponse {
  body: any;
  query: any;
  message: string;
}
// Hallucination severity in decreasing order
// Messages after FormattedMessage
export interface FormattedMessage {
  id?: number;
  type: string;
  sender: SenderType;
  content: string;
}
export enum HalluctinationCheckSeverity {
  FAIL = 4, // If any detected fail and do not retry
  RETRY = 3, // If any detected retry
  FILTER = 2, // Filter out any hallucinated entries
  NONE = 1, // Do not do any checks
}
export enum SenderType {
  AI = "ai",
  USER = "user",
  SYSTEM = "system", // Generated greetings, noninteractive
  SUMMARY = "summary", // Summary of all messages up until then
}

export class HallucinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HallucinationError";
  }
}
export enum MessageSource {
  EMBED = "embed", // Pop up greeting in app embed
  CHAT = "chat", // Conversation/thread with customer
  CHAT_GREETING = "chat_greeting", // Greeting message in palette
  HINTS = "hints", // Hints for possible user inputs
}
