import CommandPalette from "@/components/command";
import Icon from "@/components/icon";
import "@/styles/chat.css";
import ReactDOM from "react-dom/client";
import "vite/modulepreload-polyfill";
import "./section.css";

export function createIcon(home, mountDiv, overlayDiv, iconSize) {
  const element = document.getElementById(mountDiv);
  if (!element) {
    throw new Error(`Element with id "${mountDiv}" not found`);
  }
  ReactDOM.createRoot(element).render(
    <Icon
      props={{
        home: home,
        mountDiv: mountDiv,
        overlayDiv: overlayDiv,
        iconSize: iconSize,
      }}
    />
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
    document.body.appendChild(overlayDiv);
    ReactDOM.createRoot(overlayDiv).render(
      <CommandPalette props={{ overlayDiv: overlayDiv }} />
    );
  }

  return overlayDiv;
}
