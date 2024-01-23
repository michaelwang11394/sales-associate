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

const TextMessage: React.FC<TextMessageProps> = ({
  text,
  isAISender,
}): React.JSX.Element => {
  return (
    <div className="flex items-start">
      {!isAISender ? (
        ""
      ) : (
        <div className="pr-4">
          <svg
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg">
            <g id="star-06">
              <path
                id="Icon"
                d="M5.62549 27.5V21.25M5.62549 8.75V2.5M2.50049 5.625H8.75049M2.50049 24.375H8.75049M16.2505 3.75L14.0828 9.38608C13.7303 10.3026 13.554 10.7609 13.2799 11.1464C13.037 11.488 12.7385 11.7865 12.3968 12.0294C12.0114 12.3035 11.5531 12.4798 10.6366 12.8323L5.00049 15L10.6366 17.1677C11.5531 17.5202 12.0114 17.6965 12.3968 17.9706C12.7385 18.2135 13.037 18.512 13.2799 18.8536C13.554 19.2391 13.7303 19.6974 14.0828 20.6139L16.2505 26.25L18.4182 20.6139C18.7707 19.6974 18.947 19.2391 19.2211 18.8536C19.464 18.512 19.7625 18.2135 20.1041 17.9706C20.4896 17.6965 20.9479 17.5202 21.8644 17.1677L27.5005 15L21.8644 12.8323C20.9479 12.4798 20.4896 12.3035 20.1041 12.0294C19.7625 11.7865 19.464 11.488 19.2211 11.1464C18.947 10.7609 18.7707 10.3026 18.4182 9.38608L16.2505 3.75Z"
                stroke="#2A33FF"
                stroke-width="1.875"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </g>
          </svg>
        </div>
      )}
      <p className="text-md inline">{text}</p>
    </div>
  );
};

const ImageMessage: React.FC<ImageMessageProps> = ({
  src,
}): React.JSX.Element => {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={src} className="w-40 h-40 rounded-lg object-cover" />;
};

/*
const LinkMessage: React.FC<LinkMessageProps> = ({
  name,
  handle,
  price,
  image,
  host,
}): React.JSX.Element => {
  return (
    <div className="w-64">
      <img src={image} alt={name} className="w-full h-48 object-cover" />
      <div className="flex flex-col p-4">
        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        <p className="text-lg font-medium text-gray-500 mb-4">
          {price ? "$" + price : ""}
        </p>
        <a
          href={`https://${host}/products/${handle}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 bg-white text-black font-semibold rounded-md shadow-md hover:bg-gray-600">
          View Product
        </a>
      </div>
    </div>
  );
};
*/
const LinkMessage: React.FC<LinkMessageProps> = ({
  name,
  handle,
  price,
  image,
  host,
  recommendation,
}): React.JSX.Element => {
  const productLink = `https://${host}/products/${handle}`;

  return (
    <div className="w-full grid grid-cols-2 gap-4">
      {/* Existing Element */}
      <div>
        <a href={productLink} target="_blank" rel="noopener noreferrer">
          <img src={image} alt={name} className="w-full h-120 object-cover" />
          <div className="flex flex-col p-4">
            <h3 className="text-xl font-semibold mb-2">{name}</h3>
            <p className="text-lg font-medium text-gray-500 mb-4">
              {price ? "$" + price : ""}
            </p>
          </div>
        </a>
      </div>

      <div>
        <p className="text-lg ai-grey-text mb-4">{recommendation}</p>
        {/* Add any additional styling or elements for the recommendation input */}
      </div>
    </div>
  );
};

export const ChatBubble = ({
  type,
  isAISender,
  content,
  host,
}: ChatBubbleProps): React.JSX.Element => {
  const renderMessage = () => {
    switch (type) {
      case "loading":
      case "text":
        return <TextMessage text={content || ""} isAISender={isAISender} />;
      case "img":
        // TODO Add IMG
        return <ImageMessage src={content || ""} />;
      case "link":
        const linkObject = content[0]; // TODO make this carousel
        const name = linkObject.name;
        const handle = linkObject.handle;
        const price =
          linkObject.variants?.length > 0 ? linkObject.variants[0]?.price : "";
        const image = linkObject.image;
        return (
          <LinkMessage
            name={name}
            handle={handle}
            price={price}
            image={image}
            host={host}
            recommendation={linkObject.recommendation}
          />
        );
      default:
        return <TextMessage text={content[0] || ""} isAISender={isAISender} />;
    }
  };
  // TODO: Figure out better way to use flex. We want to make AI response full width but flex for user input
  return isAISender ? (
    <div className={`items-end justify-start py-1 mb-2`}>
      <div className={`px-4 py-2 min-h-[25px] bg-gray-200 ai-grey-text mr-2`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  ) : (
    <div className={`flex items-end justify-start py-1 mb-2`}>
      <div className={`px-4 py-2 min-h-[25px] user-input-text`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  );
};
