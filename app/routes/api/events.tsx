import { json } from "@remix-run/node";

export let action = async ({ request }) => {
  // Parse the request body as JSON
  let event = await json(request);

  // Log the event data
  console.log("Received event:", event);

  // You can add additional logic here to store the event data in your database

  // Return a success response
  return new Response("Event received", { status: 200 });
};

export default function Event() {
  // This component doesn't render anything
  return null;
}
