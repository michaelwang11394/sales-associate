import { useEffect, useState } from "react";
import "react-chat-elements/dist/main.css";
import { MessageList, Avatar, MessageBox } from "react-chat-elements";
// @ts-ignore
import { getSuggestions, getGreeting } from "@/helper/shopify";
// @ts-ignore
import { subscribeToEvents } from "@/helper/supabase";
// @ts-ignore
import { handleNewCustomerEvent } from "@/helper/ai";
import { createOpenai } from "@/helper/ai";

export default function CommandPalette() {
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [openai, setOpenai] = useState();

  // Effect for getting customer events and sending to AI
  useEffect(() => {
    // Call subscribeToEvents and handle the returned data
    const clientId = window.localStorage.getItem("webPixelShopifyClientId");
    createOpenai().then((res) => {
      setOpenai(res);
    });
    subscribeToEvents(clientId).then((data) => {
      // Call handleNewCustomerEvent with each event
      data.data?.forEach(async (event) => {
        //TODO: Change this if we change defaults
        const greeting = await getGreeting(event);
        setMessages([...messages, formatMessage(greeting, "system")]);
        console.log("messages", messages);
        handleNewCustomerEvent(event)
          .then((res) => {
            console.log("res", res);
            setOpenai(res);
          })
          .catch((err) => console.error(err));
      });
    });
  }, []);

  const formatMessage = (text, source) => {
    const title = source === "system" ? "Sales Associate" : "";
    const position = source === "system" ? "left" : "right";
    const messageType = "text";
    const avatar =
      source === "system"
        ? "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1061&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
        : "";

    //TODO: Download photo locally
    const message = {
      position: position,
      type: messageType,
      title: title,
      text: text,
      avatar: avatar,
    };
    return message;
  };

  const handleInputChange = async (event) => {
    setUserInput(event.target.value);
    if (event.target.value != "") {
      const suggestions = await getSuggestions(event.target.value);
      setSuggestions(suggestions);
    } else {
      setSuggestions([]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newUserMessage = formatMessage(userInput, "user");
    const newMessages = [...messages, newUserMessage];
    // @ts-ignore
    setMessages(newMessages);

    // TODO: Turn off openai for now. Add dev mode as toggle
    if (openai && false) {
      await openai
        .call({ message: userInput })
        .then((response) => {
          console.log(response.text);
          const newResponseMessage = formatMessage(response.text, "system");
          // @ts-ignore
          setMessages([...newMessages, newResponseMessage]);
          console.log("message after openai", messages);
        })
        .catch((err) => console.error(err));
    } else {
      // @ts-ignore
      setMessages([
        ...newMessages,
        formatMessage("AI is not available, please try again", "system"),
      ]);
      console.error("openai not available");
    }
    setUserInput("");
  };

  const handleDropdownItemClick = (item) => {
    // Handle the selection of suggestions if needed
    console.log("Selected suggestion:", item);
  };

  return (
    <div id="overlay" style={{ height: "70%" }}>
      <section
        style={{
          position: "relative",
          overflow: "hidden",
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
              borderWidth: "thin",
            }}
          >
            <div style={{ position: "relative" }}>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={userInput}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  style={{
                    width: "100%",
                    height: "4rem",
                    paddingRight: "1rem",
                    color: "black",
                    border: "none",
                    borderRadius: "0.625rem 0.625rem 0 0",
                    paddingLeft: "2.75rem",
                  }}
                  placeholder="Ask me anything! I am not your typical search bar."
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
              </form>
            </div>
            {/* Dividing Line */}
            {/* TODO: 1) Add add to cart button for each product. 2) Add button that will show rest of search results.*/}
            <div
              style={{
                display: "flex",
                borderTop: "1px solid rgba(17, 16, 16, 0.2)",
                flexDirection: "column",
                overflowY: "auto",
                maxHeight: "60rem",
              }}
            >
              <div
                style={{
                  flex: "1",
                  minWidth: "0",
                  padding: "1.5rem",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  Product Suggestions
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-around",
                  }}
                >
                  {suggestions && suggestions.length > 0 ? (
                    suggestions.slice(0, 4).map((product, index) => (
                      <div
                        key={index}
                        style={{
                          flex: "1 0 21%",
                          margin: "1%",
                          textAlign: "center",
                        }}
                      >
                        <a
                          // @ts-ignore
                          href={product.url}
                          onClick={() => handleDropdownItemClick(product)}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          {/* Product Image */}
                          <img
                            // @ts-ignore
                            src={product.featured_image.url}
                            // @ts-ignore
                            alt={product.featured_image.alt}
                            style={{
                              width: "80%",
                              height: "50%",
                              objectFit: "contain",
                              marginBottom: "8px",
                            }}
                          />

                          {/* Product Name */}
                          <div style={{ marginBottom: "8px" }}>
                            {
                              // @ts-ignore
                              product.title
                            }
                          </div>

                          {/* Product Price */}
                          <div>
                            {
                              // @ts-ignore
                              product.price
                            }
                          </div>
                        </a>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", fontStyle: "italic" }}>
                      Type in the search box to see suggestions
                    </div>
                  )}
                </div>
              </div>
              <div
                style={{
                  height: "2px",
                  backgroundColor: "black",
                }}
              />
              <div
                style={{
                  flex: "1",
                  minWidth: "0",
                  padding: "1.5rem",
                }}
              >
                {/* Chat Column*/}
                <div
                  style={{
                    fontWeight: "bold",
                    marginBottom: "10px",
                    textAlign: "center",
                  }}
                >
                  Conversation
                </div>

                {messages.map((message, index) => (
                  <MessageBox
                    key={index}
                    position={message.position}
                    type={message.type}
                    text={message.text}
                    avatar={message.avatar}
                    title={message.title}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
