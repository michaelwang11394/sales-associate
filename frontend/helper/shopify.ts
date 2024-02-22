import { isNewCustomer, offerCoupon } from "./supabase"; // Updated reference to refactored supabase functions

export const MERCHANT_CONFIG = {
  store_name: "Sales Associate Demo Store",
  store_type: "jewelry",
  offer_coupon: false,
  merchant_tactics: [
    "Use holidays and other approaching deadlines to create pressure on the customer. For example: 'Valentine's Day is coming up, and this would make a great gift for your loved one.",
    "Offer them a 30 day money back guarantee. For example: 'We offer a 30 day money back guarantee, so you can try it out risk free.'",
  ],
};

const shopifyRestQuery = async (endpoint) => {
  try {
    return fetch(window.Shopify.routes.root + endpoint)
      .then((response) => response.json())
      .then((json) => {
        return json;
      });
  } catch (error: any) {
    console.error(
      `Error fetching endpoint ${endpoint}: with message %s`,
      error.message
    );
    return null;
  }
};

const formatCatalogEntry = (product) => {
  // Fields we care about
  const {
    id,
    title,
    body_html: description,
    handle,
    images,
    variants,
  } = product;
  // There's a image for each variant if any, otherwise it's an array of a single element
  const formattedVariants = variants?.map((variant) => {
    return {
      id: variant.id,
      price: variant.price,
      product_id: variant.product_id,
      title: variant.title,
    };
  });
  const image_url = images.length > 0 ? images[0].src : "";
  return {
    id,
    title,
    description,
    handle,
    image_url,
    variants: formattedVariants,
  };
};

export const addToCart = async (id, quantity) => {
  try {
    return fetch(window.Shopify.routes.root + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: id,
        quantity: 1,
      }),
    })
      .then((response) => response.json())
      .then((json) => {
        return json;
      });
  } catch (error: any) {
    console.error(`Error adding to cart`, error.message);
    return null;
  }
};

// Function to retrieve suggestions based on a search query. Run for each word
export const getSuggestions = async (query) => {
  // Don't bother with keywords of length 1
  const keywords = query.split(" ");

  // Function to perform a Shopify REST query for a keyword
  const fetchSuggestionsForKeyword = async (keyword) => {
    const json = await shopifyRestQuery(
      `search/suggest.json?q=${keyword}&resources[type]=product&resources[options][unavailable_products]=hide&resources[options][fields]=title,product_type,variants.title`
    );
    return json?.resources?.results?.products || [];
  };

  // Use Promise.all to run requests in parallel for each keyword
  const suggestionsPromises = keywords
    .filter((w) => w.length > 0)
    .map((keyword) => fetchSuggestionsForKeyword(keyword));

  // Wait for all promises to resolve
  const suggestionsArray = await Promise.all(suggestionsPromises);

  // Flatten the array of arrays into a single array of suggestions
  const allSuggestions = suggestionsArray.flat();

  // Deduplicate the suggestions based on the product handle
  const uniqueSuggestions = Array.from(
    new Set(allSuggestions.map((p) => p.handle))
  ).map((handle) => allSuggestions.find((p) => p.handle === handle));

  return uniqueSuggestions;
};

export const isValidProduct = async (handle) => {
  // TODO: paginate for larger stores
  const json = await shopifyRestQuery(`products.json?limit=1&handle=${handle}`);
  return json?.products.length > 0;
};

// Get Merchant Config
const merchantConfig = MERCHANT_CONFIG;

export const getGreetingMessage = async (event) => {
  return await getEventSpecificMessage(event);
};

export const getEventSpecificMessage = async (event) => {
  // Check if the customer has viewed their cart multiple times in the past 30 minutes
  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  const isOfferCoupon = await offerCoupon(event.clientId);
  switch (event.name) {
    /* 
      Welcome Intent

      Notes regarding approach for the prompts:
      - Experimenting here with specifically identifying yourself as a sales associate. Build a c connection. 
      - Identify 2 basic capabilities of ways to use SA: answering questions about products and helping find something. As we build more capabilities, we can add them here. 
      
      Other Ideas: 
      - Consider adding more examples. This intent is pretty straight forward, and adding additional tokens contributes to cost.
      - For welcome back, consider linking directly here to a product that the customer has viewed before or already even has in the cart.  
      - Consider adding a emoji to the end of the message.

    */
    case "page_viewed":
      if (newCustomer.isNew) {
        return `This is the customers's first time visiting the ${merchantConfig["store_type"]} store called ${merchantConfig["store_name"]}. Your goal is to welcome them and ask them if they have any questions. If they have products in their cart or have viewed a product recently, mention the product to them. \nHere is an example of a potential good response:\n"Welcome to the store! Let me know if you have any questions about our products."`;
      } else {
        return `This customer has visited the ${merchantConfig["store_type"]} store called ${merchantConfig["store_name"]} before. Your goal is to welcome them back and ask if they have any questions. If they have items in their cart, encourage them to check out or ask them if they have any questions about the products in their cart. If they have viewed a product recently, ask them if they have any questions about that product. \nHere are a few examples of potential good response:\n"Welcome back to the store! Any questions on <product in cart>?"`;
      }
    /* 
      Cart Viewed Intent:
      Notes:
        - Potentially could be a bad idea to mention other best seller items here if it takes them away from the cart. 

      Other Ideas: 
      - Get products in their cart 
    */
    case "cart_viewed":
      if (
        isOfferCoupon.offerCoupon === true &&
        merchantConfig["offer_coupon"] === true
      ) {
        return "User is looking through cart page. Encourage them to checkout by offering a coupon.";
      } else {
        return `The customer is on the cart page where they can purchase their items. Your goal is to compliment them on their excellent product taste and encourage user to checkout. Here is an example of a good response:\n"Great selection! Let me know if you need any help with your purchase."`;
      }
    /*
      Product Viewed Intent

      Notes:
      Join the merchant tactics into a format like the below and add to the end of this message. 

      Other Ideas:
      - When we ingest reviews, this is where we can potentially recommend other products. 
      - In general, this is where we can add more contextual information such as a weather API. 
    */
    case "product_viewed":
      const product = event.detail.productVariant.product.title;
      return `User is considering purchasing ${product}. Your goal is to have the user add the item to cart and complete checkout. Here are ways you can accomplish this\nLet the customer know that this product is a best seller and running low on stock. For example: "${product} is one of our best sellers and is running low on stock."\nIf the customer has viewed this product before, let them know that you noticed and ask if they have any questions about it. For example: "I see you've been looking at ${product}. Do you have any questions about it?"\n${merchantConfig["merchant_tactics"]}`;
    default:
      return `Welcome user to store`;
  }
};
