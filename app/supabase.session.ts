import { Session } from "@shopify/shopify-api";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class SupabaseSessionStorage implements SessionStorage {
  async queueDeletion(id: string) {
    const { error } = await supabase
      .from("uninstalled")
      .upsert([{session_id:  id}]);
    if (error) {
      console.error(`Queueing deletion for ${id} failed`)
    }
    return !error;
  }

  public async storeSession(session: Session): Promise<boolean> {
    const { error } = await supabase
      .from("sessions")
      .upsert([
        {
          id: session.id,
          shop: session.shop,
          state: session.state,
          isOnline: session.isOnline,
          scope: session.scope,
          expires: session.expires,
          accessToken: session.accessToken,
        },
      ])
      .select();
    
    // If recently uninstalled don't delete data on next cron job
    const { error: session_id_error } = await supabase
      .from("uninstalled")
      .delete().eq("session_id", session.id);
    const { error: shop_error } = await supabase
      .from("uninstalled")
      .delete().eq("store", session.shop);

    return !error && !session_id_error && !shop_error;
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", id);

    if (!error && data?.length === 1) {
      return new Session(data[0]);
    }

    console.error("session load failed");

    return undefined;
  }

  public async deleteSession(id: string): Promise<boolean> {
    return await this.queueDeletion(id)
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    const results = await Promise.all(ids.map(id => this.queueDeletion(id)))
    return !results.includes(false);
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("shop", shop);
    if (error || !data) {
      console.error("No sessions found");
      return [];
    }
    return data;
  }
}
