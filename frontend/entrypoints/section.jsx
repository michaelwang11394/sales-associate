import "vite/modulepreload-polyfill";
import ReactDOM from "react-dom/client";
import App from "@/components/App";
import "./section.css";

ReactDOM.createRoot(document.getElementById("section")).render(
  // <React.StrictMode>
  <App props={{home: home, mountDiv: "section"}} />
  // </React.StrictMode>
);
