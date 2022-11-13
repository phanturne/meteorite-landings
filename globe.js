const width = 960;
const height = 500;
const config = {
  speed: 0.005,
  verticalTilt: -30,
  horizontalTilt: 0
};
let locations = [];
const svg = d3.select('svg')
    .attr('width', width).attr('height', height);
const markerGroup = svg.append('g');
const projection = d3.geoOrthographic();
const initialScale = projection.scale();
const path = d3.geoPath().projection(projection);
const center = [width/2, height/2];
var rotating = true;
var curFrame = 0;
var startFrame = -120;


// Create HTML element for Tooltip
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Tooltip moves with mouse
window.onmousemove = function (e) {
    var x = e.clientX,
        y = e.clientY;
    div.style("top", (y + 20) + 'px').style("left", (x + 20) + 'px');
    console.log("Tooltip Moves");
};

drawGlobe();
drawGraticule();  
var timer = enableRotation();

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
                .style("fill", (d, i) => 'white')
                .style("opacity", "1");
                locations = locationData;
                console.log(locations);
                locations = locations.filter(location => (location.reclong != 0 && location.reclat != 0));
                locations = locations.filter(location => (location.year >= 2010 && location.year <= 9999));
                console.log(locations);
                drawMarkers();                   
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
    .style("fill", "#bfd7e4");

function Rotation() {
    if (rotating) {
        startFrame = curFrame;
        timer.stop();
        document.getElementById("pauseButton").innerHTML = "Resume Rotation";
        rotating = false;
    }
    else {
        timer = enableRotation();
        document.getElementById("pauseButton").innerHTML = "Pause Rotation";
        rotating = true;
        console.log("Rotating");
    }
    console.log(startFrame);
    console.log(curFrame);
}

function enableRotation() {
    return d3.timer(function (elapsed) {
        curFrame = config.speed * elapsed + startFrame;
        projection.rotate([curFrame, config.verticalTilt, config.horizontalTilt]);
        svg.selectAll("path").attr("d", path);
        drawMarkers();
    });
}

function drawMarkers() {
    const markers = markerGroup.selectAll('circle')
        .data(locations);
    markers
        .enter()
        .append('circle')
        .merge(markers)
        .attr('cx', d => projection([d.reclong, d.reclat])[0])
        .attr('cy', d => projection([d.reclong, d.reclat])[1])
        .attr('fill', d => {
            const coordinate = [d.reclong, d.reclat];
            gdistance = d3.geoDistance(coordinate, projection.invert(center));
            return gdistance > 1.57 ? 'none' : 'steelblue';
        })
        .attr('r', 5)
        // https://bl.ocks.org/d3noob/97e51c5be17291f79a27705cef827da2
        // Mouseover Tooltip
        .on("mouseover", function(event,d) {
            div.transition()
                .duration(200)
                .style("opacity", 1);
            // Tooltip Text
            div.html("<div style=text-align:center>" + locations[d].name + "<br/>" + 
                     "<span class='left'>GeoLocation</span><span>&nbsp</span><div class='right'>" + locations[d].GeoLocation + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Class</span>&nbsp<span></span><div class='right'>" + locations[d].recclass + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Year</span>&nbsp<span></span><div class='right'>" + locations[d].year + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>ID</span>&nbsp<span></span><div class='right'>" + locations[d].id + "</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Mass</span>&nbsp<span></span><div class='right'>" + locations[d]["mass (g)"] + "g</div>" + 
                     "</div><div style=text-align:center>" + "<span class='left'>Status</span>&nbsp<span></span><div class='right'>" + locations[d].fall + "</div>"
                    )
                 .style("left", (event.pageX) + "px")
                 .style("top", (event.pageY - 28) + "px");
            console.log("Tooltip On");
            console.log(locations[d]);
        })
        .on("mouseout", function(d) {
            div.transition()
                 .duration(200)
                 .style("opacity", 0);
            console.log("Tooltip Off");
        });

    markerGroup.each(function () {
        this.parentNode.appendChild(this);
    });
}