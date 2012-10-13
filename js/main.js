COLOR_LIMITED = "#F7E89D";
COLOR_BULLET = "#F0B2A1";
FAST_FORWARD_SPEED = 3000;
nowOverride = undefined;
schedule = undefined;
nowOffset = 0;
fastForward = false;

function scheduleForToday(){
  var today = new Date();
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
      nowOverride = ui.value;
    },
    change: function(event, ui){
      if(event.originalEvent !== undefined){
        nowOverride = undefined;
        nowOffset = ui.value-(new Date()).getTime();
      }
    }
  });

  $("#fastforward").change(function(){
    fastForward = this.checked;
  });

  $("input[name=daytype]").click(function(){
    schedule = SCHEDULES[$(this).val()];
  });

  $("input[value="+scheduleForToday()+"]").click();
});

function now(){
  if(nowOverride !== undefined){
    return new Date(nowOverride);
  }
  var myDate = new Date((new Date()).getTime()+nowOffset);
  return myDate;
}

function timepointToTime(timepoint){
  var time = new Date();
  time.setHours(timepoint.split(":")[0]);
  time.setMinutes(timepoint.split(":")[1]);
  time.setSeconds(0);
  return time;
}

function drawTrain(x, y, num){
  x = Math.floor(x);
  y = Math.floor(y);
  /*console.log("Drawing train at "+x+","+y);*/
  var ctx = document.getElementById('system_map').getContext('2d');
  ctx.fillStyle = "white";
  if(num[0] == "3"){
    ctx.fillStyle = COLOR_BULLET;
  }
  if(num[0] == "2"){
    ctx.fillStyle = COLOR_LIMITED;
  }
  ctx.beginPath();
  ctx.moveTo(x-20, y-10);
  ctx.lineTo(x-20, y+10);
  if(num % 2 == 0){
    // southbound
    ctx.lineTo(x, y+18);
  }
  ctx.lineTo(x+20, y+10);
  ctx.lineTo(x+20, y-10);
  if(num % 2 == 1){
    // northbound
    ctx.lineTo(x, y-18);
  }
  ctx.lineTo(x-20, y-10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "black";
  ctx.font = "18px arial";
  if(num % 2 == 0){
    // southbound
    ctx.fillText(num, x-16, y+8);
  } else {
    // northbound
    ctx.fillText(num, x-16, y+4);
  }
}

function interpolateTrainPosition(start, end){
  var startTime = new Date();
  startTime.setHours(start[1].split(":")[0]);
  startTime.setMinutes(start[1].split(":")[1]);
  startTime.setSeconds(0);
  var endTime = new Date();
  endTime.setHours(end[1].split(":")[0]);
  endTime.setMinutes(end[1].split(":")[1]);
  endTime.setSeconds(0);
  endTime.setMinutes(endTime.getMinutes()-1);
  var segmentDuration = endTime-startTime;
  var segmentCompleted = now()-startTime;

  var x = stations[start[0]][0];
  var y = stations[start[0]][1];
  
  var xdist = stations[end[0]][0]-x;
  var ydist = stations[end[0]][1]-y;

  if(now() > endTime){
    position = 1;
  } else {
    position = segmentCompleted/segmentDuration;
  }
  return [x+(xdist*position), y+(ydist*position)];
}

/* Given a train, figure out where on the line it should be right now */
function placeTrain(train){
  var thisTrain = schedule[train];
  for(var idx = 0; idx < thisTrain.length; idx++){
    if(now() < timepointToTime(thisTrain[idx][1])){
      /* it's between thisTrain[idx-1] and thisTrain[idx] */
      return interpolateTrainPosition(thisTrain[idx-1], thisTrain[idx]);
    }
  }
}

function updateTrains(){
  if(schedule === undefined){
    return;
  }
  $("#now").text(now().toString());
  $("#timeSlider").slider({value: now().getTime()});
  var map = document.getElementById('system_map').getContext('2d');
  map.drawImage(img, 0, 0, 600, 1600);
  var activeTrains = [];
  /* Determine the set of trains currently on the line */
  for(train in schedule){
    stops = schedule[train];
    if(timepointToTime(stops[0][1]) < now() && timepointToTime(stops[stops.length-1][1]) > now()){
      activeTrains.push(train);
    }
  }
  /* Figure out where they should be */
  for(var idx = 0; idx < activeTrains.length; idx++){
    var coords = placeTrain(activeTrains[idx]);
    drawTrain(coords[0], coords[1], activeTrains[idx]);
  }
}

function Train(schedule) {
  this.schedule = schedule;

  this.stack = map.set();

  var background = map.rect(0, 0, 40, 50);
  background.attr({
    'stroke': 'black',
    'fill': 'white'
  });
  this.stack.push(background);
}

Train.prototype.move = function(startStation, endStation) {
}

function drawMap(mileposts) {
  map = Raphael($('#map').get(0));
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

  var factor = (bottomY-topY)/(mileposts[mileposts.length-1][1]);

  for(var i = 0; i < mileposts.length; i++) {
    var name = mileposts[i][0];
    var miles = mileposts[i][1];

    var t = map.text(220, topY+miles*factor, name);
    t.attr('font-size', 14);
    t.attr('text-anchor', 'end');

    var c = map.circle(240, topY+miles*factor, 6);
    c.attr('fill', 'white');
    c.attr('stroke', 'red');
    c.attr('stroke-width', 2);

    var c = map.circle(290, topY+miles*factor, 6);
    c.attr('fill', 'white');
    c.attr('stroke', 'red');
    c.attr('stroke-width', 2);
  }
}

$.getJSON("stations.json", function(data){
  stations = data;
});

$.getJSON("mileposts.json", function(data){
  mileposts = data;
  drawMap(mileposts);
});
