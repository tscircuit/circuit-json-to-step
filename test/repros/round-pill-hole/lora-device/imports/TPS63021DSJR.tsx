import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["VINA"],
  pin2: ["GND"],
  pin3: ["FB"],
  pin4: ["VOUT1"],
  pin5: ["VOUT2"],
  pin6: ["L22"],
  pin7: ["L21"],
  pin8: ["L11"],
  pin9: ["L12"],
  pin10: ["VIN1"],
  pin11: ["VIN2"],
  pin12: ["EN"],
  pin13: ["PS", "SYNC"],
  pin14: ["PG"],
  pin15: ["PGND"],
} as const

const pinAttributes = {
  pin2: { requiresGround: true },
  pin10: { requiresPower: true },
  pin11: { requiresPower: true },
  pin15: { requiresGround: true },
} as const

export const TPS63021DSJR = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C202140"],
      }}
      manufacturerPartNumber="TPS63021DSJR"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-1.5000986mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-0.9999726mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-0.4998466mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="0.0000254mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="0.5001514mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="0.5001514mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="0.0000254mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="-0.4998466mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="-0.9999726mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="-1.5000986mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="1.5001494mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="1.0000234mm"
            pcbY="-1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="1.5001494mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="1.0000234mm"
            pcbY="1.450086mm"
            width="0.2500122mm"
            height="0.6999986mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin15"]}
            points={[
              { x: "-2.1999956mm", y: "0.7900162mm" },
              { x: "-2.1999956mm", y: "0.5900166mm" },
              { x: "-1.4299946mm", y: "0.5900166mm" },
              { x: "-1.4299946mm", y: "0.3300222mm" },
              { x: "-2.1999956mm", y: "0.3300222mm" },
              { x: "-2.1999956mm", y: "0.1300226mm" },
              { x: "-1.4299946mm", y: "0.1300226mm" },
              { x: "-1.4299946mm", y: "-0.1299718mm" },
              { x: "-2.1999956mm", y: "-0.1299718mm" },
              { x: "-2.1999956mm", y: "-0.3299714mm" },
              { x: "-1.4299946mm", y: "-0.3299714mm" },
              { x: "-1.4299946mm", y: "-0.5899658mm" },
              { x: "-2.1999956mm", y: "-0.5899658mm" },
              { x: "-2.1999956mm", y: "-0.7899654mm" },
              { x: "2.1999956mm", y: "-0.7899654mm" },
              { x: "2.1999956mm", y: "-0.5899658mm" },
              { x: "1.4299946mm", y: "-0.5899658mm" },
              { x: "1.4299946mm", y: "-0.3299714mm" },
              { x: "2.1999956mm", y: "-0.3299714mm" },
              { x: "2.1999956mm", y: "-0.1299718mm" },
              { x: "1.4299946mm", y: "-0.1299718mm" },
              { x: "1.4299946mm", y: "0.1300226mm" },
              { x: "2.1999956mm", y: "0.1300226mm" },
              { x: "2.1999956mm", y: "0.3300222mm" },
              { x: "1.4299946mm", y: "0.3300222mm" },
              { x: "1.4299946mm", y: "0.5900166mm" },
              { x: "2.1999956mm", y: "0.5900166mm" },
              { x: "2.1999956mm", y: "0.7900162mm" },
              { x: "-2.1999956mm", y: "0.7900162mm" },
            ]}
            shape="polygon"
          />
          <courtyardoutline
            outline={[
              { x: -2.4499955999999656, y: 2.050085299999978 },
              { x: 2.4499955999999656, y: 2.050085299999978 },
              { x: 2.4499955999999656, y: -2.0500853000000916 },
              { x: -2.4499955999999656, y: -2.0500853000000916 },
              { x: -2.4499955999999656, y: 2.050085299999978 },
            ]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
