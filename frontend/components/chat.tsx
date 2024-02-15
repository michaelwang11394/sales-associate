import type {
  ChatBubbleProps,
  ImageMessageProps,
  LinkMessageProps,
  TextMessageProps,
} from "@/constants/types";

import React, { useEffect, useRef, useState } from "react";

const TextMessage: React.FC<TextMessageProps> = ({
  text,
  isAISender,
}): React.JSX.Element => {
  return (
    <div className="flex items-start">
      {isAISender && (
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
  key,
  host,
  content,
}): React.JSX.Element => {
  const minFontSize = 15;
  const maxFontSize = 50;
  const startFontSize = 20;
  const overFlowAllowance = 1.05; // For resizing font
  const [active, setActive] = useState(0);

  // For running binary search to find font size to match card
  const [recFontSize, setRecFontSize] = useState(startFontSize);
  const [min, setMin] = useState(minFontSize);
  const [max, setMax] = useState(maxFontSize);
  const recRef = useRef(null);
  const cardRef = useRef(null);

  // State to track the dimensions of recRef
  const [recDimensions, setRecDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setMin(minFontSize);
    setMax(recFontSize); // We are changing on a growing recommendation text, we should only be shrinking
  }, [content[active]?.recommendation, recFontSize]);

  useEffect(() => {
    setMin(minFontSize);
    setMax(maxFontSize);
  }, [active]);

  useEffect(() => {
    const recDiv = recRef.current;
    if (recDiv) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          setRecDimensions({ width, height });
        }
      });
      resizeObserver.observe(recDiv);
      return () => resizeObserver.unobserve(recDiv);
    }
  }, [recRef]);

  useEffect(() => {
    const adjustFontSize = () => {
      const recDiv = recRef.current;
      const cardDiv = cardRef.current;
      if (!recDiv || !cardDiv) return;

      const recHeight = recDiv.clientHeight;
      const cardHeight = cardDiv.clientHeight;

      // Check if recHeight is within 110% of cardHeight
      if (
        recHeight <= cardHeight * overFlowAllowance &&
        recHeight >= cardHeight
      ) {
        return;
      }

      if (recHeight > cardHeight * overFlowAllowance) {
        setMax(recFontSize);
        setRecFontSize((prevFontSize) => (min + prevFontSize) / 2);
      } else {
        setMin(recFontSize);
        setRecFontSize((prevFontSize) => (max + prevFontSize) / 2);
      }
    };

    adjustFontSize();
  }, [recDimensions, recFontSize, min, max, recRef, cardRef]);

  const handleRightClick = () => {
    // Add your click handler logic here
    setActive(Math.min(active + 1, content.length - 1));
  };

  const handleLeftClick = () => {
    // Add your click handler logic here
    setActive(Math.max(active - 1, 0));
  };

  const renderDots = () => {
    return content.map((_, index) => {
      const fill = active === index ? "#474B58" : "#CBD2DD";
      return (
        <svg
          width="9"
          key={index}
          height="9"
          viewBox="0 0 6 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <g id="Icons">
            <circle id="Ellipse 4" cx="3" cy="3" r="2.5" fill={fill} />
          </g>
        </svg>
      );
    });
  };

  return (
    <div>
      <div className="w-full gap-4">
        {/* Existing Element */}
        <div id="card" className="w-1/2 float-right m-3">
          {/* Card */}
          {content[active] && (
            <div
              ref={cardRef}
              className="product-card-shadow"
              id="existing-element">
              <a
                href={`https://${host}/products/${content[active].handle}`}
                target="_blank"
                rel="noopener noreferrer">
                <img
                  src={content[active].image}
                  alt={content[active].name}
                  className="w-full object-cover"
                />
                <div className="flex flex-col p-3">
                  <h2 className="text-xxl font-semibold">
                    {content[active].name}
                  </h2>
                  <p className="text-lg font-medium text-gray-500 mb-4">
                    {content[active].price ? "$" + content[active].price : ""}
                  </p>
                </div>
              </a>
            </div>
          )}
        </div>
        <p
          ref={recRef}
          id="rec"
          className="ai-grey-text leading-snug mb-4"
          style={{
            fontSize: `${recFontSize}px`,
          }}>
          {content[active]?.recommendation ?? ""}
        </p>
      </div>
      {content.length > 1 && (
        <div className="w-full grid grid-cols-3 items-center">
          <div className="flex justify-start">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              onClick={handleLeftClick}
              className="text-gray-400 link-card-arrow">
              <g id="Arrows">
                <path
                  id="Icon"
                  d="M19 12H5M5 12L12 19M5 12L12 5"
                  stroke={active === 0 ? "#CBD2DD" : "#474B58"}
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
          </div>
          <div className="flex justify-center">{renderDots()}</div>
          <div className="flex justify-end">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              onClick={handleRightClick}
              className="text-gray-400 link-card-arrow">
              <g id="Arrows">
                <path
                  id="Icon"
                  d="M5 12H19M19 12L12 5M19 12L12 19"
                  stroke={content.length - 1 === active ? "#CBD2DD" : "#474B58"}
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </g>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatBubble = ({
  key,
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
        return <LinkMessage key={key} content={content} host={host} />;
      default:
        return <TextMessage text={content[0] || ""} isAISender={isAISender} />;
    }
  };
  // TODO: Figure out better way to use flex. We want to make AI response full width but flex for user input
  return isAISender ? (
    <div className={`items-end justify-start py-1 mb-2`}>
      <div className={`px-4 py-3 min-h-[25px] ai-grey-text mr-2`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  ) : (
    <div className={`flex items-end justify-start py-1 mb-2`}>
      <div className={`px-4 py-3 min-h-[25px] user-input-text`}>
        <div className="message">{renderMessage()}</div>
      </div>
    </div>
  );
};
