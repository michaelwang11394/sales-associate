import { EXPERIMENT_PATH, V1, VERCEL_URL } from "@/constants/constants";
import { HTTPHelper } from "./http";

export const expose = async (clientId?: string | null) => {
  if (!clientId) {
    return "control"; // If no clientId don't show
  }
  const res: Response = await HTTPHelper.get(
    VERCEL_URL,
    [V1, EXPERIMENT_PATH],
    {
      store: location.host,
      clientId: clientId,
    }
  );
  return res?.body as string;
};
