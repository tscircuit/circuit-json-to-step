import type { ChipProps } from "@tscircuit/props"

const pinLabels = {
  pin1: ["GND1"],
  pin2: ["3V3"],
  pin3: ["EN"],
  pin4: ["IO4"],
  pin5: ["IO5"],
  pin6: ["IO6"],
  pin7: ["IO7"],
  pin8: ["IO15"],
  pin9: ["IO16"],
  pin10: ["IO17"],
  pin11: ["IO18"],
  pin12: ["IO8"],
  pin13: ["IO19"],
  pin14: ["IO20"],
  pin15: ["IO3"],
  pin16: ["IO46"],
  pin17: ["IO9"],
  pin18: ["IO10"],
  pin19: ["IO11"],
  pin20: ["IO12"],
  pin21: ["IO13"],
  pin22: ["IO14"],
  pin23: ["IO21"],
  pin24: ["IO47"],
  pin25: ["IO48"],
  pin26: ["IO45"],
  pin27: ["IO0"],
  pin28: ["IO35"],
  pin29: ["IO36"],
  pin30: ["IO37"],
  pin31: ["IO38"],
  pin32: ["IO39"],
  pin33: ["IO40"],
  pin34: ["IO41"],
  pin35: ["IO42"],
  pin36: ["RXD0"],
  pin37: ["TXD0"],
  pin38: ["IO2"],
  pin39: ["IO1"],
  pin40: ["GND2"],
  pin41: ["EP"],
} as const

const pinAttributes = {
  pin1: { requiresGround: true },
  pin2: { requiresPower: true },
  pin41: { requiresGround: true },
  pin40: { requiresGround: true },
} as const

export const ESP32_S3_WROOM_1_N8 = (props: ChipProps<typeof pinLabels>) => {
  return (
    <chip
      pinLabels={pinLabels}
      pinAttributes={pinAttributes}
      supplierPartNumbers={{
        jlcpcb: ["C2913198"],
      }}
      manufacturerPartNumber="ESP32-S3-WROOM-1-N8"
      footprint={
        <footprint>
          <smtpad
            portHints={["pin1"]}
            pcbX="-8.899779mm"
            pcbY="9.1046427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin2"]}
            pcbX="-8.899779mm"
            pcbY="7.8346427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin3"]}
            pcbX="-8.899779mm"
            pcbY="6.5646427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin4"]}
            pcbX="-8.899779mm"
            pcbY="5.2946427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin5"]}
            pcbX="-8.899779mm"
            pcbY="4.0246427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin6"]}
            pcbX="-8.899779mm"
            pcbY="2.7546427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin7"]}
            pcbX="-8.899779mm"
            pcbY="1.4846427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin8"]}
            pcbX="-8.899779mm"
            pcbY="0.2146427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin9"]}
            pcbX="-8.899779mm"
            pcbY="-1.0553573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin10"]}
            pcbX="-8.899779mm"
            pcbY="-2.3253573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin11"]}
            pcbX="-8.899779mm"
            pcbY="-3.5953573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin12"]}
            pcbX="-8.899779mm"
            pcbY="-4.8653573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin13"]}
            pcbX="-8.899779mm"
            pcbY="-6.1353573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin14"]}
            pcbX="-8.899779mm"
            pcbY="-7.4053573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin15"]}
            pcbX="-6.984873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin16"]}
            pcbX="-5.714873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin17"]}
            pcbX="-4.444873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin18"]}
            pcbX="-3.174873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin19"]}
            pcbX="-1.904873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin20"]}
            pcbX="-0.634873mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin21"]}
            pcbX="0.635127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin22"]}
            pcbX="1.905127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin23"]}
            pcbX="3.175127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin24"]}
            pcbX="4.445127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin25"]}
            pcbX="5.715127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin26"]}
            pcbX="6.985127mm"
            pcbY="-8.8046433mm"
            width="0.8999982mm"
            height="1.499997mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin27"]}
            pcbX="8.899779mm"
            pcbY="-7.4053573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin28"]}
            pcbX="8.899779mm"
            pcbY="-6.1353573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin29"]}
            pcbX="8.899779mm"
            pcbY="-4.8653573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin30"]}
            pcbX="8.899779mm"
            pcbY="-3.5953573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin31"]}
            pcbX="8.899779mm"
            pcbY="-2.3253573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin32"]}
            pcbX="8.899779mm"
            pcbY="-1.0553573mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin33"]}
            pcbX="8.899779mm"
            pcbY="0.2146427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin34"]}
            pcbX="8.899779mm"
            pcbY="1.4846427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin35"]}
            pcbX="8.899779mm"
            pcbY="2.7546427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin36"]}
            pcbX="8.899779mm"
            pcbY="4.0246427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin37"]}
            pcbX="8.899779mm"
            pcbY="5.2946427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin38"]}
            pcbX="8.899779mm"
            pcbY="6.5646427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin39"]}
            pcbX="8.899779mm"
            pcbY="7.8346427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin40"]}
            pcbX="8.899779mm"
            pcbY="9.1046427mm"
            width="1.499997mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-1.499489mm"
            pcbY="1.3850747mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-2.899537mm"
            pcbY="1.3850747mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-0.099441mm"
            pcbY="1.3850747mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-0.099441mm"
            pcbY="2.7851227mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-1.499489mm"
            pcbY="2.7851227mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-2.899537mm"
            pcbY="2.7851227mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-2.899537mm"
            pcbY="-0.0149733mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-1.499489mm"
            pcbY="-0.0149733mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <smtpad
            portHints={["pin41"]}
            pcbX="-0.099441mm"
            pcbY="-0.0149733mm"
            width="0.8999982mm"
            height="0.8999982mm"
            shape="rect"
          />
          <courtyardoutline
            outline={[
              { x: -9.899777500000027, y: 16.849954099999877 },
              { x: 9.899777500000027, y: 16.849954099999877 },
              { x: 9.899777500000027, y: -9.804641800000013 },
              { x: -9.899777500000027, y: -9.804641800000013 },
              { x: -9.899777500000027, y: 16.849954099999877 },
            ]}
          />
          <via
            connectsTo="net.GND"
            pcbX={-4.2}
            pcbY={1.385}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
          <via
            connectsTo="net.GND"
            pcbX={1.2}
            pcbY={1.385}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
          <via
            connectsTo="net.GND"
            pcbX={-1.5}
            pcbY={4.1}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
          <via
            connectsTo="net.GND"
            pcbX={-1.5}
            pcbY={-1.3}
            outerDiameter={0.6}
            holeDiameter={0.3}
            layers={["top", "bottom"]}
          />
        </footprint>
      }
      {...props}
    />
  )
}
