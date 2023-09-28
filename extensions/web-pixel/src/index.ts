import { register } from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, settings }) => {
  // get/set your tracking cookies
  const uid = await browser.cookie.get("your_visitor_cookie");
  const pixelEndpoint = `https://example.com/pixel?id=${settings.accountID}&uid=${uid}`;

  // subscribe to events
  analytics.subscribe("all_events", (event) => {
    // transform the event payload to fit your schema (optional)
    console.log("web pixel event:", event);

    // push customer event to your server for processing
    browser.sendBeacon(pixelEndpoint, event);
  });
});
