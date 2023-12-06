import "vite/modulepreload-polyfill";
import "./section.css";
import { createOverlayDiv, createIcon } from "./createElements";

createIcon(home, "embed", createOverlayDiv(), 4);
