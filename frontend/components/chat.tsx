import React from "react";

interface ChatMessage {
  type: "text" | "img" | "url";
  text?: string;
  imgSrc?: string;
  url?: string;
}

interface ChatBubbleProps {
  message: ChatMessage;
  isAI: boolean;
}

interface TextMessageProps {
  text: string;
}

const TextMessage: React.FC<TextMessageProps> = ({ text }) => {
  return <p className="text-sm">{text}</p>;
};

interface ImageMessageProps {
  src: string;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ src }) => {
  return <img src={src} className="w-40 h-40 rounded-lg object-cover" />;
};

interface LinkMessageProps {
  url: string;
  text: string;
}

const LinkMessage: React.FC<LinkMessageProps> = ({ url, text }) => {
  return (
    <a href={url} className="text-blue-500 hover:underline">
      {text}
    </a>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isAI }) => {
  const renderMessage = () => {
    switch (message.type) {
      case "text":
        return <TextMessage text={message.text || ""} />;
      case "img":
        return <ImageMessage src={message.imgSrc || ""} />;
      case "url":
        return <LinkMessage url={message.url || ""} text={message.url || ""} />;
    }
  };
  return (
    <div className={`bubble flex ${isAI ? "justify-start" : "justify-end"}`}>
      <div className={`avatar ${isAI ? "block" : "hidden"} w-6 rounded-full`}>
        {!isAI && <img src="avatar.png" className="w-full rounded-full" />}
      </div>

      <div
        className={`message max-w-3/4 rounded-lg px-4 py-2 ${
          isAI ? "bg-blue-600 ml-2 text-white" : "bg-gray-300 mr-2"
        }`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  );
};
