import { Gameboy, RomFileReader, RomDropFileReader } from 'gameboy-core';

// Audio context initialization
let audioContext = null;
var g; // Make g variable global

function initAudio() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
        
        // If audio context is suspended (needs user interaction)
        if (audioContext.state === 'suspended') {
            document.getElementById('audio-permission').classList.remove('hide');
        } else {
            setupGameboy();
        }
    } catch (e) {
        console.error("Web Audio API is not supported in this browser");
        setupGameboy();
    }
}

document.getElementById('enable-audio').addEventListener('click', function() {
    if (audioContext) {
        audioContext.resume().then(() => {
            document.getElementById('audio-permission').classList.add('hide');
            setupGameboy();
        });
    }
});

// configuration
function setupGameboy() {
    var opts = {
        romReaders: [
            new RomFileReader(),
            new RomDropFileReader(document.getElementById('dropzone'))
        ]
    };
    g = new Gameboy(document.getElementById('canvas'), opts);
    g.setSoundEnabled(document.getElementById('sound-enable').checked);
    g.setScreenZoom(document.getElementById('screen-zoom').value);
}

// When document is loaded, initialize the Audio
document.addEventListener('DOMContentLoaded', function() {
    initAudio();
});