stations = {
  "San Francisco": [440, 72],
  "22nd St.": [400, 103],
  "Menlo Park": [219, 731],
  "Redwood City": [203, 639],
  "San Carlos": [202, 574],
  "Belmont": [202, 540],
  "Hillsdale": [202, 494],
  "Hayward Park": [209, 464],
  "San Jose": [366, 1195],
  "Gilroy": [374, 1497]
}

/* WEEKDAY */
/*
schedule = {
  "276": [
    ["San Francisco", "17:27"],
    ["22nd St.", "17:32"]
  ],
  "378": [
    ["San Francisco", "17:33"]
  ]
}
*/

/* WEEKEND */
schedule = {
  "447": [
    ["San Jose", "20:00"],
    ["Menlo Park", "20:34"],
    ["Redwood City", "20:41"],
    ["San Carlos", "20:45"],
    ["San Francisco", "21:36"]
  ]
}

$(function(){
  $('#system_map').click(function(evt){
    topOffset = $(this).offset().top;
    leftOffset = $(this).offset().left;

    console.log((evt.pageX-leftOffset)+", "+(evt.pageY-topOffset));
  });
});

var img = new Image();
img.onload = function(){
  var map = document.getElementById('system_map').getContext('2d');
  map.drawImage(img, 0, 0, 600, 1600);
};
img.src = "Caltrain+Zone+Map.jpg";

function drawTrain(x, y){
  /*console.log("Drawing train at "+x+","+y);*/
  var map = document.getElementById('system_map').getContext('2d');
  map.beginPath();
  map.arc(x, y, 11, 0, Math.PI*2, false);
  map.fill();
}

function interpolateTrainPosition(startStation, endStation, position){
  var x = stations[startStation][0];
  var y = stations[startStation][1];
  
  var xdist = stations[endStation][0]-x;
  var ydist = stations[endStation][1]-y;

  return [x+(xdist*position), y+(ydist*position)];
}

/* b-a in minutes */
function timeSubtract(a, b){
  aparts = a.split(":");
  bparts = b.split(":");
  return (aparts[0]*60+aparts[1]) - (bparts[0]*60+bparts[1]);
}

/* Given a train, figure out where on the line it should be right now */
function placeTrain(train){
  var thisTrain = schedule[train];
  var now = (new Date()).toTimeString().slice(0, 5);
  for(var idx = 0; idx < thisTrain.length; idx++){
    if(now < thisTrain[idx][1]){
      /* it's between thisTrain[idx-1] and thisTrain[idx] */
      var segmentDuration = timeSubtract(thisTrain[idx][1], thisTrain[idx-1][1]);
      var segmentCompleted = timeSubtract(now, thisTrain[idx-1][1]);
      /* TODO: actually calculate the position */
      return interpolateTrainPosition(thisTrain[idx-1][0], thisTrain[idx][0], segmentCompleted/segmentDuration);
    }
  }
}

function updateTrains(){
  var map = document.getElementById('system_map').getContext('2d');
  map.drawImage(img, 0, 0, 600, 1600);
  var d = new Date();
  var now = d.toTimeString().slice(0, 5);
  var activeTrains = [];
  /* Determine the set of trains currently on the line */
  for(train in schedule){
    stops = schedule[train];
    if(stops[0][1] < now && stops[stops.length-1][1] > now){
      activeTrains.push(train);
    }
  }
  /* Figure out where they should be */
  for(var idx = 0; idx < activeTrains.length; idx++){
    var coords = placeTrain(activeTrains[idx]);
    drawTrain(coords[0], coords[1]);
  }
}

setInterval(updateTrains, 1000);
