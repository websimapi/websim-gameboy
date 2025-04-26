var GameboyJS;
(function (GameboyJS) {
    "use strict";

    // Memory operations (LD, PUSH, POP, etc.)

    GameboyJS.cpuOps = GameboyJS.cpuOps || {};
    GameboyJS.cpuOps.memory = {
        // Load operations
        LDrrnn: function(p, r1, r2) {p.wr(r2, p.memory.rb(p.r.pc));p.wr(r1, p.memory.rb(p.r.pc+1)); p.r.pc+=2;p.clock.c += 12;},
        LDrrar: function(p, r1, r2, r3) {GameboyJS.cpuOps.memory._LDav(p, GameboyJS.Util.getRegAddr(p, r1, r2), p.r[r3]);p.clock.c += 8;},
        LDrrra: function(p, r1, r2, r3) {p.wr(r1, p.memory.rb(GameboyJS.Util.getRegAddr(p, r2, r3)));p.clock.c += 8;},
        LDrn:   function(p, r1) {p.wr(r1, p.memory.rb(p.r.pc++));p.clock.c += 8;},
        LDrr:   function(p, r1, r2) {p.wr(r1, p.r[r2]);p.clock.c += 4;},
        LDrar:  function(p, r1, r2) {p.memory.wb(p.r[r1]+0xFF00, p.r[r2]);p.clock.c += 8;},
        LDrra:  function(p, r1, r2) {p.wr(r1, p.memory.rb(p.r[r2]+0xFF00));p.clock.c += 8;},
        LDspnn: function(p) {p.wr('sp', (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc));p.r.pc+=2;p.clock.c += 12;},
        LDsprr: function(p, r1, r2) {p.wr('sp', GameboyJS.Util.getRegAddr(p, r1, r2));p.clock.c += 8;},
        LDnnar: function(p, r1) {var addr=(p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc);p.memory.wb(addr,p.r[r1]);p.r.pc+=2; p.clock.c += 16;},
        LDrnna: function(p, r1) {var addr=(p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc);p.wr(r1, p.memory.rb(addr));p.r.pc+=2; p.clock.c += 16;},
        LDrrspn:function(p, r1, r2) {var rel = p.memory.rb(p.r.pc++);rel=GameboyJS.Util.getSignedValue(rel);var val=p.r.sp + rel;
            var c = (p.r.sp&0xFF) + (rel&0xFF) > 0xFF;var h = (p.r.sp & 0xF) + (rel & 0xF) > 0xF;val &= 0xFFFF;
            var f = 0; if(h)f|=0x20;if(c)f|=0x10;p.wr('F', f);
            p.wr(r1, val >> 8);p.wr(r2, val&0xFF);
            p.clock.c+=12;},
        LDnnsp: function(p) {var addr = p.memory.rb(p.r.pc++) + (p.memory.rb(p.r.pc++)<<8); GameboyJS.cpuOps.memory._LDav(p, addr, p.r.sp & 0xFF);GameboyJS.cpuOps.memory._LDav(p, addr+1, p.r.sp >> 8);p.clock.c+=20;},
        LDrran: function(p, r1, r2){var addr = GameboyJS.Util.getRegAddr(p, r1, r2);GameboyJS.cpuOps.memory._LDav(p, addr, p.memory.rb(p.r.pc++));p.clock.c+=12;},
        _LDav:  function(p, addr, val){p.memory.wb(addr, val);},
        LDHnar: function(p, r1){p.memory.wb(0xFF00 + p.memory.rb(p.r.pc++), p.r[r1]);p.clock.c+=12;},
        LDHrna: function(p, r1){p.wr(r1, p.memory.rb(0xFF00 + p.memory.rb(p.r.pc++)));p.clock.c+=12;},
        
        // Stack operations
        PUSHrr: function(p, r1, r2) {p.wr('sp', p.r.sp - 1); p.memory.wb(p.r.sp, p.r[r1]); p.wr('sp', p.r.sp - 1); p.memory.wb(p.r.sp, p.r[r2]); p.clock.c += 16;},
        POPrr:  function(p, r1, r2) {p.wr(r2, p.memory.rb(p.r.sp)); p.wr('sp', p.r.sp + 1); p.wr(r1, p.memory.rb(p.r.sp)); p.wr('sp', p.r.sp + 1); p.clock.c += 12;}
    };

}(GameboyJS || (GameboyJS = {})));