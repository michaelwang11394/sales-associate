import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import Icon from "@/components/icon";
import CommandPalette from "@/components/command";
import "./section.css";
import "@/styles/chat.css";

export function createIcon(home, mountDiv, overlayDiv, iconSize = 2) {
  ReactDOM.createRoot(document.getElementById(mountDiv)).render(
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
    overlayDiv.style.width = "100%";
    overlayDiv.style.height = "70%";
    overlayDiv.style.zIndex = "1000";
    overlayDiv.style.display = "block";
    overlayDiv.className = "overlay";
    document.body.appendChild(overlayDiv);
    ReactDOM.createRoot(document.getElementById(divId)).render(
      <CommandPalette props={{overlayDiv: overlayDiv}} />
    );
  }

  return overlayDiv;
}
