import {
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
import { callHints, callOpenai } from "@/helper/ai";
import { toggleOverlayVisibility } from "@/helper/animations";
import { getGreetingMessage, getSuggestions } from "@/helper/shopify";
import {
  getLastPixelEvent,
  getMentionedProducts,
  getMessages,
  insertMessage,
} from "@/helper/supabase";
import { debounce } from "lodash";
import { useFeatureFlagVariantKey, usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatBubble } from "./chat";

export const productDelimiter = "====PRODUCT====";
export const recDelimiter = "====REC====";
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
    content: JSON.parse(content),
  };
  return message;
};
export default function CommandPalette({ props }) {
  const [userInput, setUserInput] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [mentionedProducts, setMentionedProducts] = useState<Product[]>([]);
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hints, setHints] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const posthog = usePostHog();
  const clientId = useRef(
    window.localStorage.getItem("webPixelShopifyClientId")
  );
  const host = window.location.host;
  const variant = useFeatureFlagVariantKey("enabled");

  useEffect(() => {
    // @ts-ignore
    if (import.meta?.env?.VITE_POSTHOG_FORCE_FLAG) {
      console.log(
        "Overriding sales associate via posthog feature flag: ",
        // @ts-ignore
        import.meta.env.VITE_POSTHOG_FORCE_FLAG
      );
      posthog.featureFlags.override({
        // @ts-ignore
        enabled: import.meta.env.VITE_POSTHOG_FORCE_FLAG,
      });
    }
    if (clientId.current) {
      posthog?.identify(clientId.current, { store: window.location.host });
    }
    if (!variant || variant === "control") {
      // If we're in the control group, avoid any unnecessary supabase or openai calls
      return;
    }
    getMessages(clientId.current, SUPABASE_MESSAGES_RETRIEVED).then((data) => {
      if (!data) {
        console.error("Message history could not be fetched");
      } else {
        const messages = data.data!.map((messageRow: DBMessage) =>
          formatDBMessage(messageRow)
        );
        setMessages((prevMessages) => messages.concat(prevMessages));
        refreshHints();
      }
    });
    getLastPixelEvent(clientId.current).then((data) => {
      data.data?.forEach(async (event) => {
        const greetingPrompt = await getGreetingMessage(event);
        const uuid = uuidv4();
        const newResponseMessage: FormattedMessage = {
          type: "text",
          sender: SenderType.SYSTEM,
          content: [""],
        };
        callOpenai(
          greetingPrompt,
          clientId.current!,
          uuid,
          MessageSource.CHAT_GREETING
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
                    msg.content = [full];
                  }
                  return msg;
                })
              );
            }
            await handleNewMessage(clientId.current, newResponseMessage, uuid);
          })
          .catch((err) => {
            setMessages((prevMessages) =>
              prevMessages.filter((message) => message !== newResponseMessage)
            );
            console.error(err);
          });
      });
    });
  }, [posthog, clientId, variant]);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    setIsMobile(/iphone|ipad|ipod|android/i.test(userAgent));

    // Other useEffect code
  }, []);

  useEffect(() => {
    const attemptToFetchAndProcessEvents = async (retryCount = 0) => {
      clientId.current = window.localStorage.getItem("webPixelShopifyClientId");
      if (!clientId.current && retryCount < 5) {
        // Limit the number of retries to prevent infinite loop
        setTimeout(() => {
          attemptToFetchAndProcessEvents(retryCount + 1);
        }, 500);
      }
    };

    attemptToFetchAndProcessEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => {
      if (clientId.current) {
        getMentionedProducts(clientId.current).then((data) => {
          if (!data) {
            console.error("Product mentions could not be fetched");
          } else {
            const products = data.data!;
            const productList = products
              .map((product) => {
                const productJsons = JSON.parse(product);
                return productJsons.map((productJson) => ({
                  featured_image: {
                    url: productJson.image,
                  },
                  title: productJson.name,
                  handle: productJson.handle,
                  price:
                    productJson.variants?.length > 0
                      ? productJson.variants[0]?.price
                      : "",
                  url: "", // TODO: Add to DB
                }));
              })
              .flat()
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

  const refreshHints = () => {
    const uuid = uuidv4();
    callHints(
      "User has just opened a text box for a chat bot. Recommend three questions or requests they can ask to learn more about the store or continue the conversation",
      clientId.current!,
      uuid,
      MessageSource.HINTS
    )
      .then((res) => {
        const hints = JSON.parse(
          // @ts-ignore
          res?.openai?.kwargs?.additional_kwargs?.function_call?.arguments
        );

        setHints([hints.first_hint, hints.second_hint, hints.third_hint]);
      })
      .catch((err) => {
        setHints([]);
        console.error(err);
      });
  };

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
      JSON.stringify(newUserMessage.content),
      requestUuid
    );
    if (!success) {
      console.error("Messages update failed for supabase table messages");
    }
    newUserMessage.id = data[0].id;
    return data[0].id;
  };

  const handleInputChange = (event) => {
    const input = event.target.value;
    setUserInput(input);
    const debouncedGetSuggestions = debounce(async () => {
      if (input !== "") {
        const newSuggestions = await getSuggestions(input);
        setSuggestions(newSuggestions); // Only set the new suggestions, don't mix with mentioned products
      } else {
        setSuggestions(mentionedProducts); // If search is empty, show the mentioned products
      }
    }, 300);

    debouncedGetSuggestions();
  };

  const callOpenaiWithInput = async (input) => {
    setLoading(true);
    const newUserMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.USER,
      content: [input],
    };
    const uuid = uuidv4();
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    await handleNewMessage(clientId.current, newUserMessage, uuid);
    const newResponseMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.AI,
      content: [""],
    };
    callOpenai(input, clientId.current!, uuid, MessageSource.CHAT)
      .then(async (reader) => {
        const linkMessage = {
          type: "link",
          sender: SenderType.AI,
          content: [],
        } as FormattedMessage;
        setMessages((prevMessages) => [...prevMessages, newResponseMessage]);
        let response = "";
        let state = StructuredOutputStreamState.TEXT;
        let plainTextInserted = false;
        let productInserted = 0;
        let linkMessageInserted = false;
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
            const splitChunks: string[][] = response
              .split(productDelimiter)
              .filter((chunk) => chunk.trim() !== "")
              .map((chunk) =>
                chunk
                  .split(recDelimiter)
                  .filter((innerChunk) => innerChunk.trim() !== "")
              );
            if (state === StructuredOutputStreamState.TEXT) {
              setMessages((prevMessages) =>
                prevMessages.map((msg) => {
                  if (msg === newResponseMessage) {
                    msg.content = [splitChunks[0][0]];
                  }
                  return msg;
                })
              );
              state = StructuredOutputStreamState.PRODUCT;
              newResponseMessage.id = await handleNewMessage(
                clientId.current,
                {
                  type: "text",
                  sender: SenderType.AI,
                  content: [splitChunks[0][0]],
                },
                uuid
              );
              plainTextInserted = true;
            }
            for (let i = productInserted + 1; i < splitChunks.length; i++) {
              productInserted = Math.max(productInserted, i - 1);
              // Only insert a linkMessage if products field contains anything
              if (
                !linkMessageInserted && // Necessary since messages may not update in time
                splitChunks[i][0].length > 0 &&
                !messages.some((msg) => msg === linkMessage)
              ) {
                linkMessageInserted = true;
                linkMessage.content[i - 1] = {
                  ...JSON.parse(splitChunks[i][0]),
                  recommendation: splitChunks[i][1],
                };
                setMessages((prevMessages) => [...prevMessages, linkMessage]);
              } else {
                setMessages((prevMessages) =>
                  prevMessages.map((msg) => {
                    if (msg === linkMessage) {
                      msg.content[i - 1] = {
                        ...JSON.parse(splitChunks[i][0]),
                        recommendation: splitChunks[i][1],
                      };
                    }
                    return msg;
                  })
                );
              }
            }
          } else {
            // Still in plainText field
            setMessages((prevMessages) =>
              prevMessages.map((msg) => {
                if (msg === newResponseMessage) {
                  msg.content = [response];
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
                msg.content = [response];
              }
              return msg;
            })
          );
          newResponseMessage.id = await handleNewMessage(
            clientId.current,
            {
              type: "text",
              sender: SenderType.AI,
              content: [response],
            },
            uuid
          );
        }

        const finalSplit: string[][] = response
          .split(productDelimiter)
          .filter((chunk) => chunk.trim() !== "")
          .splice(1)
          .map((chunk) =>
            chunk
              .split(recDelimiter)
              .filter((innerChunk) => innerChunk.trim() !== "")
          )
          .filter((chunk) => chunk.length > 0)
          .map((chunk) => {
            return {
              ...JSON.parse(chunk[0]),
              recommendation: chunk[1],
            };
          });
        if (finalSplit.length > 0) {
          linkMessage.id = await handleNewMessage(
            clientId.current,
            {
              type: "link",
              sender: SenderType.AI,
              content: finalSplit,
            },
            uuid
          );
        }
        /* TODO: Taking too long and delaying next entry
        const summarize_uuid = uuidv4();
        await summarizeHistory(clientId!, summarize_uuid);
        */
        refreshHints();

        setLoading(false);
      })
      .catch(async (err) => {
        setMessages((prevMessages) =>
          prevMessages.filter((message) => message !== newResponseMessage)
        );
        await handleNewMessage(
          clientId.current,
          {
            type: "text",
            content: ["AI has encountered an error. Please try agian."],
            sender: SenderType.SYSTEM,
          } as FormattedMessage,
          uuid
        );
        console.error(err);
        setLoading(false);
      });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || userInput === "") {
      return;
    }
    const input = userInput;
    setUserInput("");
    await callOpenaiWithInput(input);
  };

  const renderControlProductColumn = () => {
    if (!isMobile) {
      return (
        <div
          id="product-column-control"
          className="product-column min-w-0 p-6 overflow-y-auto">
          <div className="font-bold mb-2 mt-2 text-center">
            {suggestions.length > 0
              ? "You might like:"
              : "We're sorry, no results match this search"}
          </div>
          {/* First row */}
          <div className="flex justify-center items-center space-x-4 mb-4">
            {suggestions.slice(0, 3).map((product, index) => (
              <a
                key={index}
                href={`https://${host}/products/${product.handle}`}
                className="flex-1"
                target="_blank"
                rel="noopener noreferrer">
                <div className="flex flex-col product-card-shadow p-2 m-1 ">
                  <div className="w-full h-40">
                    <img
                      src={product.featured_image.url}
                      alt={product.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col p-2">
                    <div className=" h-16 text-center font-bold">
                      {product.title}
                    </div>
                    <div className="text-center mt-1">
                      {product.price ? `$${product.price}` : ""}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
          {/* Second row */}
          <div className="flex justify-center items-center space-x-4">
            {suggestions.slice(3, 6).map((product, index) => (
              <a
                key={index}
                href={`https://${host}/products/${product.handle}`}
                className="flex-1"
                target="_blank"
                rel="noopener noreferrer">
                <div className="flex flex-col product-card-shadow p-2 m-1">
                  <div className="w-full h-40">
                    <img
                      src={product.featured_image.url}
                      alt={product.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col p-2">
                    <div className=" h-16 text-center font-bold">
                      {product.title}
                    </div>
                    <div className="text-center mt-1">
                      {product.price ? `$${product.price}` : ""}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div className="flex justify-center mt-12">
              <button
                className="bg-black text-white py-2 px-4 rounded hover:bg-opacity-90 focus:outline-none transition ease-in-out duration-150"
                onClick={() =>
                  (window.location.href = `/search?q=${userInput}`)
                }>
                View all Results
              </button>
            </div>
          )}
        </div>
      );
    } else if (isMobile) {
      return (
        <div id="product-column-control-mobile" className="overflow-y-auto p-4">
          <div className="font-bold mb-2 text-center">
            {suggestions.length > 0
              ? "You might like:"
              : "We're sorry, no results match this search"}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {suggestions.map((product, index) => (
              <a
                key={index}
                href={`https://${host}/products/${product.handle}`}
                className="block"
                target="_blank"
                rel="noopener noreferrer">
                <div className="flex flex-col items-center product-card-shadow p-2">
                  <div className="w-full h-24 mb-2">
                    <img
                      src={product.featured_image.url}
                      alt={product.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-center font-bold">{product.title}</div>
                  <div className="text-center">
                    {product.price ? `$${product.price}` : ""}
                  </div>
                </div>
              </a>
            ))}
          </div>
          {suggestions.length > 0 && (
            <div className="flex justify-center mt-12">
              <button
                className="bg-black text-white py-2 px-4 rounded hover:bg-opacity-90 focus:outline-none transition ease-in-out duration-150"
                onClick={() =>
                  (window.location.href = `/search?q=${userInput}`)
                }>
                View all Results
              </button>
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div
      id="overlay"
      className=" flex flex-col fixed top-0 left-0 right-0 bottom-0 items-center justify-center h-[80vh] w-[80vw] max-h-[65rem] max-w-[80rem] m-auto bg-gray-200 rounded-lg shadow-lg overflow-auto">
      <section
        id={PALETTE_DIV_ID}
        className="flex flex-grow overflow-hidden bg-cover w-full">
        <div className="relative flex justify-center flex-grow flex-shrink h-full">
          <div className="w-full mx-auto overflow-hidden transition-all bg-white backdrop-blur-[10px] rounded-lg flex flex-col flex-grow">
            <div id="search bar" className="flex justify-between items-center">
              <form onSubmit={handleSubmit} className="w-full m-2 flex mx-auto">
                <input
                  type="text"
                  value={userInput}
                  onChange={handleInputChange}
                  className="flex-grow h-16 pr-4 text-black border-none rounded-t-lg pl-14 text-center focus:outline-none focus:shadow-none focus:border-none "
                  placeholder={
                    userInput === ""
                      ? "Ask me anything! See the below hints as examples. I am not your typical search bar."
                      : ""
                  }
                  onFocus={(e) => (e.target.placeholder = "")}
                  onBlur={(e) =>
                    (e.target.placeholder =
                      "Ask me anything! See the below hints as examples. I am not your typical search bar.")
                  }
                  role="combobox"
                  aria-expanded="false"
                  aria-controls="options"
                />
                <button type="submit" disabled={loading} className="pr-6">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <g id="vuesax/bold/send">
                      <g id="send">
                        <path
                          id="Vector"
                          d="M18.07 8.50965L9.51002 4.22965C3.76002 1.34965 1.40002 3.70965 4.28002 9.45965L5.15002 11.1996C5.40002 11.7096 5.40002 12.2996 5.15002 12.8096L4.28002 14.5396C1.40002 20.2896 3.75002 22.6496 9.51002 19.7696L18.07 15.4896C21.91 13.5696 21.91 10.4296 18.07 8.50965ZM14.84 12.7496H9.44002C9.03002 12.7496 8.69002 12.4096 8.69002 11.9996C8.69002 11.5896 9.03002 11.2496 9.44002 11.2496H14.84C15.25 11.2496 15.59 11.5896 15.59 11.9996C15.59 12.4096 15.25 12.7496 14.84 12.7496Z"
                          fill="#2A33FF"
                        />
                      </g>
                    </g>
                  </svg>
                </button>
              </form>
              <div
                className="flex items-center pr-7 overlay-exit-button"
                onClick={() => toggleOverlayVisibility(props.overlayDiv)}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <g id="Cancel">
                    <path
                      id="Vector"
                      d="M5 5L12 12L5 19M19.5 19L12.5 12L19.5 5"
                      stroke="#474B58"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </svg>
              </div>
            </div>
            {variant == "control" && hints.length > 0 && (
              <div
                id="hints"
                className="flex justify-center items-center rounded">
                {hints.map((hint, index) => (
                  <div
                    key={index}
                    className="hint-bubble border-2 justify-center items-center"
                    onClick={async () => await callOpenaiWithInput(hint)}>
                    <p className="text-custom">{hint}</p>
                  </div>
                ))}
              </div>
            )}
            {/* Vertical Line Element */}
            <div className="flex divider w-full h-1"></div>

            <div
              id="results and convo"
              className="flex flex-grow border-tborder-gray-300 mobile-chat-column overflow-y-hidden h-full whitespace-normal">
              {/* Product Column for control search only group*/}
              {variant === "control"
                ? renderControlProductColumn()
                : // Product Column for test group that has AI chat
                  !isMobile && (
                    <div
                      id="product-column"
                      className="product-column min-w-0 p-6 overflow-y-auto p-4">
                      <div className="font-bold mb-2 mt-2 text-center">
                        {suggestions && suggestions.length > 0
                          ? "You might like:"
                          : "We're sorry, no results matches this search"}
                      </div>

                      {suggestions.length > 0 &&
                        suggestions.slice(0, 6).map((product, index) => (
                          <a
                            key={index}
                            href={`https://${host}/products/${product.handle}`}
                            className="p-2"
                            target="_blank"
                            rel="noopener noreferrer">
                            <div className="flex flex-grow product-card-shadow p-2 m-1">
                              {/* Product Image */}
                              <div className="w-1/3 h-40">
                                <img
                                  src={product.featured_image.url}
                                  alt={product.featured_image.alt}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              {/* Product Details */}
                              <div className="w-2/3 flex flex-grow flex-col space-y-1">
                                {/* Product Name */}
                                <div className="h-8 search-card-header flex-grow">
                                  {product.title}
                                </div>

                                {/* Product Price */}
                                <div>
                                  {product.price ? "$" + product.price : ""}
                                </div>
                              </div>
                            </div>
                          </a>
                        ))}
                    </div>
                  )}

              {/* Vertical Line Element */}
              {!isMobile && (
                <div className="flex divider h-[calc(100vh)]"></div>
              )}

              {/* Chat Column*/}
              {variant == "test" && (
                <div
                  id="chat-column"
                  className="chat-column min-w-0 p-6 overflow-y-auto p-4 mobile-chat-column">
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
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
