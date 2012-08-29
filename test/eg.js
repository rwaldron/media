document.addEventListener("DOMContentLoaded", function() {

  var stream = new Stream({
    media: "#container",
    file: "test.webm"
    // Optionally...
    // chunks: Number
  });

  // Events
  [ "sourceopen", "response", "progress", "data" ].forEach(function( type ) {
    stream.on( type, function( data ) {
      console.log( type + ": ", data );
    });
  });

}, false);
