export const toggleOverlayVisibility = async (overlayDiv) => {
  overlayDiv.classList.toggle("visible");
  const visible = overlayDiv.classList.contains("visible");
  overlayDiv.style.transition = visible
    ? "opacity 200ms ease, visibility 0s ease 0s"
    : "opacity 200ms ease, visibility 0s ease 200ms";
  overlayDiv.style.opacity = visible ? 1 : 0;
  overlayDiv.style.visibility = visible ? "visible" : "hidden";
};
