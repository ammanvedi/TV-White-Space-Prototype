


console.log(normalised);
console.log(style_black_blue);

var bandskeymap = {};
var map;
var Gheatmap = null;
var HEATMAP_DATA_CACHE = {};
var marker;
var graphobj;
var currentband = 0;

var graphdatasets = [
{
  lineColor : 'rgba(220,220,220,1)',
  pointColor : 'rgba(220,220,220,1)',
  pointStrokeColor : '#fff',
  data : [[normalised["bands"][0], -2], [normalised["bands"][1], 1.3], [normalised["bands"][2], 0], [normalised["bands"][3], 1.5], [normalised["bands"][4], 1]
  , [normalised["bands"][5], 1], [normalised["bands"][6], 1], [normalised["bands"][7], 1]]
},{
  lineColor : 'rgba(0,0,225,1)',
  pointColor : 'rgba(220,220,220,1)',
  pointStrokeColor : '#fff',
  data : [[ normalised["bands"][1] ,0],[ normalised["bands"][1] ,100]]
}


];


normalised["bands"].forEach(function(band, idx){

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

function findNearestDataPoints(lat, lng)
{
  //find nearest points within dataset nearest to the
  //passed arg lat lng
  var point = new google.maps.LatLng(lat, lng);
  var distance = Infinity;
  var calcdist;
  var lowestidx;
  var comparepoint;
  tenmeterunnorm["points"].forEach(function(points, idx){
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
  console.log(normalised["points"][lowestidx]);

  return tenmeterunnorm["points"][lowestidx];
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

  graphobj = new Xy(ctx, {width:150, height:100, labelFontSize:6
                          , pointCircleRadius:2, pointStrokeWidth: 1, lineWidth:2});

  graphobj.draw(graphdatasets);

}

function updateBandIndicator()
{

  console.log(graphobj.rangeY[0]);
  //set lower point to current band
  graphdatasets[1]["data"][0][0] =  normalised["bands"][currentband];
  graphdatasets[1]["data"][1][0] =  normalised["bands"][currentband];
  graphdatasets[1]["data"][1][1] = graphobj.rangeY[1];
  graphobj.draw(graphdatasets);

}

function bandsliderchange()
{
  var renderband = bandskeymap[parseFloat($("#bandslider").val()).toFixed(2)];
  mapBand(renderband, map, normalised);
  currentband = renderband;
  updateBandIndicator();
}

function userdiddropmarker(dropevent)
{
  console.log(dropevent);
  var near = findNearestDataPoints(dropevent["latLng"].k, dropevent["latLng"].D);
  redrawgraph(near["spectrum"]);
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

  map.setCenter({lat:normalised["points"][0].lat, lng:normalised["points"][0].lon});

  calibrateControl(normalised["bands"], normalised["band_width"])
  mapBand(0, map, normalised);
  createChart();

  marker = new google.maps.Marker({
    map:map,
    draggable:true,
    animation: google.maps.Animation.DROP,
    position: map.getCenter()
  });

  var nearest = findNearestDataPoints(normalised["points"][0].lat, normalised["points"][0].lon);
  redrawgraph(nearest["spectrum"]);

  google.maps.event.addListener(marker, 'dragend', userdiddropmarker);

}

google.maps.event.addDomListener(window, 'load', initialize);
