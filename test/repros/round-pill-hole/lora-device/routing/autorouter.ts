import { AutoroutingPipelineSolver9_PreloadedTraceGraph } from "@tscircuit/capacity-autorouter"
import type { SimpleRouteJson } from "@tscircuit/capacity-autorouter"
import { pcb_trace } from "circuit-json"
import { z } from "zod"
import reviewedRoutes from "./reviewed-routes.json"
import reviewedInputHash from "./input-sha256.json"

// Generated with capacity-autorouter 0.0.988, then reviewed and locally corrected.
// Set false to regenerate with that same native solver after changing placement.
const useReviewedRoutes = true
const traceSchema = pcb_trace.extend({
  connection_name: z.string(),
  connectsTo: z.array(z.string()),
})
const routes = reviewedRoutes.map((route) => traceSchema.parse(route))
type RouterEvent = {
  traces?: typeof routes
  error?: Error
  progress?: number
}
type Handler = (event: RouterEvent) => void

async function hashRoutingInput(input: SimpleRouteJson) {
  const bytes = new TextEncoder().encode(JSON.stringify(input))
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("")
}

/** Replays reviewed native output only when every routing input is unchanged. */
export async function createTrackerAutorouter(input: SimpleRouteJson) {
  const handlers = new Map<string, Handler[]>()
  let stopped = false
  const emit = (name: string, event: RouterEvent) => {
    for (const handler of handlers.get(name) ?? []) handler(event)
  }
  return {
    on(name: string, handler: Handler) {
      handlers.set(name, [...(handlers.get(name) ?? []), handler])
    },
    stop() {
      stopped = true
    },
    async start() {
      try {
        if (useReviewedRoutes) {
          if ((await hashRoutingInput(input)) !== reviewedInputHash) {
            throw new Error(
              "Routing inputs changed. Disable useReviewedRoutes in routing/autorouter.ts, regenerate with the native autorouter, and repeat fabrication validation.",
            )
          }
          emit("complete", { traces: routes })
          return
        }
        const solver = new AutoroutingPipelineSolver9_PreloadedTraceGraph(
          input,
          {
            effort: 5,
          },
        )
        while (!solver.solved && !solver.failed && !stopped) {
          for (
            let step = 0;
            step < 100 && !solver.solved && !solver.failed;
            step++
          ) {
            solver.step()
          }
          emit("progress", { progress: solver.computeProgress() })
          await new Promise((resolve) => setTimeout(resolve, 0))
        }
        if (stopped) return
        if (solver.failed)
          throw new Error(solver.error ?? "Native routing failed")
        const generated = solver.getOutputSimplifiedPcbTraces()
        emit("complete", {
          traces: generated.map((route) => traceSchema.parse(route)),
        })
      } catch (error) {
        emit("error", {
          error: error instanceof Error ? error : new Error(String(error)),
        })
      }
    },
  }
}
