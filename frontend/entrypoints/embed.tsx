import "vite/modulepreload-polyfill";
import "./section.css";
import { createOverlayDiv, createIcon } from "./createElements";

createIcon(embed_home, "embed", createOverlayDiv(), 100);
