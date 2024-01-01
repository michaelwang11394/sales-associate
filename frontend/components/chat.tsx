import type {
  ChatBubbleProps,
  ImageMessageProps,
  LinkMessageProps,
  TextMessageProps,
} from "@/constants/types";

import React from "react";

const LoadingMessage = () => {
  return (
    <svg className="animate-bounce" width={40} height={8} viewBox="0 0 40 8">
      <circle cx={4} cy={4} r={4} fill="#6b7280" />
      <circle cx={20} cy={4} r={4} fill="#6b7280" />
      <circle cx={36} cy={4} r={4} fill="#6b7280" />
    </svg>
  );
};
const TextMessage: React.FC<TextMessageProps> = ({ text }) => {
  return <p className="text-md">{text}</p>;
};

const ImageMessage: React.FC<ImageMessageProps> = ({ src }) => {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={src} className="w-40 h-40 rounded-lg object-cover" />;
};

const LinkMessage: React.FC<LinkMessageProps> = ({
  name,
  handle,
  price,
  image,
}) => {
  return (
    <div className="w-64">
      <img src={image} alt={name} className="w-full h-48 object-cover" />
      <div className="flex flex-col p-4">
        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        <p className="text-lg font-medium text-gray-500 mb-4">{price}</p>
        <a
          href={handle}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 bg-white text-black font-semibold rounded-md shadow-md hover:bg-gray-600">
          View Product
        </a>
      </div>
    </div>
  );
};

export const ChatBubble = ({
  type,
  isAISender,
  content,
}: ChatBubbleProps): React.ReactElement => {
  const renderMessage = () => {
    switch (type) {
      case "loading":
        return <LoadingMessage />;
      case "text":
        return <TextMessage text={content || ""} />;
      case "img":
        // TODO Add IMG
        return <ImageMessage src={content || ""} />;
      case "link":
        const linkObject = JSON.parse(content);
        const name = linkObject.name;
        const handle = linkObject.product_handle;
        const price = linkObject.variants[0]?.price || "";
        const image = linkObject.image;
        return (
          <LinkMessage
            name={name}
            handle={handle}
            price={price}
            image={image}
          />
        );
      default:
        return <TextMessage text={content || ""} />;
    }
  };
  return (
    <div
      className={`bubble flex items-end ${
        isAISender ? "justify-start" : "justify-end"
      } mb-2`}>
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
        className={`message max-w-3/4 rounded-lg px-4 py-2 min-h-[25px] ${
          isAISender ? "bg-gray-200 mr-2" : "bg-blue-600 ml-2 text-white"
        }`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  );
};
