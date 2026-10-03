# Travel atlas map

Land outlines use Natural Earth 1:110m land data, which is public domain.

- Dataset: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_110m_land.geojson
- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- Authors include Tom Patterson and Nathaniel Vaughn Kelso.

The single world map uses the Equal Earth projection and inline SVG generated at build time. Nearby markers are spaced for clarity, with fine stems showing their geographic positions. The page requires no map API, remote tiles or external fonts.

Destinations were supplied by Zitao Zhang. Markers use approximate city or regional centers, with no trip dates or chronological routes inferred. DC is interpreted as Washington, DC; SLC as Salt Lake City; Charleston as Charleston, South Carolina. Hawaii, Lofoten and Yellowstone represent regions rather than specific accommodations or exact travel locations.

Chengdu is marked as the hometown. Seattle and New York are marked as study and living bases. The other destinations use neutral visited-place markers.

Hover and focus interactions use locally hosted GSAP 3.13.0. Labels read the destination data; keyboard focus, touch and reduced-motion preferences are supported.

- GSAP source: https://github.com/greensock/GSAP/blob/3.13.0/dist/gsap.min.js
- GSAP license: https://gsap.com/standard-license
- Copyright and license notice are retained in the vendored JavaScript.
