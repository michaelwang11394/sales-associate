import posthog from "posthog-js";
import "vite/modulepreload-polyfill";
import { createIcon, createOverlayDiv } from "./createElements";
import "./section.css";

const { overlayDiv, mountOverlay } = createOverlayDiv();
let iconCreated = false;

// @ts-ignore
if (import.meta?.env?.VITE_POSTHOG_FORCE_FLAG) {
  console.log(
    "Overriding sales associate via posthog feature flag: ",
    // @ts-ignore
    import.meta.env.VITE_POSTHOG_FORCE_FLAG
  );
  posthog.featureFlags.override({
    // @ts-ignore
    enabled: import.meta.env.VITE_POSTHOG_FORCE_FLAG,
  });
}
const clientId = window.localStorage.getItem("webPixelShopifyClientId");
if (clientId) {
  posthog?.identify(clientId, { store: window.location.host });
  posthog?.reloadFeatureFlags();
  posthog.onFeatureFlags(function () {
    const isEnabledTest = posthog.getFeatureFlag("enabled") !== "control";
    // Only create the icon if it hasn't been created yet and the flag condition is met
    if (!iconCreated && isEnabledTest) {
      createIcon(embed_home, "embed", overlayDiv, mountOverlay, 100);
      iconCreated = true; // Prevent future calls from creating the icon again
    }
  });
}
