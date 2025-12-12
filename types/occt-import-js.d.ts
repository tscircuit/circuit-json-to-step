declare module "occt-import-js" {
  export interface OcctMesh {
    attributes: {
      position: {
        array: Float32Array | number[]
      }
      normal?: {
        array: Float32Array | number[]
      }
    }
    index: {
      array: Uint32Array | number[]
    }
    name?: string
    color?: [number, number, number]
  }

  export interface OcctImportResult {
    success: boolean
    root: any
    meshes: OcctMesh[]
  }

  export interface OcctImport {
    ReadStepFile(
      content: ArrayBuffer | ArrayBufferView,
      params: any | null,
    ): OcctImportResult
  }

  const factory: () => Promise<OcctImport>
  export = factory
}
