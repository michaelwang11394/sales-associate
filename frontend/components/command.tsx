import { useEffect, useState } from "react";
import { debounce } from "lodash";
import {
  getSuggestions,
  getGreetingMessage,
  addToCart,
} from "@/helper/shopify";
import {
  getLastPixelEvent,
  insertMessage,
  getMessages,
  getProductMentions,
} from "@/helper/supabase";
import {
  MESSAGES_HISTORY_LIMIT,
  PALETTE_DIV_ID,
  SUPABASE_MESSAGES_RETRIEVED,
} from "@/constants/constants";
import { toggleOverlayVisibility } from "@/helper/animations";
import {
  type FormattedMessage,
  type DBMessage,
  type Product,
  SenderType,
  MessageSource,
} from "@/constants/types";
import { ChatBubble } from "./chat";
import { callOpenai } from "@/helper/ai";

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
  const [, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const clientId = window.localStorage.getItem("webPixelShopifyClientId");

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
      getProductMentions(clientId).then((data) => {
        if (!data) {
          console.error("Product mentions could not be fetched");
        } else {
          const products = data.data!;
          const productList = products.map((product) => {
            const productJson = JSON.parse(product);
            return {
              featured_image: {
                url: productJson.variants[0].featured_image,
                alt: "",
              },
              title: productJson.name,
              price: productJson.variants[0].price,
              variants: {
                id: "", // Doesn't exist in current DB
              },
              url: "", // Doesn't exist in current DB
            };
          });
          setMentionedProducts(productList);
          setSuggestions(productList);
        }
      });
    }
    if (clientId) {
      getLastPixelEvent(clientId).then((data) => {
        data.data?.forEach(async (event) => {
          const greetingPrompt = await getGreetingMessage(event);
          callOpenai(
            greetingPrompt,
            clientId!,
            MessageSource.CHAT,
            messages
              .slice(-1 * MESSAGES_HISTORY_LIMIT)
              .map((m) => String(m.id!))
          )
            .then(async (response) => {
              if (!response.show) {
                return;
              }
              console.log(response.openai.plainText);
              const newResponseMessage: FormattedMessage = {
                type: "text",
                sender: SenderType.SYSTEM,
                content: response.openai.plainText,
              };
              await handleNewMessage(clientId, newResponseMessage);
            })
            .catch((err) => console.error(err));
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const { success, data } = await insertMessage(
      clientId,
      newUserMessage.type,
      newUserMessage.sender,
      newUserMessage.content
    );
    if (!success) {
      console.error("Messages update failed for supabase table messages");
    }
    setMessages((prevMessages) => [
      ...prevMessages,
      { ...newUserMessage, id: data[0].id },
    ]);
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
    if (userInput === "") {
      return;
    }
    setIsLoading(true);
    const input = userInput;
    setUserInput("");
    const newUserMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.USER,
      content: input,
    };
    const loadingMessage: FormattedMessage = {
      type: "loading",
      sender: SenderType.SYSTEM,
      content: "Loading...",
    };
    await handleNewMessage(clientId, newUserMessage);
    setMessages((prevMessages) => [...prevMessages, loadingMessage]);
    callOpenai(
      input,
      clientId!,
      MessageSource.CHAT,
      messages.slice(-1 - MESSAGES_HISTORY_LIMIT).map((m) => String(m.id!))
    )
      .then(async (response) => {
        setIsLoading(false);
        setMessages((prevMessages) =>
          prevMessages.filter((message) => message.type !== "loading")
        );
        if (!response.show) {
          await handleNewMessage(clientId, {
            type: "text",
            content: "AI has encountered an error. Please try agian.",
            sender: SenderType.SYSTEM,
          } as FormattedMessage);
          return;
        }
        const newResponseMessage: FormattedMessage = {
          type: "text",
          sender: SenderType.AI,
          content: response.openai.plainText,
        };
        await handleNewMessage(clientId, newResponseMessage);
        response.openai.products?.forEach(
          async (product) =>
            await handleNewMessage(clientId, {
              type: "link",
              sender: SenderType.AI,
              content: JSON.stringify(product),
            } as FormattedMessage)
        );
      })
      .catch(async (err) => {
        setIsLoading(false);
        await handleNewMessage(clientId, {
          type: "text",
          content: "AI has encountered an error. Please try agian.",
          sender: SenderType.SYSTEM,
        } as FormattedMessage);
        console.error(err);
      });
  };

  return (
    <div id="overlay" className="h-[70%]">
      <section
        id={PALETTE_DIV_ID}
        className="relative overflow-hidden bg-cover">
        <div className="relative flex items-center justify-center">
          <div className="w-full mx-auto overflow-hidden transition-all shadow-lg bg-white backdrop-blur-[10px] rounded-lg ">
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

            <div className="flex flex-col border-t border-gray-300 overflow-y-auto max-h-[60rem]">
              <div className="flex">
                <div className="flex-1 min-w-0 p-6 relative">
                  <div className="font-bold mb-2 text-center">
                    Product Suggestions
                  </div>
                  <div className="flex">
                    <div className="flex-1 min-w-0 p-6 relative">
                      {suggestions && suggestions.length > 0 ? (
                        suggestions.slice(0, 3).map((product, index) => (
                          <div key={index} className="flex p-1 m-1">
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
                              <div>{product.price}</div>

                              {/* Add to Cart Button. Note: We may run into an issue where suggested product is not available. In which case, we need to check the variant length */}

                              <button
                                className="w-1/2 mt-2 px-4 py-2 text-sm font-medium text-white bg-black border border-black rounded cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  addToCart(product.variants[0].id, 1).then(
                                    (response) =>
                                      alert(
                                        product.title +
                                          " has been added to cart"
                                      )
                                  );
                                }}>
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center italic">
                          Type in the search box to see suggestions
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-center mt-4">
                    {userInput.length > 0 && (
                      <button
                        className="px-4 py-2 text-lg text-white bg-black border-none rounded cursor-pointer font-medium"
                        onClick={() =>
                          (window.location.href = `/search?q=${userInput}`)
                        }>
                        View all Items
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Column*/}
                <div
                  id="chat-column"
                  className="flex-1 min-w-0 p-6 overflow-y-auto border-2 p-4">
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
