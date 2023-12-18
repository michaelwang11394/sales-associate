import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Button, TextContainer } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";
import { supabase } from "~/utils/supabase";

export async function loader({ request }) {
  const { admin, session } = await authenticate.admin(request);
  const shopData = await admin.rest.resources.Shop.all({
    session: session,
  });
  // Deeplink request
  const domain = shopData.data[0].domain;

  return json({ shopData, domain });
}
function SettingsPage() {
  const { domain } = useLoaderData();
  const handleDelete = async () => {
    // Delete merchant row, and subsequently cascade away all data
    const { data, error } = await supabase
      .from("sessions")
      .delete()
      .eq("shop", domain);
    if (error) console.error("Error deleting data", error);
    console.log("All data deleted", data);
  };

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <Card>
            <TextContainer>
              <p>Delete all your data</p>
              <Button tone="critical" onClick={handleDelete}>
                Delete
              </Button>
            </TextContainer>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default SettingsPage;
