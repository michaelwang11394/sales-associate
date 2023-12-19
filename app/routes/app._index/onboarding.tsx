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
import { supabase } from "~/utils/supabase";

interface OnboardingProps {
  setOnboardingCompleted: (value: boolean) => void;
}
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
export default function Index(props: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [blockAppAdded, setBlockAppAdded] = useState(false);
  const [embedAppAdded, setEmbedAppAdded] = useState(false);
  const { shopData, domain } = useLoaderData();
  console.log("from onboarding", shopData, domain);

  const steps = ["Introduction", "Deep Linking"];

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else if (step === steps.length - 1) {
      // Update onboarding_complete field in merchants table
      console.log("shopData", domain);
      try {
        const { data } = await supabase
          .from("merchants")
          .update({ onboarding_completed: true })
          .eq("domain", domain);

        console.log("data", data);
      } catch (error) {
        console.log("error", error);
      }
      props.setOnboardingCompleted(true);
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
      setEmbedAppAdded(true);
      url = `https://${shopifyDomain}/admin/themes/current/editor?context=apps&activateAppId=${uuid}/${handle}`;
    } else {
      setBlockAppAdded(true);
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
              <ButtonGroup>
                <Button
                  variant="primary"
                  onClick={() => handleDeepLink("section")}>
                  Add Block App
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDeepLink("embed")}>
                  Add Embeded App
                </Button>
              </ButtonGroup>
            </BlockStack>
          </BlockStack>
        );

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
                  disabled={
                    step === steps.length - 1 &&
                    (!blockAppAdded || !embedAppAdded)
                  }>
                  {step === steps.length - 1 ? "Finish" : "Next"}
                </Button>
              </ButtonGroup>
            </BlockStack>
          </Card>
        </Box>
      </BlockStack>
    </>
  );
}
