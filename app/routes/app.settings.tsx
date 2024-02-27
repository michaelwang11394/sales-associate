import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Button, Card, Layout, Page, TextContainer } from "@shopify/polaris";
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
    const { error } = await supabase
      .from("uninstalled")
      .upsert([{ store: domain }]);
    if (error) {
      console.error("Shop's deletion queueing failed");
    }
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
