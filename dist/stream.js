/*! stream - v0.1.0 - 2012-08-29
* https://github.com/rwldrn/stream
* Copyright (c) 2012 Rick Waldron; Licensed MIT */

(function( exports ) {

  function EventEmitter() {}

  EventEmitter.prototype.emit = function() {
    var type, handlers, args, listeners;

    type = arguments[0];
    args = [].slice.call( arguments, 1 );

    if ( !this._events ) {
      this._events = {};
      return this;
    }

    handlers = this._events[ type ];

    if ( handlers && handlers.length ) {
      listeners = handlers.slice();

      while ( listeners.length ) {
        listeners.shift().apply( this, args );
      }
    }

    return this;
  };

  EventEmitter.prototype.on = function( type, listener ) {
    if ( !this._events ) {
      this._events = {};
    }

    if ( !this._events[ type ] ) {
      this._events[ type ] = [];
    }

    this._events[ type ].push( listener );

    return this;
  };

  EventEmitter.prototype.once = function( type, listener ) {
    return this.on( type, function once() {
      this.off( type, once );
      listener.apply( this, [].slice.call(arguments) );
    });
  };

  EventEmitter.prototype.off = function( type, listener ) {
    if ( !this._events || !this._events[ type ] ) {
      return this;
    }

    var list = this._events[ type ];

    if ( listener ) {
      this._events[ type ].splice(
        list.indexOf( listener ), 1
      );
    }
    else {
      delete this._events[ type ];
    }

    return this;
  };

  exports.EventEmitter = EventEmitter;

}(this));

// Design based on
// http://dvcs.w3.org/hg/html-media/raw-file/tip/media-source/media-source.html
//
/*global MediaSource: false, document: false, URL: false, Blob: false, Uint8Array: false, EventEmitter: false, XMLHttpRequest: false, FileReader: false */
(function( exports ) {

  var Abstract;

  // Abstract operations
  Abstract = {
    // [[Put]] props from dictionary onto |this|
    // MUST BE CALLED FROM WITHIN A CONSTRUCTOR:
    //  Abstract.put.call( this, dictionary );
    put: function( dictionary ) {
      // For each own property of src, let key be the property key
      // and desc be the property descriptor of the property.
      Object.getOwnPropertyNames( dictionary ).forEach(function( key ) {
        this[ key ] = dictionary[ key ];
      }, this);

      return this;
    },
    assign: function( O, dictionary ) {
      var init = Abstract.put.call( {}, O );

      return Abstract.put.call( init, dictionary );
    }
  };

  function Stream( setup ) {
    // Batch [[Put]] constructor properties
    Abstract.put.call( this, setup );

    // Create a new MediaSource
    //    Will be used as a pointer for creating
    //    an incoming media source stream via object URL
    this.source = new MediaSource();

    // If no video property was passed to the Stream
    // constructor, we naively create and append
    // directly to the document.body.
    // TODO: Allow this to have a target or take
    //        parameterized config properties
    if ( this.media === undefined ) {
      // create the video and inject into the dom
      document.body.appendChild(
        this.media = document.createElement("video")
      );
    }

    // Support valid selectors to identify media containers
    // This allows users to pass a "selector" string OR
    // an already selected element
    if ( typeof setup.media === "string" ) {
      this.media = document.querySelector( setup.media );
    }

    // Default to Stream.CHUNKS if no "chunks" was provided
    if ( this.chunks === undefined ) {
      this.chunks = Stream.CHUNKS;
    }

    // Create a temporary object URL and assign it
    // to the video.src prop--this will feed the media
    // stream into HTMLVideoElement displayed in the browser
    this.media.src = URL.createObjectURL( this.source );

    // Initialize an empty buffer. This will be assigned
    // later when the source is opened
    this.buffer = null;

    // Read stream blob created after successful file request
    this.blob = null;

    // When the source is open...
    this.source.addEventListener("webkitsourceopen", function( event ) {
      this.emit( "sourceopen",  { target: this, data: event });

      // 1. Assign a source buffer to this
      this.buffer = this.source.addSourceBuffer(
        // Note: Codec strings expect double quotes on the inside??
        'video/webm; codecs="vorbis,vp8"'
      );

      // Make an initial request for an arraybuffer
      // first argument will be an xhr.response that
      // will be used to create a "blob" to slice and
      // read via new FileReader instance
      //
      //    1. let ua be new Uint8Array(response)
      //    2. let blob be new Blob([ua], mime)
      //
      this.request(function( response ) {

        // Emit a response event, pass the response and |this| target
        this.emit( "response", { target: this, data: response });

        // Initialize a new Blob; blob
        this.blob = new Blob(
          [ new Uint8Array(response) ],
          { type: "video/webm" }
        );

        // Calculate the size of each chunk; Used to slice
        // the blob into portions for readAsArrayBuffer
        this.blob.chunkSize = Math.ceil( this.blob.size / this.chunks );

        // Emit a blobcreate event, pass the blob and |this| target
        this.emit( "blobcreate", { target: this, data: this.blob });

        // begin blob read loop at slice zero
        this.read();
      });

    }.bind(this), false);
  }

  // Augment the stream API with EventEmitter API
  Stream.prototype = Object.create( EventEmitter.prototype );


  // Class-side "static" data properties
  //
  // Set CHUNKS to use when no "chunks" count is defined
  Stream.CHUNKS = 5;


  Stream.prototype.request = function( continuation ) {
    var xhr = new XMLHttpRequest();

    xhr.onload = function( event ) {
      if ( xhr.readyState === 4 && xhr.status === 200 ) {
        continuation.call( this, xhr.response );
      }
    }.bind(this);

    xhr.open( "GET", this.file, true );
    xhr.responseType = "arraybuffer";
    xhr.send();
  };


  Stream.prototype.read = function( slice ) {
    var read, start;

    slice = slice === undefined ? -1 : slice;

    // Once we've reached the max slices, kill it.
    if ( ++slice === this.chunks ) {

      this.source.endOfStream();
    } else {

      // Initialize a file reader to load in the blob
      read = new FileReader();

      // Caclulate and initialize the chunk start byte
      start = this.blob.chunkSize * slice;

      // Pass through all progress events
      read.onprogress = function( event ) {
        this.emit( "progress", { target: this, data: event });
      }.bind(this);

      // Pass through all onload events (as "data")
      read.onload = function( event ) {
        this.emit( "data", { target: this, data: event });

        // Append the result if reading the blob
        // chunk to the awaiting buffer
        this.buffer.append(
          new Uint8Array( read.result )
        );

        // If the media is currently marked as
        // "paused", restart playback
        if ( this.media.paused ) {
          this.media.play();
        }

        // Continue the read loop
        this.read( slice );

      }.bind(this);

      // Ready a portion of the blob
      read.readAsArrayBuffer(
        this.blob.slice( start, start + this.blob.chunkSize )
      );
    }
  };

  exports.Stream = Stream;

}( this ));
