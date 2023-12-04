import { ChatOpenAI } from "langchain/chat_models/openai";
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { BufferWindowMemory, ChatMessageHistory } from "langchain/memory";
import { LLMChain } from "langchain/chains";
import { HumanMessage, AIMessage } from "langchain/schema";
import { hasItemsInCart, hasViewedProducts, isNewCustomer } from "./supabase"; // Updated reference to refactored supabase functions
import { getProducts } from "./shopify"; // Updated reference to refactored shopify function

/* CHATS 
// HACK: Replace key after migration to nextjs
*/
const chat = new ChatOpenAI({
  openAIApiKey: "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",
  temperature: 0.7,
  streaming: true,
});

/* CALLING FUNCTION */
export const createOpenaiWithHistory = async (clientId, messages = []) => {
  /* CUSTOMER INFORMATION CONTEXT */
  let customerContext = [];

  // Check if the customer is new
  const newCustomer = await isNewCustomer(clientId);
  customerContext.push(newCustomer.message);

  // If customer is not new, check their cart history and product_viewed history. Add relevant links
  if (newCustomer.isNew === false) {
    const itemsInCart = await hasItemsInCart(clientId);
    const productsViewed = await hasViewedProducts(clientId);

    // Check if the customer has items in their cart
    if (itemsInCart.hasItems === true) {
      customerContext.push(itemsInCart.message);
      customerContext.push(itemsInCart.cartURL);
    }

    // Check if the customer has viewed any products
    if (productsViewed.hasViewed === true) {
      customerContext.push(productsViewed.message);
      customerContext.push(productsViewed.productURLs);
    }
  }

  const history = messages.map((m) =>
    m.source === "user" ? new HumanMessage(m.text) : new AIMessage(m.text)
  );

  return await createOpenai(customerContext, history);
};

const createOpenai = async (context, history = []) => {
  // Get Product Catalog
  const catalog = await getProducts();

  const formattedContext = context
    .map((item) => {
      if (item.startsWith("http")) {
        return `[Link](${item})`;
      }
      return item;
    })
    .join("\n");

  const systemTemplate =
    "You are a helpful online sales assistant. Your goal is to help customers in their shopping experience whether it's by answering questions, recommending products, or helping them checkout. Be friendly, helpful, and concise in your responses. The below is relevant context for this customer:\n{context}\nGiven that context, here are some suggestions to give the customer a great experience:\nIf the customer has items in their cart, encourage them to go to their cart and complete the purchase. You are provided the link for the cart. \nIf the customer has viewed a product multiple times, encourage them to revisit the product by giving them the product link. \nIf the customer asks for a coupon, give them a coupon link at www.claimcoupon.com\nIf the customer asks you how their search experience was, ask them if they found what they're looking for and offer to help refine the search.\nIf the customer is viewing a product, recommend a similar product they may also enjoy.\n When giving product links, remember to make sure it's a hyperlink that's clickable and not just plain text by wrapping it between html tags <a> </a> and a href and make sure that the font is blue and bold.\n Here's the whole product catalog, where each line is a JSON object containing the title, description, and id:\n{catalog}";

  const systemMessagePrompt =
    SystemMessagePromptTemplate.fromTemplate(systemTemplate);
  const formattedSystemMessagePrompt = await systemMessagePrompt.format({
    context: formattedContext,
    catalog: catalog,
  });

  const humanTemplate = "{message}";

  const chatPrompt = ChatPromptTemplate.fromMessages([
    formattedSystemMessagePrompt,
    humanTemplate,
  ]);

  /* MEMORY 
  // TODO: Because memory is loaded on render, that means, it will also be cleaned out upon navigation to a different page
  */
  const memory = new BufferWindowMemory({
    chatHistory: new ChatMessageHistory(history),
    k: LANGCHAIN_MEMORY_BUFFER_SIZE,
  });

  /* CHAIN */
  const chain = new LLMChain({
    llm: chat,
    prompt: chatPrompt,
    memory: memory,
  });

  return chain;
};
