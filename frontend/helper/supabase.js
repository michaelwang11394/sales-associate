import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xrxqgzrdxkvoszkhvnzg.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeHFnenJkeGt2b3N6a2h2bnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTYxMDY2NDgsImV4cCI6MjAxMTY4MjY0OH0.7wQAVyg2lK41GxRae6B-lmEYR1ahWCHBDWoS09aiOnw";
const supabase = createClient(supabaseUrl, supabaseKey);

export const subscribeToEvents = async (clientId) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .limit(1);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error subscribing to events." };
    }

    console.log("Data", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const getMessages = async (clientId, limit) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: false })
      .eq("clientId", clientId)
      .neq("sender", "system")
      .limit(limit);

    if (error) {
      console.error("Error", error);
      return { success: false, message: "Error getting messages." };
    }

    console.log("Data", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

// TODO
export const subscribeToMessages = (clientId, handleInserts) => {
  try {
    supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleInserts)
      .subscribe()
  } catch (error) {
    console.error("Error", error);
    return { success: false, message: "An unexpected error occurred." };
  }
};

export const insertMessage = async (clientId, sender, message) => {
  const { error } = await supabase.from("messages").insert([
    {
      clientId: clientId,
      sender: sender,
      message: message,
    },
  ]);

  if (error) {
    console.error("Error during insert:", error);
    return false
  }
  return true
}

export const isNewCustomer = async (customerId) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", customerId)
      .gte("timestamp", oneWeekAgo.toISOString());

    if (error) {
      console.error("Error", error);
      return { isNew: false, message: "Error checking if customer is new." };
    }

    return {
      isNew: data.length <= 1,
      message: data.length <= 1
        ? "This is the first time the customer has visited the store."
        : "This customer has visited the store before.",
    };
  } catch (error) {
    console.error("Error", error);
    return { isNew: false, message: "An unexpected error occurred." };
  }
};

export const hasItemsInCart = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", customerId)
      .eq("name", "cart_viewed")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error", error);
      return { hasItems: false, message: "Error checking cart items." };
    }

    if (data.length > 0 && data[0]?.detail?.cart) {
      const cartProductTitles = data[0].detail.cart.lines.map(
        (line) => line.merchandise.product.title
      );

      const cartURL = data[0].context.document.location.href;

      return {
        hasItems: true,
        message: `This customer has the following items in their cart: ${cartProductTitles.join(", ")}`,
        cartURL: `The customer can go to their cart by clicking this link: ${cartURL}`,
      };
    } else {
      return { hasItems: false, message: "This customer does not have items in their cart." };
    }
  } catch (error) {
    console.error("Error", error);
    return { hasItems: false, message: "An unexpected error occurred." };
  }
};

export const hasViewedProducts = async (customerId) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", customerId)
      .eq("name", "product_viewed")
      .gte("timestamp", oneWeekAgo.toISOString());

    if (error) {
      console.error("Error", error);
      return { hasViewed: false, message: "Error checking if customer has viewed products." };
    }

    if (data.length > 0) {
      const productTitles = data.map(
        (item) => item.detail.productVariant.product.title
      );
      const productURLs = data.map((item) => item.context.document.location.href);
      return {
        hasViewed: true,
        message: `This customer has viewed the following products: ${productTitles.join(", ")}`,
        productURLs: `The customer can revisit these products by clicking these links: ${productURLs.join(", ")}`,
      };
    } else {
      return { hasViewed: false, message: "This customer has not viewed any products." };
    }
  } catch (error) {
    console.error("Error", error);
    return { hasViewed: false, message: "An unexpected error occurred." };
  }
};

export const offerCoupon = async (customerId) => {
  try {
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("clientId", customerId)
      .eq("name", "cart_viewed")
      .gte("timestamp", thirtyMinutesAgo.toISOString());

    if (error) {
      console.error("Error", error);
      return { offerCoupon: false, message: "Error checking if customer has viewed products." };
    }

    return { offerCoupon: data.length > 2 };
  } catch (error) {
    console.error("Error", error);
    return { offerCoupon: false, message: "An unexpected error occurred." };
  }
};
