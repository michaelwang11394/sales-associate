import CommandPalette from "@/components/command";
import Icon from "@/components/icon";
import SearchBar from "@/components/searchBar";
import "@/styles/chat.css";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import ReactDOM from "react-dom/client";
import "vite/modulepreload-polyfill";
import "./section.css";

export function createSearchBar(
  home,
  mountDiv,
  overlayDiv,
  mountOverlay,
  eventEmitter
) {
  const element = document.getElementById(mountDiv);
  if (!element) {
    throw new Error(`Element with id "${mountDiv}" not found`);
  }

  const clientId = window.localStorage.getItem("webPixelShopifyClientId");
  if (clientId) {
    posthog?.identify(clientId, { store: window.location.host });
    posthog?.reloadFeatureFlags();
    posthog.onFeatureFlags(function () {
      const isEnabledTest = posthog.getFeatureFlag("enabled") !== "control";
      // Only create the icon if it hasn't been created yet and the flag condition is met
      if (isEnabledTest && !document.getElementById("sa-expanded")) {
        ReactDOM.createRoot(element).render(
          <PostHogProvider apiKey="phc_6YNAbj13W6OWd4CsBcXtyhy4zWUG3SNRb9EkXYjiGk4">
            <SearchBar
              props={{
                home,
                mountDiv,
                overlayDiv,
                mountOverlay,
                eventEmitter,
              }}
            />
          </PostHogProvider>
        );
      }
    });
  }
}

export function createIcon(home, mountDiv, overlayDiv, mountOverlay, iconSize) {
  const element = document.getElementById(mountDiv);
  if (!element) {
    throw new Error(`Element with id "${mountDiv}" not found`);
  }
  ReactDOM.createRoot(element).render(
    <PostHogProvider apiKey="phc_6YNAbj13W6OWd4CsBcXtyhy4zWUG3SNRb9EkXYjiGk4">
      <Icon
        props={{
          home: home,
          mountDiv: mountDiv,
          overlayDiv: overlayDiv,
          iconSize: iconSize,
          mountOverlay: mountOverlay,
        }}
      />
    </PostHogProvider>
  );
}

export function createOverlayDiv() {
  const divId = "full-overlay";
  let overlayDiv = document.getElementById(divId);

  if (!overlayDiv) {
    overlayDiv = document.createElement("div");
    overlayDiv.id = divId;
    overlayDiv.style.position = "fixed";
    overlayDiv.style.top = "0";
    overlayDiv.style.left = "0";
    overlayDiv.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
    overlayDiv.style.width = "100vw";
    overlayDiv.style.height = "100vh";
    overlayDiv.style.zIndex = "1000";
    overlayDiv.style.display = "block";
    overlayDiv.style.visibility = "hidden";
    overlayDiv.style.opacity = "0";
    overlayDiv.style.transition =
      "opacity 200ms ease, visibility 0s ease 200ms";
    overlayDiv.className = "overlay";
  }

  const eventEmitter = {
    events: {},
    queue: {},
    emit: function (eventName, data) {
      // If there are listeners, invoke them with the data
      if (this.events[eventName]) {
        this.events[eventName].forEach(function (callback) {
          callback(data);
        });
      } else {
        // If no listeners, queue the data
        if (!this.queue[eventName]) {
          this.queue[eventName] = [];
        }
        this.queue[eventName].push(data);
      }
    },
    on: function (eventName, callback) {
      // If there's something in the queue for this event, immediately consume it with the callback
      if (this.queue[eventName] && this.queue[eventName].length > 0) {
        while (this.queue[eventName].length > 0) {
          const data = this.queue[eventName].shift();
          callback(data);
        }
      }
      // Register the listener for future emits
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }
      this.events[eventName].push(callback);
    },
  };

  // Function to append the overlayDiv when needed
  function mountOverlay() {
    if (!document.body.contains(overlayDiv)) {
      document.body.appendChild(overlayDiv);
      ReactDOM.createRoot(overlayDiv).render(
        <PostHogProvider apiKey="phc_6YNAbj13W6OWd4CsBcXtyhy4zWUG3SNRb9EkXYjiGk4">
          <CommandPalette
            props={{ overlayDiv: overlayDiv, eventEmitter: eventEmitter }}
          />
        </PostHogProvider>
      );
    }
  }

  return { overlayDiv, mountOverlay, eventEmitter };
}
