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
import { getGreetingMessage, getSuggestions } from "@/helper/shopify";
import {
  getLastPixelEvent,
  getMentionedProducts,
  getMessages,
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
            content: [""],
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
                      msg.content = [full];
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
        getMentionedProducts(clientId).then((data) => {
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
      content: [input],
    };
    const uuid = uuidv4();
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    await handleNewMessage(clientId, newUserMessage, uuid);
    const newResponseMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.AI,
      content: [""],
    };
    callOpenai(
      input,
      clientId!,
      uuid,
      MessageSource.CHAT,
      messages.slice(-1 - MESSAGES_HISTORY_LIMIT).map((m) => String(m.id!))
    )
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
                    msg.content = [splitChunks[0]];
                  }
                  return msg;
                })
              );
              state = StructuredOutputStreamState.PRODUCT;
              newResponseMessage.id = await handleNewMessage(
                clientId,
                {
                  type: "text",
                  sender: SenderType.AI,
                  content: [splitChunks[0]],
                },
                uuid
              );
              plainTextInserted = true;
            }
            for (let i = productInserted + 1; i < splitChunks.length; i++) {
              if (productInserted === 0) {
                setMessages((prevMessages) => [...prevMessages, linkMessage]);
              }
              setMessages((prevMessages) =>
                prevMessages.map((msg) => {
                  if (msg === linkMessage) {
                    msg.content = [...msg.content, JSON.parse(splitChunks[i])];
                  }
                  return msg;
                })
              );
              productInserted++;
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

        const finalSplit: string[] = response
          .split(productDelimiter)
          .filter((chunk) => chunk.trim() !== "")
          .splice(1)
          .map((p) => {
            return JSON.parse(p);
          });
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
            clientId,
            {
              type: "text",
              sender: SenderType.AI,
              content: [response],
            },
            uuid
          );
        }

        if (productInserted > 0) {
          console.log(linkMessage);
          linkMessage.id = await handleNewMessage(
            clientId,
            {
              type: "link",
              sender: SenderType.AI,
              content: finalSplit,
            },
            uuid
          );
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
            content: ["AI has encountered an error. Please try agian."],
            sender: SenderType.SYSTEM,
          } as FormattedMessage,
          uuid
        );
        console.error(err);
        setLoading(false);
      });
  };

  return (
    <div
      id="overlay"
      className="fixed top-0 left-0 right-0 bottom-0 flex flex-col items-center justify-center h-[60rem] w-[80rem] m-auto bg-gray-200 rounded-lg shadow-lg overflow-auto">
      <section
        id={PALETTE_DIV_ID}
        className="flex flex-grow overflow-hidden bg-cover w-full">
        <div className="relative flex justify-center flex-grow flex-shrink h-full">
          <div className="w-full mx-auto overflow-hidden transition-all bg-white backdrop-blur-[10px] rounded-lg flex-grow">
            <div id="search bar" className="flex justify-between align-center">
              <div className="flex items-center pr-7">
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
                      stroke="white"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </svg>
              </div>
              <form onSubmit={handleSubmit} className="w-full m-2 flex">
                <input
                  type="text"
                  value={userInput}
                  onChange={handleInputChange}
                  className="flex-grow h-16 pr-4 text-black border-none rounded-t-lg pl-14 text-center focus:outline-none focus:shadow-none focus:border-none "
                  placeholder="Ask me anything! I am not your typical search bar."
                  role="combobox"
                  aria-expanded="false"
                  aria-controls="options"
                />
                <button type="submit" disabled={loading}>
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
            {/* Dividing Line. Beginning of product suggestions*/}

            <div
              id="results and convo"
              className="flex flex-col h-full border-tborder-gray-300 max-h-[calc(60rem-50px)]">
              <div className="flex h-full">
                <div
                  id="product-column"
                  className="product-column min-w-0 p-6 overflow-y-auto border-2 p-4 max-h-[calc(60rem-50px)]">
                  <div className="font-bold mb-2 mt-2 text-center">
                    {suggestions && suggestions.length > 0
                      ? "You might like:"
                      : "We're sorry, no results matches this search"}
                  </div>

                  {suggestions.length > 0 &&
                    suggestions.slice(0, 10).map((product, index) => (
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

                {/* Chat Column*/}
                <div
                  id="chat-column"
                  className="chat-column min-w-0 p-6 overflow-y-auto border-2 p-4 max-h-[calc(60rem-50px)">
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
