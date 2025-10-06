This project converts circuit json to step using `circuit-json` and `stepts` modules

- Use `bun` for all tests/scripts
- Create tests in `test/*` and use `import { test, expect } from 'bun:test'
- One test per file
- Create example circuit json in separate files, named after the test e.g. `test/basics/basics01/basics01.json`
- All tests should be enumerated in the name `basics01`, `basics02`, etc.
- There are references you can explore in `circuit-json` and `stepts`
- We only need to create the holes inside the outline of a circuit board to
  generate the STEP files
