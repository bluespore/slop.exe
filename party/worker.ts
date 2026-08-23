import { routePartykitRequest } from "partyserver";

import ButtonRoom from "./index";

// The DO class must be re-exported from the worker entry so wrangler can bind it.
export { ButtonRoom };

interface Env {
  /** bound as "Main" → serves partysocket's default party path /parties/main/:room */
  Main: DurableObjectNamespace<ButtonRoom>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env)) ??
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
