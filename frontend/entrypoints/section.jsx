import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import {ReactDOM as RE} from "react-dom";
import App from "@/components/App";
import "./section.css";

ReactDOM.createRoot(document.getElementById("section")).render(
  // <React.StrictMode>
  <App props={{home: home, mountDiv: "section", toggleOverlay: toggleOverlay}} />
  // </React.StrictMode>
);

// Create and append the overlay div
const overlayDiv = document.createElement("div");
overlayDiv.id = "overlay-test"
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

// Define a new React component for the overlay content
const OverlayContent = () => (
  <div id="boiboiboi" style={{ color: "white", textAlign: "center", padding: "20px" }}>
    <h1>This is the overlay content</h1>
    <p>You can render any React component here!</p>
  </div>
);

ReactDOM.createRoot(document.getElementById("overlay-test")).render(
<OverlayContent/>
);