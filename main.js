
// =============================================================================
// User interface vars
// =============================================================================

var imageLoader = document.getElementById('imageLoader');
imageLoader.addEventListener('change', importImage, false);

var mapLoader = document.getElementById('mapLoader');
mapLoader.addEventListener('change', importMap, false);

var routeLoader = document.getElementById('routeLoader');
routeLoader.addEventListener('change', importRoute, false);

var canvas = document.getElementById('imageCanvas');
var saveButton = document.getElementById("saveMap");
var attEdit = document.getElementById("attEdit");

var routeEdit = false;

var removeRouteBtn = document.getElementById("removeRouteTool");
var addRouteBtn = document.getElementById("addRouteTool");
var removeRouteBtn = document.getElementById("removeRouteTool");
var addAdaptBtn = document.getElementById("addAdaptTool");
var removeAdaptBtn = document.getElementById("removeAdaptTool");
var finishRouteBtn = document.getElementById("finishRouteTool");

var adaptSelect = document.getElementById("adaptSelect");

var startEditBtn = document.getElementById("startRouteTool");
startEditBtn.addEventListener("click", function() {
    routeEdit = true;
    this.disabled = true;
    addRouteBtn.disabled = false;
    removeRouteBtn.disabled = false;
    addAdaptBtn.disabled = false;
    removeAdaptBtn.disabled = false;
    finishRouteBtn.disabled = false;
});

var ctx = canvas.getContext('2d');
var img = null;

var obstacleicon = new Image();
obstacleicon.src = "/icons/obstacle.png";

var lighticon = new Image();
lighticon.src = "/icons/lightbulb.png";

var batteryicon = new Image();
batteryicon.src = "/icons/battery.png";


rx = ry = 0;  // current cursor position
v = 3;

grid_granularity = 5;  // Snap grid cell size


// =============================================================================
//   Map vars
// =============================================================================

var MPR = 22;                                           // Meter to pixel ratio
var origin = [];
var locationsx = [], locationsy = [], locationsl = [];  // location coordinates and labels (nodes)
var connections=[];                                     // trajectories (arcs)
var walllocationsx=[], walllocationsy=[];               // wall location coordinates
var obstacles=[], obstaclelabels=[];                    // obstacles associated with arcs
var lightsx=[], lightsy=[], lightids=[];                // Lights
var ipointsx=[], ipointsy=[];                           // Initial points grid
var IPS = 2 * grid_granularity;                         // Separation between initial points in grid
var OBSTACLE_SIZE = 10;                                 // 50/MPR; Size of obstacles
var stations=[];                                        // charging stations
var worldobstaclesx=[], worldobstaclesy=[];             // x, y obstacles 0.5x05m in world
var route = [];
var callouts = [];
var calloutloc = {};


// =============================================================================
//   Map querying (checking locations at x,y position, etc.)
// =============================================================================

function getLocationAt(x, y) {
    for (var i = 0; i < locationsx.length; i ++) {
        if (Math.abs(locationsx[i]-x)<=grid_granularity && Math.abs(locationsy[i]-y)<=grid_granularity)
            return locationsl[i];
    }
    return "";
}

function getWorldObstacleAt(x, y){
    for (var i = 0; i < worldobstaclesx.length; i ++) {
        if (Math.abs(worldobstaclesx[i]-x)<=OBSTACLE_SIZE && Math.abs(worldobstaclesy[i]-y)<=OBSTACLE_SIZE)
            return [i];
    }
    return -1;
}

function getLocationIndex(label) {
    for (var i = 0; i < locationsl.length; i ++) {
        if (locationsl[i]==label) {
            return i;
        }
    }
    return -1;
}

function getCoords(label){
    for (var i = 0; i < locationsl.length; i ++) {
        if (locationsl[i]==label)
            return ({x:locationsx[i],y:locationsy[i]});
    }
}

function getConnections(label) {
    var result=[];
    for (var i=0; i < connections.length; i++){
        if (connections[i].from==label)
            result.push(connections[i].to);
    }
    return result;
}

function locationsConnected(l1,l2){
    return (getConnections(l1).indexOf(l2)>=0);
}

function pixelsToMeters(coords){
    var result = ([parseFloat(((coords[0]-origin[0])/MPR).toFixed(3)), parseFloat(((origin[1]-coords[1])/MPR).toFixed(3))]);
    return result;
}

function metersToPixels(coords){
    return ([Math.floor(origin[0]+coords[0]*MPR), Math.floor(origin[1]-coords[1]*MPR)]);
}

function originPixelsToMeters() {
    return [parseFloat((origin[0]/MPR).toFixed(3)), parseFloat((origin[1]/MPR).toFixed(3))]
}

function originMetersToPixels(o) {
    return [Math.floor(o[0]*MPR), Math.floor(o[1]*MPR)]
}

function coordsWithinWalls (x, y){
    /*  var wlx=[], wly = [];
      var i=1;
      wlx.push(walllocationsx[0]);
      wly.push(walllocationsy[0]);
      while (((walllocationsx[i]!=walllocationsx[0]) && (walllocationsy[i]!=walllocationsy[0])) || (i<walllocationsx.length)){
        wlx.push(walllocationsx[0]);
        wly.push(walllocationsy[0]);
        i=i+1;
      }
      if (wlx.length>0)
        console.log(wlx.length);*/
    return coordsWithinPolygon (x, y, walllocationsx, walllocationsy);
}

function coordsWithinPolygon (x, y, cornersX, cornersY) {
    var i, j=cornersX.length-1 ;
    var  oddNodes=false;
    var polyX = cornersX;
    var polyY = cornersY;

    for (i=0; i<cornersX.length; i++) {
        if ((polyY[i]< y && polyY[j]>=y ||  polyY[j]< y && polyY[i]>=y) &&  (polyX[i]<=x || polyX[j]<=x)) {
            oddNodes^=(polyX[i]+(y-polyY[i])/(polyY[j]-polyY[i])*(polyX[j]-polyX[i])<x);
        }
        j=i;
    }
    return oddNodes;
}

function coordsOnLine(x, y, sx, sy, ex, ey) {
    tolerance = 3
    var L2 = ( ((ex-sx) * (ex-sx)) + ((ey-sy) * (ey-sy)));
    if (L2 == 0) return false;
    var r = (((x - sx) * (ex - sx)) + ((y - sy) * (ey - sy)))/L2;
    if (r < 0) {
        return (Math.sqrt(((sx - x) * (sx - x)) + ((sy - y) * (sy -y))) <= tolerance)
    }
    else if ((0 <= r) && (r <= 1)) {
        var s = (((sy - y) * (ex - sx)) - ((sx - x) * (ey - sy))) / L2;
        return (Math.abs(s) * Math.sqrt(L2) < tolerance);
    }
    else {
        return (Math.sqrt(((ex - x) * (ex-x)) + ((ey -y) * (ey-y))) <= tolerance);
    }
}

function removeWallAt(px, py) {
    var wlx = [], wly = [];
    var i = 1;
    while (i < walllocationsx.length) {
        if (!coordsOnLine(px,py, walllocationsx[i-1], walllocationsy[i-1], walllocationsx[i], walllocationsy[i])) {
            wlx.push(walllocationsx[i-1])
            wlx.push(walllocationsx[i])
            wly.push(walllocationsy[i-1])
            wly.push(walllocationsy[i])
        }
        i = i + 2;
    }
    walllocationsx = wlx;
    walllocationsy = wly;
}

function removeConnectionAt(px, py) {
    var newconns=[]
    console.log("removeconnat "+px.toString()+" "+py.toString())

    for (var i=0; i<connections.length; i++){
        if (!coordsOnLine(px, py, getCoords(connections[i].from).x,
            getCoords(connections[i].from).y,
            getCoords(connections[i].to).x,
            getCoords(connections[i].to).y )){
            newconns.push(connections[i]);
        }
    }
    connections = newconns;
}

function removeRouteConnectionAt(px, py) {
    var newconns=[]
    console.log("removeconnat "+px.toString()+" "+py.toString())

    for (var i=0; i<routeEdges.length; i++){
        if (!coordsOnLine(px, py, getCoords(routeEdges[i].from).x,
            getCoords(routeEdges[i].from).y,
            getCoords(routeEdges[i].to).x,
            getCoords(routeEdges[i].to).y )){
            newconns.push(routeEdges[i]);
        }
    }
    routeEdges = newconns;
}


function removeObstaclesBetweenLocations (l1, l2){
    var auxobstacles=[];
    var auxobstaclelabels=[];
    for (var i = 0; i < obstacles.length; i += 1) {
        if (!((obstacles[i].from==l1 && obstacles[i].to==l2) || (obstacles[i].from==l2 && obstacles[i].to==l1))){
            auxobstaclelabels.push(obstaclelabels[i]);
            auxobstacles.push(obstacles[i]);
        }
    }
    obstacles = auxobstacles;
    obstaclelabels = auxobstaclelabels;
}

function createLightsOnWaypoints(){
    for (var i=0; i<locationsx.length;i+=1){
        lightsx.push(locationsx[i]);
        lightsy.push(locationsy[i]);
        lightids.push("light"+lightids.length.toString());
    }
}

function createInitialPoints(){
    ipointsx=[];
    ipointsy=[];
    for (var i = grid_granularity; i < canvas.height; i += IPS)
        for (var j = grid_granularity; j < canvas.width; j += IPS)
            if (coordsWithinWalls(j,i)){
                ipointsx.push(j);
                ipointsy.push(i);
            }
}

// =============================================================================
// Tool vars
// =============================================================================

var tool = 0; // tool= 0 create, 1 connect, 2 move, 3 setorigin,
              // 4 Wall, 5 obstacle, 6 remove obstacle, 7 remove wall, 8 place light
              // 9 toggle charging station, 10 disconnect waypoints, 11 remove waypoints,
              // 12 place rewal world obstacle
var initStroke, endStroke;   // Location aux vars for tools
var connecting=false, moving=false;  // Aux var for connection and moving tool

// =============================================================================
// Tool manipulation and canvas event handling
// =============================================================================

function setToolConnect(){
    connecting = false;
    moving = false;
    tool = 1;
}
function setToolCreate(){
    connecting = false;
    moving = false;
    tool = 0;
}

function setToolMove(){
    connecting = false;
    moving = false;
    tool = 2;
}

function setToolOrigin(){
    connecting = false;
    moving = false;
    tool = 3;
}

function setToolWall(){
    connecting = false;
    moving = false;
    tool = 4;
}

function setToolInfoObstacle(){
    connecting = false;
    moving = false;
    tool = 5;
}

function setToolRemoveObstacle(){
    connecting = false;
    moving = false;
    tool = 6;
}

function setToolRemoveWall(){
    connecting = false;
    moving = false;
    tool = 7;
}

function setToolPlaceLight(){
    connecting = false;
    moving = false;
    tool = 8;
}

function setToolToggleCharging(){
    connecting = false;
    moving = false;
    tool = 9;
}

function setToolDisconnect(){
    connecting = false;
    moving = false;
    tool = 10;
}

function setToolRemove(){
    connecting = false;
    moving = false;
    tool = 11;
}

function setToolObstacle(){
    connecting = false;
    moving = false;
    tool = 12;
}

function setToolRemoveAdapt() {
    connecting = false;
    moving = false;
    tool = 13;
    console.log("Remove adapt tool");
}

function setToolAddAdapt() {
    connecting = false;
    moving = false;
    tool = 14;
    console.log("Add adapt tool");
}

function setToolRemoveRoute() {
    connecting = false;
    moving = false;
    tool = 15;
    console.log("Remove route edge tool");
}
function setToolAddRoute(){
    connecting = false;
    moving = false;
    tool = 16;
    console.log("Add route edge tool");
}


// Handles mouse move events
function moveReporter(e) {
    var rect = imageCanvas.getBoundingClientRect();
    ex = e.pageX-rect.left;
    ey = e.pageY-rect.top;
    rx=Math.floor(ex/grid_granularity)*grid_granularity;
    ry=Math.floor(ey/grid_granularity)*grid_granularity;

    if (tool==2 && moving==true){
        mindex = getLocationIndex(initStroke);
        locationsx[mindex] = rx;
        locationsy[mindex] = ry;
    }
}

// Handles mouse click events
function clickReporter(e){
    console.log(`point ${rx}, ${ry}`);

    if (tool==0){ // Creating waypoints
        if (!e.altKey){
            locationsx.push(rx);
            locationsy.push(ry);
            locationsl.push("l"+locationsx.length.toString());
            console.log("l"+locationsx.length.toString()+" created.")
        } else { // Eliminate waypoint
            var sloc = getLocationAt(rx,ry)
            slocidx=locationsl.indexOf(sloc)
            if (slocidx>=0){
                if (getConnections(sloc).length==0){ // Removed only if waypoint not connected to any other waypoint
                    locationsx.splice(slocidx,1);
                    locationsy.splice(slocidx,1);
                    locationsl.splice(slocidx,1);
                }
            }
        }
    }

    if (tool==1){ // Creating connections between locations
        if (connecting==false){  // If starting a connection (selecting start node)
            initStroke = getLocationAt(rx,ry);
            if (initStroke!=""){
                connecting = true;
            }
        } else {   // If finishing a connection (selecting end node)
            endStroke = getLocationAt(rx,ry);
            if (endStroke!="" && endStroke!=initStroke && !locationsConnected(initStroke,endStroke)){
                connecting = false;
                connections.push({from:initStroke,to:endStroke}); // Connections are bidirectional
                connections.push({from:endStroke,to:initStroke});
            }
        }
    }

    if (tool==2){ // Moving node
        if (moving == false) {
            initStroke = getLocationAt(rx,ry);
            if (initStroke!=""){
                moving = true;
            }
        }
        else
            moving = false;
    }

    if (tool==3){ // Setting origin of coordinates
        origin[0] = rx;
        origin[1] = ry;
    }

    if (tool==4){ // adding wall vertex
        if (!e.altKey){
            walllocationsx.push(rx);
            walllocationsy.push(ry);
        } else { // Remove wall
            removeWallAt(rx, ry);
        }
    }

    if (tool==5){ // Creating obstacles between waypoints
        if (connecting==false){  // If starting a connection (selecting start node)
            initStroke = getLocationAt(rx,ry);
            if (initStroke!=""){
                connecting = true;
            }
        } else {   // If finishing a connection (selecting end node)
            endStroke = getLocationAt(rx,ry);
            if (endStroke!=""){
                connecting = false;
                obstacles.push({from:initStroke,to:endStroke}); // associate obstacle with connecting arcs
                obstacles.push({from:endStroke,to:initStroke});
                obstaclelabels.push(attEdit.value);
                obstaclelabels.push(attEdit.value);
            }
        }
    }

    if (tool==6){ // Removing obstacles between waypoints
        if (connecting==false){  // If starting a connection (selecting start node)
            initStroke = getLocationAt(rx,ry);
            if (initStroke!=""){
                connecting = true;
            }
        } else {   // If finishing a connection (selecting end node)
            endStroke = getLocationAt(rx,ry);
            if (endStroke!=""){
                connecting = false;
                removeObstaclesBetweenLocations(initStroke, endStroke);
            }
        }
    }

    if (tool==8){ // Creating lights
        lightsx.push(rx);
        lightsy.push(ry);
        lightids.push("light"+lightids.length.toString());
    }

    if (tool==9) { // Toggle charging station on location
        var sloc = getLocationAt(rx,ry);
        if (locationsl.indexOf(sloc) >= 0) { // If location at mouse pointer
            if (stations.indexOf(sloc) >= 0){
                stations.splice(stations.indexOf(sloc),1); // If it is a charging station, remove it from charging station list
            } else {
                stations.push(sloc); // Otherwise, add it to charging stations
            }
        } // If no location at mouse pointer, do nothing
    }

    if (tool==10){ // Remove connection between waypoints
        removeConnectionAt(rx,ry);
    }

    if (tool==12){
        if (!e.altKey){ // Place real world obstacle
            worldobstaclesx.push(rx);
            worldobstaclesy.push(ry);
        } else{ // Delete obstacle if found in location
            var wobs = getWorldObstacleAt(rx,ry);
            if (wobs>=0){
                worldobstaclesx.splice(wobs,1);
                worldobstaclesy.splice(wobs,1);
            }
        }
    }

    if (tool == 13) {
        label = getLocationAt(rx, ry);
        if (label && callouts[label] !== undefined) {
            callouts[label].splice(0, 1);
        }
    }

    if (tool == 14) {
        label = getLocationAt(rx, ry);
        if (label) {
            if (callouts[label] === undefined) {
                callouts[label] = []
            }
            callouts[label].push(adaptSelect.value);
        }
    }

    if (tool == 15) {
        removeRouteConnectionAt(rx, ry);
    }

    if (tool==16){ // Creating connections between locations
        if (connecting==false){  // If starting a connection (selecting start node)
            initStroke = getLocationAt(rx,ry);
            if (initStroke!=""){
                connecting = true;
            }
        } else {   // If finishing a connection (selecting end node)
            endStroke = getLocationAt(rx,ry);
            if (endStroke!="" && endStroke!=initStroke && !edgeExists(initStroke,endStroke)){
                connecting = false;
                routeEdges.push({from:initStroke,to:endStroke});
            }
        }
    }

}


/** helpers for tool==16, adding route edges */
function getRouteConnections(label) {
    var result=[];
    for (var i=0; i < routeEdges.length; i++){
        if (routeEdges[i].from==label)
            result.push(routeEdges[i].to);
    }
    return result;
}

function edgeExists(l1,l2){
    return (getRouteConnections(l1).indexOf(l2)>=0);
}


// Keyboard handling
function KeyPress(e) {
    var evtobj = window.event? event : e
    if (evtobj.keyCode == 90 && evtobj.ctrlKey) { // undo (ctrl+z)
        if (tool==4){ // undo last wall
            walllocationsx.splice(-2,2);
            walllocationsy.splice(-2,2);
        }

        if (tool==8){ // undo last light
            lightsx.splice(-1,1);
            lightsy.splice(-1,1);
            lightids.splice(-1,1);
        }

    }

    if (evtobj.keyCode == 66 && evtobj.ctrlKey) { // toggle background image display (ctrl+b)
        displaybackgroundcheck.checked = !displaybackgroundcheck.checked;
    }

    if (evtobj.keyCode == 76 && evtobj.ctrlKey) { // toggle lights display (ctrl+l)
        displaylightscheck.checked = !displaylightscheck.checked;
    }

    if (evtobj.keyCode == 81 /*&& evtobj.ctrlKey*/) { // Create lights on all waypoints (ctrl+q)
        createLightsOnWaypoints();
    }

    if (evtobj.keyCode == 73 && evtobj.ctrlKey) { // Create initial points grid (ctrl+i)
        createInitialPoints();
    }
}
document.onkeydown = KeyPress;


// =============================================================================
// Import/Export of Map Data (JSON) and BG map image
// =============================================================================

function exportMap(el) {
    var map = [];
    MPR = parseFloat(document.getElementById('mpr').value)

    for (var i = 0; i < locationsx.length; i ++) {
        var mcoord = pixelsToMeters([locationsx[i], locationsy[i]]);
        var coord = {x: mcoord[0] , y: mcoord[1]};
        coord["x"]=parseFloat(coord["x"]);
        coord["y"]=parseFloat(coord["y"]);
        var obj = {"node-id": locationsl[i], coords:coord, "connected-to":getConnections(locationsl[i])};
        map.push(obj);
    }

    var walls = [];

    for (var i = 0; i < walllocationsx.length-1; i = i+2) {  // export walls
        var mcoord1 = pixelsToMeters([walllocationsx[i], walllocationsy[i]]);
        var mcoord2 = pixelsToMeters([walllocationsx[i+1], walllocationsy[i+1]]);
        var coord1 = {x: mcoord1[0] , y: mcoord1[1]};
        var coord2 = {x: mcoord2[0] , y: mcoord2[1]};
        coord1["x"]=parseFloat(coord1["x"]);
        coord1["y"]=parseFloat(coord1["y"]);
        coord2["x"]=parseFloat(coord2["x"]);
        coord2["y"]=parseFloat(coord2["y"]);
        var objw = {"p1": coord1, "p2": coord2};
        walls.push(objw);
    }

    var objobstacles=[];
    for (var i = 0; i < obstacles.length; i ++) {
        var obj = {"from": obstacles[i].from, "to": obstacles[i].to, "id":obstaclelabels[i]};
        objobstacles.push(obj);
    }

    var objlights=[];
    for (var i = 0; i < lightids.length; i ++) {
        var lcoord = pixelsToMeters([lightsx[i].toFixed(3), lightsy[i].toFixed(3)]);
        var obj = {"light-id": lightids[i], "coord": { "x": parseFloat(lcoord[0]), "y": parseFloat(lcoord[1])} };
        objlights.push(obj);
    }

    ocoord = originPixelsToMeters()

    var objipoints=[];
    for (var i = 0; i < ipointsx.length; i ++) {
        var lcoord = pixelsToMeters([ipointsx[i].toFixed(3), ipointsy[i].toFixed(3)]);
        var obj = {"x": parseFloat(lcoord[0]), "y": parseFloat(lcoord[1])};
        objipoints.push(obj);
    }

    var objwobstacles=[];
    for (var i = 0; i < worldobstaclesx.length; i ++) {
        var lcoord = pixelsToMeters([worldobstaclesx[i].toFixed(3), worldobstaclesy[i].toFixed(3)]);
        var obj = {"x": parseFloat(lcoord[0]), "y": parseFloat(lcoord[1])};
        objwobstacles.push(obj);
    }

    var jsonobj = {mpr : MPR, map: map, walls: walls, origin: {"x" : ocoord [0],"y" : ocoord[1]}, "unsafe-rects": [], obstacles: objobstacles, worldobstacles: objwobstacles,lights: objlights, "stations": stations, "initial-points": objipoints};
    var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonobj, null, 2));

    el.setAttribute("href", "data:"+data);
    el.setAttribute("download", "data.json");
}

function importMap(e){
    var reader = new FileReader();
    reader.onload = load(e.target.files[0]["name"]);
    //render();
}

function importRoute(e){
    var reader = new FileReader();
    reader.onload = loadRoute(e.target.files[0]["name"]);
    //render();
}

function getURLPath(urlStr){
    var pathArray = urlStr.split( '/' );
    var newPathname = "";
    for (var i = 1; i < pathArray.length-1; i++) {
        newPathname += "/";
        newPathname += pathArray[i];
    }
//    console.log(newPathname);
    return newPathname;
}

var actual_JSON;
var actual_JSON_route;

function load(filename) {
    console.log(filename);
    var filename2 = getURLPath(window.location.href) + "/" + filename;
    loadJSON(filename2, function(response) {
        actual_JSON = JSON.parse(response);
        clearMap();
        parseMap();
    });
}

function loadRoute(filename) {
    console.log(filename);
    var filename2 = getURLPath(window.location.href) + "/" + filename;
    loadJSON(filename2, function(response) {
        actual_JSON_route = JSON.parse(response);
        clearRoute();
        parseRoute();
    });
}

function loadJSON(file, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

function clearMap() {
    origin = [];
    locationsx = [];
    locationsy = [];
    locationsl = [];
    walllocationsx=[];
    walllocationsy=[];
    connections = [];
    lightsx = [];
    lightsy = [];
    lightids = [];
}

function clearRoute() {
    route = []
}

function parseMap() {
    var JSONmap = actual_JSON;
    if (!JSONmap["mpr"]) {
        MPR = 18.5;
    }
    else {
        MPR = parseFloat(JSONmap["mpr"]);
    }
    // load origin
    if (JSONmap["origin"]["x"]) {
        // new origin format
        o = [JSONmap["origin"]["x"], JSONmap["origin"]["y"]];
        origin = originMetersToPixels(o);
    }
    else {
        origin.push(JSONmap["origin"]["x"]); // setting origin of coordinates
        origin.push(JSONmap["origin"]["y"]);
    }

    // load graph map
    for (var i=0; i<JSONmap["map"].length; i++){
        pcoord = metersToPixels([JSONmap["map"][i]["coords"]["x"], JSONmap["map"][i]["coords"]["y"]]);
        locationsx.push(pcoord[0]);
        locationsy.push(pcoord[1]);
        locationsl.push(JSONmap["map"][i]["node-id"]);
        for (var j=0; j<JSONmap["map"][i]["connected-to"].length; j++){
            connections.push({from:JSONmap["map"][i]["node-id"],to:JSONmap["map"][i]["connected-to"][j]});
        }
    }
    // load walls
    if (JSONmap["walls"]){
        for (var i=0; i<JSONmap["walls"].length; i++){
            pcoord1 = metersToPixels([JSONmap["walls"][i]["p1"]["x"], JSONmap["walls"][i]["p1"]["y"]]);
            pcoord2 = metersToPixels([JSONmap["walls"][i]["p2"]["x"], JSONmap["walls"][i]["p2"]["y"]]);
            walllocationsx.push(pcoord1[0]);
            walllocationsy.push(pcoord1[1]);
            walllocationsx.push(pcoord2[0]);
            walllocationsy.push(pcoord2[1]);
        }
    }
    // load obstacles
    if (JSONmap["obstacles"]){
        for (var i=0; i<JSONmap["obstacles"].length; i++){
            obstacles.push({from:JSONmap["obstacles"][i]["from"], to:JSONmap["obstacles"][i]["to"]});
            obstaclelabels.push(JSONmap["obstacles"][i]["id"]);
        }
    }
    // load lights
    if (JSONmap["lights"]){
        for (var i=0; i<JSONmap["lights"].length; i++){
            var lcoord=metersToPixels([JSONmap["lights"][i]["coord"]["x"], JSONmap["lights"][i]["coord"]["y"]]);
            lightsx.push(lcoord[0]);
            lightsy.push(lcoord[1]);
            lightids.push(JSONmap["lights"][i]["light-id"]);
        }
    }

    // load world obstacles
    if (JSONmap["worldobstacles"]){
        for (var i=0; i<JSONmap["worldobstacles"].length; i++){
            var lcoord=metersToPixels([JSONmap["worldobstacles"][i]["x"], JSONmap["worldobstacles"][i]["y"]]);
            worldobstaclesx.push(lcoord[0]);
            worldobstaclesy.push(lcoord[1]);
        }
    }

    // load stations
    if (JSONmap["stations"]){
        for (var i=0; i<JSONmap["stations"].length; i++){
            stations.push(JSONmap["stations"][i]);
        }
    }
    document.getElementById('mpr').value = MPR
}


var routeEdges = []

function parseRoute() {

    var routeList = actual_JSON_route["route"];

    for (var i = 0; i < routeList.length; i++){
        // pcoord = metersToPixels([JSONmap["map"][i]["coords"]["x"], JSONmap["map"][i]["coords"]["y"]]);
        idx = getLocationIndex(routeList[i]["id"]);

        for (var j = 0; j < routeList[i]["connected-to"].length; j++){
            routeEdges.push({from: routeList[i]["node-id"],to: routeList[i]["connected-to"][j]});
        }
    }

    var actions = actual_JSON_route["actions"];
    for (var i = 0; i < actions.length; i++) {
        label = actions[i]["id"];
        callouts[label] = actions[i]["action"]
    }
    console.log(routeEdges);
}


function importImage(e){
    var reader = new FileReader();
    reader.onload = function(event) {
        img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img,0,0);
            rx = canvas.width/2;
            ry = canvas.height/2;
            setInterval(update,1000/20);
            canvas.addEventListener('mousemove', moveReporter, false);
            canvas.addEventListener('click',clickReporter,false);
            origin.push(0);
            origin.push(img.height);
        }
        img.src = event.target.result;
        document.getElementById("displaybackgroundcheck").checked = true;
    }
    reader.readAsDataURL(e.target.files[0]);
}

// =============================================================================
// Rendering
// =============================================================================

function update(){
    if (displaybackgroundcheck.checked){
        ctx.drawImage(img,0,0);
    }
    else {
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(0, 0, img.width, img.height);
    }
    render();
    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.fillRect(rx-grid_granularity/2, ry-grid_granularity/2, grid_granularity, grid_granularity);
}

function render(){
    MPR = parseFloat(document.getElementById('mpr').value);
    drawGrid();
    drawCoordinates();
    drawTool();
    drawLocations();
    drawConnections();
    drawWorldObstacles();
    //drawObstacles();
    drawOrigin();
    drawWalls();
    drawConnectionsRoute();
    drawCallouts();
    if (displaylightscheck.checked)
        drawLights();
//  if (displayinitialpointscheck.checked)
//    drawInitialPoints();
}


function drawGrid(){
    ctx.strokeStyle = '#cccccc';
    ctx.strokeStyle = "rgba(200, 200, 200 ,0.3)";
    ctx.lineWidth=1;
    ctx.beginPath();
    for (var i = grid_granularity; i < canvas.height; i += grid_granularity) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
    }
    for (var j = grid_granularity; j < canvas.width; j += grid_granularity) {
        ctx.moveTo(j, 0);
        ctx.lineTo(j, canvas.height);
    }
    ctx.stroke();
}

function drawCoordinates(){
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.font="20px Georgia";
    var mrx = pixelsToMeters([rx,ry])[0].toString();
    var mry = pixelsToMeters([rx,ry])[1].toString();
//	ctx.fillText("X: "+rx.toString()+"["+mrx+"]"+" Y: "+ry.toString()+"["+mry+"]",10,30);
    ctx.fillText("X: "+mrx+" Y: "+mry.toString(),10,30);
}

function drawTool(){
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.font="20px Georgia";
    var strTool = "[create]";
    if (tool==1){
        strTool = "[connect]";
    }
    if (tool==2){
        strTool= "[move]";
    }
    if (tool==3){
        strTool= "[set origin]";
    }
    if (tool==4){
        strTool= "[draw walls]";
    }
    if (tool==5){
        strTool= "[place obstacles]";
    }
    if (tool==8){
        strTool= "[place lights]";
    }
    if (tool==9){
        strTool = "[toggle charging station]"
    }
    if (tool==10){
        strTool = "[disconnect waypoints]"
    }
    if (tool==11){
        strTool = "[remove waypoints]"
    }

    ctx.fillText("Tool:"+strTool,10,50);
}

function drawLocations(){
    for (var i = 0; i < locationsx.length; i ++) {
        ctx.fillStyle = "rgb(200, 0, 0)";
        ctx.fillRect(locationsx[i]-grid_granularity/2, locationsy[i]-grid_granularity/2, grid_granularity, grid_granularity);
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.font = "10px Georgia";
        ctx.fillText(locationsl[i],locationsx[i]+grid_granularity,locationsy[i]+grid_granularity);
        if (stations.indexOf(locationsl[i])>=0) {
            ctx.drawImage(batteryicon, locationsx[i]-batteryicon.width-Math.floor(grid_granularity/2), locationsy[i]-Math.floor(grid_granularity/2));
        }
    }
}

function drawInitialPoints(){
    ctx.fillStyle = "rgba(0, 0, 200 ,0.3)";
    for (var i = 0; i < ipointsx.length; i ++) {
        ctx.fillRect(ipointsx[i]-grid_granularity/2, ipointsy[i]-grid_granularity/2, grid_granularity, grid_granularity);
    }
}

function drawOrigin(){
    ctx.fillStyle = "rgb(0, 0, 127)";
    ctx.fillRect(origin[0]-grid_granularity, origin[1]-grid_granularity, grid_granularity*2, grid_granularity*2);
    ctx.fillStyle = "rgb(0, 0, 255)";
    ctx.fillRect(origin[0]-grid_granularity/2, origin[1]-grid_granularity/2, grid_granularity, grid_granularity);
}

function drawConnections(){
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth=2;
    ctx.beginPath();
    for (var i = 0; i < connections.length; i += 1) {
        ctx.moveTo(getCoords(connections[i].from).x , getCoords(connections[i].from).y);
        ctx.lineTo(getCoords(connections[i].to).x, getCoords(connections[i].to).y);
    }
    ctx.stroke();
}


/* Function to draw robot routes */
function drawConnectionsRoute(){
    ctx.strokeStyle = '#0000ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < routeEdges.length; i += 1) {
        to = getCoords(routeEdges[i].to);
        from = getCoords(routeEdges[i].from);

        tox = to.x;
        toy = to.y;
        fromx = from.x;
        fromy = from.y;

        var headlen = 10;   // length of head in pixels
        var angle = Math.atan2(toy-fromy,tox-fromx);

        ctx.moveTo(fromx, fromy);
        ctx.lineTo(tox, toy);
        ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));

        ctx.moveTo(fromx , fromy);
        ctx.lineTo(tox, toy);
    }
    ctx.stroke();
}

function drawCallouts() {
    for (var label in callouts) {
        if (!callouts.hasOwnProperty(label)) continue;

        idx = getLocationIndex(label);
        if (idx === -1) continue;

        var x = locationsx[idx];
        var y = locationsy[idx];

        actions = callouts[label];

        for (var i = 0; i < actions.length; i++) {
            ctx.fillStyle = "rgb(0, 200, 0)";
            ctx.fillRect(x-grid_granularity/2, y-grid_granularity/2, grid_granularity, grid_granularity);

            ctx.fillStyle = 'rgba(225,225,225,0.8)';
            w = 50;
            h = 20;
            ctx.fillRect(x-w/2, y-h, w, h);
            ctx.fillStyle = "rgb(0, 0, 0)";
            ctx.font = "10px Helvetica";
            ctx.fillText(actions[i], x-w/2, y-h+10);
        }
    }
}


function drawObstacles(){
    for (var i = 0; i < obstacles.length; i += 1) {
        ctx.drawImage(obstacleicon, Math.floor((getCoords(obstacles[i].from).x+getCoords(obstacles[i].to).x)/2)-Math.floor(grid_granularity/2) , Math.floor((getCoords(obstacles[i].from).y+getCoords(obstacles[i].to).y)/2)-Math.floor(grid_granularity/2));
    }
}

function drawLights(){
    for (var i = 0; i < lightids.length; i += 1) {
        ctx.drawImage(lighticon, lightsx[i]-Math.floor(grid_granularity/2) , lightsy[i]-Math.floor(grid_granularity/2));
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.font="10px Georgia";
        ctx.fillText(lightids[i],lightsx[i]+grid_granularity/2+lighticon.width,lightsy[i]+grid_granularity);
    }
}

function drawWalls(){
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth=2;
    ctx.beginPath();
    for (var i = 0; i < Math.max(0,walllocationsx.length-1); i += 2) {
        ctx.moveTo(walllocationsx[i] , walllocationsy[i]);
        ctx.lineTo(walllocationsx[i+1] , walllocationsy[i+1]);
    }
    ctx.stroke();
}

function drawWorldObstacles(){

    for (var i = 0; i < worldobstaclesx.length; i ++) {
        ctx.fillStyle = "rgb(200, 0, 200)";
        ctx.fillRect(worldobstaclesx[i]-OBSTACLE_SIZE/2, worldobstaclesy[i]-OBSTACLE_SIZE/2, OBSTACLE_SIZE, OBSTACLE_SIZE);
    }
}