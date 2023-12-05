// ==UserScript==
// @name         WME-PermanentlyClosed
// @namespace    http://tampermonkey.net/
// @version      Alpha-v3
// @description  A Waze Map Editor Script to find permanently closed places
// @author       deqline
// @source       https://github.com/deqline/WME-PermanentlyClosed 
// @match        https://www.waze.com/en-US/editor
// @icon           https://www.google.com/s2/favicons?sz=64&domain=waze.com
// @license      MIT
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let api = undefined;
    let scannedPlaces = [];
    let options = {
        'enabled': false,
        'bbox': false,
        'residential': false,
        'category': "",
        'radius': 50,
        'closed': false,
        'overlays': false
    };
    let categories = new Set();
    const debug = false;

    //Waze object
    if (W?.userscripts?.state.isReady) { //optional chaining operator ?.
        console.log("user:", W.loginManager.user);
        console.log("segments:", W.model.segments.getObjectArray());

        InitializeScriptTab();
    } else {
        document.addEventListener("wme-ready", InitializeScriptTab, {
            once: true,
        });
    }

    function refreshOptions() {
        options.enabled     = document.getElementById("enable").checked;
        options.bbox        = document.getElementById("bbox_enable").checked;
        options.residential = document.getElementById("residential_enable").checked;
        options.category    = document.getElementById("category_filter").value;
        options.radius      = document.getElementById("radius_number").value;
        options.closed      = document.getElementById("closed_enable").checked;
        options.overlays   = document.getElementById("overlays_enable").checked;
    }

    function refreshUI() {
        for (let p in scannedPlaces) {
            if(place.circleOverlay){
                document.getElementById(place.parentFeatureID).removeChild(place.circleOverlay);
            }

        }

        scannedPlaces.length = 0;
        options = {
        'enabled': false,
        'bbox': false,
        'residential': false,
        'category': "",
        'radius': 50,
        'closed': false
        };
        categories = new Set();
        refreshOptions();
        document.getElementById("scanned-places").innerHTML = "";
        document.getElementById("category_filter").innerHTML = "";

        document.getElementById("bbox_enable").checked = false;
        document.getElementById("residential_enable").checked = false;
        document.getElementById("category_filter").value = "";
        document.getElementById("radius_number").value = 50;
        document.getElementById("closed_enable").checked = false;
        document.getElementById("overlays_enable").checked = false;

    }

    function InitializeScriptTab()
    {
        api = window.prompt("Enter your google maps api key (optional)");

        const { tabLabel, tabPane } = W.userscripts.registerSidebarTab("PermanentlyClosed");
        tabLabel.innerHTML = "PermanentlyClosed";

        tabPane.innerHTML = `
        <script async src="https://maps.googleapis.com/maps/api/js?key=${api}&libraries=places"></script>
         <style>
         table {
            border-collapse: collapse;
             width: 100%;
         }

        td,th {
            max-width: 10px;
            word-wrap: break-word; /* Enable word wrap */
            border: 1px solid black;
            text-align: left;
            padding: 8px;
            margin: 2px;
        }
  </style>
         <div id="map" style="display:none;"></div>
         <label for="enable" >Enabled</label>
         <input name="enable" type="checkbox" id="enable"><br>

         <label for="radius">Nearby Search radius (in m)</label>
         <input name="radius" id="radius_number" type="number" value="50"><br>

         <label for="residential"> Show residential places </label>
         <input name="residential" type="checkbox" id="residential_enable"><br>

         <label for="show_bounding_box">Show areas</label>
         <input name="show_bounding_box" type="checkbox" id="bbox_enable"><br>

         <label for="closed"> Show closed places</label>
         <input name="closed" type="checkbox" id="closed_enable"/><br>

         <label for="closed_overlays"> Show overlays on map </label>
         <input name="closed_overlays" type="checkbox" id="overlays_enable"/><br>

         <label for="category_choice">Filter by category</label>
         <select name="category_choice" id="category_filter"></select><br>


         <span>Scanned places (<span id="place_count"></span>)</span>
         <table style="border: 1px solid black">
            <thead>
                <th>Name</th>
                <th>Coords</th>
                <th>Other</th>
            </thead>
            <tbody id="scanned-places"></tbody>
         </table>
        `;

        W.userscripts.waitForElementConnected(tabPane).then(() => {
            InitializeScript();
        });

    }

    function InitializeScript()
    {
        if(debug) {
            getRenderedMarkers();
        }

        document.getElementById("enable").addEventListener("change", function() {
            refreshOptions();


            if(options.enabled) {
                getRenderedMarkers();
            } else {
                refreshUI();
                return;
            }
        });


        document.addEventListener("click", function(event) {handleRowClick(event)});

        document.addEventListener("change", function(e) {
            refreshOptions();
            filterByCategory();
            displayPlaces();

            if(e.target.id != "overlays_enable" && options.closed)
            {
                showClosed();
            }

        });
    }

    function handleRowClick(event)
    {
        if (event.target.tagName == "TD" && event.target.closest("tbody").id == "scanned-places") {
            for(let p of scannedPlaces)
            {
                if(p.name == event.target.textContent) {
                    if(debug) console.log("click!", event.target.textContent, p.featureID);
                    document.getElementById(p.featureID).setAttribute("stroke", "yellow");
                    return;
                }
            }
        }
    }

    function updatePlaceCount()
    {
        let i = 0;
        for(let p of scannedPlaces) {
            if(p.display) {
                i++;
            }
        }
        document.getElementById("place_count").innerHTML = `${scannedPlaces.length} total, ${i} shown`;
    }

    //implemented for belgium since sometimes places are in dutch in waze
    function checkSimilarity(obj1, obj2)
    {
        const regex = /[\.-;,\/]+/gm;

        let a = obj1.name.toLowerCase().replaceAll(regex, " ").replaceAll("é", "e").replaceAll("à", "a").replaceAll("è", "e").replaceAll("â", "a");
        let b = obj2.name.toLowerCase().replaceAll(regex, " ").replaceAll("é", "e").replaceAll("à", "a").replaceAll("è", "e").replaceAll("â", "a");

        if(a == b || a.includes(b) || b.includes(a)) return true;


        let substr = "";
        let nb_substr = 0;
        for(let ltr of a) {
            if(ltr == " ") {
                if(b.includes(substr)) return true;
                substr = "";
            }
            else substr += ltr;
        }

        for(let ltr of b) {
            if(ltr == " ") {
                if(a.includes(substr)) return true;
                substr = "";
            }
            else substr += ltr;
        }

        for(let t of obj1.types) {
            for(let t2 of obj2.categories) {
                let a = t.toLowerCase()
                let b = t2.toLowerCase();

                if(a == b || a.includes(b) || b.includes(a)) {
                    return true;
                }

            }
        }

        return false;
    }


    function showClosed()
    {
        if(!scannedPlaces.length) return;
        if(scannedPlaces[0].coords.length == 0 || scannedPlaces[0].coords[0] == NaN) return;

        let mapCenter = new google.maps.LatLng(scannedPlaces[0].coords[0], scannedPlaces[0].coords[1]);
        let map = new google.maps.Map(document.getElementById('map'), {center: mapCenter});
        var service = new google.maps.places.PlacesService(map);

        for (let p of scannedPlaces)
        {
            if(!p.bbox && p.display) {

                let circleElem = document.getElementById(p.featureID);
                if(!circleElem) continue;

                circleElem.setAttribute("z-index", "2");
                //create new element with a custom qualifier from an URI
                let newCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                //set the new circle coordinates to the parent circle coordinates
                newCircle.setAttribute("cx", circleElem.getAttribute("cx"));
                newCircle.setAttribute("cy", circleElem.getAttribute("cy"));
                //set some styling
                newCircle.setAttribute("r", "12");
                newCircle.setAttribute("fill-opacity", "0.7");
                newCircle.setAttribute("z-index", "1");
                let newID = "_" + circleElem.getAttribute("id");
                newCircle.setAttribute("id", newID);


                let match = false;

                let request = {
                    query: p.name + " " + p.fullAddress, //because google sometimes includes street name inside the results name
                    fields: ['name', 'business_status','formatted_address', 'types']
                }
                service.findPlaceFromQuery(request, function(results, status) {
                    if (status === google.maps.places.PlacesServiceStatus.OK) {

                        if(debug) console.log(results);
                        for (var i = 0; i < results.length; i++) {
                            console.log(`[google_places_api] Fetched results for findPlace query '${p.name + p.fullAddress}' === ${results[i].name} ( ${results[i].formatted_address} )`);
                            if(checkSimilarity(results[i], p)) {
                                match = true;
                                console.log("Found similarity");

                                if(results[i].business_status == "CLOSED_PERMANENTLY") { //can also check for "CLOSED_TEMPORARILY" if really needed
                                    p.closed = true;
                                    if(p.display) {
                                        p.node.children[0].style.color = "red";
                                        newCircle.setAttribute("fill", "red");
                                    }
                                    console.log(p.name, "=>Closed:", results[i]);

                                }
                            }
                        }

                    }

                    if(!match && !p.closed) {
                        //search twice in case we haven't found the place with the first search
                        request = {
                            location: new google.maps.LatLng(p.coords[0], p.coords[1]),
                            radius: options.radius,
                            keywords: p.name
                        };
                        service.nearbySearch(request, function(results, status) {
                            if (status === google.maps.places.PlacesServiceStatus.OK) {

                                if(debug) console.log(results);
                                for (var i = 0; i < results.length; i++) {
                                    console.log(`[google_places_api] Second try: Fetched results for nearby search query '${p.coords.join(",")}' => matched ${results[i].name}`);
                                    if(checkSimilarity(results[i], p)) {
                                        match = true;
                                        console.log("Found similarity");

                                        if("business_status" in results[i] && results[i].business_status == "CLOSED_PERMANENTLY") {
                                            p.closed = true;
                                            if(p.display) {
                                                p.node.children[0].style.color = "red";
                                                newCircle.setAttribute("fill", "red");
                                            }
                                            console.log(p.name, "=>Closed:", results[i]);

                                        }
                                    }
                                }
                            }
                        });
                    }

                    //still no match, means missing info or data mismatch between google maps and waze
                    if(!match) {
                        if(p.display) {
                            //p.node.children[0].style.color = "orange";
                            newCircle.setAttribute("fill", "orange");
                        }
                    }

                    if(!match || p.closed ) {
                        document.getElementById(p.parentFeatureID).appendChild(newCircle);
                        p.circleOverlay = newCircle;
                        if(!options.overlays) {
                            p.circleOverlay.style.display = "none";
                        }
                    }
                });

            }

        }
    }

    function displayPlaces()
    {
        let placesTable = document.getElementById("scanned-places");

        for(let place of scannedPlaces) {
            if (place.node == null) {
                let cell = document.createElement("tr");
                let coordsString = place.coords.join(",");

                cell.innerHTML = `
                <td>${place.name}</td>
                <td>${coordsString.length < 40 ? coordsString : coordsString.substring(0, 40) + '...'}</td>
                <td>${place.categories.join(",")}</td>
                `;
                place.node = cell;
            }

            if(place.node != null) {
                if(place.isBbox) {
                    place.display = options.bbox;
                    place.node.style.display = (options.bbox ? "" : "none");
                }
                if ("RESIDENCE_HOME" in place.categories)
                {
                    place.display = options.residential;
                    place.node.style.display = (options.residential ? "" : "none");
                }

                if(!options.closed) place.node.children[0].style.color = "black";
                if(place.circleOverlay) place.circleOverlay.style.display = (options.overlays ? "" : "none");

            }

        }

        if(placesTable.children.length == 0) {
            for(let e of scannedPlaces) {
                e.node.style.display = (e.display ? "" : "none");
                placesTable.appendChild(e.node);
            }
        }
        updatePlaceCount();
    }

    function updateCategories()
    {
        //no filter option
        let emptyOption = document.createElement("option");
        // Set HTML content for the option
        emptyOption.innerHTML = '----';
        // Set a value for the option (optional)
        emptyOption.value = "";
        document.getElementById("category_filter").appendChild(emptyOption);

        for(let place of scannedPlaces) {
            for(let c of place.categories) {
                if(!categories.has(c)) {
                    let optionCategory = document.createElement("option");
                    optionCategory.innerHTML = c;
                    optionCategory.value = c;
                    document.getElementById("category_filter").appendChild(optionCategory);

                    categories.add(c);
                }
            }
        }
        options.category = "";
        document.getElementById("category_filter").value = ""; // set it to default to no filter
    }

    function refreshPlaceList()
    {
        //refresh table first
        for(let p of scannedPlaces) {
            if(p.isBbox && !options.bbox) continue;
            if(("RESIDENCE_HOME" in p.categories) && !options.residential) continue;

            p.display = true;
            if(p.node) {
                p.node.style.display = "";
            }
        }
    }

    function filterByCategory()
    {
        refreshPlaceList();
        if(options.category == "") return;

        for(let p of scannedPlaces) {
            if(!p.categories.includes(options.category)) {
                p.display = false;
                p.node.style.display = "none";
            }
        }
    }

    function getRenderedMarkers()
    {
        let renderedLayers = W.map.nodeLayer.renderer.map.layers;
        let renderedPlaceMarkers = null;
        let parentFeatureID = null;

        if(renderedLayers) {
            for(let layerElement of renderedLayers) {

                if(debug) console.log(layerElement.name, " : ", layerElement);


                if(layerElement.name  == "venues") {
                    parentFeatureID = layerElement.renderer.vectorRoot.id;
                    renderedPlaceMarkers = layerElement.features;
                }
            }
        }


        if(debug) console.log("rendered place markers : ", renderedPlaceMarkers);

        for(let marker of renderedPlaceMarkers) {
            let markerFeatureObject = marker.data.wazeFeature._wmeObject;
            let featureElement = W.userscripts.getFeatureElementByDataModel(markerFeatureObject);

            //if we successfully got the id of the circle marker on the map
            if(featureElement) {
                let point = document.getElementById(featureElement.id);

                let markerDetails = markerFeatureObject.attributes;
                if(debug) console.log(markerFeatureObject);

                let streetsObject = markerFeatureObject.model.streets.objects;
                let citiesObject = markerFeatureObject.model.cities.objects;

                let fullAddress = "";
                let partialAddress = "";
                let street = streetsObject[markerFeatureObject.attributes.streetID];
                if(street) {
                    let city = citiesObject[street.attributes.cityID];
                    let country = markerFeatureObject.model.topCountry.attributes.name;
                    if(city && country && markerDetails.houseNumber) {
                        fullAddress = `${markerDetails.houseNumber} ${street.attributes.name}, ${city.attributes.name}, ${country}`;
                    } else if (city && country) {
                        partialAddress = `${city.attributes.name}, ${country}`;
                    }

                }

                let placeDetails = {
                    'name': markerDetails.residential ? "maison n°" +
                    markerDetails.houseNumber : (markerDetails.name.length > 0 ? markerDetails.name : "/"),
                    'coords': markerDetails.geoJSONGeometry.coordinates.reverse(),
                    'topAddress':partialAddress,
                    'fullAddress': fullAddress,
                    'categories': markerDetails.categories,
                    'businessDetails': {
                        'tel': markerDetails.phone,
                        'website': markerDetails.url
                    },
                    'description': markerDetails.description,
                    'node': null,
                    'featureID': featureElement.id,
                    'parentFeatureID': parentFeatureID,
                    'circleOverlay': null,
                    'isBbox': markerDetails.geoJSONGeometry.type == "Polygon",//bounding boxes (polygon of multiple points)
                    'display': true,
                    'closed': false
                };

                scannedPlaces.push(placeDetails);
            }
        }
        displayPlaces();
        updateCategories();
    }
})();
