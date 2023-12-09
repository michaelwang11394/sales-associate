import { isNewCustomer, offerCoupon } from "./supabase"; // Updated reference to refactored supabase functions
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
  const { title, body_html: description, handle, images, variants } = product;
  // There's a image for each variant if any, otherwise it's an array of a single element
  const image_url = images.length > 0 ? images[0].src : "";
  return JSON.stringify({ title, description, handle, image_url, variants });
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
  } catch (error) {
    console.error(`Error adding to cart`, error.message);
    return null;
  }
};

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
  const jsonProducts = json?.products;
  const stringifiedProducts = json?.products
    ?.map((product) => formatCatalogEntry(product))
    .join("\r\n");

  // RAG and embeddings pre-processing
  const metadataIds = jsonProducts.map((product) => product.id);
  const strippedProducts = jsonProducts.map((product) => {
    // Convert each product object to a string, remove quotes, newlines, and 'id'. Possibly remove brackets in the future too
    return JSON.stringify(product)
      .replace(/"/g, "")
      .replace(/\n/g, " ")
      .replace(/id/g, "");
  });

  return { stringifiedProducts, metadataIds, strippedProducts };
};

export const getGreetingMessage = async (event) => {
  return (
    getEventSpecificMessage(event.name) +
    "The entire response should fit in 150 characters, nothing in products field."
  );
};

export const getEventSpecificMessage = async (event) => {
  // Check if the customer has viewed their cart multiple times in the past 30 minutes
  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  const isOfferCoupon = await offerCoupon(event.clientId);
  switch (event.name) {
    // Welcome Intent
    case "page_viewed":
      if (newCustomer[0] === true) {
        return "Hi, this is my first time visiting this store. Greet me";
      } else {
        return "Hi, welcome me back to the store and ask if I need any help.";
      }
    // Cart Intent
    case "cart_viewed":
      if (isOfferCoupon.offerCoupon === true) {
        return "I am back at my cart again. Encourage me to checkout by offering a coupon.";
      } else {
        return "I am on the cart page. Encourage me to checkout.";
      }
    // Product Intent
    case "product_viewed":
      const product = event.detail.productVariant.product.title;
      return `I am looking at ${product}. Tell me why this product is great for me. If highly relevant, suggest another product in your catalog for me to look at.`;
    // Search Intent
    case "search_submitted":
      const searchQuery = event.detail.query;
      return `I am searching your store for ${searchQuery}. Ask me if I need any assistance.`;
    default:
      return "Hello.";
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
