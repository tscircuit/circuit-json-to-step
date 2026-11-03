import type { PushButtonProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["pin1"],
  pin2: ["pin2"],
} as const

export const TS_1088_AR02016 = (props: PushButtonProps<typeof pinLabels>) => {
  const { name = "SW1", ...restProps } = props

  return (
    <pushbutton
      name={name}
      pinLabels={pinLabels}
      supplierPartNumbers={{
        jlcpcb: ["C720477"],
      }}
      manufacturerPartNumber="TS-1088-AR02016"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-2.184908mm"
            pcbY="0mm"
            width="1.229995mm"
            height="1.8599912mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="2.184908mm"
            pcbY="0mm"
            width="1.229995mm"
            height="1.8599912mm"
            shape="rect"
          />
          <courtyardoutline
            outline={[
              { x: -3.049905499999909, y: 1.700009800000089 },
              { x: 3.049905499999795, y: 1.700009800000089 },
              { x: 3.049905499999795, y: -1.6999843999999484 },
              { x: -3.049905499999909, y: -1.6999843999999484 },
              { x: -3.049905499999909, y: 1.700009800000089 },
            ]}
          />
        </footprint>
      }
      {...restProps}
    />
  )
}
