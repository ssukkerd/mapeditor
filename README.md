# mapeditor
Editor for robot mission maps

Usage: 
  
1. Put on a web server, or create a local one running "python -m SimpleHTTPServer"
     from the folder where the editor is.
2. Load on web browser (tested in Chrome Version 59.0.3071.115 (64-bit) OSX.
    (e.g., "http://localhost:8000/brassmapeditor.html")
2. Load a background image of the map (png) to use as reference.
3. Use the "location/node creation" tool to create map waypoints by 
     clicking on the canvas.
4. Connect waypoints using the "connect" tool.
5. draw walls using the "draw walls tool". Ctrl-z triggers undo for walls.
5. Download the resulting map as a JSON file by clicking on the "Export Map" 
     link.
