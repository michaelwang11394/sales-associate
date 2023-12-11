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

const LinkMessage: React.FC<LinkMessageProps> = ({
  name,
  handle,
  price,
  image,
}) => {
  return (
    <div className="bg-gray-100 rounded-lg max-w-xs py-2 px-4">
      <div className="flex space-x-4">
        <img className="w-20 h-20 rounded object-cover" src={image} />

        <div>
          {/* <p className="text-gray-900 font-medium mb-1">@{handle}</p> */}
          {/* {price && <p className="font-bold text-xl">${price}</p>} */}
        </div>
      </div>

      <a
        href={handle}
        className="block text-blue-500 text-center font-medium hover:underline mt-2">
        {name}
      </a>
    </div>
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
