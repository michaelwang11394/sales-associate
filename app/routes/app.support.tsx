import { Page, Layout, Card, Text } from "@shopify/polaris";

function SupportPage() {
  return (
    <Page title="Support">
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="bodyLg" as="p">
              <p>For support, please email us at: michaelwang11394@gmail.com</p>
            </Text>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default SupportPage;
