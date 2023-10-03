import { createClient } from "@supabase/supabase-js";

//HACK: This is pure client side code so for now to this but later apply nextjs framework or webpack to bundle and minify
const supabaseUrl = "https://xrxqgzrdxkvoszkhvnzg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHFnenJkeGt2b3N6a2h2bnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTYxMDY2NDgsImV4cCI6MjAxMTY4MjY0OH0.7wQAVyg2lK41GxRae6B-lmEYR1ahWCHBDWoS09aiOnw";
const supabase = createClient(supabaseUrl, supabaseKey);
// Subscribe to all customer events
export const subscribeToEvents = async () => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) {
    console.log("Error", error);
    return;
  }
  console.log("Data", data);

  // Return the data
  return data;
};

// Check if the customer is new
export const isNewCustomer = async (customerId) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("clientId", customerId)
    .gte("timestamp", oneWeekAgo.toISOString());

  if (error) {
    console.log("Error", error);
    return [false, "Error checking if customer is new."];
  }

  // Return true if the customer is new. 1 means first time vistor.
  if (data.length <= 1) {
    return [true, "This is the first time the customer has visited the store."];
  } else {
    return [false, "This customer has visited the store before."];
  }
};

// Check if the customer has items in their cart
export const hasItemsInCart = async (customerId) => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("clientId", customerId)
    .eq("name", "cart_viewed")
    .order("timestamp", { ascending: false })
    .limit(1);

  if (error) {
    console.log("Error", error);
    return [false, "Error checking if customer has items in their cart."];
  }

  // Return true if the customer has items in their cart
  if (data.length > 0) {
    const cartProductTitles = data[0].detail.cart.lines.map(
      (line) => line.merchandise.product.title
    );
    return [
      true,
      `This customer has the following items in their cart: ${cartProductTitles.join(
        ", "
      )}`,
    ];
  } else {
    return [false, "This customer does not have items in their cart."];
  }
};

// Check if the customer has viewed any products in the past 1 week
// TODO: Merge together duplicate objects
export const hasViewedProducts = async (customerId) => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("clientId", customerId)
    .eq("name", "product_viewed")
    .gte("timestamp", oneWeekAgo.toISOString());

  if (error) {
    console.log("Error", error);
    return [false, "Error checking if customer has viewed products."];
  }

  // Return true if the customer has viewed products
  if (data.length > 0) {
    console.log("product data object", data);
    const productTitles = data.map(
      (item) => item.detail.productVariant.product.title
    );
    return [
      true,
      `This customer has viewed the following products: ${productTitles.join(
        ", "
      )}`,
    ];
  } else {
    return [false, "This customer has not viewed any products."];
  }
};
