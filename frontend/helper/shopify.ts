import { isNewCustomer, offerCoupon } from "./supabase"; // Updated reference to refactored supabase functions
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

export const getProducts = async () => {
  // TODO: paginate for larger stores
  const json = await shopifyRestQuery(
    "products.json?limit=250&status=active&fields=id,body_html,handle,images,options"
  );
  const formattedProducts = json?.products?.map((product) =>
    formatCatalogEntry(product)
  );

  const stringifiedProducts = formattedProducts
    .map((product) => JSON.stringify(product))
    .join("\r\n");

  // RAG and embeddings pre-processing
  const metadataIds = formattedProducts.map((product) => product.id);
  const strippedProducts = formattedProducts.map((product) => {
    // Convert each product object to a string, remove quotes, newlines, and 'id'. Possibly remove brackets in the future too
    return JSON.stringify(product).replace(/"/g, "").replace(/\n/g, " ");
  });

  return { stringifiedProducts, metadataIds, strippedProducts };
};

export const getGreetingMessage = async (event) => {
  return await getEventSpecificMessage(event);
};

export const getEventSpecificMessage = async (event) => {
  // Check if the customer has viewed their cart multiple times in the past 30 minutes
  // Check if the customer is new
  const newCustomer = await isNewCustomer(event.clientId);
  const isOfferCoupon = await offerCoupon(event.clientId);
  switch (event.name) {
    // Welcome Intent
    case "page_viewed":
      if (newCustomer.isNew) {
        return "This is the user's first time visiting this store. Welcome them and ask them if they have any questions";
      } else {
        return "Welcome user back to the store and ask if user needs any help.";
      }
    // Cart Intent
    case "cart_viewed":
      if (isOfferCoupon.offerCoupon === true) {
        return "User is looking through cart page. Encourage them to checkout by offering a coupon.";
      } else {
        return "User is on the cart page. Encourage user to checkout.";
      }
    // Product Intent
    case "product_viewed":
      const product = event.detail.productVariant.product.title;
      return `User is considering purchasing the product ${product}. Explain why this product is great for me and offer to answer any more questions`;
    // Search Intent
    case "search_submitted":
      const searchQuery = event.detail.query;
      return `The user is searching your store for ${searchQuery}. Offer to assist.`;
    default:
      return "Greet the user.";
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
