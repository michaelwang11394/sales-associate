import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { RETURN_TOP_N_SIMILARITY_DOCS } from "../../constants";
import { getProducts } from "../shopify";
import { supabase } from "../supabase_queries";
import { EMBEDDING_SMALL_MODEL } from "./constants";

// TODO: Move createCatalogEmbeddings to app home once we create that.
export const runEmbeddingsAndSearch = async (store: string, query: string) => {
  // const res = await createCatalogEmbeddings();
  let vectorStore;
  let relevantDocs;
  try {
    vectorStore = new SupabaseVectorStore(
      new OpenAIEmbeddings({
        modelName: EMBEDDING_SMALL_MODEL,
        openAIApiKey: process.env.OPENAI_KEY,
      }),
      {
        client: supabase,
        tableName: "vector_catalog",
        queryName: "match_documents",
        filter: (rpc) => rpc.filter("metadata", "eq", store),
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
        new OpenAIEmbeddings({
          modelName: EMBEDDING_SMALL_MODEL,
          openAIApiKey: process.env.OPENAI_KEY,
        }),
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
    console.error("No documents available right now from supabase");
    throw error; // TODO fail hard here, means we couldn't retrieve or create indices from supabase and we're generating embeddings for the entire store
    /*
    vectorStore = await MemoryVectorStore.fromTexts(
      document,
      uids,
      new OpenAIEmbeddings({
        modelName: EMBEDDING_SMALL_MODEL,
        openAIApiKey: OPENAI_KEY,
      })
    );
    relevantDocs = await vectorStore.similaritySearch(
      query,
      RETURN_TOP_N_SIMILARITY_DOCS
    );
    */
  }

  return relevantDocs.map((doc) => {
    return doc.pageContent;
  });
};
