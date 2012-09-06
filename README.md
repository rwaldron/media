# media

Simplified media mediaing with MediaSource (Chrome Canary only)

## Getting Started
### In the browser
Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/rick/media/master/dist/media.min.js
[max]: https://raw.github.com/rick/media/master/dist/media.js

In your web page:

```html
<script src="dist/media.min.js"></script>
<script>
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
</script>
```


## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [grunt](https://github.com/cowboy/grunt).

_Also, please don't edit files in the "dist" subdirectory as they are generated via grunt. You'll find source code in the "src" subdirectory!_

## Release History
_(Nothing yet)_

## License
Copyright (c) 2012 Rick Waldron
Licensed under the MIT license.
