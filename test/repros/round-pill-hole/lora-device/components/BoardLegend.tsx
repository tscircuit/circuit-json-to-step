// The current font renderer uses ~0.45 of fontSize for actual ink height.
// 2.5 mm yields >1 mm tall characters and >0.15 mm strokes in the Gerbers.
// Dense passive references remain on the assembly drawings rather than silk.
export function BoardLegend() {
  return (
    <>
      <silkscreentext text="LORA DEVICE" pcbX={0} pcbY={36} fontSize={2.5} />
      <silkscreentext
        text="865-867 MHz  REV C"
        pcbX={0}
        pcbY={32.5}
        fontSize={2.5}
      />
      <silkscreentext
        text="GPS SIDE TO SKY"
        pcbX={0}
        pcbY={28.5}
        fontSize={2.5}
      />
      <silkscreentext text="RST" pcbX={-11} pcbY={-3} fontSize={2.5} />
      <silkscreentext text="BOOT" pcbX={-3} pcbY={-3} fontSize={2.5} />
      <silkscreentext text="USER" pcbX={5} pcbY={-3} fontSize={2.5} />
      <silkscreentext text="PWR" pcbX={9.5} pcbY={-9} fontSize={2.3} />
      <silkscreentext text="CHG" pcbX={15} pcbY={-9} fontSize={2.3} />
      <silkscreentext text="LINK" pcbX={21} pcbY={-9} fontSize={2.3} />
      <silkscreentext text="+" pcbX={-21} pcbY={-4} fontSize={2.5} />
      <silkscreentext text="-" pcbX={-19} pcbY={-4} fontSize={2.5} />
      <silkscreentext text="T" pcbX={-17} pcbY={-4} fontSize={2.5} />
      <silkscreentext text="1S LiPo + NTC" pcbX={-12} pcbY={0} fontSize={2.5} />
      <silkscreentext
        text="TP1=TX TP2=RX TP3=GND"
        pcbX={0}
        pcbY={4}
        fontSize={2.5}
      />
      <silkscreentext text="USB" pcbX={18} pcbY={-30.9} fontSize={2.5} />
      <silkscreentext
        text="LORA IPEX"
        pcbX={17}
        pcbY={0}
        fontSize={2.5}
        layer="bottom"
      />
      <silkscreentext
        text="LORA DEVICE REV C"
        pcbX={0}
        pcbY={31}
        fontSize={2.5}
        layer="bottom"
      />
      {/* Cathode bars sit outside the LED pads. */}
      <silkscreenpath
        strokeWidth={0.2}
        route={[
          { x: 9.3, y: -6.1 },
          { x: 9.3, y: -4.9 },
        ]}
      />
      <silkscreenpath
        strokeWidth={0.2}
        route={[
          { x: 13.3, y: -6.1 },
          { x: 13.3, y: -4.9 },
        ]}
      />
      <silkscreenpath
        strokeWidth={0.2}
        route={[
          { x: 17.3, y: -6.1 },
          { x: 17.3, y: -4.9 },
        ]}
      />
    </>
  )
}
