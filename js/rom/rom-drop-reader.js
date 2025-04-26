var GameboyJS;
(function (GameboyJS) {
"use strict";

// ROM Drop Reader
// Handle loading a ROM from drag and drop
var RomDropFileReader = function(dropzone) {
    this.callback = null;
    this.dropzone = dropzone;
    
    this.initDropzone();
};

RomDropFileReader.prototype.initDropzone = function() {
    var self = this;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        self.dropzone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Highlight drop area when item is dragged over
    ['dragenter', 'dragover'].forEach(function(eventName) {
        self.dropzone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(function(eventName) {
        self.dropzone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        self.dropzone.classList.add('drag-active');
    }
    
    function unhighlight() {
        self.dropzone.classList.remove('drag-active');
    }
    
    // Handle dropped files
    this.dropzone.addEventListener('drop', function(e) {
        var dt = e.dataTransfer;
        var files = dt.files;
        
        if (files.length > 0) {
            var file = files[0];
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
        }
    }, false);
};

RomDropFileReader.prototype.setCallback = function(callback) {
    this.callback = callback;
};

GameboyJS.RomDropFileReader = RomDropFileReader;
}(GameboyJS || (GameboyJS = {})));

