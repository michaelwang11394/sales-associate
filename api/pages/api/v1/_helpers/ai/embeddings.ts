import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { OPENAI_KEY, RETURN_TOP_N_SIMILARITY_DOCS } from "../../constants";
import { getProducts } from "../shopify";
import { supabase } from "../supabase_queries";

// TODO: Move createCatalogEmbeddings to app home once we create that.
export const runEmbeddingsAndSearch = async (
  store: string,
  query: string,
  document: string[],
  uids: string[]
) => {
  // const res = await createCatalogEmbeddings();
  let vectorStore;
  let relevantDocs;
  try {
    vectorStore = new SupabaseVectorStore(
      new OpenAIEmbeddings({ openAIApiKey: OPENAI_KEY }),
      {
        client: supabase,
        tableName: "vector_catalog",
        queryName: "match_documents",
        filter: { metadata: { $eq: store } },
      }
    );
    relevantDocs = await vectorStore.similaritySearch(
      query,
      RETURN_TOP_N_SIMILARITY_DOCS
    );

    // If no docs are returned, means that we need to create embeddings
    if (relevantDocs.length === 0) {
      const { strippedProducts } = await getProducts(store);
      // Delete existing indices first
      const { error } = await supabase
        .from("vector_catalog")
        .delete()
        .eq("metadata", store);
      if (error) {
        throw new Error("error updating vector table in supabase");
      }

      vectorStore = await SupabaseVectorStore.fromTexts(
        strippedProducts,
        Array(strippedProducts.length).fill(store),
        new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_KEY }),
        {
          client: supabase,
          tableName: "vector_catalog",
          queryName: "match_documents",
        }
      );
      relevantDocs = await vectorStore.similaritySearch(
        query,
        RETURN_TOP_N_SIMILARITY_DOCS
      );
      if (relevantDocs.length === 0) {
        throw new Error("Search after index creation returned 0 results");
      }
    }
  } catch (error) {
    vectorStore = await MemoryVectorStore.fromTexts(
      document,
      uids,
      new OpenAIEmbeddings({
        openAIApiKey: OPENAI_KEY,
      })
    );
    relevantDocs = await vectorStore.similaritySearch(
      query,
      RETURN_TOP_N_SIMILARITY_DOCS
    );
  }

  return relevantDocs.map((doc) => doc.pageContent);
};
