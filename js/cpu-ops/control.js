var GameboyJS;
(function (GameboyJS) {
"use strict";

// Control flow operations (JP, JR, CALL, RET, RST, etc.)

GameboyJS.cpuOps = GameboyJS.cpuOps || {};
GameboyJS.cpuOps.control = {
    // Jump operations
    JPnn:   function(p) {p.wr('pc', (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc)); p.clock.c += 16;},
    JRccn:  function(p, cc) {if (GameboyJS.Util.testFlag(p, cc)) {var v = p.memory.rb(p.r.pc++); v = GameboyJS.Util.getSignedValue(v); p.r.pc += v; p.clock.c += 4;} else {p.r.pc++;} p.clock.c += 8;},
    JPccnn: function(p, cc) {if (GameboyJS.Util.testFlag(p, cc)) {p.wr('pc', (p.memory.rb(p.r.pc + 1) << 8) + p.memory.rb(p.r.pc)); p.clock.c += 4;} else {p.r.pc += 2;} p.clock.c += 12;},
    JPrr:   function(p, r1, r2) {p.r.pc = (p.r[r1] << 8) + p.r[r2]; p.clock.c += 4;},
    JRn:    function(p) {var v = p.memory.rb(p.r.pc++); v = GameboyJS.Util.getSignedValue(v); p.r.pc += v; p.clock.c += 12;},
    
    // Call operations
    CALLnn: function(p) {GameboyJS.cpuOps.control._CALLnn(p); p.clock.c += 24;},
    CALLccnn:function(p, cc) {if (GameboyJS.Util.testFlag(p, cc)) {GameboyJS.cpuOps.control._CALLnn(p); p.clock.c += 12;} else {p.r.pc += 2;} p.clock.c += 12; },
    _CALLnn:function(p){p.wr('sp', p.r.sp - 1); p.memory.wb(p.r.sp, ((p.r.pc + 2) & 0xFF00) >> 8);
        p.wr('sp', p.r.sp - 1); p.memory.wb(p.r.sp, (p.r.pc + 2) & 0x00FF);
        var j = p.memory.rb(p.r.pc) + (p.memory.rb(p.r.pc + 1) << 8); p.r.pc = j;},
    
    // Return operations
    RET:    function(p) {p.r.pc = p.memory.rb(p.r.sp); p.wr('sp', p.r.sp + 1); p.r.pc += p.memory.rb(p.r.sp) << 8; p.wr('sp', p.r.sp + 1); p.clock.c += 16;},
    RETcc:  function(p, cc) {if (GameboyJS.Util.testFlag(p, cc)) {p.r.pc = p.memory.rb(p.r.sp); p.wr('sp', p.r.sp + 1); p.r.pc += p.memory.rb(p.r.sp) << 8; p.wr('sp', p.r.sp + 1); p.clock.c += 12;} p.clock.c += 8;},
    RETI:   function(p) {p.enableInterrupts(); GameboyJS.cpuOps.control.RET(p);},
    
    // Reset operation
    RSTn:   function(p, n) {p.wr('sp', p.r.sp - 1); p.memory.wb(p.r.sp, p.r.pc >> 8); p.wr('sp', p.r.sp - 1); p.memory.wb(p.r.sp, p.r.pc & 0xFF); p.r.pc = n; p.clock.c += 16;},
    
    // CB prefix operation (for extended opcodes)
    CB:     function(p) {var opcode = p.memory.rb(p.r.pc++);
        GameboyJS.opcodeCbmap[opcode](p);
        p.clock.c += 4;}
};

}(GameboyJS || (GameboyJS = {})));