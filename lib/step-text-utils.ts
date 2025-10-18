export function normalizeStepNumericExponents(stepText: string): string {
  return stepText.replace(
    /(-?(?:\d+\.\d*|\.\d+|\d+))e([+-]?\d+)/g,
    (_match, mantissa: string, exponent: string) => `${mantissa}E${exponent}`,
  )
}
