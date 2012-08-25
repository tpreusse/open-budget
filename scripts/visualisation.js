$(function() {
    var nodes = OpenBudget.nodes;

    var $window = $(window), 
        $svg = $('svg'), 
        $sidebar = $('#sidebar'),
        $body = $('body');

    var svg = d3.select('body').select('svg'),
        defs = svg.select('defs'),
        svgWidth,
        svgHeight;

    var force = d3.layout.force()
        .gravity(0.0)
        .friction(0.9)
        .charge(0)
        .alpha(0.5);

    var activeNodes = d3.select(),
        activeNodesCircles = d3.select(),
        activeNodesGroups = d3.select(),
        activeNodesClipPaths = d3.select();

    var grayscale = function(color) {
        var hsl = d3.hsl(color);
        hsl.s = 0;
        return hsl.toString();
    };

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
        var q, i, k, o, c, aN = activeNodes, aNL = activeNodes.length;

        q = d3.geom.quadtree(aN);
        i = 0;
        k = e.alpha * 0.1;

        while (i < aNL) {
            o = aN[i];
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
        activeNodesGroups.attr('transform', helpers.transform);
    };

    var vis = {
        setActiveNodes: function(aLevel) {
            if(activeNodesCircles) {
                activeNodesCircles
                    .on('mousedown.drag', null)
                    .on('touchstart.drag', null);
            }
            activeNodes = aLevel.nodes;
            activeNodesCircles = aLevel.circles || d3.select();
            activeNodesGroups = aLevel.groups || d3.select();
            activeNodesClipPaths = aLevel.clipPaths || d3.select();

            force.nodes(activeNodes)
            activeNodesCircles.call(force.drag);
        },
        resize: function(svgSizeCallback) {
            svgWidth = $body.width() - $sidebar.outerWidth();
            svgHeight = $body.height();

            if(typeof svgSizeCallback == 'function') {
                svgSizeCallback();
            }
        
            svg.attr('width', svgWidth).attr('height', svgHeight);
            force.size([svgWidth, svgHeight]);
            
            nodes.resize(svgWidth, svgHeight);
            
            activeNodesCircles.attr('r', helpers.r);
            activeNodesClipPaths.selectAll('circle')
                .attr('r', helpers.computedRadius)
                .attr('cx', helpers.computedRadius)
                .attr('cy', helpers.computedRadius);
            activeNodesGroups.attr('transform', helpers.transform);

            force.resume();
        }
    };

    var helpers = {
        transform: function(d) {
            var radius = d.radius,
                computedRadius = d.computedRadius,
                scale = computedRadius ? radius / computedRadius : 1;
            return 'translate(' + (d.x - radius) + ',' + (d.y - radius) + ') scale(' + scale + ')';
        },
        centerTransform: function(d) {
            var radius = d.radius,
                parent = d.parent,
                center = parent ? {x: parent.centerRadius, y: parent.centerRadius} : nodes.centers['middle'];
            d.centerRadius = radius;
            return 'translate(' + (center.x - radius) + ',' + (center.y - radius) + ') scale(1)';
        },
        cx: function(d) {
            return d.x;
        },
        cy: function(d) {
            return d.y;
        },
        r: function(d) {
            return d.radius;
        },
        computedRadius: function(d) {
            return d.computedRadius || d.radius;
        },
        classWithParent: function(parentId, suffix) {
            suffix = suffix ? ' ' + suffix : '';
            return 'p-' + parentId + suffix;
        },
        classWithParentAndLevel: function(parentId, level) {
            return helpers.classWithParent(parentId, 'l-' + level);
        },
        cid: function(d) { return 'c-' + d.id; },
        gid: function(d) { return 'g-' + d.id; },
        clipPathId: function(d) { return 'clip-path-' + d.id; },
        clipPathUrl: function(d) { return 'url(#'+helpers.clipPathId(d)+')'; },
        reject: function(dd) {
            return function(d) {
                return d == dd ? null : this;
            }
        }
    }

    var level = {
        stack: [],
        all: [],
        current: function() {
            return level.getAtStackPos(level.stack.length - 1);
        },
        getAtStackPos: function(i) {
            return level.all[level.stack[i]];
        },
        setup: function(levelNodes, parent) {
            var levelId = level.all.length,
                parentId;

            if(typeof parent == 'string') {
                parentId = parent;
                parentSelection = svg;
            }
            else {
                parentId = parent.id;
                parentSelection = d3.select('#g-' + parentId);
            }

            var nodeCircles = parentSelection.selectAll('circle.p-' + parentId + ', circle.l-' + levelId)
                .data(levelNodes);

            var clipPaths = defs.selectAll('clipPath.l-' + levelId)
                .data(levelNodes);

            var nodeGroups = parentSelection.selectAll('g.p-' + parentId+', g.l-' + levelId)
                .data(levelNodes);

            nodeCircles.enter()
                .append('circle').attr('id', helpers.cid);
            nodeCircles.attr('class', helpers.classWithParentAndLevel(parentId, levelId));

            clipPaths.enter()
                .append('clipPath').attr('id', helpers.clipPathId)
                    .append('circle');
            clipPaths.attr('class', helpers.classWithParentAndLevel(parentId, levelId));

            nodeGroups.enter()
                .append('g').attr('id', helpers.gid);
            nodeGroups.attr('class', helpers.classWithParentAndLevel(parentId, levelId))
                .attr('clip-path', helpers.clipPathUrl);

            nodeGroups.each(function(d) {
                var children = d.children || {},
                    childrenLength = children.length;

                if(childrenLength < 2) {
                    return;
                }

                setTimeout(function() {
                    var parentId = d.id;

                    nodes.stuffChildren(d);
                    d.computedRadius = d.stuffedChildrenRadius;

                    var g = d3.select('#g-' + d.id);
                    g.classed('blur', 1);

                    var childrenCircles = g.selectAll('circle')
                        .data(children);

                    childrenCircles.enter()
                        .append('circle')
                            .attr('id', helpers.cid)
                            .attr('class', helpers.classWithParent(parentId, 'blur'))
                            .attr('cx', helpers.cx)
                            .attr('cy', helpers.cy)
                            .attr('r', helpers.r)
                            .style('fill', function(d) { return d.parent.fill; })
                            .style('stroke', function(d) { return d.parent.stroke; });
                    
                    // smallest = last dom element = on top
                    childrenCircles.sort(function(a, b) {
                        return b.radius - a.radius;
                    });

                    // g.transition().duration(500).style('opacity', 0.5);
                }, 10);
            });

            level.all[levelId] = {
                'nodes': levelNodes, 
                'circles': nodeCircles, 
                'groups': nodeGroups,
                'clipPaths': clipPaths
            };
            return levelId;
        },
        push: function(levelId, parent) {
            var curLevel = level.current();
            if(curLevel) {
                curLevel.parent = parent;
            }

            level.stack.push(levelId);

            var theLevel = level.all[levelId];

            var i, stackToHide = level.stack.length - 2, stackLevelId, stackLevel;
            for(i = 0; i < stackToHide; i += 1) {
                stackLevelId = level.stack[i];
                stackLevel = level.all[stackLevelId];
                if(!stackLevel.hidden) {
                    stackLevel.hidden = true;
                    svg.selectAll('.l-'+stackLevelId).filter(helpers.reject(stackLevel.parent))
                        .transition().duration(750)
                        .style('opacity', 0);
                }
            }

            theLevel.circles.on('click', level.zoom);
        },
        pop: function() {
            var levelId = level.stack.pop();

            if(level.stack.length > 1) {
                var stackLevelId = level.stack[level.stack.length - 2],
                    stackLevel = level.all[stackLevelId];

                if(stackLevel.hidden) {
                    stackLevel.hidden = false;
                    svg.selectAll('.l-'+stackLevelId).filter(helpers.reject(stackLevel.parent))
                        .transition().duration(750)
                        .style('opacity', 0.3);
                }
            }

            return level.all[levelId];
        },
        zoom: function(e) {
            var d = this.__data__,
                c = d3.select(this),
                cNode = this,
                g = d3.select('#g-' + d.id),
                gNode = g.node(),
                children = d.children;

            if(d.depth+1 < level.stack.length) return;
            d3.event.stopPropagation();
            force.stop();

            if(!children || children.length < 2) {
                return;
            }

            var curLevel = level.current(),
                levelId = level.setup(children, d),
                theLevel = level.all[levelId];

            level.push(levelId, d);
            
            // curLevel.circles.each(function(d) { d.fixed = true; });

            var newRadius = (Math.min(svgWidth, svgHeight) / 2) - 200;
            var unscaledRadius = d.unscaledRadius;
            var scaleFactor = newRadius / unscaledRadius;

            var filter = helpers.reject(d),
                disabledCircles = curLevel.circles.filter(filter),
                disabledGroups = curLevel.groups.filter(filter);

            nodes.setRadiusScaleFactor(scaleFactor);
            nodes.calculateRadius();

            d.computedRadius = undefined;

            var transitionSpeed = d3.event.altKey ? 7500 : 750;

            cNode.parentNode.appendChild(cNode);
            gNode.parentNode.appendChild(gNode);

            c.transition().duration(transitionSpeed)
                .attr('cx', helpers.cx)
                .attr('cy', helpers.cy)
                .attr('r', helpers.r)
                .style('opacity', 0)
                .style('fill', function(d) { return '#ffffff'; })
                .style('stroke', function(d) { return grayscale(d.stroke); });

            disabledCircles.transition().duration(transitionSpeed)
                // .style('fill', function(d) { return grayscale(d.fill); })
                // .style('stroke', function(d) { return grayscale(d.stroke); })
                .style('opacity', 0.3);

            disabledGroups.transition().duration(75)
                .style('opacity', 0.3);

            g.attr('clip-path', '').classed('blur', 0);
            g.transition().duration(transitionSpeed)
                .attr('transform', helpers.centerTransform)
                .style('opacity', 1);

            vis.setActiveNodes(theLevel);

            force.on('tick', forceTick);
            force.start();
            var tickI, tickIMax = 50;
            for(tickI = 0; tickI < tickIMax; tickI+=1) force.tick();
            force.stop();

            var childrenTransitionSpeed = Math.floor(transitionSpeed / 2);

            theLevel.circles.transition().duration(transitionSpeed)
                .attr('r', helpers.r)
                .attr('cx', helpers.cx)
                .attr('cy', helpers.cy)
                .style('fill', function(d) { return d.fill; })
                .style('stroke', function(d) { return d.stroke; });

            theLevel.groups.transition().duration(transitionSpeed)
                .attr('transform', helpers.transform);

            setTimeout(function() {
                force.on('tick', forceTickAndSet);
                force.start();

                vis.resize();
                g.selectAll('g').transition().duration(75).style('opacity', 0.5);
            }, transitionSpeed);
        }
    };

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

        var levelId = level.setup(rootNodes, 'root');
        var theLevel = level.all[levelId];

        var rootNodeCircles = theLevel.circles,
            rootNodeGroups = theLevel.groups;

        vis.setActiveNodes(theLevel);
        force.start();

        rootNodeCircles
            .attr('cx', helpers.cx)
            .attr('cy', helpers.cy)
            .style('fill', function(d) { return d.fill; })
            .style('stroke', function(d) { return d.stroke; })
            .call(force.drag);

        rootNodeGroups
            .attr('transform', helpers.transform)
            .style('opacity', 0.5);

        vis.resize();

        /*rootNodeCircles.attr('r', function(d) { return 0; });
        rootNodeCircles.transition().duration(2000)
            .attr('r', helpers.r);*/

        force.on('tick', forceTickAndSet);
        level.push(levelId);

        // zoom out
        d3.select(window).on("click", function() {
            if(level.stack.length < 2) return;
            force.stop();

            var popLevel = level.pop(),
                newLevel = level.current();

            var newActiveParent = newLevel.nodes[0].parent,
                scaleFactor;
            if(newActiveParent) {
                scaleFactor = ((Math.min(svgWidth, svgHeight) / 2) - 200) / newActiveParent.unscaledRadius;
            }
            else {
                scaleFactor = 1;
            }
            nodes.setRadiusScaleFactor(scaleFactor);
            nodes.calculateRadius();

            var hideSpeed = d3.event.altKey ? 7500 : 750;
            newLevel.circles.transition().duration(hideSpeed)
                .attr('cx', helpers.cx)
                .attr('cy', helpers.cy)
                .attr('r', helpers.r)
                .style('opacity', 1)
                .style('fill', function(d) { return d.fill; })
                .style('stroke', function(d) { return d.stroke; });

            var childrenCircles = popLevel.circles,
                childrenGroups = popLevel.groups;

            childrenGroups.transition().duration(75)
                .style('opacity', 0)
                .remove();

            vis.setActiveNodes(newLevel);

            childrenCircles.sort(function(a, b) {
                return b.radius - a.radius;
            });

            childrenCircles.transition().duration(hideSpeed)
                .attr('r', function(d) { return d.sr; })
                .attr('cx', function(d) { d.x = d.sx; return d.x; })
                .attr('cy', function(d) { d.y = d.sy; return d.y; })
                .style('fill', function(d) { return d.parent.fill; })
                .style('stroke', function(d) { return d.parent.stroke; });

            var activeGroup = d3.select('#g-' + popLevel.nodes[0].parent.id);
            activeGroup.each(function(d) {
                d.computedRadius = d.stuffedChildrenRadius;
            });

            activeGroup.transition().duration(hideSpeed)
                .attr('transform', helpers.transform);

            var fadeInSpeed = d3.event.altKey ? 750 : 75;
            newLevel.groups.classed('blur', 1).transition().delay(hideSpeed - fadeInSpeed).duration(fadeInSpeed)
                .attr('clip-path', helpers.clipPathUrl)
                .style('opacity', 0.5);
                //.attr('transform', helpers.transform);

            setTimeout(function() {
                vis.resize();
            }, hideSpeed);
        });
    });
});
