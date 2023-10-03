import { useEffect, useState } from "react";
import { subscribeToEvents } from "./supabase.js";
import { handleNewCustomerEvent } from "./ai.js";
export default function App({ home }) {
  const [events, setEvents] = useState([]);
  console.log("Home", home);
  useEffect(() => {
    // Call subscribeToEvents and handle the returned data
    subscribeToEvents().then((data) => {
      // Call handleNewCustomerEvent with each event
      data?.forEach((event) => {
        handleNewCustomerEvent(event)
          .then((response) => {
            // Handle the response from the chatbot
            console.log(response.text);
          })
          .catch((err) => console.error(err));
      });
    });
  }, []);

  return (
    <div className="tw-text-5xl tw-text-red-600">
      Hello From Chat Interface!
    </div>
  );
}
