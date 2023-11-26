import { useEffect, useState, useRef } from "react";
// @ts-ignore
import { subscribeToEvents } from "./supabase.js";
import { handleNewCustomerEvent } from "./ai.js";

// @ts-ignore
export default function App({ home }) {
  const [userInput, setUserInput] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const iconRef = useRef(null);

  useEffect(() => {
    if (iconRef.current) {
      // @ts-ignore
      const iconWidth = iconRef.current.clientWidth;
      // @ts-ignore
      const iconHeight = iconRef.current.clientHeight;
      // @ts-ignore
      const iconOffsetTop = iconRef.current.offsetTop;
      // @ts-ignore
      const iconOffsetLeft = iconRef.current.offsetLeft;

      console.log("Icon Width:", iconWidth);
      console.log("Icon Height:", iconHeight);
      console.log("Icon OffsetTop:", iconOffsetTop);
      console.log("Icon OffsetLeft:", iconOffsetLeft);

      // Perform any other logic with the icon's dimensions or position
    }
  }, []);

  useEffect(() => {
    // Show dropdown as soon as there is text in the input
    if (userInput.trim() !== "") {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [userInput]);

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleSubmit = () => {
    handleNewCustomerEvent(userInput)
      .then((response) => {
        console.log(response.text);
      })
      .catch((err) => console.error(err));
    setUserInput("");
  };

  const handleIconClick = () => {
    setShowSearchBar(!showSearchBar);
    // Reset dropdown when search bar is toggled
    setShowDropdown(false);
  };

  const handleDropdownItemClick = (item) => {
    console.log("Selected item:", item);
    setShowDropdown(false);
  };

  return (
    <div className="mt-4" style={{ position: "relative" }}>
      {/* Icon */}
      <div
        ref={iconRef}
        onClick={handleIconClick}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="1em"
          viewBox="0 0 512 512"
          style={{ fill: "white" }}  // Set icon color to white
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
            }}
          >
            <input
              type="text"
              value={userInput}
              onChange={handleInputChange}
              placeholder="Search..."
              style={{
                width: "80%",
                padding: "8px",
                fontSize: "1.5rem",
                borderRadius: "4px",
                color: "black",
              }}
            />
            <button onClick={handleSubmit}>Search</button>
          </div>

          {/* Dropdown items */}
          {showDropdown && (
            <div
              style={{
                background: "black",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "5px", // Adjust this value as needed
              }}
            >
              <div
                onClick={() => handleDropdownItemClick("Item 1")}
                style={{
                  width: "80%",
                  padding: "8px",
                  borderBottom: "1px solid #ccc",
                  boxSizing: "border-box",
                  textAlign: "center",
                  color: "white",
                }}
              >
                Item 1
              </div>
              <div
                onClick={() => handleDropdownItemClick("Item 2")}
                style={{
                  width: "80%",
                  padding: "8px",
                  boxSizing: "border-box",
                  textAlign: "center",
                  color: "white",
                }}
              >
                Item 2
              </div>
              {/* Add more items as needed */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
