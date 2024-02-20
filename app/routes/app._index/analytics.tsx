import type {
  ChatBubbleProps,
  ImageMessageProps,
  LinkMessageProps,
  TextMessageProps,
} from "@/constants/types";
import { useEffect, useRef, useState } from "react";
import { supabase } from "~/utils/supabase";
import "./chat.css";

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

const ChatModal = ({ isOpen, onClose, chatData, store }) => {
  if (!isOpen) return null;

  return (
    <div
      className="chat-column min-w-0 p-6 overflow-y-auto p-4 mobile-chat-column"
      style={{
        position: "fixed" /* Stay in place */,
        zIndex: 1 /* Sit on top */,
        left: 0,
        top: 0,
        width: "100%" /* Full width */,
        height: "100%" /* Full height */,
        backgroundColor: "rgb(0,0,0)" /* Fallback color */,
        backgroundColor: "rgba(0,0,0,0.4)" /* Black w/ opacity */,
        display: "flex-col",
        justifyContent: "center",
        alignItems: "center",
      }}>
      <div
        id="chat-column"
        style={{
          backgroundColor: "#fefefe",
          margin: "auto",
          padding: "20px",
          border: "1px solid #888",
          width: "50%" /* Could be more or less, depending on screen size */,
          height: "80%" /* Full height */,
          overflow: "scroll",
          boxShadow:
            "0 4px 8px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19)",
          animationName: "animatetop",
          animationDuration: "0.4s",
        }}>
        {chatData
          .filter((message) => message.message !== undefined)
          .map((message, index) => (
            <ChatBubble
              key={index}
              type={message.type}
              isAISender={message.sender !== "user"}
              content={message.message}
              host={store}
            />
          ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}>
        <button
          onClick={onClose}
          style={{
            backgroundColor: "#4CAF50" /* Green */,
            color: "white",
            padding: "14px 20px",
            margin: "10px 0",
            border: "none",
            cursor: "pointer",
            width: "50%",
          }}>
          Close
        </button>
      </div>
    </div>
  );
};

const UserBreakdown = ({ store }) => {
  const [data, setData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChatData, setSelectedChatData] = useState([]);
  const [clientPage, setClientPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0); // Total items for pagination
  const [embedLink, setEmbedLink] = useState<string | null | undefined>(null); // Total items for pagination

  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(0); // Total pages for pagination

  useEffect(() => {
    const fetchTotalCount = async () => {
      // Assuming you have a function to fetch total count
      const { data: count } = await supabase.rpc("get_unique_client_count", {
        store_param: store,
      });
      setTotalItems(count);
      setTotalPages(Math.ceil(count / pageSize));
    };

    fetchTotalCount();
    const fetchData = async () => {
      const { data: tableData, error } = await supabase.rpc(
        "get_event_counts",
        { store_param: store, start_index: clientPage, page_size: pageSize }
      );
      if (error) {
        console.error("Error fetching data:", error);
        return;
      }
      setData(tableData);
    };

    fetchData();

    const getEmbedLink = async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("posthog_dashboard")
        .eq("domain", store);
      if (error) {
        console.error("Error fetching data:", error);
        return;
      }
      if (data && data.length === 1) {
        setEmbedLink(data[0].posthog_dashboard as string);
      }
    };

    getEmbedLink();
  }, [store]);

  useEffect(() => {
    const paginateClientRows = async () => {
      const { data: tableData, error } = await supabase.rpc(
        "get_event_counts",
        {
          store_param: store,
          start_index: clientPage * pageSize,
          page_size: pageSize,
        }
      );
      if (error) {
        console.error("Error fetching data:", error);
        return;
      }
      setData(tableData);
    };

    paginateClientRows();
  }, [clientPage]);

  const handleChatLinkClick = async (clientId) => {
    const { data: chatData, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .eq("store", store)
      .neq("sender", "system")
      .neq("sender", "summary")
      .limit(100); // TODO paginate here

    if (error) {
      console.error("Error fetching chat data:", error);
      return;
    }

    setSelectedChatData(
      chatData.reverse().map((row) => ({
        type: row.type,
        sender: row.sender,
        message: JSON.parse(row.content),
      }))
    );
    setIsModalOpen(true);
  };

  useEffect(() => {
    const scrollToBottom = () => {
      const chatColumn = document.getElementById("chat-column");
      if (chatColumn) {
        chatColumn.scrollTop = chatColumn.scrollHeight;
      }
    };
    scrollToBottom();
  }, [selectedChatData]);

  // Pagination handlers
  const handlePreviousClick = () => {
    setClientPage((prevPage) => Math.max(prevPage - 1, 0));
  };

  const handleNextClick = () => {
    setClientPage((prevPage) => Math.min(prevPage + 1, totalPages - 1));
  };

  return (
    <>
      <table style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black" }}>Client ID</th>
            <th style={{ border: "1px solid black" }}>Most Recent Timestamp</th>
            <th style={{ border: "1px solid black" }}>Page Viewed Count</th>
            <th style={{ border: "1px solid black" }}>Product Viewed Count</th>
            <th style={{ border: "1px solid black" }}>Chat Thread</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              <td style={{ border: "1px solid black" }}>{row.client}</td>
              <td style={{ border: "1px solid black" }}>
                {row.newest_timestamp}
              </td>
              <td style={{ border: "1px solid black" }}>
                {row.page_viewed_count}
              </td>
              <td style={{ border: "1px solid black" }}>
                {row.product_viewed_count}
              </td>
              <td style={{ border: "1px solid black" }}>
                <a
                  href="#"
                  onClick={() => handleChatLinkClick(row.client)}
                  style={{ color: "blue", fontWeight: "bold" }}>
                  View Chat
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "20px",
        }}>
        <button
          className="hint-bubble"
          onClick={handlePreviousClick}
          disabled={clientPage === 0}
          style={{ visibility: clientPage === 0 ? "hidden" : "visible" }}>
          Previous
        </button>
        <span>
          Page {clientPage + 1} of {totalPages}
        </span>
        <button
          className="hint-bubble"
          onClick={handleNextClick}
          disabled={clientPage === totalPages - 1}
          style={{
            visibility: clientPage === totalPages - 1 ? "hidden" : "visible",
          }}>
          Next
        </button>
      </div>
      {embedLink && (
        <iframe
          width="100%"
          height="1000"
          frameborder="0"
          allowfullscreen
          title="Posthog dashboard"
          src={`https://${embedLink}`}></iframe>
      )}
      <ChatModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        chatData={selectedChatData}
        store={store}
      />
    </>
  );
};

export default UserBreakdown;
