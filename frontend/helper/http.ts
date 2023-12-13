export class HTTPHelper {
  static async get<T>(
    url: string,
    queryParams?: Record<string, string | number>
  ): Promise<T> {
    try {
      const queryString = queryParams
        ? Object.entries(queryParams)
            .map(
              ([key, value]) =>
                `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
            )
            .join("&")
        : "";

      const fullUrl = queryString ? `${url}?${queryString}` : url;

      const response = await fetch(fullUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data: T = await response.json();
      return data;
    } catch (error) {
      console.error("Error during GET request:", error);
      throw error;
    }
  }

  static async post<T>(url: string, data: any): Promise<T> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData: T = await response.json();
      return responseData;
    } catch (error) {
      console.error("Error during POST request:", error);
      throw error;
    }
  }
}

/*
// Example usage:

// Making a GET request with query parameters
const getExampleWithQueryParams = async () => {
  try {
    const queryParams = {
      userId: 1,
      category: "technology",
    };

    const data = await HTTPHelper.get<{ title: string }>(
      "https://jsonplaceholder.typicode.com/posts",
      queryParams
    );
    console.log("GET Request Result:", data);
  } catch (error) {
    console.error("Error in GET example with query parameters:", error);
  }
};

// Call the example
getExampleWithQueryParams();
*/
