var GameboyJS;
(function (GameboyJS) {
"use strict";

// Logic operations (AND, OR, XOR, CP, etc.)
// List of CPU operations
// Most operations have been factorized here to limit code redundancy
//
// How to read operations:
// Uppercase letters qualify the kind of operation (LD = LOAD, INC = INCREMENT, etc.)
// Lowercase letters are used to hint parameters :
// r = register, n = 1 memory byte, sp = sp register,
// a = suffix for memory address, i = bit index
// Example : LDrrar = LOAD operation with two-registers memory address
// as first parameter and one register value as second
//
// Underscore-prefixed functions are here to delegate the logic between similar operations,
// they should not be called from outside
//
// It's up to each operation to update the CPU clock
GameboyJS.cpuOps = GameboyJS.cpuOps || {};
GameboyJS.cpuOps.logic = {
    // OR operations
    ORr:    function(p, r1) {p.r.A |= p.r[r1]; p.r.F = (p.r.A == 0) ? 0x80 : 0x00; p.clock.c += 4;},
    ORn:    function(p) {p.r.A |= p.memory.rb(p.r.pc++); p.r.F = (p.r.A == 0) ? 0x80 : 0x00; p.clock.c += 8;},
    ORrra:  function(p, r1, r2) {p.r.A |= p.memory.rb((p.r[r1] << 8) + p.r[r2]); p.r.F = (p.r.A == 0) ? 0x80 : 0x00; p.clock.c += 8;},
    
    // AND operations
    ANDr:   function(p, r1) {p.r.A &= p.r[r1]; p.r.F = (p.r.A == 0) ? 0xA0 : 0x20; p.clock.c += 4;},
    ANDn:   function(p) {p.r.A &= p.memory.rb(p.r.pc++); p.r.F = (p.r.A == 0) ? 0xA0 : 0x20; p.clock.c += 8;},
    ANDrra: function(p, r1, r2) {p.r.A &= p.memory.rb(GameboyJS.Util.getRegAddr(p, r1, r2)); p.r.F = (p.r.A == 0) ? 0xA0 : 0x20; p.clock.c += 8;},
    
    // XOR operations
    XORr:   function(p, r1) {p.r.A ^= p.r[r1]; p.r.F = (p.r.A == 0) ? 0x80 : 0x00; p.clock.c += 4;},
    XORn:   function(p) {p.r.A ^= p.memory.rb(p.r.pc++); p.r.F = (p.r.A == 0) ? 0x80 : 0x00; p.clock.c += 8;},
    XORrra: function(p, r1, r2) {p.r.A ^= p.memory.rb((p.r[r1] << 8) + p.r[r2]); p.r.F = (p.r.A == 0) ? 0x80 : 0x00; p.clock.c += 8;},
    
    // Compare operations
    CPr:    function(p, r1) {var n = p.r[r1]; GameboyJS.cpuOps.logic._CPn(p, n); p.clock.c += 4;},
    CPn:    function(p) {var n = p.memory.rb(p.r.pc++); GameboyJS.cpuOps.logic._CPn(p, n); p.clock.c += 8;},
    CPrra:  function(p, r1, r2) {var n = p.memory.rb(GameboyJS.Util.getRegAddr(p, r1, r2)); GameboyJS.cpuOps.logic._CPn(p, n); p.clock.c += 8;},
    _CPn:   function(p, n) {var c = p.r.A < n; var z = p.r.A == n; var h = (p.r.A & 0xF) < (n & 0xF);
        var f = 0x40; if (z) f += 0x80; if (h) f += 0x20; if (c) f += 0x10; p.r.F = f;}
};

}(GameboyJS || (GameboyJS = {})));