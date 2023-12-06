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
  const { title, body_html: description, id } = product;
  return JSON.stringify({ title, description, id });
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
  console.log(json);
  return json?.products
    ?.map((product) => formatCatalogEntry(product))
    .join("\r\n");
};

export const getGreetingMessage = async (event) => {
  // Check if the customer has viewed their cart multiple times in the past 30 minutes
  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  const isOfferCoupon = await offerCoupon(event.clientId);

  switch (event.name) {
    // Welcome Intent
    case "page_viewed":
      if (newCustomer[0] === true) {
        return "Hi, this is my first time visiting this store.";
      } else {
        return "Hi, welcome me back to the store and ask for any help I may need.";
      }
    // Cart Intent
    case "cart_viewed":
      if (isOfferCoupon.offerCoupon === true) {
        return "I am back at my cart again. I will consider purchasing if you give me a coupon.";
      } else {
        return "I am on the cart page. Encourage me to checkout.";
      }
    // Product Intent
    case "product_viewed":
      const product = event.detail.productVariant.product.title;
      return `I am looking at ${product}. Suggest for me another product in your catalog for me to look at. `;
    // Search Intent
    case "search_submitted":
      const searchQuery = event.detail.query;
      return `I am searching for ${searchQuery}. Ask me if I found what I was looking for.`;
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
