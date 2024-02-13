export class HTTPHelper {
  static assembleUrl = (
    base: string,
    path: string | string[],
    params?: Record<string, string | string[]>
  ): string => {
    let url = base;

    if (Array.isArray(path)) {
      // If path is an array, join its elements with '/'
      url += "/" + path.join("/");
    } else {
      // If path is a string, append it directly
      url += "/" + path;
    }

    if (params) {
      const queryParams = Object.entries(params)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value
              .map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
              .join("&");
          } else {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          }
        })
        .join("&");

      url += "?" + queryParams;
    }

    return url;
  };

  static async get<T>(
    baseUrl: string,
    resourcePath: string | string[],
    queryParams?: Record<string, string | string[]>
  ): Promise<T> {
    try {
      const url = this.assembleUrl(baseUrl, resourcePath, queryParams);

      const response = await fetch(url);

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
