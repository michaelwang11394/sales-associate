import {
  hasItemsInCart,
  hasViewedProducts,
  isNewCustomer,
  offerCoupon,
} from "./supabase"; // Updated reference to refactored supabase functions
const shopifyRestQuery = async (endpoint) => {
  try {
    return fetch(window.Shopify.routes.root + endpoint)
      .then((response) => response.json())
      .then((json) => {
        return json;
      });
  } catch (error) {
    console.error(
      `Error fetching endpoint ${endpoint}: with message %s`,
      error.message
    );
    return null;
  }
};

const formatCatalogEntry = (product) => {
  // Fields we care about
  const { title, body_html: description, id, variants } = product;
  return JSON.stringify({ title, description, id, variants });
};

export const addToCart = async (id, quantity) => {
  try {
    return fetch(window.Shopify.routes.root + 'cart/add.js', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        id: id,
        quantity: 1
      })
    }).then((response) => response.json())
      .then((json) => {
        return json;
      });
  } catch (error) {
    console.error(
      `Error adding to cart`,
      error.message
    );
    return null;
  }
}

// Function to retrieve suggestions based on a search query
export const getSuggestions = async (query) => {
  const json = await shopifyRestQuery(
    `search/suggest.json?q=${query}&resources[type]=product&resources[options][unavailable_products]=hide&resources[options][fields]=title,product_type,variants.title`
  );
  // TODO: Get Search link page
  // const fullTest = await shopifyRestQuery(
  //   `search/suggest.json?q=${query}&resources[page]`
  // );
  // console.log("seearch json", test);
  return json?.resources?.results?.products;
};

export const getProducts = async () => {
  // TODO: paginate for larger stores
  const json = await shopifyRestQuery("products.json?limit=250&status=active");
  console.log(json);
  return json?.products
    ?.map((product) => formatCatalogEntry(product))
    .join("\r\n");
};

export const getGreeting = async (event) => {
  // Check if the customer has viewed their cart multiple times in the past 30 minutes
  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  // Add coupon logic once LLM can create rich outputs
  // const isOfferCoupon = await offerCoupon(event.clientId);

  switch (event.name) {
    // Welcome Intent
    case "page_viewed":
      if (newCustomer.isNew === true) {
        return "Hey there, welcome to the store! Click me to ask any questions.";
      } else {
        return "Welcome back to the store! Please ask me any questions you may have.";
      }
    // Cart Intent
    case "cart_viewed":
      return "Let me know if I can answer any more questions about your cart items.";
    // Product Intent
    case "product_viewed":
      const product = event.detail.productVariant.product.title;
      return `Have any questions about ${product}? Feel free to ask me anything`;
    // Search Intent
    case "search_submitted":
      const searchQuery = event.detail.query;
      return `Let me know if I can help with your search for "${searchQuery}". Happy to help!`;
    default:
      return "Click me for any questions, powered by AI";
  }
};

// Example usage
/*
const searchQuery = 'bag';
getSuggestions(searchQuery)
  .then((productSuggestions) => {
    if (productSuggestions.length > 0) {
      const firstProductSuggestion = productSuggestions[0];
      console.log(`The title of the first product suggestion is: ${firstProductSuggestion.title}`);
    } else {
      console.log('No product suggestions found.');
    }
  });
*/
