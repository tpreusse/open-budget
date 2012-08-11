$(function() {
    var nodes = OpenBudget.nodes;

    var $window = $(window), 
        $svg = $('svg'), 
        $sidebar = $('#sidebar'),
        $body = $('body');

    var svg = d3.select('body').select('svg'),
        svgWidth,
        svgHeight;

    var force = d3.layout.force()
        .gravity(0.0)
        .friction(0.9)
        .charge(0)
        .alpha(0.5);

    var xScale = d3.scale.linear(),
        yScale = d3.scale.linear();

    var activeNodes = d3.select(), 
        activeNodesCircles = d3.select(), 
        activeNodesGroups = d3.select();

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

    var forceTick = function(e) {
        var q, i, k, o, c, nodes = activeNodes, nodesLength = activeNodes.length;

        q = d3.geom.quadtree(activeNodes);
        i = 0;
        k = e.alpha * 0.1;

        while (i < nodesLength) {
            o = nodes[i];
            c = o.center || {x: o.parent.radius, y: o.parent.radius};

            o.x += (c.x - o.x) * k;
            o.y += (c.y - o.y) * k;

            q.visit(collide(o));
            
            i += 1;
        }
    };
    var forceTickAndSet = function(e) {
        forceTick(e);
        
        activeNodesCircles
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })
        activeNodesGroups.attr('transform', vis.transform());
    };

    var vis = {
        setActiveNodes: function(nodes, circles, groups) {
            if(activeNodesCircles) {
                activeNodesCircles
                    .on('mousedown.drag', null)
                    .on('touchstart.drag', null);
            }
            activeNodes = nodes;
            activeNodesCircles = circles || d3.select();
            activeNodesGroups = groups || d3.select();

            force.nodes(activeNodes)
            activeNodesCircles.call(force.drag);
        },
        resize: function(svgSizeCallback) {
            svgWidth = $body.width() - $sidebar.outerWidth();
            svgHeight = $body.height();

            if(typeof svgSizeCallback == 'function') {
                svgSizeCallback();
            }

            xScale.range([0, svgWidth]);
            yScale.range([0, svgHeight]);
        
            svg.attr('width', svgWidth).attr('height', svgHeight);
            force.size([svgWidth, svgHeight]);
            
            nodes.resize(svgWidth, svgHeight);
            
            activeNodesCircles.attr('r', function(d) { return d.radius; });
            svg.selectAll('g').attr('transform', vis.transform());

            force.resume();
        },
        transform: function(scaleX, scaleY) {
            if(typeof scaleX == 'function' && typeof scaleY == 'function') {
                return function(d) {
                    var radius = d.radius,
                        computedRadius = d.computedRadius,
                        scale = computedRadius ? radius / computedRadius : 1;
                    return 'translate('+(scaleX(d.x)-radius)+','+(scaleY(d.y)-radius)+') scale('+scale+')';
                }
            }
            else {
                return function(d) {
                    var radius = d.radius,
                        computedRadius = d.computedRadius,
                        scale = computedRadius ? radius / computedRadius : 1;
                    return 'translate('+(d.x-radius)+','+(d.y-radius)+') scale('+scale+')';
                }
            }
        },
        cx: function(scale) {
            if(typeof scale == 'function') {
                return function(d) {
                    return scale(d.x);
                };
            }
            else {
                return function(d) {
                    return d.x;
                };
            }
        },
        cy: function(scale) {
            if(typeof scale == 'function') {
                return function(d) {
                    return scale(d.y);
                };
            }
            else {
                return function(d) {
                    return d.y;
                };
            }
        }
    }

    nodes.load(function(rootNodes, data) {
        // var $sidebarTableBody = $('#sidebar table tbody');
        // var $trTemplate = $sidebarTableBody.find('tr').detach();
        // $.each(data, function(key, directorate) {
        //     var $tr = $trTemplate.clone();
        //     if(
        //         !directorate.gross_cost || 
        //         !directorate.gross_cost.budgets || 
        //         !directorate.revenue || 
        //         !directorate.revenue.budgets || 
        //         !directorate.net_cost || 
        //         !directorate.net_cost.budgets
        //     ) 
        //         return;

        //     $tr.find('td:eq(0)').text(directorate.name.replace('Direktion für ', ''));
        //     $tr.find('td:eq(1)').text(d3.round(directorate.gross_cost.budgets['2013']));
        //     $tr.find('td:eq(2)').text(d3.round(directorate.revenue.budgets['2013']));
        //     $sidebarTableBody.append($tr);
        // });

        $window.resize(vis.resize);
            
        var rootNodeCircles = svg.selectAll('circle.directorate')
            .data(rootNodes);
        
        var rootNodeGroups = svg.selectAll('g.directorate')
            .data(rootNodes);
        
        vis.setActiveNodes(rootNodes, rootNodeCircles, rootNodeGroups);
        force.start();

        rootNodeCircles.enter()
            .append('circle')
            .attr('class', function(d) { return 'directorate'; })
            .attr('cx', vis.cx())
            .attr('cy', vis.cy())
            .attr('r', function(d) { return 0; })
            .style('fill', function(d) { return d.fill; })
            .style('stroke', function(d) { return d.stroke; })
            .call(force.drag);

        rootNodeGroups.enter()
            .append('g')
            .attr('transform', vis.transform())
            .attr('class', function(d) { return 'directorate id-'+d.id; })

        vis.resize();

        force.on('tick', forceTickAndSet);

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

                nodes.stuffChildren(node);
                node.computedRadius = node.stuffedChildrenRadius;

                var g = svg.select('g.id-'+node.id);
                g.classed('blur', 1);

                var childrenCircles = g.selectAll('circle')
                    .data(children);

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

                g.transition().duration(500).style('opacity', 0.5);
            })();
        }

        vis.resize();

        }, 2000);

        //zoom

        var grayscale = function(color) {
            var hsl = d3.hsl(color);
            hsl.s = 0;
            hsl.l += 0.2;
            return hsl.toString();
        };

        var activeGroup;
        d3.select(window).on("click", function() {
            if(!activeGroup) return;
            force.stop();

            nodes.setRadiusScaleFactor(1);
            nodes.calculateRadius();

            var hideSpeed = d3.event.altKey ? 7500 : 750;
            rootNodeCircles.transition().duration(hideSpeed)
                .attr("cx", vis.cx())
                .attr("cy", vis.cy())
                .attr("r", function(d) { return d.radius; })
                .style('fill', function(d) { return d.fill; })
                .style('stroke', function(d) { return d.stroke; });

            var childrenCircles = activeGroup.selectAll('circle');

            childrenCircles.transition().duration(hideSpeed)
                .attr('r', function(d) { return d.sr; })
                .attr('cx', function(d) { return d.sx; })
                .attr('cy', function(d) { return d.sy; })
                .style('fill', function(d) { return d.parent.fill; })
                .style('stroke', function(d) { return d.parent.stroke; });

            setTimeout(function() {
                vis.setActiveNodes(rootNodes, rootNodeCircles, rootNodeGroups);
            }, hideSpeed);

            activeGroup.each(function(d) {
                d.computedRadius = d.stuffedChildrenRadius;
            });

            activeGroup.transition().duration(hideSpeed)
                .attr('transform', vis.transform());

            var fadeInSpeed = d3.event.altKey ? 750 : 75;
            rootNodeGroups.classed('blur', 1).transition().delay(hideSpeed - fadeInSpeed).duration(fadeInSpeed)
                .style('opacity', 0.5);
                //.attr('transform', vis.transform());

            activeGroup = null;
        });
        rootNodeCircles.on('click', function(e) {
            if(activeGroup) return;
            d3.event.stopPropagation();
            force.stop();

            var d = this.__data__,
                c = d3.select(this),
                g = d3.select('g.id-'+d.id),
                children = d.children;

            if(!children || !children.length) {
                return;
            }
            
            //rootNodeCircles.each(function(d) { d.fixed = true; });

            var newRadius = (Math.min(svgWidth, svgHeight) / 2) - 200;
            var scaleFactor = newRadius / d.radius;

            xScale.domain([d.x - d.radius*1.83, d.x + d.radius*1.83]);
            yScale.domain([d.y - d.radius*1.83, d.y + d.radius*1.83]);

            var filter = function(dd) {
                    return dd == d ? null : this;
                },
                disabledCircles = rootNodeCircles.filter(filter),
                disabledGroups = rootNodeGroups.filter(filter);

            nodes.setRadiusScaleFactor(scaleFactor);
            nodes.calculateRadius();

            d.computedRadius = undefined;

            var transitionSpeed = d3.event.altKey ? 7500 : 750;

            rootNodeCircles.transition().duration(transitionSpeed)
                .attr("cx", vis.cx(xScale))
                .attr("cy", vis.cy(yScale))
                .attr("r", function(d) { return d.radius; })
                .style('fill', function(d) { return '#ffffff'; })
                .style('stroke', function(d) { return grayscale(d.stroke); });

            disabledGroups.transition().duration(75)
                .style('opacity', 0);

            g.classed('blur', 0);
            g.transition().duration(transitionSpeed)
                .attr('transform', vis.transform(xScale, yScale))
                .style('opacity', 1);

            var childrenCircles = g.selectAll('circle');

            vis.setActiveNodes(children, childrenCircles);

            force.on('tick', forceTick);
            force.start();
            var tickI, tickIMax = 50;
            for(tickI = 0; tickI < tickIMax; tickI+=1) force.tick();
            force.stop();

            var childrenTransitionSpeed = Math.floor(transitionSpeed / 2);

            childrenCircles.transition().duration(transitionSpeed)
                .attr('r', function(d) { return d.radius; })
                .attr('cx', function(d) { return d.x; })
                .attr('cy', function(d) { return d.y; })
                .style('fill', function(d) { return d.fill; })
                .style('stroke', function(d) { return d.stroke; });

            setTimeout(function() {
                force.on('tick', forceTickAndSet);
                force.start();
            }, transitionSpeed);

            activeGroup = g;

        });
    });
});