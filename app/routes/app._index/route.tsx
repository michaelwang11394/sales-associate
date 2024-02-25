import { json } from "@remix-run/node";
import { Layout, Page, Text } from "@shopify/polaris";
import { useState } from "react";

import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import { supabase } from "~/utils/supabase";
import UserBreakdown from "./analytics";
import Onboarding from "./onboarding";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });
  // Deeplink request
  const domain = shopData.data[0].domain;

  //supabase request to check if merchant exists and has completed onboarding
  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", shopData.data[0].id);

  let onboardingState;
  if (merchant !== null && merchant.length > 0 && merchantError === null) {
    // merchant exists and check if onboarding is completed
    if (merchant[0].onboarding_completed) {
      // onboarding is completed
      onboardingState = true;
    } else {
      // onboarding is not completed
      onboardingState = false;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: merchantInsert } = await supabase.from("merchants").upsert([
        {
          id: shopData.data[0].id,
          store: shopData.data[0].domain, // FK to events[store], messages[store], vector_catalog[metadata] tables
          name: shopData.data[0].name,
          plan_name: shopData.data[0].plan_name,
          myshopify_domain: shopData.data[0].myshopify_domain, //FK to sessions[store] table
          shop_owner: shopData.data[0].shop_owner,
          customer_email: shopData.data[0].customer_email,
          checkout_api_supported: shopData.data[0].checkout_api_supported,
          onboarding_completed: false,
        },
      ]);
    }
  } else {
    // merchant does not exist so insert data
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { data: merchantInsert, error: insertError } = await supabase
      .from("merchants")
      .insert([
        {
          id: shopData.data[0].id,
          domain: shopData.data[0].domain, // FK to events[store], messages[store], vector_catalog[metadata] tables
          name: shopData.data[0].name,
          plan_name: shopData.data[0].plan_name,
          shop_owner: shopData.data[0].shop_owner,
          customer_email: shopData.data[0].customer_email,
          checkout_api_supported: shopData.data[0].checkout_api_supported,
          onboarding_completed: false,
        },
      ]);
  }

  return json({ shopData, domain, onboardingState, merchant });
}

export default function Index() {
  const { shopData, onboardingState, merchant } = useLoaderData();
  console.log("data", shopData, onboardingState, merchant);
  const [onboardingCompleted, setOnboardingCompleted] =
    useState(onboardingState);

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
          <UserBreakdown store={shopData.data[0].domain} />
        </Layout.Section>
      </Layout>
    </Page>
  );
}
