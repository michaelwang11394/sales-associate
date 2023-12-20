import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        SITE UNDER CONSTRUCTION
        <br /> Privacy Policy: Sales Associate does not collect or request any
        customer data from your store, including name, address, phone, and email
        fields in accordance with Shopify's protected customer data
        requirements. All permissions will be displayed upon app install to
        access any store information, such as products. All data related to your
        store can be deleted from your admin page, and all data will be
        AUTOMATICALLY deleted upon uninstall.
      </div>
    </main>
  );
}
