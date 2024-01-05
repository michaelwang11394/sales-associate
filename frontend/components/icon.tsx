import {
  MESSAGES_HISTORY_LIMIT,
  PALETTE_DIV_ID,
  SUPABASE_MESSAGES_RETRIEVED,
} from "@/constants/constants";
import { MessageSource, type DBMessage } from "@/constants/types";
import { callOpenai } from "@/helper/ai";
import { toggleOverlayVisibility } from "@/helper/animations";
import { getGreetingMessage } from "@/helper/shopify";
import { v4 as uuidv4 } from "uuid";

import {
  getLastPixelEvent,
  getMessages,
  insertMessage,
} from "@/helper/supabase";
import "@/styles/chat.css";
import { useEffect, useRef, useState } from "react";
import { formatDBMessage } from "./command";

export default function Icon({ props }) {
  const [greeting, setGreeting] = useState(
    "Welcome to the store, click me to start chatting with your AI sales assistant!"
  );
  const iconRef = useRef(null);
  const iconSize = props.iconSize;
  const clientId = window.localStorage.getItem("webPixelShopifyClientId");

  useEffect(() => {
    // Add event listener to close overlay when clicking outside of it
    const handleClickOutside = (event) => {
      const clickTarget = document.getElementById(PALETTE_DIV_ID);
      const overlayDiv = props.overlayDiv;

      if (
        !clickTarget?.contains(event.target) &&
        overlayDiv.classList.contains("visible")
      ) {
        toggleOverlayVisibility(overlayDiv);
      }
    };

    document.addEventListener("click", handleClickOutside);
    if (clientId && props.mountDiv === "embed") {
      getMessages(clientId, SUPABASE_MESSAGES_RETRIEVED).then((data) => {
        if (!data) {
          console.error("Message history could not be fetched");
        } else {
          const messages = data
            .data!.map((messageRow: DBMessage) => formatDBMessage(messageRow))
            .reverse();
          getLastPixelEvent(clientId).then((d) => {
            d.data?.forEach(async (event) => {
              const uuid = uuidv4();
              const greetingPrompt = await getGreetingMessage(event);
              callOpenai(
                greetingPrompt,
                clientId!,
                uuid,
                MessageSource.EMBED,
                messages
                  .slice(-1 * MESSAGES_HISTORY_LIMIT)
                  .map((m) => String(m.id!))
              )
                .then(async (response) => {
                  if (response.show) {
                    setGreeting(response.openai);
                  }
                  await insertMessage(
                    clientId,
                    "text",
                    "system",
                    response.openai,
                    uuid
                  );
                })
                .catch((err) => console.error(err));
            });
          });
        }
      });
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleIconClick = (event) => {
    event.stopPropagation();
    const overlayDiv = props.overlayDiv;
    toggleOverlayVisibility(overlayDiv);
  };

  return (
    <div
      className="mt-4"
      style={{ position: "relative", cursor: "pointer" }}
      onClick={handleIconClick}>
      {/* Icon */}
      <div ref={iconRef}>
        <img
          src="https://cdn.shopify.com/s/files/1/0847/3011/8437/files/icon12001200.png?v=1703370084"
          alt="Chat Icon"
          width={iconSize + "px"}
          style={{
            borderRadius: "50%", // Make it circular
          }}
        />
      </div>

      {/* Overlay Bubble */}
      {props.mountDiv === "embed" && iconRef.current && (
        <div
          className="talk-bubble tri-right round border btm-right-in"
          style={{
            position: "absolute",
            bottom: iconRef.current.offsetTop + iconSize / 2 + "px",
            right: iconRef.current.offsetLeft + "px",
            height: "auto",
            width: "500px",
            background: "white",
            color: "black",
          }}>
          <div className="talktext">
            <p style={{ overflow: "hidden", margin: 0 }}>{greeting}</p>
          </div>
        </div>
      )}
    </div>
  );
}
