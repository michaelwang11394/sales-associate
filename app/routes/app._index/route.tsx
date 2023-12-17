import { useState } from "react";
import { json } from "@remix-run/node";
import { Page, Text, Layout } from "@shopify/polaris";

import { authenticate } from "~/shopify.server";
import Onboarding from "./onboarding";
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });
  // Deeplink request
  const domain = shopData.data[0].domain;
  return json({ shopData, domain });
}

export default function Index() {
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
