import { PALETTE_DIV_ID } from "@/constants/constants";
import { MessageSource, SenderType } from "@/constants/types";
import { callOpenai } from "@/helper/ai";
import { toggleOverlayVisibility } from "@/helper/animations";
import { getGreetingMessage } from "@/helper/shopify";
import { v4 as uuidv4 } from "uuid";

import { getLastPixelEvent, insertMessage } from "@/helper/supabase";
import "@/styles/chat.css";
import { PostHogFeature, usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";

export default function Icon({ props }) {
  const [greeting, setGreeting] = useState(
    "Welcome to the store, click me to start chatting with your AI sales assistant!"
  );
  const iconRef = useRef(null);
  const iconSize = props.iconSize;
  const posthog = usePostHog();
  const clientId = useRef(
    window.localStorage.getItem("webPixelShopifyClientId")
  );

  useEffect(() => {
    // posthog.featureFlags.override({ enabled: "test" }); If you want to override feature flag
    if (clientId.current) {
      posthog?.identify(window.location.host + clientId.current);
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
    const attemptToFetchAndProcessEvents = (retryCount = 0) => {
      clientId.current = window.localStorage.getItem("webPixelShopifyClientId");
      if (clientId.current && props.mountDiv === "embed") {
        getLastPixelEvent(clientId.current).then((d) => {
          d.data?.forEach(async (event) => {
            const uuid = uuidv4();
            const greetingPrompt = await getGreetingMessage(event);
            callOpenai(
              greetingPrompt,
              clientId.current!,
              uuid,
              MessageSource.EMBED
            )
              .then(async (reader) => {
                let full = "";
                while (true) {
                  const { done, value } = await reader!.read();
                  if (done) {
                    reader!.cancel();
                    break;
                  }
                  let chunk = new TextDecoder("utf-8").decode(value);
                  full += chunk;
                  setGreeting(full);
                }
                await insertMessage(
                  clientId.current,
                  "text",
                  SenderType.SYSTEM,
                  [full],
                  uuid
                );
              })
              .catch((err) => console.error(err));
          });
        });
      } else if (retryCount < 5) {
        // Limit the number of retries to prevent infinite loop
        setTimeout(() => {
          attemptToFetchAndProcessEvents(retryCount + 1);
        }, 500);
      }
    };

    attemptToFetchAndProcessEvents();

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
    clientId.current && (
      <PostHogFeature flag="enabled" match={"test"}>
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
              id="popup"
              className="talk-bubble mobile-talk-bubble"
              style={{
                position: "absolute",
                bottom: iconRef.current.offsetTop + iconSize / 2 + "px",
                right: iconRef.current.offsetLeft + iconSize / 3 + "px",
              }}>
              <div className="talktext flex-1" style={{ whiteSpace: "normal" }}>
                <p>{greeting}</p>
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    cursor: "pointer",
                    background: "#f0f0f0", // Slightly gray background
                    borderRadius: "50%", // Added round border
                    padding: "0px 0px 0px 4px",
                    borderColor: "#d0d0d0", // Added border color
                    borderWidth: "1px", // Added border width
                    borderStyle: "solid", // Added border style
                    width: "20px", // Ensure equal width and height
                    height: "20px",
                  }}
                  onClick={(event) => {
                    event?.stopPropagation();
                    const popupDiv = document.getElementById("popup");
                    if (popupDiv) {
                      popupDiv.style.visibility =
                        popupDiv.style.visibility === "hidden"
                          ? "visible"
                          : "hidden";
                    }
                  }} // Assuming toggleOverlayVisibility can hide the div
                >
                  <svg
                    style={{
                      marginBottom: "1px",
                    }}
                    fill="#000000"
                    height="10px"
                    width="10px"
                    version="1.1"
                    id="Capa_1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 460.775 460.775">
                    <path
                      d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
	c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
	c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
	c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
	l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
	c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </PostHogFeature>
    )
  );
}
