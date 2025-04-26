var GameboyJS;
(function (GameboyJS) {
"use strict";

// Debug utilities
var Debug = {
    // Log CPU state
    logState: function(cpu) {
        console.log(`A: ${cpu.r.A.toString(16).padStart(2, '0')} F: ${cpu.r.F.toString(16).padStart(2, '0')} 
        B: ${cpu.r.B.toString(16).padStart(2, '0')} C: ${cpu.r.C.toString(16).padStart(2, '0')} 
        D: ${cpu.r.D.toString(16).padStart(2, '0')} E: ${cpu.r.E.toString(16).padStart(2, '0')} 
        H: ${cpu.r.H.toString(16).padStart(2, '0')} L: ${cpu.r.L.toString(16).padStart(2, '0')} 
        PC: ${cpu.r.pc.toString(16).padStart(4, '0')} SP: ${cpu.r.sp.toString(16).padStart(4, '0')}`);
    },
    
    // Log memory dump
    dumpMemory: function(memory, start, length) {
        var result = '';
        for (var i = 0; i < length; i += 16) {
            var line = (start + i).toString(16).padStart(4, '0') + ': ';
            for (var j = 0; j < 16 && (i + j) < length; j++) {
                line += memory[start + i + j].toString(16).padStart(2, '0') + ' ';
            }
            result += line + '\n';
        }
        console.log(result);
    },
    
    // Disassemble instruction at PC
    disassemble: function(cpu) {
        var pc = cpu.r.pc;
        var opcode = cpu.memory.rb(pc);
        var instruction = Debug.getInstructionName(opcode);
        var bytes = [opcode];
        
        if (Debug.instructionBytes[opcode] > 1) {
            bytes.push(cpu.memory.rb(pc + 1));
        }
        if (Debug.instructionBytes[opcode] > 2) {
            bytes.push(cpu.memory.rb(pc + 2));
        }
        
        var byteString = bytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
        return `${pc.toString(16).padStart(4, '0')}: ${byteString.padEnd(8, ' ')} ${instruction}`;
    },
    
    // Get instruction name/mnemonic
    getInstructionName: function(opcode) {
        return Debug.instructionNames[opcode] || 'Unknown';
    },
    
    // Instruction lengths in bytes
    instructionBytes: {
        // Fill this with actual instruction lengths
    },
    
    // Instruction names/mnemonics
    instructionNames: {
        // Fill this with actual instruction names
    }
};

GameboyJS.Debug = Debug;
}(GameboyJS || (GameboyJS = {})));