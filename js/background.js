// For https://chrome.google.com/webstore/detail/mgmiemnjjchgkmgbeljfocdjjnpjnmcg

// Learn more about poke v3 here:
// http://wiki.antp.co/
var info = {
  "poke"    :   3,              // poke version 3
  "width"   :   2,              // 406 px default
  "height"  :   1,              // 200 px default
  "path"    :   "widget.html",
  "v2"      :   {
                  "resize"    :   true,   // Set to true ONLY if you create a range below.
                                          // Set to false to disable resizing
                  "min_width" :   1,      // Required; set to default width if not resizable
                  "max_width" :   2,      // Required; set to default width if not resizable
                  "min_height":   1,      // Required; set to default height if not resizable
                  "max_height":   1       // Required; set to default height if not resizable
                },
  "v3"      :   {
                  "multi_placement": true // Allows the widget to be placed more than once
                                          // Set to false unless you allow users to customize each one
                }
};

chrome.extension.onMessageExternal.addListener(function(request, sender, sendResponse) {
  if(request === "mgmiemnjjchgkmgbeljfocdjjnpjnmcg-poke") {
    chrome.extension.sendMessage(
      sender.id,
      {
        head: "mgmiemnjjchgkmgbeljfocdjjnpjnmcg-pokeback",
        body: info,
      }
    );
  }
});

// Start of weather-specific stuff

// backwards compatibility
if ( localStorage.getItem("place")
  || localStorage.getItem("hl")
  || localStorage.getItem("unit")
  || localStorage.getItem("style")
  || localStorage.getItem("weather") ) {

  // import to "default"
  instance = {
    place: localStorage.getItem("place"),
    hl: localStorage.getItem("hl"),
    unit: localStorage.getItem("unit"),
    style: localStorage.getItem("style"),
    weather: localStorage.getItem("weather")
  }

  localStorage.setItem("default", JSON.stringify(instance));

  // remove old items
  localStorage.removeItem("place");
  localStorage.removeItem("hl");
  localStorage.removeItem("unit");
  localStorage.removeItem("style");
  localStorage.removeItem("weather");
}

$(window).bind("storage", function (e) {
  update();
});

function getCoords(place) {
  var return_location = "";
  $.ajax({
    url : "https://maps.googleapis.com/maps/api/geocode/json",
    data: {"address": place, sensor: false},
    dataType: "json",
    async: false,
    success: function(data) {
      if (data.status == "OK") {
        var location = data.results[0].geometry.location;
        return_location = location.lat + "," + location.lng;
      }
    }
  });
  return return_location;
}

function update() {
  if (!API_KEY || API_KEY === "YOUR_KEY_HERE") {
    console.error("Need API key. See api_key.example.js", API_KEY);
    return;
  }

  for (instance_id in localStorage) {
    var
      instance = JSON.parse(localStorage[instance_id]),
      now = Math.round(new Date().getTime()/1000.0),
      place = instance.place || "San Francisco, CA",
      hl = instance.hl || "en";

    if ( !instance.last_accessed ) {
      instance.last_accessed = Math.round(new Date().getTime()/1000.0);
    }

    if ( !instance.last_update ) {
      instance.last_update = 1;
    }

    if ( (now - instance.last_accessed) < 129600 ) { // if accessed less than 1.5 days ago

      if ( !instance.last_update || !instance.weather) {
        instance.last_update = 1;
      }

      if ( (now - instance.last_update) > 1*60*60 ) { // if updated more than 1 hour ago, update it        
        instance.weather = getWeather(place, false);
        if(instance.weather.error) { // check with coordinates
          if (instance.coord_place != place) { // to save Googles oh-so-precious bandwidth (and the users...)
            instance.coords = getCoords(place);
            instance.coord_place = place;
          }
          instance.weather = getWeather(place, true, instance.coords);
        }

        instance.last_update = Math.round(new Date().getTime()/1000.0);
        localStorage.setItem(instance_id, JSON.stringify(instance));

      }
    } else if ( (now - instance.last_accessed) > 2419200 ) { // if accessed more than 4 weeks ago, delete it
      console.warn(instance_id, "hasn't been accessed in 4 weeks. Removing completely.")

      // delete instance
      localStorage.removeItem(instance_id);
    }
  }
}

function getWeather(place, isCoords, coords) {
  place = (isCoords === false ? encodeURIComponent(place) : coords);
  
  var
    url = "https://api.wunderground.com/api/"+API_KEY+"/conditions/forecast/q/"+place+".xml",
    xml = new JKL.ParseXML( url ),
    data = xml.parse(),
    weather = {};

  if ( data && typeof data === "object" ) {
    if (data.response.current_observation) {
      weather = data.response;
    } else {
      weather.error = true;
    }
  } else {
    weather.error = true;
  }
  return weather;
}

setInterval(update, 4*60*60*1000);
update();
