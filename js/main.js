


console.log(datasettouse);
console.log(style_black_blue);

var bandskeymap = {};
var map;
var Gheatmap = null;
var HEATMAP_DATA_CACHE = {};
var marker;
var graphobj;
var currentband = 0;
var currentThreshold = -30;
var pointdata;
var datasettouse = peakpower;
var mappingdataset = peakpowernormalised;
var BANDWIDTH = datasettouse["band_width"];

var graphdatasets = [
{//frequency power
  lineColor : 'rgba(0,255,0,1)',
  pointColor : 'rgba(0,150,0,1)',
  pointStrokeColor : '#fff',
  data : [[datasettouse["bands"][0], -2], [datasettouse["bands"][1], 1.3], [datasettouse["bands"][2], 0], [datasettouse["bands"][3], 1.5], [datasettouse["bands"][4], 1]
  , [datasettouse["bands"][5], 1], [datasettouse["bands"][6], 1], [datasettouse["bands"][7], 1]]
},{//start band
  lineColor : 'rgba(0,0,225,1)',
  pointColor : 'rgba(220,220,220,0)',
  pointStrokeColor : '#fff',
  data : [[ datasettouse["bands"][1] ,0],[ datasettouse["bands"][1] ,-50]]
},{//end band
  lineColor : 'rgba(0,0,225,1)',
  pointColor : 'rgba(220,220,220,0)',
  pointStrokeColor : '#fff',
  data : [[ datasettouse["bands"][1] + BANDWIDTH ,0],[ datasettouse["bands"][1] + BANDWIDTH,-100]]
},{//threshold
  lineColor : 'rgba(225,0,0,1)',
  pointColor : 'rgba(220,220,220,0)',
  pointStrokeColor : '#fff',
  data : [[ datasettouse["bands"][0] ,currentThreshold],[ datasettouse["bands"][datasettouse["bands"].length-1] , currentThreshold] ]
}


];


datasettouse["bands"].forEach(function(band, idx){

  bandskeymap[band.toFixed(2)] = idx;

});



function calibrateControl(bands, bandwidth)
{

  var rangedata = {};
  var snappoints = bands.length;
  var step = 100.0/snappoints;

  for (var i = 0; i < snappoints; i++) {
     if(i == 0)
     {
       rangedata['min'] = bands[i];
       continue;
     }

     if(i == (snappoints - 1))
     {
       rangedata['max'] = bands[i];
       continue;
     }

     var stepval = (step*i + '%');
     rangedata[stepval] = bands[i];


   }


  $("#bandslider").noUiSlider({

    behaviour: 'tap',
    start: [ 500],
    snap:true,
    range: rangedata,
  });

  // Bind the color changing function
  // to the slide event.
  $('#bandslider').on('slide', bandsliderchange);

}

function calibrateFreeChannelSlider()
{
  $('#thresholdslider').noUiSlider({
    behaviour: 'tap',
    start: [-30],
    range: {
      'min': -50,
      'max': 10
    },
  });

  $('#thresholdslider').on('slide', thresholdchanged);
  determineFreeChannels($('#thresholdslider').val());
}

function drawThreshold(threshval)
{
//[[ datasettouse["bands"][0] ,currentThreshold],[ datasettouse["bands"][datasettouse["bands"].length-1] , currentThreshold] ]
graphdatasets[3]["data"][0][1] = threshval;
graphdatasets[3]["data"][1][1] = threshval;
}

function determineFreeChannels(threshold)
{
  //current point is pointdata
  //which bands are free?

  var freebands = [];

  pointdata["spectrum"].forEach(function(bandpower, bandidx){
    if(bandpower < threshold)
    {
      freebands.push(bandidx);
    }
  });
  $("#channelsfree").html(freebands.length);
  displayFreeChannels(freebands);
  console.log(freebands);
}

function displayFreeChannels(freechannels)
{
  //draw free channel divs
  if(freechannels.length == 0 )
  {
    //no free channels found
    //display consistant message
    $("#freechanneldata").html("<div id=\"nochannels\"><h1>OOPS! There are no free bands to show</h1></div>");
    return;
  }

  var divtext = "";
  freechannels.forEach(function(indexofband){
    divtext += " <div class=\"freechannelinfo\"><div class=\"channeltext\">" + datasettouse["bands"][indexofband] +  " MHz →" +  parseFloat(datasettouse["bands"][indexofband] + BANDWIDTH).toFixed(2) + " MHz"+ "</div><div class=\"freeicon\"><p>free!</p></div></div>"
    console.log(divtext);
  });

  $("#freechanneldata").html(divtext);
}

function thresholdchanged()
{
  //redraw threshold line to graph
  drawThreshold($('#thresholdslider').val());
  determineFreeChannels($('#thresholdslider').val());
  //redraw
  graphobj.draw(graphdatasets, true);
}

function findNearestDataPoints(lat, lng)
{
  //find nearest points within dataset nearest to the
  //passed arg lat lng
  var point = new google.maps.LatLng(lat, lng);
  var distance = Infinity;
  var calcdist;
  var lowestidx;
  var comparepoint;
  datasettouse["points"].forEach(function(points, idx){
    comparepoint = new google.maps.LatLng(points.lat, points.lon);
    //distance from this point
    calcdist = google.maps.geometry.spherical.computeDistanceBetween(point, comparepoint);

    if(calcdist < distance)
    {
      //we have reached a new low....
      distance = calcdist;
      lowestidx = idx;
    }

  });

  console.log("lowest item at points index " + lowestidx + " and the distance is " + distance);
  console.log(datasettouse["points"][lowestidx]);

  return datasettouse["points"][lowestidx];
}


function mapBand(whichband, map, normdataset) {
  var lowend = normdataset["bands"][whichband];
  var highend = normdataset["bands"][whichband] + normdataset["band_width"];


  var heatmap;

  if(HEATMAP_DATA_CACHE[whichband] != undefined)
  {
    //is cached
    console.log("Loading from cache")
    heatmap = HEATMAP_DATA_CACHE[whichband];

  }else {
    //not cached
    heatmap = [];
    //create weightedlocation array from data to pass to heatmap
    normdataset["points"].forEach(function(point){

      var weightedLoc = {

        location: new google.maps.LatLng(point.lat, point.lon),
        weight: point["spectrum"][whichband]

      }

      heatmap.push(weightedLoc);

    });

    //should now cache the data
    HEATMAP_DATA_CACHE[whichband] = heatmap;
  }





  if(Gheatmap == null)
  {
    Gheatmap = new google.maps.visualization.HeatmapLayer({
      data: heatmap,
      radius: 45
    });
  }else{
    Gheatmap.setData(heatmap);
  }

  Gheatmap.setMap(map);


}

function redrawgraph(bandpowers)
{
  //update dataset with closest point data
  graphdatasets[0]["data"].forEach(function(point, idx){
    point[1] = bandpowers[idx];
    console.log(point);
  });

  //redraw
  graphobj.draw(graphdatasets, true);
}



function createChart()
{


  var ctx = document.getElementById('frequencyChart').getContext('2d');

  graphobj = new Xy(ctx, {width:300, height:200, labelFontSize:10
                          , pointCircleRadius:5, pointStrokeWidth: 1, lineWidth:2, rangeY: [-50, 20]});

  graphobj.draw(graphdatasets);

}

function updateBandIndicator()
{

  console.log(graphobj.rangeY[0]);
  //set lower point to current band
  graphdatasets[1]["data"][0][0] =  datasettouse["bands"][currentband];
  graphdatasets[1]["data"][1][0] =  datasettouse["bands"][currentband];
  graphdatasets[1]["data"][1][1] = graphobj.rangeY[0];

  graphdatasets[2]["data"][0][0] =  datasettouse["bands"][currentband] + BANDWIDTH;
  graphdatasets[2]["data"][1][0] =  datasettouse["bands"][currentband] + BANDWIDTH;
  graphdatasets[2]["data"][1][1] = graphobj.rangeY[0];

  graphobj.draw(graphdatasets);

}

function bandsliderchange()
{
  var renderband = bandskeymap[parseFloat($("#bandslider").val()).toFixed(2)];
  mapBand(renderband, map, peakpowernormalised);
  currentband = renderband;
  updateBandIndicator();
  updateBandText(currentband);
}

function userdiddropmarker(dropevent)
{
  //console.log(dropevent);
  var near = findNearestDataPoints(dropevent["latLng"].k, dropevent["latLng"].D);
  redrawgraph(near["spectrum"]);
  console.log(near);
  var measurementdate = new Date(near["ts"]*1000);
  console.log(measurementdate);
  pointdata = near;
  updateBandIndicator();
  //update the marker text
  updateMarkerText(dropevent["latLng"].k, dropevent["latLng"].D);
  updateDateText(measurementdate);
  thresholdchanged();
}

function updateDateText(dateobj)
{
  $("#datetext").html(dateobj.toString());
}


function updateMarkerText(lat, lng)
{
  $("#latitudetext").html("LAT : " + lat);
  $("#longitudetext").html("LNG : " + lng);
}

function updateBandText(bandnumber)
{
  var upperlimit = datasettouse["bands"][bandnumber] + BANDWIDTH
  $("#bandtext").html(datasettouse["bands"][bandnumber] + " MHz ⇒ " + upperlimit + " MHz");
  //update text in map overlay also
  $("#displayindicator").html("<h1>Now Showing Heatmap For Band</h1><p>" + datasettouse["bands"][bandnumber] + " MHz ⇒ " + upperlimit + " MHz</p>")

}



function initialize() {
  var mapOptions = {
    center: { lat: -34.397, lng: 150.644},
    zoom: 16,
    styles: style_blue,
    disableDefaultUI: true
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
  mapOptions);

  map.setCenter({lat:datasettouse["points"][0].lat, lng:datasettouse["points"][0].lon});

  updateMarkerText(datasettouse["points"][0].lat, datasettouse["points"][0].lon);

  calibrateControl(datasettouse["bands"], datasettouse["band_width"]);
  mapBand(0, map, peakpowernormalised);
  createChart();

  marker = new google.maps.Marker({
    map:map,
    draggable:true,
    animation: google.maps.Animation.DROP,
    position: map.getCenter()
  });
  pointdata = findNearestDataPoints(datasettouse["points"][0].lat, datasettouse["points"][0].lon);
  var nearest = findNearestDataPoints(datasettouse["points"][0].lat, datasettouse["points"][0].lon);
  redrawgraph(nearest["spectrum"]);
  updateBandIndicator();
  calibrateFreeChannelSlider();
  updateBandText(currentband);
  google.maps.event.addListener(marker, 'dragend', userdiddropmarker);

}


google.maps.event.addDomListener(window, 'load', initialize);
