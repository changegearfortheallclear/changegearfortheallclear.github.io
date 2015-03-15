
function initialize() {
  var mapOptions = {
    center: { lat: 51.7991, lng: 0.93880},
    zoom: 7,
    disableDefaultUI: true,
    draggable: true,
    scrollwheel: true,
    disableDoubleClickZoom: true
  };

  mainMap = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  // load route

  Tabletop.init({ key: '1-Czw0MlN5oc4iUNMlOEjEIkOjsIQ6oGVz2z_2zSUCpY', callback: loadPath, simpleSheet: false, parseNumbers: true, prettyColumnNames: false })
  
}

function updateBounds(LatLngArray) {

  route.bounds = new google.maps.LatLngBounds();

  // path bounds

  route.bounds.extend(route.path[0]);
  route.bounds.extend(route.path[route.path.length-1]);

  // add bounds point to shift map to avoid title
  route.bounds.extend(new google.maps.LatLng(50.2110, -5.4800));

  // add points from array

  for (var i = 0; i < LatLngArray.length; i++) {
    route.bounds.extend(LatLngArray[i]);
  };

}

function loadPath(data) {

  route = {};
  markers = {};

  route.path = [];
  route.distances = [];

  var totalDistance = 0;

  for (var i = 0; i < data.path.elements.length; i++) {

    var latLng = new google.maps.LatLng(data.path.elements[i].lat, data.path.elements[i].lng);

    var distanceFromLast = (i === 0) ? 0 : google.maps.geometry.spherical.computeDistanceBetween(route.path[i-1], latLng)

    totalDistance += distanceFromLast;

    route.path.push(latLng);
    route.distances.push(distanceFromLast);

  };

  route.pathDistance = totalDistance;

  route.trueDistance = data.metadata.elements[2].truedistance;

  route.bikeDistance = data.metadata.elements[0].truedistance;
  route.rowDistance = data.metadata.elements[1].truedistance;

  markers.start = new google.maps.LatLng(data.markers.elements[0].lat, data.markers.elements[0].lng);
  markers.dover = new google.maps.LatLng(data.markers.elements[1].lat, data.markers.elements[1].lng);
  markers.calais = new google.maps.LatLng(data.markers.elements[2].lat, data.markers.elements[2].lng);
  markers.end = new google.maps.LatLng(data.markers.elements[3].lat, data.markers.elements[3].lng);

  console.log(route);

  initMap()

}

function initMap() {

  // path

  new google.maps.Polyline({
    map: mainMap,
    path: route.path,
    strokeColor: '#1267FF',
    strokeWeight: 10
  })

  progressPolyline = new google.maps.Polyline({
    map: mainMap,
    path: [markers.start],
    strokeColor: '#163B7F',
    strokeWeight: 10
  })

  // start/end markers

  var icon = {
    path: google.maps.SymbolPath.CIRCLE,
    strokeColor: '#ecf0f1',
    scale: 5
  }

  new google.maps.Marker({
    map: mainMap,
    position: markers.start,
    icon: icon
  })
  new google.maps.Marker({
    map: mainMap,
    position: markers.dover,
    icon: icon
  })
  new google.maps.Marker({
    map: mainMap,
    position: markers.calais,
    icon: icon
  })
  new google.maps.Marker({
    map: mainMap,
    position: markers.end,
    icon: icon
  })

  // progress marker

  progressMarker = new markerOverlay(mainMap, markers.start, route.bikeDistance, route.rowDistance);


  $(window).resize(resize);

  updateBounds([]);

  $(document).on('keypress', function(e) {
    if (e.key === 'r') { // refresh
      refreshData();
    }
    if (e.key === 'f') { // fullscreen

      var elem = $('body')[0];

      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    }
  })

  // init progress data

  progressData = Tabletop.init({ key: '1lSPcaGp-aKeI70Hk23ePsMK1D4Y9_HXlWsfwHT-i02Y', callback: updateProgress, simpleSheet: true, parseNumbers: true, prettyColumnNames: false })


  // auto update

  setInterval(refreshData, 5*60*1000) // 5 min
  
}

function resize(e) {

  //if (typeof e !== 'undefined') {

    mainMap.setZoom(8);

  //}

  var listener = google.maps.event.addListener(mainMap, "idle", function() { 

    mainMap.fitBounds(route.bounds);
    google.maps.event.removeListener(listener); 

  });

}

function refreshData() {

  $('#loading').removeClass('hidden');

  progressData.fetch();

}

function updateProgress(data) {

  $('#loading').addClass('hidden');

  console.log(data);

  var progress = (data[0].bike + data[0].row) / route.trueDistance

  if (progress > 1) {
    progress = 1;
  }

  var scaledProgress = progress * route.pathDistance;

  var runningTotal = 0;
  var progressPath = [route.path[0]];

  for (var i = 1; i < route.distances.length; i++) {

    if (scaledProgress <= runningTotal+route.distances[i]) {

      var firstPos = route.path[i-1];
      var secondPos = route.path[i];

      var fraction = (scaledProgress - runningTotal) / route.distances[i];

      progressMarker.setPosition(google.maps.geometry.spherical.interpolate(firstPos, secondPos, fraction), data[0].bike, data[0].row);

      progressPath.push(google.maps.geometry.spherical.interpolate(firstPos, secondPos, fraction));

      progressPolyline.setPath(progressPath);

      break;

    }
    else {
      runningTotal += route.distances[i]
      progressPath.push(route.path[i]);
    }
  }

  // sidebar values

  $('#totals_distance').text( ((data[0].bike+data[0].row)/1609.344).toFixed(1) + '/' + (route.trueDistance/1609.344).toFixed(1) );

  $('#totals_bestbike').text( (data[0].bestbike === 0) ? '-' : (data[0].bestbike/1609.344).toFixed(1) );
  $('#totals_bestbikename').text( (data[0].bestbike === 0) ? '-' : data[0].bestbikename );

  $('#totals_bestrow').text( (data[0].bestrow === 0) ? '-' : (data[0].bestrow/1609.344).toFixed(1) );
  $('#totals_bestrowname').text( (data[0].bestrow === 0) ? '-' : data[0].bestrowname );

}


// MarkerOverlay


markerOverlay.prototype = new google.maps.OverlayView();

/** @constructor */
function markerOverlay(map, position, bikeTotal, rowTotal) {

  // Now initialize all properties.
  this.map_ = map;
  this.position_ = position;

  this.bikeDist_ = 0;
  this.bikeTotal_ = bikeTotal;
  this.rowDist_ = 0;
  this.rowTotal_ = rowTotal;

  // Define a property to hold the image's div. We'll
  // actually create this div upon receipt of the onAdd()
  // method so we'll leave it null for now.
  this.div_ = null;

  // Explicitly call setMap on this overlay
  this.setMap(map);
}

/**
 * onAdd is called when the map's panes are ready and the overlay has been
 * added to the map.
 */
markerOverlay.prototype.onAdd = function() {



  var div = $($('#progress_marker_templ').html())[0];

  this.div_ = div;

  // Add the element to the "overlayImage" pane.
  var panes = this.getPanes();
  panes.overlayImage.appendChild(this.div_);
};

markerOverlay.prototype.draw = function() {

  var bikeRing = $('#bikeRing');
  var rowRing = $('#rowRing');

  var bikeLen = bikeRing[0].getTotalLength();
  var rowLen = rowRing[0].getTotalLength();

  var bikePercent = (this.bikeDist_ > this.bikeTotal_) ? 1 : this.bikeDist_/this.bikeTotal_;
  var rowPercent = (this.rowDist_ > this.rowTotal_) ? 1 : this.rowDist_/this.rowTotal_;

  bikeRing.attr({'stroke-dasharray': bikeLen+' '+bikeLen, 'stroke-dashoffset': ''+(-bikeLen+(bikeLen*bikePercent))});
  rowRing.attr({'stroke-dasharray': rowLen+' '+rowLen, 'stroke-dashoffset': ''+(-rowLen+(rowLen*rowPercent))});

  $('#bikeData .progress .distance').text( (bikePercent === 1) ? '' : (this.bikeDist_/1609.344).toFixed(1) );
  $('#bikeData .progress .units').text( (bikePercent === 1) ? 'GOAL REACHED' : 'MI' );
  $('#bikeData .togo .distance').text( (bikePercent === 1) ? ((this.bikeDist_-this.bikeTotal_)/1609.344).toFixed(1) : ((this.bikeTotal_-this.bikeDist_)/1609.344).toFixed(1) );
  $('#bikeData .togo .units').text( (bikePercent === 1) ? 'MI OVER GOAL' : 'MI TO GO' );

  $('#rowData .progress .distance').text( (rowPercent === 1) ? '' : (this.rowDist_/1609.344).toFixed(1) );
  $('#rowData .progress .units').text( (rowPercent === 1) ? 'GOAL REACHED' : 'MI' );
  $('#rowData .togo .distance').text( (rowPercent === 1) ? ((this.rowDist_-this.rowTotal_)/1609.344).toFixed(1) : ((this.rowTotal_-this.rowDist_)/1609.344).toFixed(1) );
  $('#rowData .togo .units').text( (rowPercent === 1) ? 'MI OVER GOAL' : 'MI TO GO' );


  var overlayProjection = this.getProjection();

  var pos = overlayProjection.fromLatLngToDivPixel(this.position_);

  // Resize the image's div to fit the indicated dimensions.
  var div = this.div_;
  div.style.left = pos.x + 'px';
  div.style.top = pos.y + 'px';

  // fit bounds to include marker
  // 730 x 200 px
  // 365 x 125 px

  var topleft = overlayProjection.fromDivPixelToLatLng(new google.maps.Point(pos.x-365, pos.y-125));
  var bottomright = overlayProjection.fromDivPixelToLatLng(new google.maps.Point(pos.x+365, pos.y+75));

  updateBounds([topleft, bottomright]);

};

markerOverlay.prototype.onRemove = function() {
  this.div_.parentNode.removeChild(this.div_);
};

markerOverlay.prototype.setPosition = function(position, bikeDist, rowDist) {
  if (this.div_) {

    this.position_ = position;

    this.bikeDist_ = bikeDist;
    this.rowDist_ = rowDist;

    this.draw();

    resize();

  }
};

// USGSOverlay.prototype.show = function() {
//   if (this.div_) {
//     this.div_.style.visibility = 'visible';
//   }
// };

// USGSOverlay.prototype.toggle = function() {
//   if (this.div_) {
//     if (this.div_.style.visibility == 'hidden') {
//       this.show();
//     } else {
//       this.hide();
//     }
//   }
// };

// // Detach the map from the DOM via toggleDOM().
// // Note that if we later reattach the map, it will be visible again,
// // because the containing <div> is recreated in the overlay's onAdd() method.
// USGSOverlay.prototype.toggleDOM = function() {
//   if (this.getMap()) {
//     // Note: setMap(null) calls OverlayView.onRemove()
//     this.setMap(null);
//   } else {
//     this.setMap(this.map_);
//   }
// };

// google.maps.event.addDomListener(window, 'load', initialize);



$(document).ready(initialize);