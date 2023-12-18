import { useState } from "react";
import { json } from "@remix-run/node";
import { Page, Text, Layout } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import Onboarding from "./onboarding";
import { supabase } from "~/utils/supabase";
import { useLoaderData } from "@remix-run/react";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });
  // Deeplink request
  const domain = shopData.data[0].domain;
  // supabase request
  // TODO: Add a check to see if merchant exists in supabase. Upsert suffices for now

  const { data: merchantInsert } = await supabase.from("merchants").upsert([
    {
      id: shopData.data[0].id,
      domain: shopData.data[0].domain, // FK to events[store], messages[store], vector_catalog[metadata] tables
      name: shopData.data[0].name,
      plan_name: shopData.data[0].plan_name,
      myshopify_domain: shopData.data[0].myshopify_domain, //FK to sessions[store] table
      shop_owner: shopData.data[0].shop_owner,
      customer_email: shopData.data[0].customer_email,
      checkout_api_supported: shopData.data[0].checkout_api_supported,
    },
  ]);

  return json({ shopData, domain, merchantInsert });
}

export default function Index() {
  const { shopData, merchantInsert } = useLoaderData();
  console.log("data", shopData, merchantInsert);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  return (
    <Page title="Home">
      <Layout>
        <Layout.Section>
          {!onboardingCompleted && (
            <Onboarding setOnboardingCompleted={setOnboardingCompleted} />
          )}

          <Text variant="heading2xl" as="h2" alignment="center">
            Welcome to our platform!
          </Text>
          <Text variant="bodyLg" as="p" alignment="center">
            We're glad to have you here. Let's boost your sales together.
          </Text>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
