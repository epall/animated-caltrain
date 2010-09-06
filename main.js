stations = {
  "San Francisco": [440, 72],
  "22nd Street": [400, 103],
  "Bayshore": [336, 157],
  "So. San Francisco": [269, 233],
  "San Bruno": [194, 269],
  "Millbrae": [185, 320],
  "Broadway": [193, 360],
  "Burlingame": [205, 389],
  "San Mateo": [213, 427],
  "Hayward Park": [209, 464],
  "Hillsdale": [202, 494],
  "Belmont": [202, 540],
  "San Carlos": [202, 574],
  "Redwood City": [203, 639],
  "Menlo Park": [219, 731],
  "Palo Alto": [222, 766],
  "California Ave": [229, 810],
  "San Antonio": [234, 883],
  "Mountain View": [254, 926],
  "Sunnyvale": [284, 997],
  "Lawrence": [313, 1040],
  "Santa Clara": [356, 1127],
  "San Jose": [366, 1195],
  "Tamien": [362, 1241],
  "Capitol": [374, 1300],
  "Blossom Hill": [377, 1386],
  "Morgan Hill": [377, 1432],
  "San Martin": [375, 1467],
  "Gilroy": [374, 1497]
}

COLOR_LIMITED = "#F7E89D";
COLOR_BULLET = "#F0B2A1";

$(function(){
  $('#system_map').click(function(evt){
    topOffset = $(this).offset().top;
    leftOffset = $(this).offset().left;

    console.log("["+(evt.pageX-leftOffset)+", "+(evt.pageY-topOffset)+"],");
  });
});

var img = new Image();
img.onload = function(){
  var map = document.getElementById('system_map').getContext('2d');
  map.drawImage(img, 0, 0, 600, 1600);
};
img.src = "Caltrain+Zone+Map.jpg";

function drawTrain(x, y, num){
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
  /*
  ctx.beginPath();
  ctx.arc(x, y, 11, 0, Math.PI*2, false);
  ctx.fill();
  */
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
      /* TODO: higher-resolution interpolation */
      var segmentDuration = timeSubtract(thisTrain[idx][1], thisTrain[idx-1][1]);
      var segmentCompleted = timeSubtract(now, thisTrain[idx-1][1]);
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
      /*console.log(train+" is active");*/
      activeTrains.push(train);
    }
  }
  /* Figure out where they should be */
  for(var idx = 0; idx < activeTrains.length; idx++){
    var coords = placeTrain(activeTrains[idx]);
    drawTrain(coords[0], coords[1], activeTrains[idx]);
  }
}

$.getJSON("trains.json", function(data){
  schedule = data;
  updateTrains();
  setInterval(updateTrains, 1000);
});

