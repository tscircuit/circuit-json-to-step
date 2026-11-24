import {
  ManifoldSolidBrep,
  Plane,
  type Repository,
  parseRepository,
} from "stepts"

type Point = { x: number; y: number; z: number }

export type ShellFace = {
  /** Outward normal from the plane axis and the face's same_sense flag. */
  normal: string
  /** Outer-boundary vertices in the order the STEP loop traverses them. */
  loop: Point[]
}

const axisName = ({ x, y, z }: Point) =>
  [
    ["X", x],
    ["Y", y],
    ["Z", z],
  ]
    .filter(([, value]) => value !== 0)
    .map(([axis, value]) => `${(value as number) > 0 ? "+" : "-"}${axis}`)
    .join("")

/**
 * Read the board shell exactly as written, without the healing OCCT applies on
 * import. Every face here is planar, so only planes are handled.
 */
export function readBoardShell(step: string) {
  const repo: Repository = parseRepository(step)
  const solid = repo
    .entries()
    .map(([, entity]) => entity)
    .find((entity) => entity instanceof ManifoldSolidBrep) as ManifoldSolidBrep
  const faces: ShellFace[] = []
  // edge curve id -> [face normal, traversed start->end?] for every use
  const edgeUses = new Map<number, { normal: string; forward: boolean }[]>()

  for (const face of solid.outer
    .resolve(repo)
    .faces.map((f) => f.resolve(repo))) {
    const plane = face.surface.resolve(repo)
    if (!(plane instanceof Plane)) throw new Error("expected a planar face")
    const axis = plane.placement.resolve(repo).axis!.resolve(repo)
    const sign = face.sameSense ? 1 : -1
    const normal = axisName({
      x: axis.dx * sign,
      y: axis.dy * sign,
      z: axis.dz * sign,
    })
    const [outer] = face.bounds.map((bound) => bound.resolve(repo))
    const oriented = outer!.bound
      .resolve(repo)
      .edges.map((e) => e.resolve(repo))
    const ordered = outer!.sameSense ? oriented : [...oriented].reverse()
    const loop: Point[] = []
    for (const use of ordered) {
      const forward = use.orientation === outer!.sameSense
      const edge = use.edge.resolve(repo)
      const start = (forward ? edge.start : edge.end).resolve(repo)
      const { x, y, z } = start.pnt.resolve(repo)
      loop.push({ x, y, z })
      edgeUses.set(use.edge.id, [
        ...(edgeUses.get(use.edge.id) ?? []),
        { normal, forward },
      ])
    }
    faces.push({ normal, loop })
  }

  // In a closed, consistently oriented shell each edge is used by exactly two
  // faces, once in each direction. Strict readers reject anything else.
  const inconsistentEdges = [...edgeUses.values()]
    .filter(
      (uses) => uses.length !== 2 || uses[0]!.forward === uses[1]!.forward,
    )
    .map((uses) => uses.map((use) => use.normal).sort())
    .sort((a, b) => (a.join() < b.join() ? -1 : 1))

  return { faces, inconsistentEdges }
}
