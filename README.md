# UrbexFinder

This repository contains a javascript plugin for the [Waze Map Editor](https://www.waze.com/en-US/editor) that allows to find permanently closed places in a given area.
It also allows to:
- list every place in the current map editor view
- filter places by categories
- show permanently closed places using the google maps places api

✅Please check out the greasyfork link to see the latest code instead of this repository.

## Instructions
To use this script, you must:
1. Install the [tampermonkey extension](https://www.tampermonkey.net/)
2. Download this script over at [greasyfork](https://greasyfork.org/en/scripts/481447-wme-permanentlyclosed)
3. Head to the [waze map editor](https://www.waze.com/en-US/editor) and login with your waze account
4. If tampermonkey loaded the script, you should see a message box asking you for your [google places api key](https://developers.google.com/maps/documentation/javascript/get-api-key).
5. Head to the sidebar on the left and go to the scripts page

⚠️ Make sure to enable `Places > Public` in the waze map layers and before enabling the plugin, you should zoom enough on the map to see marker points appear.

## Features
- `Nearby Search radius` defines the radius used to address the imprecision of coordinates when transitioning between Waze and Google Maps. For cities, a lower value may be suitable
- `show residential places` is to show residential addresses (i.e houses)
- `show areas` is to show the pink areas details in the table view (contain multiple coordinates)
- `show closed places` is to highlight in red every permanently closed place in the table (can also filter by category 'CLOSED')
- `show overlays on map` is to add an overlay on the marker elements on the map view (experimental, see section below)
  - red: indicates confirmed business closure
  - orange: indicates data mismatch between waze and google maps (see developer console)
- `Filter By Category` is to filter table entries by a certain category
  - Note: filtering before showing closed places only sends google place requests for the elements displayed on the table
 
- Clicking on an entry name in the table will highlight the corresponding marker or area on the map (can be nonvisible because out of view)
  - clicking/hovering on the highlighted marker or area will restore it's highlighting

## Important
- When enabling the `show overlays on map` feature
    - Avoid zooming because this will displace the circle overlays and misalign them with the actual markers
    - If the overlays are over the marker point and you can't select the markers, try toggling the sidebar

## Future Features
- Keep some feature points on map even after de-zoom
