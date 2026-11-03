import type { LedProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["cathode", "neg"],
  pin2: ["anode", "pos"],
} as const

export const LTST_C190TBKT = (props: LedProps) => {
  const { name = "LED1", ...restProps } = props

  return (
    <led
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C125096"],
      }}
      manufacturerPartNumber="LTST-C190TBKT"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin2", "anode", "pos"]}
            pcbX="0.7489952mm"
            pcbY="0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin1", "cathode", "neg"]}
            pcbX="-0.7489952mm"
            pcbY="-0.000127mm"
            width="0.7999984mm"
            height="0.7999984mm"
            shape="rect"
          />
          <fabricationnotepath
            route={[
              { x: -1.07000040000014, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: 0.061518800000044394 },
              { x: -0.5299964000000728, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: -0.06847839999988992 },
              { x: -1.07000040000014, y: 0.061518800000044394 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.7345679999998538, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: 0.2729229999999916 },
              { x: 0.864539799999875, y: -0.26708099999996193 },
              { x: 0.7345679999998538, y: -0.26708099999996193 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <fabricationnotepath
            route={[
              { x: 0.5289295999999695, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: 0.06837679999989632 },
              { x: 1.0689336000000367, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: -0.0616203999999243 },
              { x: 0.5289295999999695, y: 0.06837679999989632 },
            ]}
            strokeWidth="0mm"
            isFilled
            hasStroke={false}
          />
          <courtyardoutline
            outline={[
              { x: -1.3989943999999923, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: 0.6599813999999924 },
              { x: 1.3989943999998786, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: -0.6600067999999055 },
              { x: -1.3989943999999923, y: 0.6599813999999924 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}
