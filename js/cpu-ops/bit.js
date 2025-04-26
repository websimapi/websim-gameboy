var GameboyJS;
(function (GameboyJS) {
"use strict";

// Bit manipulation operations (BIT, SET, RES, SWAP, RL, RR, etc.)

GameboyJS.cpuOps = GameboyJS.cpuOps || {};
GameboyJS.cpuOps.bit = {
    // Rotate right operations
    RRCr:   function(p, r1) {p.r.F = 0; var out = p.r[r1] & 0x01; if (out) p.r.F |= 0x10; p.r[r1] = (p.r[r1] >> 1) | (out * 0x80); if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    RRCrra: function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); p.r.F = 0; var out = p.memory.rb(addr) & 0x01; if (out) p.r.F |= 0x10; p.memory.wb(addr, (p.memory.rb(addr) >> 1) | (out * 0x80)); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    RRr:    function(p, r1) {var c = (p.r.F & 0x10) ? 1 : 0; p.r.F = 0; var out = p.r[r1] & 0x01; out ? p.r.F |= 0x10 : p.r.F &= 0xEF; p.r[r1] = (p.r[r1] >> 1) | (c * 0x80); if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    RRrra:  function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); var c = (p.r.F & 0x10) ? 1 : 0; p.r.F = 0; var out = p.memory.rb(addr) & 0x01; out ? p.r.F |= 0x10 : p.r.F &= 0xEF; p.memory.wb(addr, (p.memory.rb(addr) >> 1) | (c * 0x80)); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    
    // Rotate left operations
    RLCr:   function(p, r1) {p.r.F = 0; var out = p.r[r1] & 0x80 ? 1 : 0; if (out) p.r.F |= 0x10; p.r[r1] = ((p.r[r1] << 1) + out) & 0xFF; if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    RLCrra: function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); p.r.F = 0; var out = p.memory.rb(addr) & 0x80 ? 1 : 0; if (out) p.r.F |= 0x10; p.memory.wb(addr, ((p.memory.rb(addr) << 1) + out) & 0xFF); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    RLr:    function(p, r1) {var c = (p.r.F & 0x10) ? 1 : 0; p.r.F = 0; var out = p.r[r1] & 0x80; out ? p.r.F |= 0x10 : p.r.F &= 0xEF; p.r[r1] = ((p.r[r1] << 1) + c) & 0xFF; if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    RLrra:  function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); var c = (p.r.F & 0x10) ? 1 : 0; p.r.F = 0; var out = p.memory.rb(addr) & 0x80; out ? p.r.F |= 0x10 : p.r.F &= 0xEF; p.memory.wb(addr, ((p.memory.rb(addr) << 1) + c) & 0xFF); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    
    // Shift operations
    SRAr:   function(p, r1) {p.r.F = 0; if (p.r[r1] & 0x01) p.r.F |= 0x10; var msb = p.r[r1] & 0x80; p.r[r1] = (p.r[r1] >> 1) | msb; if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    SRArra: function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); p.r.F = 0; if (p.memory.rb(addr) & 0x01) p.r.F |= 0x10; var msb = p.memory.rb(addr) & 0x80; p.memory.wb(addr, (p.memory.rb(addr) >> 1) | msb); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    SLAr:   function(p, r1) {p.r.F = 0; if (p.r[r1] & 0x80) p.r.F |= 0x10; p.r[r1] = (p.r[r1] << 1) & 0xFF; if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    SLArra: function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); p.r.F = 0; if (p.memory.rb(addr) & 0x80) p.r.F |= 0x10; p.memory.wb(addr, (p.memory.rb(addr) << 1) & 0xFF); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    SRLr:   function(p, r1) {p.r.F = 0; if (p.r[r1] & 0x01) p.r.F |= 0x10; p.r[r1] = p.r[r1] >> 1; if (p.r[r1] == 0) p.r.F |= 0x80; p.clock.c += 4;},
    SRLrra: function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); p.r.F = 0; if (p.memory.rb(addr) & 0x01) p.r.F |= 0x10; p.memory.wb(addr, p.memory.rb(addr) >> 1); if (p.memory.rb(addr) == 0) p.r.F |= 0x80; p.clock.c += 12;},
    
    // Bit test, set, reset operations
    BITir:  function(p, i, r1) {var mask = 1 << i; var z = (p.r[r1] & mask) ? 0 : 1; var f = p.r.F & 0x10; f |= 0x20; if (z) f |= 0x80; p.r.F = f; p.clock.c += 4;},
    BITirra:function(p, i, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); var mask = 1 << i; var z = (p.memory.rb(addr) & mask) ? 0 : 1; var f = p.r.F & 0x10; f |= 0x20; if (z) f |= 0x80; p.r.F = f; p.clock.c += 8;},
    SETir:  function(p, i, r1) {var mask = 1 << i; p.r[r1] |= mask; p.clock.c += 4;},
    SETirra:function(p, i, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); var mask = 1 << i; p.memory.wb(addr, p.memory.rb(addr) | mask); p.clock.c += 12;},
    RESir:  function(p, i, r1) {var mask = 0xFF - (1 << i); p.r[r1] &= mask; p.clock.c += 4;},
    RESirra:function(p, i, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2); var mask = 0xFF - (1 << i); p.memory.wb(addr, p.memory.rb(addr) & mask); p.clock.c += 12;},
    
    // Swap operation
    SWAPr:  function(p, r1) {p.r[r1] = GameboyJS.cpuOps.bit._SWAPn(p, p.r[r1]); p.clock.c += 4;},
    SWAPrra:function(p, r1, r2){var addr = (p.r[r1] << 8) + p.r[r2]; p.memory.wb(addr, GameboyJS.cpuOps.bit._SWAPn(p, p.memory.rb(addr))); p.clock.c += 12;},
    _SWAPn: function(p, n){p.r.F = n == 0 ? 0x80 : 0; return ((n & 0xF0) >> 4) | ((n & 0x0F) << 4;}
};

}(GameboyJS || (GameboyJS = {})));