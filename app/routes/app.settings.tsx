import { ActionFunction, json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  BlockStack,
  Button,
  Card,
  Layout,
  Modal,
  Page,
  Select,
  Text,
  TextContainer,
} from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "~/shopify.server";
import { supabase } from "~/utils/supabase";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const shopId = formData.get("shopId");
  const settings = {
    headerBackgroundColor: formData.get("headerBackgroundColor"),
    searchBackgroundColor: formData.get("searchBackgroundColor"),
    convoBackgroundColor: formData.get("convoBackgroundColor"),
    hintBubbleColor: formData.get("hintBubbleColor"),
    logoColor: formData.get("logoColor"),
    systemFontColor: formData.get("systemFontColor"),
    userFontColor: formData.get("userFontColor"),
    fontStyle: formData.get("fontStyle"),
  };
  console.log("settings", settings);

  const { error } = await supabase
    .from("merchants")
    .update({ shop_style: settings })
    .eq("id", shopId);
  if (error) {
    throw new Error(`Failed to save settings: ${error.message}`);
  }

  return json({ success: true });
};

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });

  //supabase request to check if merchant exists and has completed onboarding
  const { data: merchantData, error } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", shopData.data[0].id);

  if (error) {
    throw new Error(`Failed to fetch merchant data: ${error.message}`);
  }

  return json({ merchantData });
}
function SettingsPage() {
  const { merchantData } = useLoaderData();
  const fetcher = useFetcher();
  const initialSettings = merchantData[0].shop_style;

  const [modalActive, setModalActive] = useState(false);

  const [settings, setSettings] = useState({
    headerBackgroundColor: initialSettings.headerBackgroundColor || "#ffffff",
    searchBackgroundColor: initialSettings.searchBackgroundColor || "#ffffff",
    convoBackgroundColor: initialSettings.convoBackgroundColor || "#ffffff",
    hintBubbleColor: initialSettings.hintBubbleColor || "#000000",
    logoColor: initialSettings.logoColor || "#0004fa",
    systemFontColor: initialSettings.systemFontColor || "#000000",
    userFontColor: initialSettings.userFontColor || "#0004fa",
    fontStyle: initialSettings.fontStyle || "Arial",
  });

  useEffect(() => {
    if (fetcher.data?.success) {
      alert("Save was successfully executed");
    }
  }, [fetcher.data]);

  const fontStyleOptions = [
    { label: "Arial", value: "Arial" },
    { label: "Helvetica", value: "Helvetica" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Courier New", value: "Courier New" },
    { label: "Verdana", value: "Verdana" },
    // Add more options as needed
  ];

  const handleColorChange = (name) => (event) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: event.target.value,
    }));
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("uninstalled")
      .upsert([{ store: merchantData[0].store }]);
    if (error) {
      console.error("Shop's deletion queueing failed");
    }
  };

  const toggleModal = () => setModalActive(!modalActive);

  return (
    <Page title="Settings">
      <Layout.Section>
        <Card>
          <Text variant="headingXl" as="h3">
            Command Palette Visual Settings
          </Text>
          <fetcher.Form method="post">
            <BlockStack gap="200">
              {Object.entries(settings).map(([name, value]) =>
                name !== "fontStyle" ? (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}>
                    <label htmlFor={name} style={{ marginRight: "1rem" }}>
                      {name}:
                    </label>
                    <input
                      type="color"
                      id={name}
                      name={name}
                      value={value}
                      onChange={handleColorChange(name)}
                    />
                  </div>
                ) : (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}>
                    <label style={{ marginRight: "1rem" }}>Font Style</label>
                    <Select
                      label=""
                      options={fontStyleOptions}
                      name={name}
                      onChange={(e) =>
                        handleColorChange(name)({ target: { value: e } })
                      }
                      value={value}
                    />
                  </div>
                )
              )}
            </BlockStack>
            <input type="hidden" name="shopId" value={merchantData[0].id} />
            <Button submit>Save</Button>
          </fetcher.Form>
        </Card>
      </Layout.Section>
      <Layout.Section>
        <Card>
          <TextContainer>
            <p>Delete all your data</p>
            <Button tone="critical" onClick={toggleModal}>
              Delete
            </Button>
          </TextContainer>
        </Card>
      </Layout.Section>

      <Modal
        open={modalActive}
        onClose={toggleModal}
        title="Are you sure you want to delete all your data?"
        primaryAction={{
          content: "Delete",
          onAction: handleDelete,
          destructive: true,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: toggleModal,
          },
        ]}>
        <Modal.Section>
          <TextContainer>
            <p>This action cannot be undone.</p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default SettingsPage;
