import { useEffect, useState } from "react";
import "react-chat-elements/dist/main.css";
import { MessageList } from "react-chat-elements";
// @ts-ignore
import { getSuggestions } from "@/helper/shopify";
import { subscribeToEvents } from "@/helper/supabase";
import { handleNewCustomerEvent } from "@/helper/ai";

export default function CommandPalette() {
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);

  // Effect for getting customer events and sending to AI
  useEffect(() => {
    // Call subscribeToEvents and handle the returned data
    subscribeToEvents().then((data) => {
      // Call handleNewCustomerEvent with each event
      data?.forEach((event) => {
        handleNewCustomerEvent(event)
          .then((response) => {
            // Handle the response from the chatbot
            console.log(response.text);
            formatMessage(response.text, "system");
          })
          .catch((err) => console.error(err));
      });
    });
  }, []);

  const formatMessage = (text, source) => {
    const title = source === "system" ? "Sales Associate" : "User"; // TODO: What should user actually be named?
    const position = source === "system" ? "Sales Associate" : "User";
    const messageType = "text";

    const message = {
      title: title,
      position: position,
      messageType: messageType,
      text: text,
    };
    setMessages([...messages, message]);
  };

  const handleInputChange = async (event) => {
    setUserInput(event.target.value);
    console.log(event.target.value);
    if (event.target.value != "") {
      const suggestions = await getSuggestions(event.target.value);
      setSuggestions(suggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = () => {
    handleNewCustomerEvent(userInput, "user")
      .then((response) => {
        console.log(response.text);
      })
      .catch((err) => console.error(err));
    setUserInput("");
  };

  const handleDropdownItemClick = (item) => {
    // Handle the selection of suggestions if needed
    console.log("Selected suggestion:", item);
  };

  return (
    <div id="boi" style={{ height: "500px" }}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: "black",
          backgroundSize: "cover",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
          }}
        >
          <div
            style={{
              maxWidth: "1200px",
              width: "100%",
              margin: "auto",
              overflow: "hidden",
              transition: "all",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              backgroundColor: "white",
              backdropFilter: "blur(10px)",
              borderRadius: "1rem",
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                type="text"
                onChange={handleInputChange}
                onSubmit={handleSubmit}
                style={{
                  width: "100%",
                  height: "3rem",
                  paddingRight: "1rem",
                  color: "black",
                  border: "none",
                  borderRadius: "0.625rem 0.625rem 0 0",
                  paddingLeft: "2.75rem",
                }}
                placeholder="Ask me anything! I am not your typical search bar"
                role="combobox"
                aria-expanded="false"
                aria-controls="options"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{
                  position: "absolute",
                  top: "50%",
                  right: "10px",
                  transform: "translateY(-50%)",
                  height: "1.5rem",
                  width: "1.5rem",
                  color: "black",
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {/* Dividing Line */}
            <div
              style={{
                display: "flex",
                borderTop: "1px solid rgba(17, 16, 16, 0.2)",
                flexDirection: "row",
              }}
            >
              <div
                style={{
                  flex: "1",
                  minWidth: "0",
                  padding: "1.5rem",
                  overflowY: "auto",
                  maxHeight: "24rem",
                }}
              >
                {/* 
                Suggestions column
                //TODO: Add Description and Price
                */}
                {suggestions &&
                  suggestions.map((product, index) => (
                    <a
                      key={index}
                      // @ts-ignore
                      href={product.url}
                      onClick={() => handleDropdownItemClick(product)}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "8px",
                          borderBottom: "1px solid #ccc",
                          boxSizing: "border-box",
                          cursor: "pointer",
                        }}
                      >
                        {/* Product Image */}
                        <img
                          // @ts-ignore
                          src={product.featured_image.url}
                          // @ts-ignore
                          alt={product.featured_image.alt}
                          style={{ width: "50px", marginRight: "8px" }}
                        />

                        {/* Product Name */}
                        <div style={{ textAlign: "center" }}>
                          {
                            // @ts-ignore
                            product.title
                          }
                        </div>
                      </div>
                    </a>
                  ))}
              </div>
              <div
                style={{
                  flex: "1",
                  minWidth: "0",
                  padding: "1.5rem",
                  overflowY: "auto",
                  maxHeight: "24rem",
                }}
              >
                {/* Chat Column */}
                <MessageList
                  className="message-list"
                  lockable={true}
                  toBottomHeight={"100%"}
                  dataSource={[
                    {
                      position: "left",
                      type: "text",
                      title: "Kursat",
                      text: "Give me a message list example !",
                    },
                    {
                      position: "right",
                      type: "text",
                      title: "Emre",
                      text: "That's all.",
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
