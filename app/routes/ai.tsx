// import { json, redirect } from "@remix-run/node";
import { OpenAI } from "openai";

import { register } from "@shopify/web-pixels-extension";

// Initialize the OpenAI API with your API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Loader function to receive logs
export const loader = async () => {
  register((api) => {
    // you can access the web pixel extension API in here
    api.analytics.subscribe("page_viewed", (event) => {
      console.log(`Event Name is: ${event.name}`);
      // Event Name is: page_viewed

      // Set a cookie with the standard API
      api.browser.cookie.set("my_user_id", "ABCX123");

      console.log(`Customer Name: ${api.init.data.customer.firstName}`);
      // Customer Name: Bogus

      console.log(api.settings);
      /**
       * {
       *   "accountID": 234
       * }
       */
    });
  });
};
// export async function loader({ request }) {
//   const body = await request.json();
//   const event = body.event;
//   console.log("Event from browser:", event);
//   return json({ event });
// }

// Route Component
export default function Ai() {
  // TODO: Return null for now
  return null;
}
// Function to send prompts to GPT-3.5 Turbo
async function sendEventToGpt(event) {
  try {
    const stream = await openai.chat.completions.create({
      messages: [{ role: "user", content: event }],
      model: "gpt-3.5-turbo",
      stream: true,
    });

    for await (const part of stream) {
      process.stdout.write(part.choices[0]?.delta?.content || "");
    }
  } catch (error) {
    console.error(
      "Error occurred while communicating with OpenAI GPT-3.5 Turbo:",
      error
    );
    throw error; // re-throw the error so it can be handled by the caller
  }
}

// Action function to send logs to OpenAI
export async function action({ request }) {
  const body = await request.json();
  const event = body.event;
  await sendEventToGpt(event);
  // return redirect("/ai");
}

// Export the function so it can be used in other files
export { sendEventToGpt };
