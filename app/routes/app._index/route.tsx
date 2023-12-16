import { useState } from "react";
import { json } from "@remix-run/node";
import { Page, Text, Layout } from "@shopify/polaris";

import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
import Onboarding from "./onboarding";
export async function loader({ request }) {
  await authenticate.admin(request);

  return json({ apiKey: process.env.SHOPIFY_API_KEY });
}

export default function Index() {
  const { apiKey } = useLoaderData();
  console.log("apiKey", apiKey);
  const [onboardingCompleted, setOnboardingCompleted] = useState(true);

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
