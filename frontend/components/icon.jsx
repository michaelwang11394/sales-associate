import React, { useEffect, useRef, useState } from "react";
import { subscribeToEvents } from "@/helper/supabase";
import { handleNewCustomerEvent } from "@/helper/ai";
import "@/styles/chat.css";

export default function Icon({ props }) {
  const [greeting, setGreeting] = useState("");
  const iconRef = useRef(null);
  const iconSize = props.iconSize;

  useEffect(() => {
    subscribeToEvents().then((data) => {
      data?.forEach((event) => {
        handleNewCustomerEvent(event)
          .then((response) => {
            setGreeting(response.text);
          })
          .catch((err) => console.error(err));
      });

      // Add event listener to close overlay when clicking outside of it
      const handleClickOutside = (event) => {
        const overlayDiv = props.overlayDiv;
        const specificDiv = document.getElementById("overlay");

        if (
          !specificDiv.contains(event.target) &&
          overlayDiv.style.display !== "none"
        ) {
          overlayDiv.style.display = "none";
        }
      };

      document.addEventListener("click", handleClickOutside);
      return () => {
        document.removeEventListener("click", handleClickOutside);
      };
    });
  }, []);

  const handleIconClick = (event) => {
    event.stopPropagation();
    const overlayDiv = props.overlayDiv;
    overlayDiv.style.display =
      overlayDiv.style.display === "none" ? "block" : "none";
  };

  return (
    <div
      className="mt-4"
      style={{ position: "relative" }}
      onClick={handleIconClick}
    >
      {/* Icon */}
      <div ref={iconRef}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height={iconSize + "em"}
          viewBox="0 0 512 512"
          style={{ fill: "black" }}
        >
          <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
        </svg>
      </div>

      {/* Overlay Bubble */}
      {props.mountDiv === "embed" && iconRef.current && (
        <div
          className="talk-bubble tri-right round border btm-right-in"
          style={{
            position: "absolute",
            bottom: iconRef.current.offsetTop + iconSize / 4 + "em",
            right: iconRef.current.offsetLeft - iconSize + "em",
            height: "auto",
            width: "500px",
            background: "white",
            color: "black",
          }}
        >
          <div className="talktext">
            <p style={{ overflow: "hidden", margin: 0 }}>{greeting}</p>
          </div>
        </div>
      )}
    </div>
  );
}
