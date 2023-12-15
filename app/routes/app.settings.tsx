import { Page, Layout, Card, Button, TextContainer } from "@shopify/polaris";

function SettingsPage() {
  const handleDelete = () => {
    // Placeholder for backend deletion function
    console.log("All data deleted");
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
