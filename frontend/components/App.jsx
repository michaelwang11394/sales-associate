import { useEffect, useState } from "react";
import { subscribeToEvents } from "./supabase.js";
import { handleNewCustomerEvent } from "./ai.js";
export default function App({ home }) {
  const [userInput, setUserInput] = useState("");

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

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
  };

  const handleSubmit = () => {
    handleNewCustomerEvent(userInput)
      .then((response) => {
        console.log(response.text);
      })
      .catch((err) => console.error(err));
    setUserInput("");
  };

  return (
    <div className="mt-4">
      <input
        type="text"
        value={userInput}
        onChange={handleInputChange}
        className="border-2 border-black bg-white h-10 px-5 pr-16 rounded-lg text-sm "
      />
      <button
        onClick={handleSubmit}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Submit
      </button>
    </div>
  );
}
