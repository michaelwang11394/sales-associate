import React, { useEffect, useState, useRef } from "react";
import { subscribeToEvents } from "../helper/supabase.js";
import { handleNewCustomerEvent } from "../helper/ai.js";
import { getSuggestions } from "../helper/shopify.js";

export default function Icon({ props }) {
  const [userInput, setUserInput] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [chatThread, setChatThread] = useState([]);
  const iconRef = useRef(null);
  const chatThreadRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom of the chat thread when it updates
    if (chatThreadRef.current) {
      chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
    }
  }, [chatThread]);

  useEffect(() => {
    if (iconRef.current) {
      const iconWidth = iconRef.current.clientWidth;
      const iconHeight = iconRef.current.clientHeight;
      const iconOffsetTop = iconRef.current.offsetTop;
      const iconOffsetLeft = iconRef.current.offsetLeft;

      console.log("Icon Width:", iconWidth);
      console.log("Icon Height:", iconHeight);
      console.log("Icon OffsetTop:", iconOffsetTop);
      console.log("Icon OffsetLeft:", iconOffsetLeft);
      console.log(props)

      // Perform any other logic with the icon's dimensions or position
    }
  }, []);

  const handleInputChange = async (event) => {
    setUserInput(event.target.value);
    console.log(event.target.value)
    if (event.target.value != "") {
      const suggestions = await getSuggestions(event.target.value)
      setSuggestions(suggestions)
    } else {
      setSuggestions([])
    }
  };

  const handleIconClick = () => {
    props.toggleOverlay()
    /*
    setShowSearchBar(!showSearchBar);
    */

  };

  return (
    <div className="mt-4" style={{ position: "relative" }}>
      {/* Icon */}
      <div ref={iconRef} onClick={handleIconClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height={props.iconSize ?? "1em"}
          viewBox="0 0 512 512"
          style={{ fill: "black" }}
        >
          <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
        </svg>
      </div>
    </div>
  );
}
