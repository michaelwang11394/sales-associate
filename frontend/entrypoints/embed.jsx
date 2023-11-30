import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import Icon from "@/components/icon";
import CommandPalette from "@/components/command";
import "./embed.css";
import { AppProvider } from "@shopify/polaris";

ReactDOM.createRoot(document.getElementById("embed")).render(
  // <React.StrictMode>
  <Icon props={{home: home, mountDiv: "embed", iconSize: "2em", toggleOverlay: toggleOverlay}} />
  // </React.StrictMode>
);

// Create and append the overlay div
const overlayDiv = document.createElement("div");
const divId = "embed-overlay"
overlayDiv.id = divId
overlayDiv.style.position = "fixed";
overlayDiv.style.top = "0";
overlayDiv.style.left = "0";
overlayDiv.style.width = "100%";
overlayDiv.style.height = "100%";
overlayDiv.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
overlayDiv.style.zIndex = "1000";
overlayDiv.style.display = "none";
document.body.appendChild(overlayDiv);

// Function to show/hide the overlay
function toggleOverlay() {
  overlayDiv.style.display = overlayDiv.style.display === "none" ? "block" : "none";
}

ReactDOM.createRoot(document.getElementById(divId)).render(
  <AppProvider>
    <CommandPalette/>
  </AppProvider>
);