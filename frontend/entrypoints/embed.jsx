import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import App from "@/components/App";
import "./embed.css";

ReactDOM.createRoot(document.getElementById("embed")).render(
  // <React.StrictMode>
  <App props={{home: home, mountDiv: "embed", iconSize: "2em"}} />
  // </React.StrictMode>
);
