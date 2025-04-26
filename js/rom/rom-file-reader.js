var GameboyJS;
(function (GameboyJS) {
"use strict";

// ROM File Reader
// Handle loading a ROM from an HTML file input
var RomFileReader = function() {
    this.callback = null;
    var self = this;
    
    // Initialize the file input listener
    document.getElementById('file').addEventListener('change', function(e) {
        if (e.target.files.length === 0) return;
        
        var file = e.target.files[0];
        var reader = new FileReader();
        
        reader.onload = function() {
            if (self.callback) {
                // Convert ArrayBuffer to Uint8Array
                var arrayBuffer = this.result;
                var array = new Uint8Array(arrayBuffer);
                self.callback(array);
            }
        };
        
        reader.readAsArrayBuffer(file);
    });
};

RomFileReader.prototype.setCallback = function(callback) {
    this.callback = callback;
};

GameboyJS.RomFileReader = RomFileReader;
}(GameboyJS || (GameboyJS = {})));

