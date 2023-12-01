const shopifyRestQuery = async (endpoint) => {
  try {
    return fetch(window.Shopify.routes.root + endpoint)
      .then((response) => response.json())
      .then((json) => {
        return json
      });
  } catch (error) {
    console.error(`Error fetching endpoint ${endpoint}: with message %s`, error.message);
    return null;
  }
}

const formatCatalogEntry = (product) => {
  // Fields we care about
  const { title, body_html: description, id } = product;
  return JSON.stringify({ title, description, id })
}

// Function to retrieve suggestions based on a search query
export const getSuggestions = async (query) => {
  const json = await shopifyRestQuery(`search/suggest.json?q=${query}&resources[type]=product&resources[options][unavailable_products]=hide&resources[options][fields]=title,product_type,variants.title`)
  return json?.resources?.results?.products
};

export const getProducts = async () => {
  // TODO: paginate for larger stores
  const json = await shopifyRestQuery('products.json?limit=250&status=active')
  console.log(json)
  return json?.products?.map(product => formatCatalogEntry(product)).join("\r\n")
}

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
