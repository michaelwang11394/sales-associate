
export const MERCHANT_CONFIG = {
  store_name: "Lotus Haus",
  store_type: "jewelry",
  offer_coupon: false,
  cart_tactics:
    "If they have items in their card, encourage them to sign up for the newsletter",
  product_tactics: [
    "Here are some general selling tactics to remember: (1) Emphasize that all products are hypoallergenic. (2) Many companies will say their products are 'jade' when they're not. Our products are made from aventurine which is much more affordable.",
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
      `search/suggest.json?q=${keyword}&resources[type]=product,article,collection,query&resources[options][unavailable_products]=hide&resources[options][fields]=title,product_type,variants.title`
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
  switch (event.name) {
    /* 
      Cart Viewed Intent:
      Notes:
        - Potentially could be a bad idea to mention other best seller items here if it takes them away from the cart. 

      Other Ideas: 
      - Get products in their cart 
    */
    case "cart_viewed":
      return `The customer is on the cart page where they can purchase their items. Your goal is to compliment them on their excellent product taste and encourage user to checkout. Here is an example of a good response:\n"Great selection! Let me know if you need any help with your purchase. Here are some other goals to accomplish:\n${merchantConfig["cart_tactics"]}`;
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
      return `User is considering purchasing ${product}. Your goal is to have the user add the item to cart and complete checkout. Here are ways you can accomplish this\nLet the customer know that this product is a best seller and running low on stock. For example: "${product} is one of our best sellers and is running low on stock."\nIf the customer has viewed this product before, let them know that you noticed and ask if they have any questions about it. For example: "I see you've been looking at ${product}. Do you have any questions about it?"\n${merchantConfig["product_tactics"]}`;
    default:
      return null;
  }
};

export const getCartItems = async() => {
  const cart = await shopifyRestQuery('cart.js')
  return cart.items?.map((item: any) => item.title).join(",")
}