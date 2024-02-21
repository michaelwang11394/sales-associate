import "vite/modulepreload-polyfill";
import { createIcon, createOverlayDiv } from "./createElements";
import "./section.css";
const { overlayDiv, mountOverlay } = createOverlayDiv();
createIcon(embed_home, "embed", overlayDiv, mountOverlay, 100);
