import type { CapacitorProps, ResistorProps } from "@tscircuit/props"

const resistorParts: Record<string, string> = {
  "22": "RC0603FR-0722RL",
  "2.2k": "RC0603FR-072K2L",
  "3.24k": "RC0603FR-073K24L",
  "3.57k": "RC0603FR-073K57L",
  "5.1k": "RC0603FR-075K1L",
  "10k": "RC0603FR-0710KL",
  "100k": "RC0603FR-07100KL",
  "1M": "RC0603FR-071ML",
}

const capacitorParts: Record<string, { mpn: string; voltage: string }> = {
  "100nF": { mpn: "C0603C104K5RACTU", voltage: "50V" },
  "1uF": { mpn: "GRM188R61A105KA61D", voltage: "10V" },
  "10uF": { mpn: "GRM21BR61C106KE15L", voltage: "16V" },
  "22uF": { mpn: "GRM21BR61A226ME44L", voltage: "10V" },
}

export const R = (props: ResistorProps) => (
  <resistor
    schRotation={-90}
    pcbStyle={{ silkscreenTextVisibility: "hidden" }}
    supplierPartNumbers={{}}
    manufacturerPartNumber={resistorParts[String(props.resistance)]}
    {...props}
    footprint={`${typeof props.footprint === "string" ? props.footprint : "0603"}_nosilkscreen`}
  />
)

export const C = (props: CapacitorProps) => (
  <capacitor
    schRotation={-90}
    pcbStyle={{ silkscreenTextVisibility: "hidden" }}
    supplierPartNumbers={{}}
    manufacturerPartNumber={capacitorParts[String(props.capacitance)]?.mpn}
    maxVoltageRating={capacitorParts[String(props.capacitance)]?.voltage}
    {...props}
    footprint={`${typeof props.footprint === "string" ? props.footprint : "0603"}_nosilkscreen`}
  />
)
