import { Session } from "@shopify/shopify-api";
import type { SessionStorage } from "@shopify/shopify-app-session-storage";
import { createClient } from "@supabase/supabase-js";
import { SupabaseTables } from "../constants";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseKey!);

export class SupabaseSessionStorage implements SessionStorage {
  public async storeSession(session: Session): Promise<boolean> {
    const { error } = await supabase
      .from(SupabaseTables.SESSIONS)
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
    return !error;
  }

  public async loadSession(id: string): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from(SupabaseTables.SESSIONS)
      .select("*")
      .eq("id", id);

    if (!error && data?.length === 1) {
      return new Session(data[0]);
    }

    console.error("session load failed");

    return undefined;
  }

  public async deleteSession(id: string): Promise<boolean> {
    const { error } = await supabase.from(SupabaseTables.SESSIONS).delete().eq("id", id);
    return !error;
  }

  public async deleteSessions(ids: string[]): Promise<boolean> {
    const { error } = await supabase.from(SupabaseTables.SESSIONS).delete().in("id", ids);
    return !error;
  }

  public async findSessionsByShop(shop: string): Promise<Session[]> {
    const { data, error } = await supabase
      .from(SupabaseTables.SESSIONS)
      .select("*")
      .eq("shop", shop);
    if (error || !data) {
      console.error("No sessions found", data);
      return [];
    }
    return data;
  }
}
