import type {
  ChatBubbleProps,
  ImageMessageProps,
  LinkMessageProps,
  TextMessageProps,
} from "@/constants/types";
import React from "react";

const TextMessage: React.FC<TextMessageProps> = ({ text }) => {
  return <p className="text-md">{text}</p>;
};

const ImageMessage: React.FC<ImageMessageProps> = ({ src }) => {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={src} className="w-40 h-40 rounded-lg object-cover" />;
};

const LinkMessage: React.FC<LinkMessageProps> = ({ url, text }) => {
  return (
    <a href={url} className="text-blue-500 hover:underline">
      {text}
    </a>
  );
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  type,
  isAISender,
  content,
}) => {
  const renderMessage = () => {
    switch (type) {
      case "text":
        return <TextMessage text={content || ""} />;
      case "img":
        // TODO Add IMG
        return <ImageMessage src={content || ""} />;
      //TODO ADd url
      case "url":
        return <LinkMessage url={content || ""} text={content || ""} />;
      default:
        return <TextMessage text={content || ""} />;
    }
  };
  return (
    <div
      className={`bubble flex items-end ${
        isAISender ? "justify-start" : "justify-end"
      }`}>
      <div
        className={`avatar ${
          isAISender ? "block" : "hidden"
        } w-20 rounded-full mr-4`}>
        {isAISender && (
          <img
            src="https://plus.unsplash.com/premium_photo-1661726660137-61b182d93809?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt=""
            className="w-20 rounded-full"
          />
        )}
      </div>

      <div
        className={`message max-w-3/4 rounded-lg px-4 py-2 ${
          isAISender ? "bg-gray-300 mr-2" : "bg-blue-600 ml-2 text-white"
        }`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  );
};
