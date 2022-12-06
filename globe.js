// all functions are from http://bl.ocks.org/ivyywang/7c94cb5a3accd9913263

var to_radians = Math.PI / 180;
var to_degrees = 180 / Math.PI;


// Helper function: cross product of two vectors v0&v1
function cross(v0, v1) {
    return [v0[1] * v1[2] - v0[2] * v1[1], v0[2] * v1[0] - v0[0] * v1[2], v0[0] * v1[1] - v0[1] * v1[0]];
}

//Helper function: dot product of two vectors v0&v1
function dot(v0, v1) {
    for (var i = 0, sum = 0; v0.length > i; ++i) sum += v0[i] * v1[i];
    return sum;
}

// Helper function:
// This function converts a [lon, lat] coordinates into a [x,y,z] coordinate
// the [x, y, z] is Cartesian, with origin at lon/lat (0,0) center of the earth
function lonlat2xyz( coord ){

    var lon = coord[0] * to_radians;
    var lat = coord[1] * to_radians;

    var x = Math.cos(lat) * Math.cos(lon);

    var y = Math.cos(lat) * Math.sin(lon);

    var z = Math.sin(lat);

    return [x, y, z];
}

// Helper function:
// This function computes a quaternion representation for the rotation between to vectors
// https://en.wikipedia.org/wiki/Rotation_formalisms_in_three_dimensions#Euler_angles_.E2.86.94_Quaternion
function quaternion(v0, v1) {

    if (v0 && v1) {

        var w = cross(v0, v1),  // vector pendicular to v0 & v1
            w_len = Math.sqrt(dot(w, w)); // length of w

        if (w_len == 0)
            return;

        var theta = .5 * Math.acos(Math.max(-1, Math.min(1, dot(v0, v1)))),

            qi  = w[2] * Math.sin(theta) / w_len;
        qj  = - w[1] * Math.sin(theta) / w_len;
        qk  = w[0]* Math.sin(theta) / w_len;
        qr  = Math.cos(theta);

        return theta && [qr, qi, qj, qk];
    }
}

// Helper function:
// This functions converts euler angles to quaternion
// https://en.wikipedia.org/wiki/Rotation_formalisms_in_three_dimensions#Euler_angles_.E2.86.94_Quaternion
function euler2quat(e) {

    if(!e) return;

    var roll = .5 * e[0] * to_radians,
        pitch = .5 * e[1] * to_radians,
        yaw = .5 * e[2] * to_radians,

        sr = Math.sin(roll),
        cr = Math.cos(roll),
        sp = Math.sin(pitch),
        cp = Math.cos(pitch),
        sy = Math.sin(yaw),
        cy = Math.cos(yaw),

        qi = sr*cp*cy - cr*sp*sy,
        qj = cr*sp*cy + sr*cp*sy,
        qk = cr*cp*sy - sr*sp*cy,
        qr = cr*cp*cy + sr*sp*sy;

    return [qr, qi, qj, qk];
}

// This functions computes a quaternion multiply
// Geometrically, it means combining two quant rotations
// http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/arithmetic/index.htm
function quatMultiply(q1, q2) {
    if(!q1 || !q2) return;

    var a = q1[0],
        b = q1[1],
        c = q1[2],
        d = q1[3],
        e = q2[0],
        f = q2[1],
        g = q2[2],
        h = q2[3];

    return [
        a*e - b*f - c*g - d*h,
        b*e + a*f + c*h - d*g,
        a*g - b*h + c*e + d*f,
        a*h + b*g - c*f + d*e];

}

// This function computes quaternion to euler angles
// https://en.wikipedia.org/wiki/Rotation_formalisms_in_three_dimensions#Euler_angles_.E2.86.94_Quaternion
function quat2euler(t){

    if(!t) return;

    return [ Math.atan2(2 * (t[0] * t[1] + t[2] * t[3]), 1 - 2 * (t[1] * t[1] + t[2] * t[2])) * to_degrees,
        Math.asin(Math.max(-1, Math.min(1, 2 * (t[0] * t[2] - t[3] * t[1])))) * to_degrees,
        Math.atan2(2 * (t[0] * t[3] + t[1] * t[2]), 1 - 2 * (t[2] * t[2] + t[3] * t[3])) * to_degrees
    ]
}

/*  This function computes the euler angles when given two vectors, and a rotation
	This is really the only math function called with d3 code.

	v0 - starting pos in lon/lat, commonly obtained by projection.invert
	v1 - ending pos in lon/lat, commonly obtained by projection.invert
	o0 - the projection rotation in euler angles at starting pos (v0), commonly obtained by projection.rotate
*/

function eulerAngles(v0, v1, o0) {

    /*
        The math behind this:
        - first calculate the quaternion rotation between the two vectors, v0 & v1
        - then multiply this rotation onto the original rotation at v0
        - finally convert the resulted quat angle back to euler angles for d3 to rotate
    */

    var t = quatMultiply( euler2quat(o0), quaternion(lonlat2xyz(v0), lonlat2xyz(v1) ) );
    return quat2euler(t);
}

// ************************************************************************************** //

const width = 960;
const height = 500;
const config = {
  speed: 0.002,
  verticalTilt: -30,
  horizontalTilt: 0
};
let locations = [];
let locs = [];
const svg = d3.select('svg')
    .attr("viewBox", [0, 0, width, height]);
const markerGroup = svg.append('g');
const projection = d3.geoOrthographic();
const initialScale = projection.scale();
const path = d3.geoPath().projection(projection);
const center = [width/2, height/2];
//var rotating = true;
var curFrame = 0;
var startFrame = -120;

// scale globe to size of window
var scl = Math.min(width, height)/2.5;

// Create HTML element for Tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Tooltip moves with mouse
window.onmousemove = function (e) {
    var x = e.clientX,
        y = e.clientY;
    div.style("top", (y + 20) + 'px').style("left", (x + 20) + 'px');
};

drawGlobe();
drawGraticule();  

linearColor = d3.scaleLinear()
  .domain([0, 10000])
  .range(["white", "red"])

function filterLocations(locations) {
    let newLocations = [];
    for (var i = 1; i < locations.length; i++) {
        var prevLoc = locations[i  - 1];
        var curLoc  = locations[i];
        if (prevLoc.year != curLoc.year || Math.sqrt(Math.pow(curLoc.reclat - prevLoc.reclat, 2) + Math.pow(curLoc.reclong - prevLoc.reclong, 2)) > 3) {
            newLocations.push(curLoc);
        }
    }
    return newLocations;
}

function drawGlobe() {
    d3.queue()
        .defer(d3.json, 'https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/world-110m.json')          
        .defer(d3.json, 'landings.json')
        .await((error, worldData, locationData) => {
            svg.selectAll(".segment")
                .data(topojson.feature(worldData, worldData.objects.countries).features)
                .enter().append("path")
                .attr("class", "segment")
                .attr("d", path)
                .style("stroke", "#888")
                .style("stroke-width", "1px")
                .style("fill", (d, i) => 'green')
                .style("opacity", "1");
        
                locations = locationData;
                locations = locations.filter(location => (location.reclong != 0 && location.reclat != 0));
                locations = locations.filter(location => (location.year >= 1800 && location.year <= 9999));
                locs = filterLocations(locations);
                drawMarkers();
                svg.selectAll("path").attr("d", path);
        });
}

function drawGraticule() {
    const graticule = d3.geoGraticule()
        .step([10, 10]);

    svg.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path)
        .style("fill", "#fff")
        .style("stroke", "#ccc");
}

// Background for the globe
// Source: https://observablehq.com/@sarah37/spinning-globe
var bgCircle = svg.append("circle")
    .attr("cx", width/2)
    .attr("cy", height/2)
    .attr("r", projection.scale())
    .style("fill", "#89CFF0");

var checker = false;

function drawMarkers() {
    markerGroup.selectAll('circle').remove();
    const markers = markerGroup.selectAll('circle')
        .data(locs);
    markers
        .enter()
        .append('circle')
        .merge(markers)
        .attr('cx', d => projection([d.reclong, d.reclat])[0])
        .attr('cy', d => projection([d.reclong, d.reclat])[1])
        .attr('fill', d => {
            const coordinate = [d.reclong, d.reclat];
            gdistance = d3.geoDistance(coordinate, projection.invert(center));
            return gdistance > 1.57 ? 'none' : linearColor(d['mass (g)']);
        })
        .attr('r', 3)
        // https://bl.ocks.org/d3noob/97e51c5be17291f79a27705cef827da2
        // Mouseover Tooltip
        .on("mouseover", function(event,d) {
            div.transition()
                .duration(200)
                .style("opacity", 1);
            // Tooltip Text
            div.html("<div style=text-align:center;color:white;>" + locs[d].name + "<br/>" +
                     "<span class='left'>GeoLocation</span><span>&nbsp</span><div class='right'>" + locations[d].GeoLocation + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Class</span>&nbsp<span></span><div class='right'>" + locations[d].recclass + "</div>" +
                     "</div><div style=text-align:center>" + "<span class='left'>Year</span>&nbsp<span></span><div class='right'>" + locations[d].year + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>ID</span>&nbsp<span></span><div class='right'>" + locations[d].id + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Mass</span>&nbsp<span></span><div class='right'>" + locations[d]["mass (g)"] + "g</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Status</span>&nbsp<span></span><div class='right'>" + locations[d].fall + "</div>"
                    )
                 .style("left", (event.pageX) + "px")
                 .style("top", (event.pageY - 28) + "px")
        })
        .on("mouseout", function(d) {
            div.transition()
                 .duration(200)
                 .style("opacity", 0);
        });

    markerGroup.each(function () {
        this.parentNode.appendChild(this);
    });
}

// enable drag
var drag = d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged);

var gpos0, o0, gpos1, o1;
svg.call(drag);

// enable zoom
var zoom = d3.zoom()
    .scaleExtent([0.75, 50]) //bound zoom
    .on("zoom", zoomed);

svg.call(zoom);

// functions for dragging
function dragstarted() {
    gpos0 = projection.invert(d3.mouse(this));
    o0 = projection.rotate();
}

function dragged() {
    gpos1 = projection.invert(d3.mouse(this));
    o0 = projection.rotate();
    o1 = eulerAngles(gpos0, gpos1, o0);
    if (o1 !== undefined) {
        projection.rotate(o1);
    }
    svg.selectAll("path").attr("d", path);
    drawMarkers();
}

// functions for zooming
function zoomed() {
    projection.scale(d3.event.transform.translate(projection).k * scl);
    bgCircle.attr("r", projection.scale());
    svg.selectAll("path").attr("d", path);
    drawMarkers();
}

document.addEventListener( "input", locationRange );

function locationRange(event){
    var element = event.target;
    const rangeInput = document.querySelectorAll(".range-input input");
    let minRange = parseInt(rangeInput[0].value);
    let maxRange = parseInt(rangeInput[1].value);
    if (element.className === 'min' || element.className === 'max') {
        locs = filterLocations(locations.filter(location => (location.year >= minRange && location.year <= maxRange)));
        drawMarkers();
    }
}
