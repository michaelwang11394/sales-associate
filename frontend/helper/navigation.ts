export async function getMostRecentEvent(browser: { sessionStorage: Storage }, store: string): Promise<any | null> {
  try {
    const localEventsRaw = await browser.sessionStorage.getItem("webPixelShopifyLatestEvents" + store);
    if (!localEventsRaw) return null; // Return null if there are no events stored

    const localEvents = JSON.parse(localEventsRaw);
    return localEvents.length > 0 ? localEvents[localEvents.length - 1] : null; // Return the most recent event or null if the array is empty
  } catch (error) {
    console.error("Error parsing events from sessionStorage:", error);
    return null; // Return null in case of any error
  }
}