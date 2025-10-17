export interface StepTransform {
  /** Pose (position and rotation) of the object in 3D space */
  pose?: {
    /** Position/translation in 3D space (in millimeters) */
    position?: { x?: number; y?: number; z?: number }
    /** Rotation angles around X, Y, Z axes (in degrees) */
    rotation?: { x?: number; y?: number; z?: number }
  }
  /** Uniform scale factor (1.0 = original size, 2.0 = double size, etc.) */
  scale?: number
}
