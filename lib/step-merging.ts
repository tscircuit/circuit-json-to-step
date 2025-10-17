import type { Ref, ManifoldSolidBrep, Curve, Surface } from "stepts"
import {
  Repository,
  parseRepository,
  CartesianPoint,
  Direction,
  Axis2Placement3D,
  ManifoldSolidBrep as ManifoldSolidBrepClass,
  ClosedShell,
  AdvancedFace,
  FaceOuterBound,
  EdgeLoop,
  OrientedEdge,
  EdgeCurve,
  VertexPoint,
  Line,
  Circle,
  Vector,
  Plane,
  CylindricalSurface,
  type Entity,
} from "stepts"
import { fetchStepFile } from "./fetch-step-file"
import type { StepTransform } from "./step-types"
/**
 * Applies transformation to a CartesianPoint
 */
function transformPoint(
  point: CartesianPoint,
  transform?: StepTransform,
): CartesianPoint {
  if (!transform) {
    return point
  }

  const scale = transform.scale || 1
  let x = point.x * scale
  let y = point.y * scale
  let z = point.z * scale

  // Apply rotation if specified (simplified - only handles rotation around Z axis)
  if (transform.pose?.rotation) {
    const rotZ = (transform.pose.rotation.z || 0) * (Math.PI / 180) // Convert to radians
    const cosZ = Math.cos(rotZ)
    const sinZ = Math.sin(rotZ)
    const newX = x * cosZ - y * sinZ
    const newY = x * sinZ + y * cosZ
    x = newX
    y = newY

    // TODO: Implement rotation around X and Y axes if needed
  }

  // Apply translation
  if (transform.pose?.position) {
    x += transform.pose.position.x || 0
    y += transform.pose.position.y || 0
    z += transform.pose.position.z || 0
  }

  return new CartesianPoint(point.name, x, y, z)
}

/**
 * Deep copies an entity and all its referenced entities, applying transformations
 */
function copyEntity(
  entity: Entity,
  sourceRepo: Repository,
  targetRepo: Repository,
  transform?: StepTransform
): Entity {
  // Transform CartesianPoint entities
  if (entity instanceof CartesianPoint) {
    return transformPoint(entity, transform)
  }

  // For Direction, just copy (transformations would be more complex)
  if (entity instanceof Direction) {
    return new Direction(entity.name, entity.dx, entity.dy, entity.dz)
  }

  // For Vector, copy direction and magnitude
  if (entity instanceof Vector) {
    const orientation = entity.orientation.resolve(sourceRepo)
    const copiedOrientation = new Direction(orientation.name, orientation.dx, orientation.dy, orientation.dz)
    const orientationRef = targetRepo.add(copiedOrientation)
    return new Vector(entity.name, orientationRef, entity.magnitude)
  }

  // For Line, transform the point and copy the direction vector
  if (entity instanceof Line) {
    const transformedPoint = transformPoint(entity.pnt.resolve(sourceRepo), transform)
    const pointRef = targetRepo.add(transformedPoint)
    const dirVector = entity.dir.resolve(sourceRepo)
    const copiedVector = copyEntity(dirVector, sourceRepo, targetRepo, transform) as Vector
    const vectorRef = targetRepo.add(copiedVector)
    return new Line(entity.name, pointRef, vectorRef)
  }

  // For Circle, transform the placement and keep the radius (scaled if needed)
  if (entity instanceof Circle) {
    const placement = entity.placement.resolve(sourceRepo)
    const copiedPlacement = copyEntity(placement, sourceRepo, targetRepo, transform) as Axis2Placement3D
    const placementRef = targetRepo.add(copiedPlacement)
    const scaledRadius = entity.radius * (transform?.scale || 1)
    return new Circle(entity.name, placementRef, scaledRadius)
  }

  // For Plane, transform the placement
  if (entity instanceof Plane) {
    const placement = entity.placement.resolve(sourceRepo)
    const copiedPlacement = copyEntity(placement, sourceRepo, targetRepo, transform) as Axis2Placement3D
    const placementRef = targetRepo.add(copiedPlacement)
    return new Plane(entity.name, placementRef)
  }

  // For CylindricalSurface, transform the placement and apply scale to radius
  if (entity instanceof CylindricalSurface) {
    const position = entity.position.resolve(sourceRepo)
    const copiedPosition = copyEntity(position, sourceRepo, targetRepo, transform) as Axis2Placement3D
    const positionRef = targetRepo.add(copiedPosition)
    const scaledRadius = entity.radius * (transform?.scale || 1)
    return new CylindricalSurface(entity.name, positionRef, scaledRadius)
  }

  // For Axis2Placement3D, transform the location point
  if (entity instanceof Axis2Placement3D) {
    const newLocation = transformPoint(entity.location.resolve(sourceRepo), transform)
    const newLocationRef = targetRepo.add(newLocation)
    
    let newAxis = entity.axis
    let newRefDir = entity.refDirection
    
    if (entity.axis) {
      const axis = entity.axis.resolve(sourceRepo)
      const copiedAxis = new Direction(axis.name, axis.dx, axis.dy, axis.dz)
      newAxis = targetRepo.add(copiedAxis)
    }
    
    if (entity.refDirection) {
      const refDir = entity.refDirection.resolve(sourceRepo)
      const copiedRefDir = new Direction(refDir.name, refDir.dx, refDir.dy, refDir.dz)
      newRefDir = targetRepo.add(copiedRefDir)
    }
    
    return new Axis2Placement3D(entity.name, newLocationRef, newAxis, newRefDir)
  }

  // For other entity types, log a warning and return a copy
  // This is a fallback - most geometry should be handled above
  console.warn(`Unhandled entity type in copyEntity: ${entity.type}. Returning original entity.`)
  return entity
}

/**
 * Type guard to check if an entity is a Curve (Line or Circle)
 */
function isCurve(entity: Entity): entity is Curve {
  return entity instanceof Line || entity instanceof Circle
}

/**
 * Type guard to check if an entity is a Surface (Plane or CylindricalSurface)
 */
function isSurface(entity: Entity): entity is Surface {
  return entity instanceof Plane || entity instanceof CylindricalSurface
}

/**
 * Merges STEP file content into the target repository
 * 
 * This implementation:
 * 1. Parses the external STEP file using parseRepository
 * 2. Finds all ManifoldSolidBrep entities (the main solid bodies)
 * 3. Recursively copies these entities and their dependencies to the target repository
 * 4. Applies coordinate transformations (position, rotation, scale)
 * 
 * @param stepContent - The STEP file content as a string
 * @param targetRepo - The repository to merge entities into
 * @param transform - Optional transformation to apply (pose and scale)
 * @returns Array of references to merged solid entities
 */
export function mergeStepFile(
  stepContent: string,
  targetRepo: Repository,
  transform?: StepTransform
): Ref<ManifoldSolidBrep>[] {
  const solids: Ref<ManifoldSolidBrep>[] = []

  try {
    // Parse the external STEP file
    const sourceRepo = parseRepository(stepContent)
    
    console.log(`Parsed external STEP file, found ${sourceRepo.entries().length} entities`)
    
    // Find all ManifoldSolidBrep entities (these are the main solid bodies)
    const entries = sourceRepo.entries()
    for (const [entityId, entity] of entries) {
      if (entity.type === "MANIFOLD_SOLID_BREP") {
        console.log(`Found MANIFOLD_SOLID_BREP at #${entityId}`)
        
        // Get the solid
        const solid = entity as unknown as ManifoldSolidBrepClass
        
        // Copy the shell and all its dependencies
        const shellEntity = solid.outer.resolve(sourceRepo)
        
        // Recursively copy all faces in the shell
        if (shellEntity.type === "CLOSED_SHELL") {
          const shell = shellEntity as unknown as ClosedShell
          const newFaces: Ref<AdvancedFace>[] = []
          
          for (const faceRef of shell.faces) {
            const face = faceRef.resolve(sourceRepo) as AdvancedFace
            
            // Copy the face and its geometry
            const copiedFace = copyFaceWithTransform(
              face,
              sourceRepo,
              targetRepo,
              transform
            )
            newFaces.push(copiedFace)
          }
          
          // Create new shell with copied faces
          const newShell = targetRepo.add(new ClosedShell(shell.name, newFaces))
          
          // Create new solid
          const newSolid = targetRepo.add(
            new ManifoldSolidBrepClass(solid.name, newShell)
          )
          
          solids.push(newSolid)
          console.log(`Merged solid #${entityId} as #${newSolid.id}`)
        }
      }
    }
    
    console.log(`Successfully merged ${solids.length} solid(s) from external STEP file`)
    
  } catch (error) {
    console.error(`Failed to merge STEP file: ${error}`)
    console.error(error)
    // Continue without the external model rather than failing completely
  }

  return solids
}

/**
 * Copies a face and applies transformations to its geometry
 */
function copyFaceWithTransform(
  face: AdvancedFace,
  sourceRepo: Repository,
  targetRepo: Repository,
  transform?: StepTransform
): Ref<AdvancedFace> {
  // Copy the surface geometry
  const surface = face.surface.resolve(sourceRepo)
  const copiedSurface = copyEntity(surface, sourceRepo, targetRepo, transform)
  
  if (!isSurface(copiedSurface)) {
    throw new Error(`Expected Surface entity but got ${copiedSurface.type}`)
  }
  
  const surfaceRef = targetRepo.add(copiedSurface) as Ref<Surface>
  
  // Copy all bounds (edges)
  const newBounds: Ref<FaceOuterBound>[] = []
  
  for (const boundRef of face.bounds) {
    const bound = boundRef.resolve(sourceRepo) as FaceOuterBound
    
    // Copy the edge loop
    const edgeLoop = bound.bound.resolve(sourceRepo) as EdgeLoop
    const newEdges: Ref<OrientedEdge>[] = []
    
    if (edgeLoop.type === "EDGE_LOOP") {
      for (const edgeRef of edgeLoop.edges) {
        const edge = edgeRef.resolve(sourceRepo) as OrientedEdge
        
        // Copy the edge curve
        const edgeCurve = edge.edge.resolve(sourceRepo) as EdgeCurve
        
        // Copy start and end vertices with transformation
        const startVertex = edgeCurve.start.resolve(sourceRepo) as VertexPoint
        const endVertex = edgeCurve.end.resolve(sourceRepo) as VertexPoint
        
        const startPoint = startVertex.pnt.resolve(sourceRepo)
        const endPoint = endVertex.pnt.resolve(sourceRepo)
        
        const newStartPoint = transformPoint(startPoint, transform)
        const newEndPoint = transformPoint(endPoint, transform)
        
        const newStartPointRef = targetRepo.add(newStartPoint)
        const newEndPointRef = targetRepo.add(newEndPoint)
        
        const newStartVertex = targetRepo.add(new VertexPoint(startVertex.name, newStartPointRef))
        const newEndVertex = targetRepo.add(new VertexPoint(endVertex.name, newEndPointRef))
        
        // Copy the curve geometry
        const curveGeom = edgeCurve.curve.resolve(sourceRepo)
        const copiedCurveGeom = copyEntity(curveGeom, sourceRepo, targetRepo, transform)
        
        if (!isCurve(copiedCurveGeom)) {
          throw new Error(`Expected Curve entity but got ${copiedCurveGeom.type}`)
        }
        
        const curveGeomRef = targetRepo.add(copiedCurveGeom) as Ref<Curve>
        
        // Create new edge curve
        const newEdgeCurve = targetRepo.add(
          new EdgeCurve(
            edgeCurve.name,
            newStartVertex,
            newEndVertex,
            curveGeomRef,
            edgeCurve.sameSense
          )
        )
        
        // Create new oriented edge
        const newOrientedEdge = targetRepo.add(
          new OrientedEdge(
            edge.name,
            newEdgeCurve,
            edge.orientation
          )
        )
        
        newEdges.push(newOrientedEdge)
      }
      
      // Create new edge loop
      const newEdgeLoop = targetRepo.add(new EdgeLoop(edgeLoop.name, newEdges))
      
      // Create new bound (all bounds in AdvancedFace are FaceOuterBound)
      const newBound = targetRepo.add(
        new FaceOuterBound(bound.name, newEdgeLoop, bound.sameSense)
      )
      newBounds.push(newBound)
    }
  }
  
  // Create new face
  const newFace = targetRepo.add(
    new AdvancedFace(face.name, newBounds, surfaceRef, face.sameSense)
  )
  
  return newFace
}

/**
 * Fetches and merges a STEP file from a URL into the target repository
 * 
 * @param stepUrl - The URL or local path to the STEP file
 * @param targetRepo - The repository to merge entities into
 * @param transform - Optional transformation to apply (pose and scale)
 * @returns Array of references to merged solid entities
 */
export async function fetchAndMergeStepFile(
  stepUrl: string,
  targetRepo: Repository,
  transform?: StepTransform
): Promise<Ref<ManifoldSolidBrep>[]> {
  try {
    const stepContent = await fetchStepFile(stepUrl)
    return mergeStepFile(stepContent, targetRepo, transform)
  } catch (error) {
    console.warn(`Failed to fetch and merge STEP file from ${stepUrl}: ${error}`)
    return []
  }
}
