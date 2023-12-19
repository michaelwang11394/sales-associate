import React, { useEffect, useRef, useState } from "react";
import { getLastPixelEvent, getMessages } from "@/helper/supabase";
import "@/styles/chat.css";
import { getGreetingMessage } from "@/helper/shopify";
import { toggleOverlayVisibility } from "@/helper/animations";
import {
  MESSAGES_HISTORY_LIMIT,
  PALETTE_DIV_ID,
  SUPABASE_MESSAGES_RETRIEVED,
} from "@/constants/constants";
import { MessageSource, type DBMessage } from "@/constants/types";
import { formatDBMessage } from "./command";
import { callOpenai } from "@/helper/ai";

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
              const greetingPrompt = await getGreetingMessage(event);
              callOpenai(
                greetingPrompt,
                clientId!,
                MessageSource.EMBED,
                messages
                  .slice(-1 * MESSAGES_HISTORY_LIMIT)
                  .map((m) => String(m.id!))
              )
                .then((response) => {
                  if (response.show) {
                    setGreeting(response.openai.plainText);
                  }
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
          src={
            "https://cdn.shopify.com/s/files/applications/7e5628d9a123d4cd1a055719e949d6a3_200x200.png?1702946915"
          }
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
