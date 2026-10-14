export function normalizeStepNumericExponents(stepText: string): string {
  return stepText.replace(
    /(-?(?:\d+\.\d*|\.\d+|\d+))e([+-]?\d+)/g,
    (_match, mantissa: string, exponent: string) => `${mantissa}E${exponent}`,
  )
}

/** Accept STEP writers that put whitespace before an entity's semicolon. */
export function normalizeStepEntityTerminators(stepText: string): string {
  // Leave quoted strings (including escaped quotes) and comments untouched.
  return stepText.replace(
    /'(?:[^']|'')*'|\/\*[\s\S]*?\*\/|(\))\s+;/g,
    (match, closingParenthesis: string | undefined) =>
      closingParenthesis ? ");" : match,
  )
}
