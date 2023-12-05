# WME-PermanentlyClosed

This Waze Map Editor script has the ability to:
- list every place in the current map editor view
- filter places by categories
- show permanently closed places using the google maps places api

## Options
- `show residential places` is to show residential addresses (sometimes houses are referenced on waze)
- `show areas` is to show the pink areas details in the table view (contain multiple points)
- `show closed places` is to highlight in red every permanently closed place in the table
- `show overlays on map` is to add a red/orange overlay on the marker elements on the map view (experimental)
- `Filter By Category` is to filter table entries by a certain category
  - Note: filtering before showing closed places only sends google place requests for the elements displayed on the table  

## Installation
To use this script, you must:
1. Install the [tampermonkey extension](https://www.tampermonkey.net/)
2. Download this script over at [greasyfork](https://greasyfork.org/en/scripts/481447-wme-permanentlyclosed)
3. Head to the [waze map editor](https://www.waze.com/en-US/editor) and login with your waze account
4. If tampermonkey loaded the script, you should see a message box asking you for your [google places api key](https://developers.google.com/maps/documentation/javascript/get-api-key).
5. Head to the sidebar on the left and go to the scripts page 

## Issues
- Bounding boxes (collection of points, pink areas) isn't supported yet in the show closed feature
- When enabling the `show overlays on map` feature
  - Avoid zooming because this may displace the circle overlays and misalign them
  - If the overlays are over the marker point and you can't select the markers, try toggling the sidebar 

## Todo
- add option to get center coord of polygon area
