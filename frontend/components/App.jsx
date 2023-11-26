import React, { useEffect, useState, useRef } from "react";
import { subscribeToEvents } from "./supabase.js";
import { handleNewCustomerEvent } from "./ai.js";

export default function App({ home }) {
  const [userInput, setUserInput] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [chatThread, setChatThread] = useState([]);
  const iconRef = useRef(null);

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

      // Perform any other logic with the icon's dimensions or position
    }
  }, []);

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleSuggestions = () => {
    // Mocking suggestions for demonstration purposes. Call ajax API for predictive search
    setSuggestions(["Suggestion 1", "Suggestion 2", "Suggestion 3"]);
  };

  const handleEnterPress = () => {
    if (userInput.trim() !== "") {
      // Update chat thread with the new message
      setChatThread((prevChatThread) => [
        ...prevChatThread,
        { user: "You", message: userInput },
      ]);

      // Reset the search box text
      setUserInput("");
    }
  };

  const handleIconClick = () => {
    setShowSearchBar(!showSearchBar);

    // Fetch suggestions when search bar is opened
    if (!showSearchBar) {
      handleSuggestions();
    }
  };

  const handleDropdownItemClick = (item) => {
    // Handle the selection of suggestions if needed
    console.log("Selected suggestion:", item);
  };

  return (
    <div className="mt-4" style={{ position: "relative" }}>
      {/* Icon */}
      <div ref={iconRef} onClick={handleIconClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="1em"
          viewBox="0 0 512 512"
          style={{ fill: "white" }} // Set icon color to white
        >
          <path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z" />
        </svg>
      </div>

      {/* Search bar and Dropdown Container */}
      {showSearchBar && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", zIndex: 2 }}>
          {/* Search bar */}
          <div
            style={{
              background: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "column",
            }}
          >
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleEnterPress()}
              placeholder="Type and press Enter..."
              style={{
                width: "80%",
                padding: "8px",
                fontSize: "1rem",
                borderRadius: "4px",
                color: "black",
                marginBottom: "8px",
              }}
            />
          </div>

          {/* Suggestions and Chat thread Container */}
          <div
            style={{
              background: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "start",
              flexDirection: "row",
              height: "30vh",
            }}
          >
            {/* Suggestions Container */}
            <div
              style={{
                display: "flex",
                width: "30%",
                justifyContent: "flex-start",
                flexDirection: "column",
                color: "white",
                overflowY: "auto", // Make it scrollable
                maxHeight: "30vh", // Set maximum height
              }}
            >
              {/* Suggestions */}
              {suggestions.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleDropdownItemClick(item)}
                  style={{
                    padding: "8px",
                    borderBottom: "1px solid #ccc",
                    boxSizing: "border-box",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Chat thread Container */}
            <div
              style={{
                background: "black",
                display: "flex",
                width: "70%",
                flexDirection: "column",
                alignItems: "center",
                overflowY: "auto",
                padding: "8px",
                color: "white",
                maxHeight: "30vh", // Set maximum height
              }}
            >
              {/* Chat thread */}
              {chatThread.map((message, index) => (
                <div key={index} style={{ marginBottom: "8px" }}>
                  <strong>{message.user}:</strong> {message.message}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
