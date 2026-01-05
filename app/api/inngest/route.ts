import { serve } from "inngest/next";
import {
  helloWorld,
  inngest,
  performAIMatching,
} from "@/lib/inngest/functions";

// Inngest has its own logging and monitoring, so we don't wrap with Axiom
// The serve function returns handlers that are already instrumented by Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    performAIMatching, // <-- Durable AI matching function
  ],
});
