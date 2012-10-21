COLOR_LIMITED = "#F7E89D";
COLOR_BULLET = "#F0B2A1";
FAST_FORWARD_SPEED = 3000;
DWELL_TIME = 90; /* seconds */
nowOverride = undefined;
schedule = undefined;
nowOffset = 0;
fastForward = false;

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

  $(".slider").slider({
    min: dayStart.getTime(),
    max: dayEnd.getTime(),
    value: current.getTime(),
    slide: function(event, ui){
      window.virtualTime = ui.value;
    }
  });

  $("#fastforward").change(function(){
    window.fastForward = this.checked;
  });

  $("input[name=daytype]").click(function(){
    window.schedule = SCHEDULES[$(this).val()];
  });

  $("input[value="+scheduleForDay(new Date())+"]").click();

  drawMap(mileposts);
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

  var currentSliderValue = $('.slider').slider('value');
  if(Math.abs(currentSliderValue-window.virtualTime) > 1000) {
    $('#now').text(now.toString());
    $('.slider').slider('value', window.virtualTime);
  }

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
  endTime = new Date(endTime - DWELL_TIME*1000);

  var segmentDuration = endTime-startTime;
  var segmentCompleted = time-startTime;

  if(time > endTime){
    position = 1;
  } else {
    position = segmentCompleted/segmentDuration;
  }

  var startMilepost;
  for(var i = 0; i < mileposts.length; i++) {
    if(mileposts[i][0] == start[0]) {
      startMilepost = mileposts[i][1];
      break;
    }
  }

  var endMilepost;
  for(var i = 0; i < mileposts.length; i++) {
    if(mileposts[i][0] == end[0]) {
      endMilepost = mileposts[i][1];
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

  return train;
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

    var x = isNorthboundTrain(name) ? 240 : 290;
    var yPosition = trainPosition(time, stops);
    yPosition = Math.round(yPosition*50) / 50;

    var y = yPosition*verticalScale + 40;
    var t = 't'+x+','+y;

    if(train.yPosition != y) {
      train.transform(t);
      train.yPosition = y;
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
      delete trainsOnMap[name];
    }
  }
}

/* ************* Background map drawing ************ */

function drawMap(mileposts) {
  var label = map.text(240, 10,"N");
  label.attr('font-size', 14);
  label.attr('font-weight', 'bold');
  var north = map.path("M240 20L240 1580M241 20L230 30M239 20L250 30");
  north.attr('stroke-width', 4);

  label = map.text(290, 10, "S");
  label.attr('font-size', 14);
  label.attr('font-weight', 'bold');
  var south = map.path("M240 20L240 1580M241 20L230 30M239 20L250 30");
  south.attr('stroke-width', 4);
  south.transform("t50,0s1,-1,240,800")

  var topY = 40;
  var bottomY = map.height-40;

  window.verticalScale = (bottomY-topY)/(mileposts[mileposts.length-1][1]);

  for(var i = 0; i < mileposts.length; i++) {
    var name = mileposts[i][0];
    var miles = mileposts[i][1];

    var t = map.text(220, topY+miles*verticalScale, name);
    t.attr('font-size', 14);
    t.attr('text-anchor', 'end');

    var c = map.circle(240, topY+miles*verticalScale, 6);
    c.attr('fill', 'white');
    c.attr('stroke', 'red');
    c.attr('stroke-width', 2);

    var c = map.circle(290, topY+miles*verticalScale, 6);
    c.attr('fill', 'white');
    c.attr('stroke', 'red');
    c.attr('stroke-width', 2);
  }
}
