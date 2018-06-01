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
    ctx.lineWidth=2;
    ctx.beginPath();
    for (var i = 0; i < route.length; i += 1) {
        to = getCoords(route[i].to);
        from = getCoords(route[i].from);

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