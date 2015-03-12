
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

function loadPath(data) {

  route = {};
  markers = {};

  route.path = [];
  route.distances = [];

  var totalDistance = 0;
  var bounds = new google.maps.LatLngBounds();

  for (var i = 0; i < data.path.elements.length; i++) {

    var latLng = new google.maps.LatLng(data.path.elements[i].lat, data.path.elements[i].lng)

    bounds.extend(latLng);

    var distanceFromLast = (i === 0) ? 0 : google.maps.geometry.spherical.computeDistanceBetween(route.path[i-1], latLng)

    totalDistance += distanceFromLast;

    route.path.push(latLng);
    route.distances.push(distanceFromLast);

  };

  route.bounds = bounds;

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


  $(window).resize(resize).resize();

  $(document).on('keypress', function(e) {
    if (e.key === 'r') {
      updateProgress();
    }
  })

  updateProgress();
  
}

function resize() {

  mainMap.fitBounds(route.bounds);

}

function updateProgress() {

  // load progress data

  Tabletop.init({ key: '1HpgLgPfUj-JLnKWLNFkApnYufgLTWcR1y3cqJHytyj0', callback: updateMarker, simpleSheet: true, parseNumbers: true, prettyColumnNames: false })

  function updateMarker(data) {

    console.log(data);

    var progress = (data[0].bike + data[0].row) / route.trueDistance

    if (progress > 1) {
      progress = 1;
    }

    var scaledProgress = progress * route.pathDistance;

    var runningTotal = 0;
    var progressPath = [];

    for (var i = 0; i < route.distances.length+1; i++) {

      if (runningTotal >= scaledProgress) {

        var firstPos = route.path[i-2];
        var secondPos = route.path[i-1];

        var fraction = (scaledProgress - (runningTotal-route.distances[i-1])) / route.distances[i-1];

        progressMarker.setPosition(google.maps.geometry.spherical.interpolate(firstPos, secondPos, fraction), data[0].bike, data[0].row);

        progressPath.pop();
        progressPath.push(google.maps.geometry.spherical.interpolate(firstPos, secondPos, fraction));

        progressPolyline.setPath(progressPath);

        break;

      }
      else {
        runningTotal += route.distances[i]
        progressPath.push(route.path[i]);
      }
    }

  }

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

  var s = '<div id="progressMarker"><div id="bikeData"><span class="distance">200</span> <span class="units">MI</span><br><span class="togo"><span class="distance">180</span> <span class="units">MI TO GO</span></span></div>'
  s += '<div id="rowData"><span class="distance">200</span> <span class="units">MI</span><br><span class="togo"><span class="distance">180</span> <span class="units">MI TO GO</span></span></div>'
  s += '<svg version="1.1" width="150" height="150" xmlns="http://www.w3.org/2000/svg">'
  s += '<circle cx="75" cy="75" r="10" style="fill: #fff" />'
  s += '<path id="rowRing" d="M 75, 75 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0 " style="fill: none; stroke: #E67E22; stroke-width: 12; stroke-linecap: round" stroke-dasharray="" stroke-dashoffset="" transform="rotate(90, 75, 75)" />'
  s += '<path id="bikeRing" d="M 75, 75 m -57, 0 a 57,57 0 1,0 114,0 a 57,57 0 1,0 -114,0 " style="fill: none; stroke: #2ECC71; stroke-width: 12; stroke-linecap: round" stroke-dasharray="" stroke-dashoffset="" transform="rotate(90, 75, 75)" />'
  s += '</svg></div>'

  var div = $(s)[0];

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

  $('#bikeData > .distance').text((this.bikeDist_/1609.344).toFixed(1));
  $('#bikeData .togo .distance').text((this.bikeDist_ > this.bikeTotal_) ? 0 : ((this.bikeTotal_-this.bikeDist_)/1609.344).toFixed(1));

  $('#rowData > .distance').text((this.rowDist_/1609.344).toFixed(1));
  $('#rowData .togo .distance').text((this.rowDist_ > this.rowTotal_) ? 0 : ((this.rowTotal_-this.rowDist_)/1609.344).toFixed(1));


  var overlayProjection = this.getProjection();

  var pos = overlayProjection.fromLatLngToDivPixel(this.position_);

  // Resize the image's div to fit the indicated dimensions.
  var div = this.div_;
  div.style.left = pos.x + 'px';
  div.style.top = pos.y + 'px';
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