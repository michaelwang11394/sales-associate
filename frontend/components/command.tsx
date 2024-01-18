import {
  MESSAGES_HISTORY_LIMIT,
  PALETTE_DIV_ID,
  SUPABASE_MESSAGES_RETRIEVED,
} from "@/constants/constants";
import {
  MessageSource,
  SenderType,
  type DBMessage,
  type FormattedMessage,
  type Product,
} from "@/constants/types";
import { callOpenai } from "@/helper/ai";
import { toggleOverlayVisibility } from "@/helper/animations";
import {
  addToCart,
  getGreetingMessage,
  getSuggestions,
} from "@/helper/shopify";
import {
  getLastPixelEvent,
  getMessages,
  getProductMentions,
  insertMessage,
} from "@/helper/supabase";
import { debounce } from "lodash";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatBubble } from "./chat";

export const productDelimiter = "====PRODUCT====";
export enum StructuredOutputStreamState {
  TEXT = 1,
  PRODUCT = 2,
}

export const formatDBMessage = (messageRow: DBMessage) => {
  const { id, type, content, sender } = messageRow;

  const message: FormattedMessage = {
    id,
    type,
    sender,
    content,
  };
  return message;
};
export default function CommandPalette({ props }) {
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [mentionedProducts, setMentionedProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const clientId = window.localStorage.getItem("webPixelShopifyClientId");
  const host = window.location.host;

  useEffect(() => {
    if (clientId) {
      getMessages(clientId, SUPABASE_MESSAGES_RETRIEVED).then((data) => {
        if (!data) {
          console.error("Message history could not be fetched");
        } else {
          const messages = data
            .data!.map((messageRow: DBMessage) => formatDBMessage(messageRow))
            .reverse();
          setMessages((prevMessages) => messages.concat(prevMessages));
        }
      });
    }
    if (clientId) {
      getLastPixelEvent(clientId).then((data) => {
        data.data?.forEach(async (event) => {
          const greetingPrompt = await getGreetingMessage(event);
          const uuid = uuidv4();
          const newResponseMessage: FormattedMessage = {
            type: "text",
            sender: SenderType.SYSTEM,
            content: "",
          };
          callOpenai(
            greetingPrompt,
            clientId!,
            uuid,
            MessageSource.CHAT_GREETING,
            messages
              .slice(-1 * MESSAGES_HISTORY_LIMIT)
              .map((m) => String(m.id!))
          )
            .then(async (reader) => {
              setMessages((prevMessages) => [
                ...prevMessages,
                newResponseMessage,
              ]);
              let full = "";
              let streamDone = false;
              while (true && !streamDone) {
                const { done, value } = await reader!.read();
                streamDone = done;
                if (streamDone) {
                  // Do something with last chunk of data then exit reader
                  reader?.cancel();
                  break;
                }
                let chunk = new TextDecoder("utf-8").decode(value);
                full += chunk;
                setMessages((prevMessages) =>
                  prevMessages.map((msg) => {
                    if (msg === newResponseMessage) {
                      msg.content = full;
                    }
                    return msg;
                  })
                );
              }
              await handleNewMessage(clientId, newResponseMessage, uuid);
            })
            .catch((err) => {
              setMessages((prevMessages) =>
                prevMessages.filter((message) => message !== newResponseMessage)
              );
              console.error(err);
            });
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => {
      if (clientId) {
        getProductMentions(clientId).then((data) => {
          if (!data) {
            console.error("Product mentions could not be fetched");
          } else {
            const products = data.data!;
            const productList = products
              .map((product) => {
                const productJson = JSON.parse(product);
                return {
                  featured_image: {
                    url: productJson.image,
                    alt: "",
                  },
                  title: productJson.name,
                  handle: productJson.product_handle,
                  price:
                    productJson.variants?.length > 0
                      ? productJson.variants[0]?.price
                      : "",
                  url: "", // TODO: Add to DB
                };
              })
              .filter(
                (product, index, self) =>
                  index === self.findIndex((p) => p.handle === product.handle)
              );
            setMentionedProducts(productList);
            setSuggestions(productList);
          }
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages]
  );

  useEffect(() => {
    scrollToBottom();
  }, [messages, suggestions]);

  const scrollToBottom = () => {
    const chatColumn = document.getElementById("chat-column");
    if (chatColumn) {
      chatColumn.scrollTop = chatColumn.scrollHeight;
    }
  };

  const handleNewMessage = async (clientId, newUserMessage, requestUuid) => {
    const { success, data } = await insertMessage(
      clientId,
      newUserMessage.type,
      newUserMessage.sender,
      newUserMessage.content,
      requestUuid
    );
    if (!success) {
      console.error("Messages update failed for supabase table messages");
    }
    newUserMessage.id = data[0].id;
  };

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
    const debouncedGetSuggestions = debounce(async () => {
      if (event.target.value !== "") {
        const newSuggestions = await getSuggestions(event.target.value);
        setSuggestions(newSuggestions); // Only set the new suggestions, don't mix with mentioned products
      } else {
        setSuggestions(mentionedProducts); // If search is empty, show the mentioned products
      }
    }, 300);

    debouncedGetSuggestions();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || userInput === "") {
      return;
    }
    setLoading(true);
    const input = userInput;
    setUserInput("");
    const newUserMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.USER,
      content: input,
    };
    const uuid = uuidv4();
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    await handleNewMessage(clientId, newUserMessage, uuid);
    const newResponseMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.AI,
      content: "",
    };
    callOpenai(
      input,
      clientId!,
      uuid,
      MessageSource.CHAT,
      messages.slice(-1 - MESSAGES_HISTORY_LIMIT).map((m) => String(m.id!))
    )
      .then(async (reader) => {
        setMessages((prevMessages) => [...prevMessages, newResponseMessage]);
        let response = "";
        let state = StructuredOutputStreamState.TEXT;
        let plainTextInserted = false;
        let productInserted = 0;
        while (true) {
          const { done, value } = await reader!.read();
          if (done) {
            // Do something with last chunk of data then exit reader
            reader?.cancel();
            break;
          }
          let chunk = new TextDecoder("utf-8").decode(value);
          response += chunk;
          if (response.includes(productDelimiter)) {
            // plainText is completed
            const splitChunks: string[] = response
              .split(productDelimiter)
              .filter((chunk) => chunk.trim() !== "");
            if (state === StructuredOutputStreamState.TEXT) {
              setMessages((prevMessages) =>
                prevMessages.map((msg) => {
                  if (msg === newResponseMessage) {
                    msg.content = splitChunks[0];
                  }
                  return msg;
                })
              );
              state = StructuredOutputStreamState.PRODUCT;
              await handleNewMessage(clientId, newResponseMessage, uuid);
              plainTextInserted = true;
            }
            for (let i = productInserted + 1; i < splitChunks.length; i++) {
              const linkMessage = {
                type: "link",
                sender: SenderType.AI,
                content: splitChunks[i],
              } as FormattedMessage;
              setMessages((prevMessages) => [...prevMessages, linkMessage]);
              await handleNewMessage(clientId, linkMessage, uuid);
              productInserted++;
            }
          } else {
            // Still in plainText field
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg === newResponseMessage) {
                  msg.content = response;
                }
                return msg;
              })
            );
          }
        }
        // Occurs if there are no elements in product field
        if (!plainTextInserted) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) => {
              if (msg === newResponseMessage) {
                msg.content = response;
              }
              return msg;
            })
          );
          await handleNewMessage(clientId, newResponseMessage, uuid);
        }
        setLoading(false);
      })
      .catch(async (err) => {
        setMessages((prevMessages) =>
          prevMessages.filter((message) => message !== newResponseMessage)
        );
        await handleNewMessage(
          clientId,
          {
            type: "text",
            content: "AI has encountered an error. Please try agian.",
            sender: SenderType.SYSTEM,
          } as FormattedMessage,
          uuid
        );
        console.error(err);
        setLoading(false);
      });
  };

  return (
    <div id="overlay" className="h-[70vh] flex flex-col">
      <section
        id={PALETTE_DIV_ID}
        className="relative overflow-hidden bg-cover flex-grow">
        <div className="relative flex justify-center flex-grow flex-shrink h-full">
          <div className="w-full mx-auto overflow-hidden transition-all shadow-lg bg-white backdrop-blur-[10px] rounded-lg flex-grow">
            <div className="flex justify-center">
              <form
                onSubmit={handleSubmit}
                className="w-1/2 border-4 border-black m-2 flex">
                <input
                  type="text"
                  value={userInput}
                  onChange={handleInputChange}
                  className="w-full h-16 pr-4 text-black border-none rounded-t-lg pl-11 focus:outline-none focus:shadow-none focus:border-none "
                  placeholder="Ask me anything! I am not your typical search bar."
                  role="combobox"
                  aria-expanded="false"
                  aria-controls="options"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-blue-600 text-white w-16 h-16 flex items-center m-1 justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    className="h-6 w-6 transform rotate-90">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </button>
              </form>
            </div>
            {/* Dividing Line. Beginning of product suggestions*/}

            <div className="flex flex-col h-full border-t scrollable-bottom border-gray-300 max-h-[calc(70vh-50px)]">
              <div className="flex h-full">
                <div
                  id="product-column"
                  className="flex-1 min-w-0 p-6 overflow-y-auto border-2 p-4 max-h-[calc(70vh-50px)">
                  <div className="font-bold mb-2 mt-2 text-center">
                    Product Suggestions
                  </div>

                  {suggestions && suggestions.length > 0 ? (
                    suggestions.slice(0, 3).map((product, index) => (
                      <a
                        key={index}
                        href={`https://${host}/products/${product.handle}`}
                        target="_blank"
                        rel="noopener noreferrer">
                        <div className="flex p-1 m-1 flex-grow">
                          {/* Product Image */}
                          <div className="w-1/3">
                            <img
                              src={product.featured_image.url}
                              alt={product.featured_image.alt}
                              className="w-full h-full object-contain"
                            />
                          </div>

                          {/* Product Details */}
                          <div className="w-2/3 flex flex-col p-2 space-y-1">
                            {/* Product Name */}
                            <div className="h-10 overflow-hidden line-clamp-2">
                              {product.title}
                            </div>

                            {/* Product Price */}
                            <div>
                              {product.price ? "$" + product.price : ""}
                            </div>

                            {/* Add to Cart Button. Note: We may run into an issue where suggested product is not available. In which case, we need to check the variant length */}
                            {product.variants &&
                              product.variants[0] &&
                              product.variants[0].id && (
                                <button
                                  className="w-1/3 mt-2 px-2 py-1 text-md font-medium text-white bg-blue-600 border rounded cursor-pointer"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    const response = await addToCart(
                                      product.variants[0].id,
                                      1
                                    );
                                    if (response) {
                                      window.location.href = `https://${host}/cart`;
                                    } else {
                                      // If product variant is not available to add, redirect to product page

                                      window.location.href = `https://${host}/products/${product.handle}`;
                                    }
                                  }}>
                                  Add to Cart
                                </button>
                              )}
                          </div>
                        </div>
                      </a>
                    ))
                  ) : (
                    <div className="text-center italic">
                      Type in the search box to see suggestions
                    </div>
                  )}

                  <div className="h-[3rem] flex justify-center mt-4">
                    {suggestions.length > 0 && (
                      <button
                        className="px-2 py-1 text-md text-white bg-blue-600 border-none rounded cursor-pointer font-medium"
                        onClick={() =>
                          // TODO: Different themes will have different URLS for search result pages
                          (window.location.href = `https://${host}/pages/search-results-page?/search?q=${userInput}`)
                        }>
                        View All Items
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Column*/}
                <div
                  id="chat-column"
                  className="flex-1 min-w-0 p-6 overflow-y-auto border-2 p-4 max-h-[calc(70vh-50px)">
                  <div className="font-bold mb-2 mt-2 text-center">
                    Conversation
                  </div>
                  <button
                    className="absolute top-2 right-2 bg-transparent border-none text-2xl cursor-pointer"
                    onClick={() => toggleOverlayVisibility(props.overlayDiv)}>
                    &times;
                  </button>

                  {messages
                    .filter((message) => message.content !== undefined)
                    .map((message, index) => (
                      <ChatBubble
                        key={index}
                        type={message.type}
                        isAISender={message.sender !== SenderType.USER}
                        content={message.content}
                        host={host}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
