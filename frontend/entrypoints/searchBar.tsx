import "vite/modulepreload-polyfill";
import { createOverlayDiv, createSearchBar } from "./createElements";
import "./section.css";

const { overlayDiv, mountOverlay, eventEmitter } = createOverlayDiv();
createSearchBar(home, "sa-search-bar", overlayDiv, mountOverlay, eventEmitter);
