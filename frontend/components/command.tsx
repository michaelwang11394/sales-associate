import { useEffect, useState } from "react";
import { debounce } from "lodash";
import {
  getSuggestions,
  getGreetingMessage,
  addToCart,
} from "@/helper/shopify";
import type { RunnableWithMemory } from "@/helper/ai";
import { MessageSource, createOpenaiWithHistory } from "@/helper/ai";
import {
  subscribeToMessages,
  getLastPixelEvent,
  insertMessage,
  getMessages,
} from "@/helper/supabase";
import {
  PALETTE_DIV_ID,
  SUPABASE_MESSAGES_RETRIEVED,
} from "@/constants/constants";
import { toggleOverlayVisibility } from "@/helper/animations";
import {
  type FormattedMessage,
  type DBMessage,
  type Product,
  SenderType,
} from "@/constants/types";
import { ChatBubble } from "./chat";

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
  const [messages, setMessages] = useState<FormattedMessage[]>([]);
  const [openai, setOpenai] = useState<RunnableWithMemory | undefined>();
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
          createOpenaiWithHistory(clientId, MessageSource.CHAT, messages).then(
            (res) => {
              setOpenai(undefined); // Set to undefined to toggle off openai
            }
          );
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
            .run(greetingPrompt)
            .then((response) => {
              console.log(response.plainText);
              const newResponseMessage: FormattedMessage = {
                type: "text",
                sender: SenderType.SYSTEM,
                content: response.plainText,
              };
              handleNewMessage(clientId, newResponseMessage);
            })
            .catch((err) => console.error(err));
        });
      });
    }
  }, [openai]);

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
      newUserMessage.type,
      newUserMessage.sender,
      newUserMessage.content
    );
    if (!success) {
      console.error("Messages update failed for supabase table messages");
    }
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
  };

  const handleInputChange = (event) => {
    setUserInput(event.target.value);
    const debouncedGetSuggestions = debounce(async () => {
      if (event.target.value !== "") {
        const suggestions = await getSuggestions(event.target.value);
        setSuggestions(suggestions);
      } else {
        setSuggestions([]);
      }
    }, 300);

    debouncedGetSuggestions();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (userInput === "") {
      return;
    }
    const input = userInput;
    setUserInput("");
    const newUserMessage: FormattedMessage = {
      type: "text",
      sender: SenderType.USER,
      content: input,
    };
    await handleNewMessage(clientId, newUserMessage);
    if (openai) {
      await openai
        .run(input)
        .then(async (response) => {
          const newResponseMessage: FormattedMessage = {
            type: "text",
            sender: SenderType.AI,
            content: response.plainText,
          };
          await handleNewMessage(clientId, newResponseMessage);
          response.products?.forEach(
            async (product) =>
              await handleNewMessage(clientId, {
                type: "link",
                sender: SenderType.AI,
                content: JSON.stringify(product),
              } as FormattedMessage)
          );
        })
        .catch(async (err) => {
          await handleNewMessage(clientId, {
            type: "text",
            content: "AI has encountered an error. Please try agian.",
            sender: SenderType.SYSTEM,
          } as FormattedMessage);
          console.error(err);
        });
    } else {
      const dummyLink = `{"name":"The Collection Snowboard: Hydrogen","product_handle":"the-collection-snowboard-hydrogen","image":"https://quickstart-91d3669c.myshopify.com/cdn/shop/products/Main_b9e0da7f-db89-4d41-83f0-7f417b02831d.jpg?v=1695859472&width=1100","variants":[{"title":"Hydrogen","price":299.99,"featured_image":"https://quickstart-91d3669c.myshopify.com/products/the-collection-snowboard-hydrogen"}]}`;
      await handleNewMessage(clientId, {
        type: "link",
        content: dummyLink,
        sender: SenderType.SYSTEM,
      } as FormattedMessage);
      console.error("openai not available");
    }
  };

  const handleDropdownItemClick = (item) => {
    // Handle the selection of suggestions if needed
    console.log("Selected suggestion:", item);
  };

  return (
    <div id="overlay" className="h-[70%]">
      <section
        id={PALETTE_DIV_ID}
        className="relative overflow-hidden bg-cover">
        <div className="relative flex items-center justify-center">
          <div className="w-full mx-auto overflow-hidden transition-all shadow-lg bg-white backdrop-blur-[10px] rounded-lg ">
            <div className="relative">
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  value={userInput}
                  onChange={handleInputChange}
                  onSubmit={handleSubmit}
                  className="w-full h-16 pr-4 text-black border-none rounded-t-lg pl-11"
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
                  className="absolute top-1/2 right-2 transform -translate-y-1/2 h-6 w-6 text-black">
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
            <div className="flex border-t border-gray-300 flex-col overflow-y-auto max-h-[60rem]">
              <div className="flex-1 min-w-0 p-6 relative">
                <button
                  className="absolute top-2 right-2 bg-transparent border-none text-2xl cursor-pointer"
                  onClick={() => toggleOverlayVisibility(props.overlayDiv)}>
                  &times;
                </button>
                <div className="font-bold mb-2 text-center">
                  Product Suggestions
                </div>
                <div className="flex flex-wrap justify-around">
                  {suggestions && suggestions.length > 0 ? (
                    suggestions.slice(0, 4).map((product, index) => (
                      <div key={index} className="flex-1 text-center p-1 m-1">
                        <a
                          href={product.url}
                          onClick={() => handleDropdownItemClick(product)}
                          className="text-decoration-none text-inherit flex flex-col items-center justify-between min-h-[150px]">
                          {/* Product Image */}
                          <img
                            src={product.featured_image.url}
                            alt={product.featured_image.alt}
                            className="w-4/5 h-1/2 max-h-[150px] object-contain mb-2"
                          />

                          {/* Product Name */}
                          <div className="mb-2 h-10">{product.title}</div>

                          {/* Product Price */}
                          <div>{product.price}</div>
                          {/* Add to Cart Button */}
                          {product.variants.length > 0 && (
                            <button
                              className="mt-2 px-4 py-2 text-sm font-medium text-black bg-white border border-black rounded cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                addToCart(product.variants[0].id, 1).then(
                                  (response) =>
                                    alert(
                                      product.title + " has been added to cart"
                                    )
                                );
                              }}>
                              Add to Cart
                            </button>
                          )}
                        </a>
                      </div>
                    ))
                  ) : (
                    <div className="text-center italic">
                      Type in the search box to see suggestions
                    </div>
                  )}
                </div>
                {userInput.length > 0 && (
                  <div className="flex justify-center mt-4">
                    <button
                      className="px-4 py-2 text-lg text-white bg-black border-none rounded cursor-pointer font-medium"
                      onClick={() =>
                        (window.location.href = `/search?q=${userInput}`)
                      }>
                      View all Items
                    </button>
                  </div>
                )}
              </div>
              <div className="h-2 bg-black" />
              {/* Chat Column*/}
              <div className="font-bold mb-2 text-center">Conversation</div>
              <div
                id="chat-column"
                className="flex-1 min-w-0 p-6 overflow-y-auto">
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
      </section>
    </div>
  );
}
