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
                messages.slice(MESSAGES_HISTORY_LIMIT).map((m) => String(m.id!))
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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height={iconSize + "em"}
          viewBox="0 0 256 256"
          style={{ fill: "black" }}>
          <path d="M197.00781,132.74023l-52.16015-19.21777a3.99186,3.99186,0,0,1-2.3711-2.37012L123.25977,58.99219a11.99948,11.99948,0,0,0-22.51954,0L81.52246,111.15234a3.99186,3.99186,0,0,1-2.37012,2.3711L26.99219,132.74023a11.99948,11.99948,0,0,0,0,22.51954l52.16015,19.21777a3.99186,3.99186,0,0,1,2.3711,2.37012l19.21679,52.16015a11.99948,11.99948,0,0,0,22.51954,0l19.21679-52.16015h.001a3.99186,3.99186,0,0,1,2.37012-2.3711l52.16015-19.21679a11.99948,11.99948,0,0,0,0-22.51954Zm-2.76562,15.01368L142.082,166.96973a11.98076,11.98076,0,0,0-7.11133,7.1123l-19.21679,52.16016a4.00076,4.00076,0,0,1-7.50782,0L89.03027,174.082a11.98076,11.98076,0,0,0-7.1123-7.11133L29.75781,147.75391a4.00076,4.00076,0,0,1,0-7.50782L81.918,121.03027a11.98076,11.98076,0,0,0,7.11133-7.1123l19.21679-52.16016a4.00076,4.00076,0,0,1,7.50782,0L134.96973,113.918a11.98076,11.98076,0,0,0,7.1123,7.11133l52.16016,19.21679a4.00076,4.00076,0,0,1,0,7.50782ZM148,40a4.0002,4.0002,0,0,1,4-4h20V16a4,4,0,0,1,8,0V36h20a4,4,0,0,1,0,8H180V64a4,4,0,0,1-8,0V44H152A4.0002,4.0002,0,0,1,148,40Zm96,48a4.0002,4.0002,0,0,1-4,4H228v12a4,4,0,0,1-8,0V92H208a4,4,0,0,1,0-8h12V72a4,4,0,0,1,8,0V84h12A4.0002,4.0002,0,0,1,244,88Z" />
        </svg>
      </div>

      {/* Overlay Bubble */}
      {props.mountDiv === "embed" && iconRef.current && (
        <div
          className="talk-bubble tri-right round border btm-right-in"
          style={{
            position: "absolute",
            bottom: iconRef.current.offsetTop + iconSize / 2 + "em",
            right: iconRef.current.offsetLeft - iconSize / 4 + "em",
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
