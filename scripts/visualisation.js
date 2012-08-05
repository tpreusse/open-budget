$(function() {
    var $body = $('body');
    
    var nodes = TPOpenBudget.nodes;

    nodes.load(function(rootNodes) {
        
        var svg = d3.select('body').select('svg');
        var force = d3.layout.force()
            .nodes(rootNodes)
            .gravity(0.0)
            .friction(0.9)
            .charge(0)
            .alpha(0.5)
            .start();

        var circlesCollections = [];

        var $window = $(window), 
            $svg = $('svg'), 
            $sidebar = $('#sidebar');
        $window.resize(function() {
            var width = $body.width() - $sidebar.outerWidth(), 
                height = $body.height();
        
            svg.attr('width', width).attr('height', height);
            force.size([width, height]);
            
            nodes.resize(width, height);
            
            var circlesCollectionsLength = circlesCollections.length;
            i = 0;
            while(i < circlesCollectionsLength) {
                circlesCollections[i].attr('r', function(d) { return d.radius; });
                i += 1;
            }
            svg.selectAll('g').attr('transform', gTransform);
            force.resume();
        });
            
        var rootNodeCircles = svg.selectAll('circle.directorate')
            .data(rootNodes);

        circlesCollections.push(rootNodeCircles);
            
        var rootNodeGs = svg.selectAll('g.directorate')
            .data(rootNodes);
        
        rootNodeCircles.enter()
            .append('circle')
            .attr('class', function(d) { return 'directorate'; })
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .attr('r', function(d) { return 0; })
            .style('fill', function(d) { return d.fill; })
            .style('stroke', function(d) { return d.stroke; })
            .call(force.drag);

        var gTransform = function(d) {
            var radius = d.radius,
                computedRadius = d.computedRadius,
                scale = computedRadius ? radius / computedRadius : 1;
            return 'translate('+(d.x-radius)+','+(d.y-radius)+') scale('+scale+')';
        };
        rootNodeGs.enter()
            .append('g')
            .attr('transform', gTransform)
            .attr('class', function(d) { return 'directorate id-'+d.id; })
        
        var collide = function(node) {
            var r = node.radius + 16,
                nx1 = node.x - r,
                nx2 = node.x + r,
                ny1 = node.y - r,
                ny2 = node.y + r;
            return function(quad, x1, y1, x2, y2) {
                if(quad.point && (quad.point !== node)) {
                    var x = node.x - quad.point.x,
                    y = node.y - quad.point.y,
                    l = Math.sqrt(x * x + y * y),
                    r = node.radius + quad.point.radius;
                    if(l < r) {
                        l = (l - r) / l * .5;
                        node.x -= x *= l;
                        node.y -= y *= l;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2
                    || x2 < nx1
                    || y1 > ny2
                    || y2 < ny1;
            };
        };

        $window.resize();
        
        force.on('tick', function(e) {
            var q, i, k, o, c, nodes = rootNodes, nodesLength = rootNodes.length;

            q = d3.geom.quadtree(rootNodes);
            i = 0;
            k = e.alpha * 0.1;

            while (i < nodesLength) {
                o = nodes[i];
                c = o.center;

                o.x += (c.x - o.x) * k;
                o.y += (c.y - o.y) * k;

                q.visit(collide(o));
                
                i += 1;
            }
            
            rootNodeCircles.attr('cx', function(d) { return d.x; }).attr('cy', function(d) { return d.y; });
            rootNodeGs.attr('transform', gTransform);
        });

        //child forces
        setTimeout(function() {

        var i = 0,
            rootNodesLength = rootNodes.length;
        for(i = 0; i < rootNodesLength; i+= 1) {
            (function() {
                var node = rootNodes[i],
                    children = node.children;

                if(!children || !children.length) {
                    return;
                }

                var nodeRadius = node.radius,
                    nodeSize = nodeRadius * 2;

                var g = svg.select('g.id-'+node.id);

                g.attr('width', nodeSize).attr('height', nodeSize).classed('blur', 1);
                node.computedRadius = nodeRadius;

                var childrenCircles = g.selectAll('circle')
                    .data(children);

                var force = d3.layout.force()
                    .size([nodeSize, nodeSize])
                    .gravity(-0.01)
                    .friction(0.9)
                    .alpha(0.01)
                    .charge(function(d) { return -Math.pow(d.radius, 2.0) / 16; })
                    .nodes(children);

                //circlesCollections.push(childrenCircles);

                childrenCircles.enter()
                    .append('circle')
                    .attr('class', function(d) { return 'blur '+d.type; })
                    .attr('cx', function(d) { return d.x; })
                    .attr('cy', function(d) { return d.y; })
                    .attr('r', function(d) { return d.radius; })
                    .style('fill', function(d) { return d.parent.fill; })
                    .style('stroke', function(d) { return d.parent.stroke; });
                
                childrenCircles.sort(function(a, b) {
                    return b.radius - a.radius;
                });

                var damper = 0.11,
                    move_towards_center = function(alpha) {
                        return function(d) {
                            var c = nodeRadius, da = (damper + 0.02) * alpha;
                            d.x += (c - d.x) * da;
                            d.y += (c - d.y) * da;
                        }
                    };

                force.on('tick', function(e) {
                    childrenCircles.each(move_towards_center(e.alpha))
                }).start();
                var tickI, tickIMax = children.length * 6;
                for(tickI = 0; tickI < tickIMax; tickI+=1) force.tick();
                force.stop();

                childrenCircles
                    .attr('cx', function(d) { return d.x; })
                    .attr('cy', function(d) { return d.y; });

                g.transition().duration(500).style('opacity', 0.5);
            })();
        }

        $window.resize();

        }, 2000);

        //zoom
        rootNodeCircles.on('click', function(e) {
            var d = d3.select(this);

        });
    });
});