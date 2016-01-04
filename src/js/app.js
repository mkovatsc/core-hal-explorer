//= require ../vendor/jquery/dist/jquery.js
//= require ../vendor/lodash/lodash.js
//= require ../vendor/d3/d3.js
//= require ../vendor/jquery-jsonview/dist/jquery.jsonview.js
//= require ../vendor/bootstrap-sass-official/assets/javascripts/bootstrap.js
//= require partials/main.js
$(window).resize(function() {
    update();

});

function load_proxy(){
    if (window.CoAPRequest == undefined) {
        $('.run').prop('disabled', true);
        $('.proxy-missing button').button('loading');
        $.getScript("http://localhost:8080/coap.js")
            .done(function(script, textStatus) {
                $('.proxy-missing').hide();
                $('.run').prop('disabled', false);
            }).error(function() {
                $('.proxy-missing').show();
                $('.proxy-missing button').button('reset');
            });
    } else {
        $('.run').prop('disabled', false);
    }
}
load_proxy();
$('.proxy-missing button').click(load_proxy)

var color = d3.scale.category10();
var oldnodes = [];
$(".run").on("click", function() {
    oldnodes = _.clone(nodes);
	for(var k in nodes){
		delete nodes[k];
	}
	links = [];
	update();
    process($("input").val());
});
//http://stackoverflow.com/questions/470832/getting-an-absolute-url-from-a-relative-one-ie6-issue
function resolve(url, base_url) {
  var doc      = document
    , old_base = doc.getElementsByTagName('base')[0]
    , old_href = old_base && old_base.href
    , doc_head = doc.head || doc.getElementsByTagName('head')[0]
    , our_base = old_base || doc_head.appendChild(doc.createElement('base'))
    , resolver = doc.createElement('a')
    , resolved_url
    ;
  our_base.href = base_url;
  resolver.href = url;
  resolved_url  = resolver.href; // browser magic at work here

  if (old_base) old_base.href = old_href;
  else doc_head.removeChild(our_base);
  return resolved_url;
}
var nodes = {};
function process(url) {
	if(url in nodes)
		return;
    $.get(url, function(data) {
    	if(data[0]=='<'){
	        _.map(_.filter(data.split(','), function(el) {
	            return el.length > 0;
	        }), function(el) {
	            console.log(el);
	            var val = el.substring(1, el.indexOf('>'));
	    		var uri = resolve(val, url);
	            if(el.indexOf('ct=6')>0){
				    links.push({
				        source: url,
				        target: uri
				    });
		            process(uri);
				    update();
		        }
	        });
	    }else{
	    	var item = JSON.parse(data);
	    	var ln  =  nodes[url] || (nodes[url] = { name: url });
	    		if(item['name']!=undefined){
	    			ln.name = item['name'];
	    		}else if(item['location']!=undefined){
	    			ln.name = item['location'];
	    		}
	    		console.log(ln)
	    		console.log("a");
	    	var proc = function(x, k){
	    		var uri = resolve(x.href, url);
				    links.push({
				        source: url,
				        target: uri,
				        rel:k
				    });
				    process(uri);

	    	};
	    	_.forEach(item['_links'],function(val, k){
	    		if(_.isArray(val)){
	    			_.forEach(val, function(x){
	    				proc(x, k);
	    			});
	    		}else{
	    			proc(val, k);
	    		}
	    	});
			update();

	    }
    });
}

var links = [];


// Compute the distinct nodes from the links.
 
var width = 960,
    height = 500;

var force = d3.layout.force() 
    .size([width, height])
    .linkDistance(60)
    .charge(-300)
    .on("tick", tick) 

var svg = d3.select(".view").append("svg")
    .attr("width", width)
    .attr("height", height);

// Per-type markers, as they don't inherit styles.
var defs = svg.append("defs")
function marker(c){
	var x = c.substring(1);
	if($("#markers"+x).length>0){
    	return "url(#markers"+x+")";
	} 
	defs.append("marker")
	    .attr("id", "markers"+x)
	    .attr("viewBox", "0 -5 10 10")
	    .attr("refX", 15)
	    .attr("refY", -1.5)
	    .attr("markerWidth", 6)
	    .attr("markerHeight", 6)
	    .attr("orient", "auto")
	    .append("path")
	    .style('fill',c)
	    .attr("d", "M0,-5L10,0L0,5");
    return "url(#markers"+x+")";
}
var path = svg.append('g');
var circles = svg.append('g');
var text = svg.append('g');
var current = null;
1 
var legends = d3.select('svg')
    .append("g"); 
function load(d){
    url = d;
    $('.json').text("");
    $('#url').text(d.url).attr("href",d.url);
    $.get(d.url, function(data) {
    	$('.json').text(data);
    	try{
  			$(".json").JSONView(JSON.parse(data));
  		}catch(e){

  		}
    });
    current = d; 
    update();
}
$('#url').on("click", function(e){
    e.preventDefault();
    load(current);
})
function update() { 
    width = $(".view").width();
    svg.attr("width", width);
    link2 = _.map(links, function(l) {
        var link = {}
        link.type = l.rel||"initial";
        link.source = nodes[l.source] || (nodes[l.source] = oldnodes[l.source] ||  {
            name: l.source,
            url:l.source
        });
        link.target = nodes[l.target] || (nodes[l.target] = oldnodes[l.target] ||{
            name: l.target,
            url:l.target
        });
        return link;
    });
    force.size([width, height]).nodes(d3.values(nodes))
        .links(link2).start();

    var pathdata = path.selectAll("path")
        .data(force.links());
    pathdata.enter().append("path")
        .attr("class", function(d) {
            return "link " + d.type;
        })
        .style('stroke',function(d){return color(d.type);})
        .attr("marker-end", function(d) {
            return marker(color(d.type));
        });
    pathdata.exit().remove();

    var circlesdata = circles.selectAll("circle")
        .data(force.nodes());

    circlesdata.attr("class",function(d){
            return current==d?"selected":"";
        })
        .enter().append("circle")
        .attr("r", 6)
        .on("click",load)
        .call(force.drag);

    circlesdata.exit().remove();
    var textdata = text.selectAll("text")
        .data(force.nodes());
    
    textdata.text(function(d) {
            return d.name;
        })
        .enter().append("text")
        .attr("x", 8)
        .attr("y", ".31em")
        .text(function(d) {
            return d.name;
        });

    textdata.exit().remove();

    var legendRectSize = 20;
    var legendSpacing = 5;
    var legend = legends
        .selectAll("g")
        .data(color.domain())
        .enter()
        .append('g')
          .attr('class', 'legend')
          .attr('transform', function(d, i) {
            var height = legendRectSize;
            var x = 0;
            var y = i * height;
            return 'translate(' + x + ',' + y + ')';
        });
legend.append('rect')
    .attr('width', legendRectSize)
    .attr('height', legendRectSize)
    .style('fill', color)
    .style('stroke', color);
 
legend.append('text')
    .attr('x', legendRectSize + legendSpacing)
    .attr('y', legendRectSize - legendSpacing)
    .text(function(d) { return d; });
    force.resume();
}

// Use elliptical arc path segments to doubly-encode directionality.
function tick() {


    path.selectAll("path").attr("d", linkArc);
    circles.selectAll("circle").attr("transform", transform);
    text.selectAll("text").attr("transform", transform);
}

function linkArc(d) {
    var dx = d.target.x - d.source.x,
        dy = d.target.y - d.source.y,
        dr = Math.sqrt(dx * dx + dy * dy);
    return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
}

function transform(d) {
    return "translate(" + d.x + "," + d.y + ")";
}