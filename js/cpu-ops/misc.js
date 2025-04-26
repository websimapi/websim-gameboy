var GameboyJS;
(function (GameboyJS) {
"use strict";

// Miscellaneous operations (CPL, CCF, SCF, DAA, HALT, DI, EI, etc.)

GameboyJS.cpuOps = GameboyJS.cpuOps || {};
GameboyJS.cpuOps.misc = {
    CPL:    function(p) {p.wr('A', (~p.r.A) & 0xFF); p.r.F |= 0x60; p.clock.c += 4;},
    CCF:    function(p) {p.r.F &= 0x9F; p.r.F & 0x10 ? p.r.F &= 0xE0 : p.r.F |= 0x10; p.clock.c += 4;},
    SCF:    function(p) {p.r.F &= 0x9F; p.r.F |= 0x10; p.clock.c += 4;},
    DAA:    function(p) {
        var sub = (p.r.F & 0x40) ? 1 : 0; var h = (p.r.F & 0x20) ? 1 : 0; var c = (p.r.F & 0x10) ? 1 : 0;
        if (sub) {
            if (h) {
                p.r.A = (p.r.A - 0x6) & 0xFF;
            }
            if (c) {
                p.r.A -= 0x60;
            }
        } else {
            if ((p.r.A & 0xF) > 9 || h) {
                p.r.A += 0x6;
            }
            if (p.r.A > 0x9F || c) {
                p.r.A += 0x60;
            }
        }
        if (p.r.A & 0x100) c = 1;

        p.r.A &= 0xFF;
        p.r.F &= 0x40; if (p.r.A == 0) p.r.F |= 0x80; if (c) p.r.F |= 0x10;
        p.clock.c += 4;
    },
    HALT:   function(p) {p.halt(); p.clock.c += 4;},
    DI:     function(p) {p.disableInterrupts(); p.clock.c += 4;},
    EI:     function(p) {p.enableInterrupts(); p.clock.c += 4;}
};

}(GameboyJS || (GameboyJS = {})));

