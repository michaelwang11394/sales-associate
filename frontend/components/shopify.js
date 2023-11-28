// Function to retrieve suggestions based on a search query
export const getSuggestions = async (query) => {
  try {
    return fetch(window.Shopify.routes.root + `search/suggest.json?q=${query}&resources[type]=product&resources[options][unavailable_products]=hide&resources[options][fields]=title,product_type,variants.title`)
      .then((response) => response.json())
      .then((suggestions) => {
        const productSuggestions = suggestions.resources.results.products;

        if (productSuggestions.length > 0) {
          console.log(productSuggestions);
          return productSuggestions;
        } else {
          return [];
        }
      });
  } catch (error) {
    console.error('Error fetching suggestions:', error.message);
    return [];
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
