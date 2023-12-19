import { useState } from "react";
import { json } from "@remix-run/node";
import {
  Card,
  Button,
  ProgressBar,
  BlockStack,
  Text,
  Box,
  ButtonGroup,
} from "@shopify/polaris";

import { useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";
export async function loader({ request }) {
  // Authenticate the request
  const { admin, session } = await authenticate.admin(request);
  // Get Store Shopify Domain
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });
  // Deeplink request domain
  const domain = shopData.data[0].domain;

  return json({ shopData, domain });
}
export default function Index() {
  const [step, setStep] = useState(0);
  const { shopData, domain } = useLoaderData();
  console.log("from onboarding", shopData, domain);

  const steps = [
    "Introduction",
    "Deep Linking",
    // "Prompt Settings",
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

  const handleDeepLink = (type: string) => {
    const shopifyDomain = domain;
    // TODO: Currently this is Client ID of sales-associate-DEV. We'd need to change this to accept env variables and uuid of production app
    const uuid = "5ad052c5180f45582abe299b3bbe69b8";
    const handle = type === "embed" ? "embed" : "section"; // embed.liquid file in blokcs
    let url;
    if (type === "embed") {
      url = `https://${shopifyDomain}/admin/themes/current/editor?context=apps&activateAppId=${uuid}/${handle}`;
    } else {
      //TODO: Asset API to replace any default search
      url = `https://${shopifyDomain}/admin/themes/current/editor?addAppBlockId=${uuid}/${handle}&target=sectionGroup:header`;
    }
    window.open(url, "_blank");
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
              Welcome! Let's add the Sales Associate app to your store in the
              next step. This app will help you boost your sales by interacting
              with your customers in real time.
            </Text>
          </BlockStack>
        );
      case 1:
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
              <Button
                variant="primary"
                onClick={() => handleDeepLink("section")}>
                Add Block App
              </Button>
              <Button variant="primary" onClick={() => handleDeepLink("embed")}>
                Add Embeded App
              </Button>
            </BlockStack>
          </BlockStack>
        );
      //TODO: Add Prompt Settings
      //   case 2:
      //     return (
      //       <BlockStack>
      //         <Text variant="heading2xl" as="h3" alignment="center">
      //           Add Sales tactics
      //         </Text>
      //         <Text variant="bodyLg" as="p">
      //           In the below form, you can teach your sales associate best tactics
      //           to convert sales on your shop. For example, if you're a jewelry
      //           store, complimenting how nice the ring would look on the
      //           customer's hand is a great way to convert sales.
      //         </Text>
      //       </BlockStack>
      //     );
      // case 2:
      //   return (
      //     <BlockStack>
      //       <Text variant="heading2xl" as="h3" alignment="center">
      //         Add store catalog
      //       </Text>
      //       <Text variant="bodyLg" as="p">
      //         Let's now add your stores catalog so your sales associate will
      //         know what products are available.
      //       </Text>
      //       <BlockStack inlineAlign="center" align="center">
      //         <Button variant="primary" onClick={() => handleAddCatalog()}>
      //           Add Catalog
      //         </Button>
      //       </BlockStack>
      //     </BlockStack>
      //   );

      default:
        return null;
    }
  };

  return (
    <>
      <ProgressBar progress={(step + 1) * (100 / steps.length)} size="small" />
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
  );
}
