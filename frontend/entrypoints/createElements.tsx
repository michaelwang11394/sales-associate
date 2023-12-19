import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import Icon from "@/components/icon";
import CommandPalette from "@/components/command";
import "./section.css";
import "@/styles/chat.css";

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
    overlayDiv.style.width = "100%";
    overlayDiv.style.height = "100%";
    overlayDiv.style.zIndex = "1000";
    overlayDiv.style.display = "block";
    overlayDiv.className = "overlay";
    document.body.appendChild(overlayDiv);
    ReactDOM.createRoot(overlayDiv).render(
      <CommandPalette props={{ overlayDiv: overlayDiv }} />
    );
  }

  return overlayDiv;
}
