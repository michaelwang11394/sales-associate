import { useEffect, useState } from "react";
import supabase from "./supabase";
export default function App({ home }) {
  const [events, setEvents] = useState([]);
  console.log("Home", home);
  useEffect(() => {
    subscribeToEvents();
  }, []);

  // Note: Our app gets unmounted each time the customer changes a page, so supabase subscriptions listener also gets unmounted. For now, we just fetch the last 3 events on each page load, and do parsing there.
  const subscribeToEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(3);

    if (error) {
      console.log("Error", error);
      return;
    }
    console.log("Data", data);
  };

  return (
    <div className="tw-text-5xl tw-text-red-600">
      Hello From Chat Interface!
    </div>
  );
}
