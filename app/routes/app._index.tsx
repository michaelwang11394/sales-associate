import { useState } from "react";
import { json } from "@remix-run/node";
import {
  Page,
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
import { useLoaderData } from "@remix-run/react";
export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const res = await admin.rest.resources.Shop.all({
    session: session,
  });
  return json({ res, session });
}

export default function Index() {
  const [step, setStep] = useState(0);
  const { res, session } = useLoaderData();
  console.log("from index", res, session);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

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
      case 1:
        // TODO: Add deep link backend https://shopify.dev/docs/apps/online-store/theme-app-extensions/extensions-framework#deep-linking

        return (
          <BlockStack>
            <Text variant="heading2xl" as="h3" alignment="center">
              Add app to store.
            </Text>
            <Text variant="bodyLg" as="p">
              We're going to add the Sales Associate app to your store via a
              deep link. The app consists of two parts. The first part is a
              traditional search icon that will replace your current search. The
              second part will be an embed in your shops bottom right corner
              that will show floaty messages.{" "}
            </Text>
            <BlockStack inlineAlign="center" align="center">
              <Button variant="primary">Add App</Button>
            </BlockStack>
          </BlockStack>
        );
      case 2:
        return (
          <BlockStack>
            <Text variant="heading2xl" as="h3" alignment="center">
              Add Sales tactics
            </Text>
            <Text variant="bodyLg" as="p">
              In the below form, you can teach your sales associate best tactics
              to convert sales on your shop. For example, if you're a jewelry
              store, complimenting how nice the ring would look on the
              customer's hand is a great way to convert sales.
            </Text>
          </BlockStack>
        );
      case 3:
        return (
          <BlockStack>
            <Text variant="heading2xl" as="h3" alignment="center">
              Add store catalog
            </Text>
            <Text variant="bodyLg" as="p">
              Let's now add your stores catalog so your sales associate will
              know what products are available.
            </Text>
            <BlockStack inlineAlign="center" align="center">
              <Button variant="primary">Add Catalog</Button>
            </BlockStack>
          </BlockStack>
        );

      default:
        return null;
    }
  };

  return (
    <Page title="Home">
      <Layout>
        <Layout.Section>
          {!onboardingCompleted && (
            <>
              <ProgressBar
                progress={(step + 1) * (100 / steps.length)}
                size="small"
              />
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
            </>
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
