import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const getTurns = defineRpc({
  name: "thinking.turns",
  input: z.object({ agentId: z.string().min(1) }),
  output: z.object({
    active: z.boolean(),
    successes: z.array(z.string()),
  }),
});
