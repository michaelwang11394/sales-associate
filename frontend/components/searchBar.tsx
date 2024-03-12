import { PALETTE_DIV_ID } from "@/constants/constants";
import { toggleOverlayVisibility } from "@/helper/animations";

import "@/styles/chat.css";
import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

export default function SearchBar({ props }) {
  const [userInput, setUserInput] = useState("");
  const posthog = usePostHog();
  const clientId = useRef(
    window.localStorage.getItem("webPixelShopifyClientId")
  );

  useEffect(() => {
    if (import.meta?.env?.VITE_POSTHOG_FORCE_FLAG) {
      console.log(
        "Overriding sales associate via posthog feature flag: ",
        import.meta.env.VITE_POSTHOG_FORCE_FLAG
      );
      posthog.featureFlags.override({
        enabled: import.meta.env.VITE_POSTHOG_FORCE_FLAG,
      });
    }
    if (clientId.current) {
      posthog?.identify(clientId.current, { store: window.location.host });
    }
  }, [posthog, clientId]);

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

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    props.eventEmitter.emit("searchSubmitted", { input: userInput });
    const overlayDiv = props.overlayDiv;
    props.mountOverlay();
    // Inside CommandPalette component
    setUserInput("");
    toggleOverlayVisibility(overlayDiv);
  };

  return (
    clientId.current && (
      <div id="sa-expanded">
        <div id="search bar" className="flex justify-between items-center">
          <form
            onSubmit={handleSearchSubmit}
            className="w-3/4 m-2 flex mx-auto relative">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-grow h-16 pr-12 pl-14 text-black border border-gray-300 rounded-lg text-center focus:outline-none focus:shadow-none focus:border-none w-3/4 mx-auto shadow-sm"
              style={{
                backgroundColor: "#fff",
                fontFamily: "Avenir",
              }}
              placeholder={
                userInput === ""
                  ? "I'm not your average search bar. Ask me anything!"
                  : ""
              }
              onFocus={(e) => (e.target.placeholder = "")}
              onBlur={(e) =>
                (e.target.placeholder =
                  "I'm not your average search bar. Ask me anything!")
              }
              role="combobox"
              aria-expanded="false"
              aria-controls="options"
            />
            <button
              id="submit-button"
              type="submit"
              disabled={userInput === ""}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 pt-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <g id="vuesax/bold/send">
                  <g id="send">
                    <path
                      id="Vector"
                      d="M18.07 8.50965L9.51002 4.22965C3.76002 1.34965 1.40002 3.70965 4.28002 9.45965L5.15002 11.1996C5.40002 11.7096 5.40002 12.2996 5.15002 12.8096L4.28002 14.5396C1.40002 20.2896 3.75002 22.6496 9.51002 19.7696L18.07 15.4896C21.91 13.5696 21.91 10.4296 18.07 8.50965ZM14.84 12.7496H9.44002C9.03002 12.7496 8.69002 12.4096 8.69002 11.9996C8.69002 11.5896 9.03002 11.2496 9.44002 11.2496H14.84C15.25 11.2496 15.59 11.5896 15.59 11.9996C15.59 12.4096 15.25 12.7496 14.84 12.7496Z"
                      fill={"#2a33ff"}
                    />
                  </g>
                </g>
              </svg>
            </button>
          </form>
        </div>
      </div>
    )
  );
}
