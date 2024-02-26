import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
import { useState } from "react";
import { authenticate } from "~/shopify.server";
import { supabase } from "~/utils/supabase";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });

  //supabase request to check if merchant exists and has completed onboarding
  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("id", shopData.data[0].id);

  return json({ merchant });
}
function SettingsPage() {
  const { merchant } = useLoaderData();
  const [modalActive, setModalActive] = useState(false);

  const [headerBackgroundColor, setHeaderBackgroundColor] = useState("#000000");
  const [searchBackgroundColor, setSearchBackgroundColor] = useState("#000000");
  const [convoBackgroundColor, setConvoBackgroundColor] = useState("#000000");
  const [hintBubbleColor, setHintBubbleColor] = useState("#000000");
  const [logoColor, setLogoColor] = useState("#000000");
  const [systemFontColor, setSystemFontColor] = useState("#000000");
  const [userFontColor, setUserFontColor] = useState("#000000");
  const [fontStyle, setFontStyle] = useState("Arial");
  const fontStyleOptions = [
    { label: "Arial", value: "Arial" },
    { label: "Helvetica", value: "Helvetica" },
    { label: "Times New Roman", value: "Times New Roman" },
    { label: "Courier New", value: "Courier New" },
    { label: "Verdana", value: "Verdana" },
    // Add more options as needed
  ];
  // Handlers for new color states
  const handleColorChange = (setter) => (event) => setter(event.target.value);

  const handleDelete = async () => {
    // Delete merchant row, and subsequently cascade away all data
    const { data, error } = await supabase
      .from("sessions")
      .delete()
      .eq("shop", merchant[0].store);
    if (error) console.error("Error deleting data", error);
    else console.log("All data deleted", data);
    setModalActive(false); // Close the modal after deletion
  };

  const toggleModal = () => setModalActive(!modalActive);

  return (
    <Page title="Settings">
      <Layout.Section>
        <Card>
          <Text variant="heading2xl" as="h3">
            Command Palette Visual Settings
          </Text>
          <BlockStack gap="200">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "1rem",
              }}>
              <label
                htmlFor="headerColorPicker"
                style={{ marginRight: "1rem" }}>
                Header Background Color:
              </label>
              <input
                type="color"
                id="headerColorPicker"
                value={headerBackgroundColor}
                onChange={handleColorChange(setHeaderBackgroundColor)}
              />
            </div>
            {/* Repeat the pattern for the new color states */}
            {[
              {
                label: "Search Background Color:",
                id: "searchColorPicker",
                value: searchBackgroundColor,
                setter: setSearchBackgroundColor,
              },
              {
                label: "Conversation Background Color:",
                id: "convoColorPicker",
                value: convoBackgroundColor,
                setter: setConvoBackgroundColor,
              },
              {
                label: "Hint Bubble Color:",
                id: "hintColorPicker",
                value: hintBubbleColor,
                setter: setHintBubbleColor,
              },
              {
                label: "Logo Color:",
                id: "logoColorPicker",
                value: logoColor,
                setter: setLogoColor,
              },
              {
                label: "System Font Color:",
                id: "systemFontColorPicker",
                value: systemFontColor,
                setter: setSystemFontColor,
              },
              {
                label: "User Font Color:",
                id: "userFontColorPicker",
                value: userFontColor,
                setter: setUserFontColor,
              },
            ].map(({ label, id, value, setter }) => (
              <div
                key={id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}>
                <label htmlFor={id} style={{ marginRight: "1rem" }}>
                  {label}
                </label>
                <input
                  type="color"
                  id={id}
                  value={value}
                  onChange={handleColorChange(setter)}
                />
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "1rem",
              }}>
              <label style={{ marginRight: "1rem" }}>Font Style</label>
              <Select
                label=""
                options={fontStyleOptions}
                onChange={setFontStyle}
                value={fontStyle}
              />
            </div>
          </BlockStack>
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
