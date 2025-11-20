import { Checkout } from "@polar-sh/nextjs";
import { ENV } from "@/lib/env";

export const GET = Checkout({
  accessToken: ENV.POLAR_ACCESS_TOKEN,
  successUrl: ENV.POLAR_SUCCESS_URL,
});


