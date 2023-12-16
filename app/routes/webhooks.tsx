import { createClient } from "@supabase/supabase-js";
import { authenticate } from "../shopify.server";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);
export const action = async ({ request }) => {
  const { topic, shop, session } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        const { error } = await supabase
          .from("merchants")
          .delete()
          .eq("shop", shop);
        if (error) {
          console.error("Shop's session deletion failed");
        }
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
