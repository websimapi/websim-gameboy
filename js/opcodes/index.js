var GameboyJS;
(function (GameboyJS) {
"use strict";

// Main entry point for opcode mapping
// This file combines standard opcodes and CB-prefixed opcodes

// Import maps from their respective modules
GameboyJS.opcodeMap = GameboyJS.opcodes.map;
GameboyJS.opcodeCbmap = GameboyJS.opcodes.cbmap;

}(GameboyJS || (GameboyJS = {})));