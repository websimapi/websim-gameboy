var GameboyJS;
(function (GameboyJS) {
    "use strict";

    // Main entry point for CPU operations
    // This file combines all operation groups

    // The operations have been split into logical groups based on function:
    // - memory.js: Memory operations (LD, PUSH, POP)
    // - arithmetic.js: Arithmetic operations (ADD, SUB, INC, DEC)
    // - logic.js: Logical operations (AND, OR, XOR)
    // - bit.js: Bit manipulation operations (BIT, SET, RES, SWAP, RL, RR)
    // - control.js: Control flow operations (JP, JR, CALL, RET)
    // - misc.js: Miscellaneous operations (DI, EI, DAA, CPL, etc.)

    // Combine all operation groups into a single object
    GameboyJS.cpuOps = GameboyJS.cpuOps || {};

    // We'll combine the modules manually rather than using object spread
    // for better browser compatibility
}(GameboyJS || (GameboyJS = {})));