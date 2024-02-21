import "vite/modulepreload-polyfill";
import { createIcon, createOverlayDiv } from "./createElements";
import "./section.css";

const { overlayDiv, mountOverlay } = createOverlayDiv();
createIcon(home, "section", overlayDiv, mountOverlay, 30);
