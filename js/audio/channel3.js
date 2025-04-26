var GameboyJS;
(function (GameboyJS) {
"use strict";

// Sound Channel 3 (Wave output)
var Channel3 = function(apu, channel, context) {
    this.apu = apu;
    this.channelNum = channel;
    this.context = context;
    
    this.oscillator = null;
    this.gainNode = null;
    this.enabled = false;
    this.playing = false;
    
    this.frequency = 0;
    this.volume = 0;
    this.volumeShift = 0;
    this.lengthCounter = 0;
    this.maxLength = 256;
    this.lengthEnabled = false;
    this.lengthCheck = false;
    
    // Wave buffer
    this.waveBuffer = new Uint8Array(16);
    this.wavePosition = 0;
    
    // Clock counters
    this.lengthClock = 0;
    this.waveClock = 0;
    
    this.initAudio();
};

Channel3.prototype.initAudio = function() {
    if (!this.context) {
        return;
    }
    
    // Use a custom wave oscillator
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'sine'; // Will be replaced with custom wave
    
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0;
    
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
    
    this.oscillator.start();
};

Channel3.prototype.setWaveBufferByte = function(index, value) {
    this.waveBuffer[index] = value;
    this.updateWaveForm();
};

Channel3.prototype.updateWaveForm = function() {
    if (!this.oscillator || !this.context) {
        return;
    }
    
    // Create 32-sample wave from 16 bytes
    var real = new Float32Array(33);
    var imag = new Float32Array(33);
    real[0] = 0; // DC offset
    imag[0] = 0;
    
    // Convert 4-bit samples to waveform
    for (var i = 0; i < 32; i++) {
        var byteIndex = Math.floor(i / 2);
        var nibble = (i % 2 === 0) ? 
                    (this.waveBuffer[byteIndex] >> 4) : 
                    (this.waveBuffer[byteIndex] & 0x0F);
        
        // Convert to -1 to 1 range
        var sample = (nibble / 7.5) - 1;
        
        // Store as real part (phase is 0)
        real[i + 1] = sample;
        imag[i + 1] = 0;
    }
    
    try {
        var wave = this.context.createPeriodicWave(real, imag);
        this.oscillator.setPeriodicWave(wave);
    } catch (e) {
        console.error('Failed to create periodic wave', e);
    }
};

Channel3.prototype.enable = function() {
    this.enabled = true;
    if (this.playing) {
        this.updateVolume();
    }
};

Channel3.prototype.disable = function() {
    this.enabled = false;
    if (this.playing) {
        this.gainNode.gain.value = 0;
    }
};

Channel3.prototype.play = function() {
    // Reset length counter if it reached zero
    if (this.lengthCounter === 0) {
        this.lengthCounter = this.maxLength;
    }
    
    // Reset wave position
    this.wavePosition = 0;
    
    // Set playing state
    this.playing = true;
    this.apu.setSoundFlag(this.channelNum, 1);
    
    // Update audio output
    this.updateFrequency();
    this.updateVolume();
};

Channel3.prototype.stop = function() {
    this.playing = false;
    this.gainNode.gain.value = 0;
    this.apu.setSoundFlag(this.channelNum, 0);
};

Channel3.prototype.updateFrequency = function() {
    if (!this.oscillator) {
        return;
    }
    
    // Convert GB frequency to actual frequency
    var gbFreqHz = 65536 / (2048 - this.frequency);
    this.oscillator.frequency.value = gbFreqHz;
};

Channel3.prototype.updateVolume = function() {
    if (!this.gainNode || !this.enabled) {
        return;
    }
    
    var volume = 0;
    switch (this.volumeShift) {
        case 0: volume = 0; break;
        case 1: volume = 1.0; break;
        case 2: volume = 0.5; break;
        case 3: volume = 0.25; break;
    }
    
    this.gainNode.gain.value = volume * 0.25;
};

Channel3.prototype.setFrequency = function(freq) {
    this.frequency = freq;
    if (this.playing) {
        this.updateFrequency();
    }
};

Channel3.prototype.getFrequency = function() {
    return this.frequency;
};

Channel3.prototype.setLength = function(length) {
    this.lengthCounter = this.maxLength - length;
};

Channel3.prototype.update = function(cycles) {
    if (!this.playing) {
        return;
    }
    
    // Update length counter
    if (this.lengthEnabled) {
        this.lengthClock += cycles;
        // Length updated at 256Hz
        while (this.lengthClock >= 16384) {
            this.lengthClock -= 16384;
            
            if (this.lengthCounter > 0) {
                this.lengthCounter--;
                if (this.lengthCounter === 0 && this.lengthCheck) {
                    this.stop();
                    return;
                }
            }
        }
    }
};

GameboyJS.Channel3 = Channel3;
}(GameboyJS || (GameboyJS = {})));

