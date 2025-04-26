// Main initialization code
document.addEventListener('DOMContentLoaded', function() {
    var canvas = document.getElementById('screen');
    var gameboy = new GameboyJS.Gameboy(canvas, {
        zoom: 2
    });
    
    // Setup UI controls
    document.getElementById('load-rom').addEventListener('click', function() {
        // This would typically open a file dialog
        // For now just trigger the file input click
        var fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.gb,.gbc,.rom';
        fileInput.click();
        
        fileInput.addEventListener('change', function(e) {
            // This will be handled by the ROM reader
        });
    }); 
    
    document.getElementById('pause').addEventListener('click', function() {
        // Toggle pause state
        var isPaused = gameboy.cpu.isPaused;
        gameboy.pause(!isPaused);
        this.textContent = isPaused ? 'Pause' : 'Resume';
    });
    
    window.gameboy = gameboy; // For debugging
});