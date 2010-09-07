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
    $.getJSON($(this).val()+"_schedule.json", function(data){
      schedule = data;
    });
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

var img = new Image();
img.onload = function(){
  var map = document.getElementById('system_map').getContext('2d');
  map.drawImage(img, 0, 0, 600, 1600);
};
img.src = "Caltrain+Zone+Map.jpg";

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
  ctx.fillRect(x-20, y-10, 40, 20);
  ctx.beginPath();
  if(num % 2 == 1){
    ctx.moveTo(x-20, y-9);
    ctx.lineTo(x, y-15);
    ctx.lineTo(x+20, y-9);
  } else {
    ctx.moveTo(x-20, y+9);
    ctx.lineTo(x, y+15);
    ctx.lineTo(x+20, y+9);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "black";
  ctx.font = "18px arial";
  ctx.fillText(num, x-16, y+6);
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

  try{
  var x = stations[start[0]][0];
  var y = stations[start[0]][1];
  
  var xdist = stations[end[0]][0]-x;
  var ydist = stations[end[0]][1]-y;
} catch(e){
  console.log(start[0]);
}

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

function refresh(){
  if(fastForward){
    nowOffset += FAST_FORWARD_SPEED;
  }
  updateTrains();
}

setInterval(refresh, 50);

$.getJSON("stations.json", function(data){
  stations = data;
});

