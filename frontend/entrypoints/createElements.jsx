import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import Icon from "@/components/icon";
import CommandPalette from "@/components/command";
import "./section.css";
import { AppProvider } from "@shopify/polaris";

export function createIcon(home, mountDiv, overlayDiv, iconSize='1em') {
  ReactDOM.createRoot(document.getElementById(mountDiv)).render(
    <Icon
      props={{ home: home, mountDiv: mountDiv, overlayDiv: overlayDiv, iconSize: iconSize }}
    />
  );
}

export function createOverlayDiv() {
  const divId = "overlay"
  let overlayDiv = document.getElementById(divId);

  if (!overlayDiv) {
    overlayDiv = document.createElement("div");
    overlayDiv.id = divId;
    overlayDiv.style.position = "fixed";
    overlayDiv.style.top = "0";
    overlayDiv.style.left = "0";
    overlayDiv.style.width = "100%";
    overlayDiv.style.height = "100%";
    overlayDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    overlayDiv.style.zIndex = "1000";
    overlayDiv.style.display = "none";
    document.body.appendChild(overlayDiv);
    ReactDOM.createRoot(document.getElementById(divId)).render(
      <AppProvider>
        <CommandPalette/>
      </AppProvider>
    );
  }


  return overlayDiv;
}