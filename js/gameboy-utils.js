// This exception should be thrown whenever a critical feature that
// has not been implemented is requested
class UnimplementedException extends Error {
    constructor(message, fatal = true) {
        super(message);
        this.name = "UnimplementedException";
        this.fatal = fatal;
    }
}

// Utility functions
const Util = {
    // Add to the first argument the properties of all other arguments
    extend: function(target, ...sources) {
        for (const source of sources) {
            for (const name in source) {
                target[name] = source[name];
            }
        }
        return target;
    },
    
    testFlag: function(p, cc) {
        let test = 1;
        let mask = 0x10;
        if (cc === 'NZ' || cc === 'NC') test = 0;
        if (cc === 'NZ' || cc === 'Z')  mask = 0x80;
        return (test && p.r.F & mask) || (!test && !(p.r.F & mask));
    },
    
    getRegAddr: function(p, r1, r2) {
        return Util.makeword(p.r[r1], p.r[r2]);
    },

    // make a 16 bits word from 2 bytes
    makeword: function(b1, b2) {
        return (b1 << 8) + b2;
    },

    // return the integer signed value of a given byte
    getSignedValue: function(v) {
        return v & 0x80 ? v-256 : v;
    },

    // extract a bit from a byte
    readBit: function(byte, index) {
        return (byte >> index) & 1;
    }
};

export { UnimplementedException, Util };