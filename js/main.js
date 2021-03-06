/* vim:set shiftwidth=2: */ 

COLOR_LIMITED = "#F7E89D";
COLOR_BULLET = "#F0B2A1";
FAST_FORWARD_SPEED = 3000;
schedule = undefined;
fastForward = false;

/* drawing positions */
var SOUTH_X_POSITION = 150;
var NORTH_X_POSITION = SOUTH_X_POSITION+50;

function zeroPadded(num) {
  return ('0'+num).slice(-2);
}

function dwellTime(now) {
  if(window.schedule == SCHEDULES.weekday) {
    if(now.getHours() >= 7 && now.getHours() <= 9) {
      return 70 * 1000; // morning rush hour
    } else if(now.getHours() >= 17 && now.getHours() <= 19) {
      return 70 * 1000; // evening rush hour
    } else {
      return 40 * 1000; // daytime
    }
  } else {
    // weekend
    return 30 * 1000;
  }
}
  

function scheduleForDay(today){
  var day = today.getDay();
  if(day == 0){
    return "sunday";
  }
  if(day == 6){
    return "saturday";
  }
  return "weekday";
}

$(function(){
  map = Raphael($('#map').get(0));
  var current = new Date();;
  var dayStart = new Date();
  dayStart.setHours(0);
  dayStart.setMinutes(0);
  dayStart.setSeconds(0);
  var dayEnd = new Date();
  dayEnd.setHours(23);
  dayEnd.setMinutes(59);
  dayEnd.setSeconds(59);

  var timeSlider = $('#timeSlider');
  timeSlider.attr('min', dayStart.getTime());
  timeSlider.attr('max', dayEnd.getTime());
  timeSlider.attr('step', 1000*60); // 1-minute steps
  timeSlider.get(0).value = current.getTime();

  timeSlider.on('change', function() {
    window.virtualTime = parseInt(this.value, 10);
  });

  $("#fastforward").change(function(){
    window.fastForward = this.checked;
  });

  $("input[name=daytype]").click(function(){
    window.schedule = SCHEDULES[$(this).val()];
  });

  $("input[value="+scheduleForDay(new Date())+"]").click();

  $('#locate').click(function(e) {
    e.preventDefault();
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(geo) {
        var milepost = latlngToMilepost(geo.coords.latitude, geo.coords.longitude);
        updateMyLocationOnMap(milepost);
      });
    }
  });

  drawMap(STATIONS);
  window.virtualTime = new Date().getTime();
  animate();
});

var lastFrameTime = new Date();

function animate() {
  requestAnimationFrame(animate);
  var delta = new Date() - lastFrameTime;
  lastFrameTime = new Date();
  if(window.fastForward) {
    delta = delta * 30;
  }

  window.virtualTime += delta;
  var now = new Date(window.virtualTime);
  drawTrains(now);

  var slider = document.getElementById('timeSlider');
  if(Math.abs(slider.value-window.virtualTime) > 1000) {
    $('#now').text(now.getHours() + ":" + zeroPadded(now.getMinutes()) + ":" + zeroPadded(now.getSeconds()));
    slider.value = window.virtualTime;
  }
}

/* ************* Geometry utilities **************** */
function sqr(x) { return x * x }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y) }

function distToSegmentSquared(p, v, w) {
  var l2 = dist2(v, w);
  if (l2 == 0) return dist2(p, v);
  var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  if (t < 0) return dist2(p, v);
  if (t > 1) return dist2(p, w);
  return dist2(p, { x: v.x + t * (w.x - v.x),
                    y: v.y + t * (w.y - v.y) });
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }

/* ************* GPS<->Milepost translation ******** */
function latlngToMilepost(latitude, longitude) {
  var bestSegment;
  var bestSegmentDistance = 1000.0;
  var p = {x: latitude, y: longitude};

  for(var i = 0; i < STATIONS.length-1; i++) {
    var v = {x: STATIONS[i].latitude, y: STATIONS[i].longitude, milepost: STATIONS[i].milepost};
    var w = {x: STATIONS[i+1].latitude, y: STATIONS[i+1].longitude, milepost: STATIONS[i+1].milepost};

    var distance = distToSegment(p, v, w);
    if(distance < bestSegmentDistance) {
      bestSegmentDistance = distance;
      bestSegment = [v, w];
    }
  }

  var firstHalf = Math.sqrt(dist2(p, bestSegment[0]));
  var secondHalf = Math.sqrt(dist2(p, bestSegment[1]));

  var milepostDelta = bestSegment[1].milepost - bestSegment[0].milepost;

  return bestSegment[0].milepost + (firstHalf/(secondHalf+firstHalf))*milepostDelta;
}

/* ************* Schedule querying ***************** */
function timepointToTime(timepoint){
  var time = new Date();
  time.setHours(timepoint.split(":")[0]);
  time.setMinutes(timepoint.split(":")[1]);
  time.setSeconds(0);
  return time;
}

function getActiveTrains(time) {
  var activeTrains = [];

  for(var train in window.schedule){
    var stops = window.schedule[train];
    var journeyStart = timepointToTime(stops[0][1]);
    var journeyEnd = timepointToTime(stops[stops.length-1][1]);
    if(journeyStart < time && journeyEnd > time){
      activeTrains.push([train, stops]);
    }
  }
  return activeTrains;
}
/* ************* Position calculation ************** */

function trainPositionInterpolated(start, end, time){
  var startTime = timepointToTime(start[1]);
  var endTime = timepointToTime(end[1]);
  endTime = new Date(endTime - dwellTime(endTime));

  var segmentDuration = endTime-startTime;
  var segmentCompleted = time-startTime;

  if(time > endTime){
    position = 1;
  } else {
    position = segmentCompleted/segmentDuration;
  }

  var startMilepost;
  for(var i = 0; i < STATIONS.length; i++) {
    if(STATIONS[i].name == start[0]) {
      startMilepost = STATIONS[i].milepost;
      break;
    }
  }

  var endMilepost;
  for(var i = 0; i < STATIONS.length; i++) {
    if(STATIONS[i].name == end[0]) {
      endMilepost = STATIONS[i].milepost;
      break;
    }
  }
  if(startMilepost === undefined) {
    throw new Error('Milepost "'+start[0]+'" not found');
  }
  if(endMilepost === undefined) {
    throw new Error('Milepost "'+start[0]+'" not found');
  }

  var distance = endMilepost - startMilepost;
  return startMilepost + (distance * position);
}

/* Given a train, figure out where on the line it should be right now */
function trainPosition(time, stops){
  for(var idx = 0; idx < stops.length; idx++){
    if(time < timepointToTime(stops[idx][1])){
      /* it's between thisTrain[idx-1] and thisTrain[idx] */
      return trainPositionInterpolated(stops[idx-1], stops[idx], time);
    }
  }
}

function nextStopPosition(time, stops) {
  for(var idx = 0; idx < stops.length; idx++){
    if(time < timepointToTime(stops[idx][1])){
      for(var i = 0; i < STATIONS.length; i++) {
        if(STATIONS[i].name == stops[idx][0]) {
          return STATIONS[i].milepost;
        }
      }
    }
  }
  return null;
}

/* ************* My Location drawing *************** */

var myLocationMarker;

function updateMyLocationOnMap(milepost) {
  if(!myLocationMarker) {
    map.setStart();

    var outerCircle = map.circle(0, 0, 8, 8);
    outerCircle.attr('fill', 'white');
    outerCircle.attr('stroke', 'green');
    outerCircle.attr('stroke-width', 3);

    var innerDot = map.circle(0, 0, 3, 3);
    innerDot.attr('fill', 'green');
    innerDot.attr('stroke', 'clear');


    myLocationMarker = map.setFinish();
  }

  var x = (SOUTH_X_POSITION+NORTH_X_POSITION)/2;
  var y = milepost*verticalScale+40;

  myLocationMarker.transform('t'+x+','+y);
}

/* ************* Train drawing ********************* */

var trainsOnMap = {};

function isNorthboundTrain(name) {
  return "13579".indexOf(name[2]) != -1;
}

function isBulletTrain(name) {
  return name[0] == '3' || name[0] == '8';
}
function isLimitedTrain(name) {
  return name[0] == '2';
}


function createTrain(name) {
  var pointerToNextStop = map.path("M0 0L10 10");
  pointerToNextStop.attr({
    'arrow-end': 'open',
    'stroke-width': 1.5
  });

  map.setStart();

  var background = map.rect(-20, -10, 40, 20, 5);
  if(isBulletTrain(name)) {
    background.attr('fill', '#F0B2A1');
  } else if(isLimitedTrain(name)) {
    background.attr('fill', '#F7E89D');
  } else {
    background.attr('fill', 'white');
  }

  var namePath = map.text(0, 0, name);
  namePath.attr('font-size', 12)

  var train = map.setFinish();

  train.pointerToNextStop = pointerToNextStop;

  return train;
}

function placeTrain(train, x, y, nextX, nextY) {
  var t = 't'+x+','+y;
  train.transform(t);
  train.yPosition = y;

  var curveShift = (y > nextY) ? 20 : -20;

  var controlX = x + curveShift;
  var controlY = (y+nextY)/2;

  train.pointerToNextStop.attr('path', Raphael.format("M{0},{1}Q{2},{3},{4},{5}", x, y, controlX, controlY, nextX, nextY));
  train.toFront();
}

function drawTrains(time) {
  var activeTrains = getActiveTrains(time);

  for(var i = 0; i < activeTrains.length; i++) {
    var name = activeTrains[i][0];
    var stops = activeTrains[i][1];

    if(!trainsOnMap[name]) {
      var train = createTrain(name);
      trainsOnMap[name] = train;
    } else {
      var train = trainsOnMap[name];
    }

    var x = isNorthboundTrain(name) ? NORTH_X_POSITION : SOUTH_X_POSITION;
    var yPosition = trainPosition(time, stops);
    yPosition = Math.round(yPosition*50) / 50;

    var y = yPosition*verticalScale + 40;

    if(train.yPosition != y) {
      placeTrain(train, x, y, x, nextStopPosition(time, stops)*verticalScale+40);
    }
  }

  for(var name in trainsOnMap) {
    var keep = false;
    for(var i = 0; i < activeTrains.length; i++) {
      if(activeTrains[i][0] == name) {
        keep = true;
        break;
      }
    }
    if(!keep) {
      var el = trainsOnMap[name];
      el.remove();
      el.pointerToNextStop.remove();
      delete trainsOnMap[name];
    }
  }
}

/* ************* Background map drawing ************ */

function drawMap(stations) {
  var routePath = map.path("M0 0L0 1560M1 0L-10 10M-1 0L10 10");
  routePath.attr('stroke-width', 4);

  var label = map.text(NORTH_X_POSITION, 10,"N");
  label.attr('font-size', 14);
  label.attr('font-weight', 'bold');

  var north = routePath.clone();
  north.transform("t"+NORTH_X_POSITION+",20")

  label = map.text(SOUTH_X_POSITION, 10, "S");
  label.attr('font-size', 14);
  label.attr('font-weight', 'bold');

  var south = routePath.clone();
  south.transform("s1,-1,0,800t"+SOUTH_X_POSITION+",20");

  var topY = 40;
  var bottomY = map.height-40;

  window.verticalScale = (bottomY-topY)/(stations[stations.length-1].milepost);

  for(var i = 0; i < stations.length; i++) {
    var name = stations[i].name;
    var miles = stations[i].milepost;

    var t = map.text(SOUTH_X_POSITION-30, topY+miles*verticalScale, name);
    t.attr('font-size', 14);
    t.attr('text-anchor', 'end');

    var c = map.circle(NORTH_X_POSITION, topY+miles*verticalScale, 6);
    c.attr('fill', 'white');
    c.attr('stroke', 'red');
    c.attr('stroke-width', 2);

    var c = map.circle(SOUTH_X_POSITION, topY+miles*verticalScale, 6);
    c.attr('fill', 'white');
    c.attr('stroke', 'red');
    c.attr('stroke-width', 2);
  }
  routePath.remove();
}
