import posthog from "posthog-js";
import "vite/modulepreload-polyfill";
import { createIcon, createOverlayDiv } from "./createElements";
import "./section.css";

const { overlayDiv, mountOverlay } = createOverlayDiv();
let iconCreated = false;

posthog.onFeatureFlags(function () {
  const isEnabledTest = posthog.getFeatureFlag("enabled") !== "control";
  // Only create the icon if it hasn't been created yet and the flag condition is met
  if (!iconCreated && isEnabledTest) {
    createIcon(embed_home, "embed", overlayDiv, mountOverlay, 100);
    iconCreated = true; // Prevent future calls from creating the icon again
  }
});
