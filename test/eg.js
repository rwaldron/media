document.addEventListener("DOMContentLoaded", function() {

  var media = new Media({
    media: "#container",
    file: "test.webm"
    // Optionally...
    // chunks: Number
  });

  // Events
  [ "sourceopen", "response", "progress", "data" ].forEach(function( type ) {
    media.on( type, function( data ) {
      console.log( type + ": ", data );
    });
  });

}, false);
