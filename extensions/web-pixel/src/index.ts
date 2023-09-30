import { register } from "@shopify/web-pixels-extension";

register(async ({ analytics, browser, settings }) => {
  // const uid = await browser.cookie.get("your_visitor_cookie");

  // subscribe to events
  analytics.subscribe("all_events", async (event) => {
    console.log("web pixel event:", event);

    // The Server is http://localhost:51246
    // const pixelEndpoint =
    //   "https://ill-handmade-crm-opportunity.trycloudflare.com/ai";

    // Send event to /ai route in Remix application

    // try {
    //   const response = await fetch("/ai", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ event }),
    //     keepalive: true,
    //   });
    //   console.log("web pixel event sent", response);
    // } catch (error) {
    //   console.error("Error during fetch:", error);
    // }
    // const iSuccessful = await browser.sendBeacon(
    //   pixelEndpoint,
    //   JSON.stringify({ ...event })
    // );
    // if (!isSusccessful) throw new Error("Unable to send via Beacon API");
  });
});
