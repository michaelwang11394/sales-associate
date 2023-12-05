import { useEffect, useState } from "react";
import "react-chat-elements/dist/main.css";
import "@/styles/command.css";
import { MessageList, Avatar, MessageBox } from "react-chat-elements";
// @ts-ignore
import { getSuggestions, getGreetingMessage } from "@/helper/shopify";
// @ts-ignore
import { getLastPixelEvent } from "@/helper/supabase";
// @ts-ignore
import { createOpenaiWithHistory } from "@/helper/ai";
import { subscribeToMessages } from "@/helper/supabase";
import { insertMessage } from "@/helper/supabase";
import { getMessages } from "@/helper/supabase";
import { SUPABASE_MESSAGES_RETRIEVED } from "@/constants/constants";
import { toggleOverlayVisibility } from "@/helper/animations";
import { addToCart } from "@/helper/shopify";
import { formatMessage } from "@/helper/ai";

export default function CommandPalette({ props }) {
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [openai, setOpenai] = useState();
  const clientId = window.localStorage.getItem("webPixelShopifyClientId");

  useEffect(() => {
    if (clientId) {
      getMessages(clientId, SUPABASE_MESSAGES_RETRIEVED).then((data) => {
        if (!data) {
          console.error("Message history could not be fetched");
        } else {
          const messages = data.data
            .map((messageRow) =>
              formatMessage(messageRow.message, messageRow.sender)
            )
            .reverse();
          // @ts-ignore
          setMessages((prevMessages) => messages.concat(prevMessages));
          createOpenaiWithHistory(clientId, messages).then((res) => {
            setOpenai(res);
          });
        }
      });
      subscribeToMessages(clientId, (message) => {
        console.log("message inserted", JSON.stringify(message));
      });
    }
  }, []);

  useEffect(() => {
    if (clientId && openai) {
      getLastPixelEvent(clientId).then((data) => {
        data.data?.forEach(async (event) => {
          const greetingPrompt = await getGreetingMessage(event);
          await openai
            .call({ message: greetingPrompt })
            .then((response) => {
              const newResponseMessage = formatMessage(response.text, "system");
              handleNewMessage(clientId, newResponseMessage);
            })
            .catch((err) => console.error(err));
        });
      });
    }
  }, [openai])

  useEffect(() => {
    scrollToBottom();
  }, [messages, suggestions]);

  const scrollToBottom = () => {
    const chatColumn = document.getElementById("chat-column");
    if (chatColumn) {
      chatColumn.scrollTop = chatColumn.scrollHeight;
    }
  };

  const handleNewMessage = async (clientId, newUserMessage) => {
    const success = await insertMessage(
      clientId,
      newUserMessage.source,
      newUserMessage.text
    );
    if (!success) {
      console.error("Messages update failed for supabase table messages");
    }
    // @ts-ignore
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
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
    if (userInput === '') {
      return
    }
    const newUserMessage = formatMessage(userInput, "user");
    await handleNewMessage(clientId, newUserMessage);

    // TODO: Turn off openai for now. Add dev mode as toggle
    if (openai && true) {
      await openai
        .call({ message: userInput })
        .then((response) => {
          console.log(response.text);
          const newResponseMessage = formatMessage(response.text, "ai");
          handleNewMessage(clientId, newResponseMessage);
          console.log("message after openai", messages);
        })
        .catch((err) => console.error(err));
    } else {
      await handleNewMessage(
        clientId,
        formatMessage("AI is not available, please try again", "system")
      );
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
                  position: "relative", // Add this line
                }}
              >
                <button
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "none",
                    border: "none",
                    fontSize: "2rem",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleOverlayVisibility(props.overlayDiv)}
                >
                  &times;
                </button>
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

                          textAlign: "center",
                          padding: "0.2em",
                          margin: "0.2em",
                        }}
                      >
                        <a
                          // @ts-ignore
                          href={product.url}
                          onClick={() => handleDropdownItemClick(product)}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "space-between", // Distribute space between elements
                            minHeight: "150px", // Ensure a minimum height
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
                              maxHeight: "150px",
                              objectFit: "contain",
                              marginBottom: "8px",
                            }}
                          />

                          {/* Product Name */}
                          <div style={{ marginBottom: "8px", height: "40px" }}>
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
                          {/* Add to Cart Button */}
                          {product.variants.length > 0 && (
                            <button
                              style={{
                                marginTop: "10px",
                                padding: "0.5rem 1rem",
                                fontSize: "1rem",
                                fontFamily: "Verdana",
                                color: "#000",
                                background: "#fff",
                                border: "1px solid #000",
                                borderRadius: "0.25rem",
                                cursor: "pointer",
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                addToCart(product.variants[0].id, 1).then(
                                  (response) =>
                                    alert(
                                      product.title + " has been added to cart"
                                    )
                                );
                              }}
                            >
                              Add to Cart
                            </button>
                          )}
                        </a>
                      </div>
                    ))
                  ) : (
                    <div style={{ textAlign: "center", fontStyle: "italic" }}>
                      Type in the search box to see suggestions
                    </div>
                  )}
                </div>
                {userInput.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "1rem",
                    }}
                  >
                    <button
                      style={{
                        padding: "0.5rem 1rem",
                        fontSize: "1.5rem",
                        color: "#fff",
                        background: "#0e0e0e",
                        border: "none",
                        borderRadius: "0.25rem",
                        cursor: "pointer",
                        fontFamily: "Verdana",
                      }}
                      onClick={() =>
                        (window.location.href = `/search?q=${userInput}`)
                      }
                    >
                      View all Items
                    </button>
                  </div>
                )}
              </div>
              <div
                style={{
                  height: "2px",
                  backgroundColor: "black",
                }}
              />
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
              <div
                id="chat-column"
                style={{
                  flex: "1",
                  minWidth: "0",
                  padding: "1.5rem",
                  overflowY: "auto",
                }}
              >
                {messages.map((message, index) => (
                  <MessageBox
                    key={index}
                    position={message.position}
                    type={message.type}
                    text={
                      <div
                        // className="message-box"
                        dangerouslySetInnerHTML={{
                          __html: `${message.text}`,
                        }}
                      />
                    }
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
