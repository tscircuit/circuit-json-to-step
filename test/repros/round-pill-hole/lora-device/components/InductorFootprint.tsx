import type { InductorProps } from "@tscircuit/props"
export const InductorFootprint = (props: Omit<InductorProps, "inductance">) => (
  <inductor
    inductance="1.5uH"
    footprint={
      <footprint>
        <smtpad
          portHints={["1"]}
          pcbX="-1.185mm"
          pcbY="0mm"
          layer="top"
          width="0.98mm"
          height="3.4mm"
          shape="rect"
        />
        <smtpad
          portHints={["2"]}
          pcbX="1.185mm"
          pcbY="0mm"
          layer="top"
          width="0.98mm"
          height="3.4mm"
          shape="rect"
        />
        <courtyardrect width={4.8} height={4.8} />
      </footprint>
    }
    {...props}
  />
)
