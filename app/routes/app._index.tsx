import { useState } from "react";
import { json } from "@remix-run/node";
import {
  Card,
  Button,
  ProgressBar,
  BlockStack,
  Text,
  List,
  Box,
  Layout,
  ButtonGroup,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";
export async function loader({ request }) {
  await authenticate.admin(request);

  return json({ apiKey: process.env.SHOPIFY_API_KEY });
}

export default function Index() {
  const [step, setStep] = useState(0);

  const steps = [
    "Introduction",
    "Deep Linking",
    "Prompt Settings",
    "Embedding",
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  const renderContent = () => {
    switch (step) {
      case 0:
        return (
          <BlockStack>
            <Text variant="heading2xl" as="h3" alignment="center">
              Begin Onboarding
            </Text>
            <Text variant="bodyLg" as="p">
              Welcome! You're only 3 steps away from boosting your sales with
              your own online Sales Associate. Here's what we're going to do in
              the next 3 steps:
              <List type="bullet">
                <List.Item>
                  We're going to add the Sales Associate app to your store via a
                  deep link. The app consists of two parts. The first part is a
                  traditional search icon that will replace your current search.
                  The second part will be an embed in your shops bottom right
                  corner that will show floaty messages.{" "}
                </List.Item>
                <List.Item>
                  Next, we'll add your store's catalog so your sales associate
                  will know what products are available.{" "}
                </List.Item>
                <List.Item>
                  Lastly, you're going to teach your Sales Associate best
                  tactics to convert sales on your shop.{" "}
                </List.Item>
              </List>
              Let's get started!
            </Text>
          </BlockStack>
        );
      // ... handle other steps ...
      default:
        return null;
    }
  };

  return (
    <Layout>
      <Layout.Section>
        <ProgressBar
          progress={(step + 1) * (100 / steps.length)}
          size="small"
        />
      </Layout.Section>
      <Layout.Section>
        <BlockStack inlineAlign="center" align="center">
          <Box width="500px">
            <Card>
              <BlockStack inlineAlign="center">
                {renderContent()}
                <ButtonGroup gap="loose">
                  <Button onClick={handleBack} disabled={step === 0}>
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    disabled={step === steps.length - 1}>
                    Next
                  </Button>
                </ButtonGroup>
              </BlockStack>
            </Card>
          </Box>
        </BlockStack>
      </Layout.Section>
    </Layout>
  );
}
