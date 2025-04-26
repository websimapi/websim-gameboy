var GameboyJS;
(function (GameboyJS) {
"use strict";

// Arithmetic operations (ADD, SUB, INC, DEC, etc.)

GameboyJS.cpuOps = GameboyJS.cpuOps || {};
GameboyJS.cpuOps.arithmetic = {
    // Addition operations
    ADDrr:  function(p, r1, r2) {var n = p.r[r2]; GameboyJS.cpuOps.arithmetic._ADDrn(p, r1, n); p.clock.c += 4;},
    ADDrn:  function(p, r1) {var n = p.memory.rb(p.r.pc++); GameboyJS.cpuOps.arithmetic._ADDrn(p, r1, n); p.clock.c+=8;},
    _ADDrn: function(p, r1, n) {var h=((p.r[r1]&0xF)+(n&0xF))&0x10;p.wr(r1, p.r[r1]+n);var c=p.r[r1]&0x100;p.r[r1]&=0xFF;
            var f = 0;if (p.r[r1]==0)f|=0x80;if (h)f|=0x20;if (c)f|=0x10;p.wr('F', f);},
    ADDrrrr:function(p, r1, r2, r3, r4) {GameboyJS.cpuOps.arithmetic._ADDrrn(p, r1, r2, (p.r[r3]<<8) + p.r[r4]); p.clock.c+=8;},
    ADDrrsp:function(p, r1, r2) {GameboyJS.cpuOps.arithmetic._ADDrrn(p, r1, r2, p.r.sp); p.clock.c += 8;},
    ADDspn: function(p) {var v = p.memory.rb(p.r.pc++);v = GameboyJS.Util.getSignedValue(v);
        var c = ((p.r.sp&0xFF) + (v&0xFF)) > 0xFF; var h = (p.r.sp & 0xF) + (v&0xF) > 0xF;
        var f = 0; if(h)f|=0x20;if(c)f|=0x10;p.wr('F', f);
        p.wr('sp', (p.r.sp + v) & 0xFFFF);
        p.clock.c+=16;},
    _ADDrrn:function(p, r1, r2, n) {var v1 = (p.r[r1]<<8) + p.r[r2];var v2 = n;
        var res = v1 + v2;var c = res&0x10000;var h = ((v1&0xFFF) + (v2&0xFFF))&0x1000;var z = p.r.F&0x80;
        res&=0xFFFF;p.r[r2]=res&0xFF;res=res>>8;p.r[r1]=res&0xFF;
        var f=0;if(z)f|=0x80;if(h)f|=0x20;if(c)f|=0x10;p.r.F=f;},
    ADDrrra:function(p, r1, r2, r3) {var v = p.memory.rb(GameboyJS.Util.getRegAddr(p, r2, r3));var h = ((p.r[r1]&0xF) + (v&0xF)) & 0x10; p.wr(r1, p.r[r1] + v); var c = p.r[r1] & 0x100; p.r[r1] &= 0xFF;
        var f = 0; if (p.r[r1] == 0) f |= 0x80; if (h) f |= 0x20; if (c) f |= 0x10; p.wr('F', f);
        p.clock.c += 8;},
    
    // Add with carry operations
    ADCrr:  function(p, r1, r2) {var n = p.r[r2]; GameboyJS.cpuOps.arithmetic._ADCrn(p, r1, n); p.clock.c += 4;},
    ADCrn:  function(p, r1) {var n = p.memory.rb(p.r.pc++); GameboyJS.cpuOps.arithmetic._ADCrn(p, r1, n); p.clock.c += 8;},
    _ADCrn: function(p, r1, n) {
        var c = (p.r.F&0x10) ? 1 : 0; var h = ((p.r[r1]&0xF) + (n&0xF) + c) & 0x10;
        p.wr(r1, p.r[r1] + n + c); c = p.r[r1] & 0x100; p.r[r1] &= 0xFF;
        var f = 0; if (p.r[r1] == 0) f |= 0x80; if (h) f |= 0x20; if (c) f |= 0x10; p.wr('F', f);
    },
    ADCrrra:function(p, r1, r2, r3) {var n = p.memory.rb(GameboyJS.Util.getRegAddr(p, r2, r3)); GameboyJS.cpuOps.arithmetic._ADCrn(p, r1, n); p.clock.c += 8;},
    
    // Increment operations
    INCrr:  function(p, r1, r2) {p.wr(r2, (p.r[r2]+1)&0xFF); if (p.r[r2] == 0) p.wr(r1, (p.r[r1]+1)&0xFF);p.clock.c += 8;},
    INCrra: function(p, r1, r2) {var addr = GameboyJS.Util.getRegAddr(p, r1, r2);var val = (p.memory.rb(addr)+1)&0xFF;var z = val==0;var h=(p.memory.rb(addr)&0xF)+1 > 0xF;
        p.memory.wb(addr, val);
        p.r.F&=0x10;if(h)p.r.F|=0x20;if(z)p.r.F|=0x80;
        p.clock.c+=12;},
    INCsp:  function(p){p.wr('sp', p.r.sp+1); p.r.sp &= 0xFFFF; p.clock.c+=8;},
    INCr:   function(p, r1) {var h = ((p.r[r1]&0xF) + 1)&0x10;p.wr(r1, (p.r[r1] + 1)&0xFF);var z = p.r[r1]==0;
        p.r.F&=0x10;if(h)p.r.F|=0x20;if(z)p.r.F|=0x80;
        p.clock.c += 4;},
    
    // Decrement operations
    DECrr:  function(p, r1, r2) {p.wr(r2, (p.r[r2] - 1) & 0xFF); if (p.r[r2] == 0xFF) p.wr(r1, (p.r[r1] - 1)&0xFF);p.clock.c += 8;},
    DECsp:  function(p){p.wr('sp', p.r.sp-1); p.r.sp &= 0xFFFF; p.clock.c+=8;},
    DECr:   function(p, r1) {var h = (p.r[r1]&0xF) < 1;p.wr(r1, (p.r[r1] - 1) & 0xFF);var z = p.r[r1]==0;
        p.r.F&=0x10;p.r.F|=0x40;if(h)p.r.F|=0x20;if(z)p.r.F|=0x80;
        p.clock.c += 4;},
    DECrra: function(p, r1, r2){var addr = GameboyJS.Util.getRegAddr(p, r1, r2);var val = (p.memory.rb(addr)-1)&0xFF;var z = val==0;var h=(p.memory.rb(addr)&0xF) < 1;
        p.memory.wb(addr, val);
        p.r.F&=0x10;p.r.F|=0x40;if(h)p.r.F|=0x20;if(z)p.r.F|=0x80;
        p.clock.c+=12;},
    
    // Subtraction operations
    SUBr:   function(p, r1) {var n = p.r[r1]; GameboyJS.cpuOps.arithmetic._SUBn(p, n); p.clock.c += 4;},
    SUBn:   function(p) {var n = p.memory.rb(p.r.pc++); GameboyJS.cpuOps.arithmetic._SUBn(p, n); p.clock.c += 8;},
    SUBrra: function(p, r1, r2) {var n = p.memory.rb(GameboyJS.Util.getRegAddr(p, r1, r2)); GameboyJS.cpuOps.arithmetic._SUBn(p, n); p.clock.c += 8;},
    _SUBn:  function(p, n) {var c = p.r.A < n; var h = (p.r.A & 0xF) < (n & 0xF);
        p.wr('A', p.r.A - n); p.r.A &= 0xFF; var z = p.r.A == 0;
        var f = 0x40; if (z) f |= 0x80; if (h) f |= 0x20; if (c) f |= 0x10; p.wr('F', f);},
    
    // Subtract with carry operations
    SBCn:   function(p) {var n = p.memory.rb(p.r.pc++); GameboyJS.cpuOps.arithmetic._SBCn(p, n); p.clock.c += 8;},
    SBCr:   function(p, r1) {var n = p.r[r1]; GameboyJS.cpuOps.arithmetic._SBCn(p, n); p.clock.c += 4;},
    SBCrra: function(p, r1, r2) {var v = p.memory.rb((p.r[r1] << 8) + p.r[r2])); GameboyJS.cpuOps.arithmetic._SBCn(p, v); p.clock.c += 8;},
    _SBCn:  function(p, n) {var carry = p.r.F & 0x10 ? 1 : 0;
        var c = p.r.A < n + carry; var h = (p.r.A & 0xF) < (n & 0xF) + carry;
        p.wr('A', p.r.A - n - carry); p.r.A &= 0xFF; var z = p.r.A == 0;
        var f = 0x40; if (z) f += 0x80; if (h) f += 0x20; if (c) f += 0x10; p.r.F = f;}
};

}(GameboyJS || (GameboyJS = {})));