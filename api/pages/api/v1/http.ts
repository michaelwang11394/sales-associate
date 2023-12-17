import type { NextApiRequest, NextApiResponse } from "next";
import type { ApiResponse } from "./types";

export const httpResponse = (
  request: NextApiRequest,
  response: NextApiResponse,
  code: number,
  message: string,
  body?: any
) => {
  return response.status(code).json({
    body: body,
    query: request.query,
    message: message,
  } as ApiResponse);
};
