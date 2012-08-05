$(function() {
    var $body = $('body');
    
    /* tooltip */
    var formatCHF = d3.format(',f');
    var formatDiffPercent = d3.format('+.2');
    var $tip = $('<div id="tooltip"></div>').html('<div></div>').hide().appendTo($body);
    var $tipInner = $tip.find('div');
    $(document).mousemove(function(e){
        $tip.css({
            'top': e.pageY + 0,
            'left': e.pageX + 10
        });
    });
    
    $(document).on('mouseover', 'svg circle', function(){
        var d = this.__data__, valueLabel = '';
        if(d.type == 'revenue') {
            valueLabel = 'Erlöse: ';
        }
        else if(d.type == 'gross_cost') {
            valueLabel = 'Bruttokosten: ';
        }

        $tipInner.html(
            '<strong>'+d.name+'</strong><br />'+
            valueLabel+'CHF '+formatCHF(d.value)+' <span>'+formatDiffPercent(d.diff)+'%</span>'/*+'<br />'+
            valueLabel+'CHF '+formatCHF(d.value2)+' '+formatDiffPercent(d.diff)+'%'*/
        );
        $tipInner.find('span').css('color', d.stroke);
        $tip.show();
    });
    $(document).on('mouseout', 'svg circle', function(){
        $tip.hide();
    });
    /* end tooltip */
    
    d3.json('data/bern-budget2013.json', function(data) {
        var centers = {
            'revenue': {x:0,y:0},
            'surplus': {x:0,y:0},
            'gross_cost': {x:0,y:0}
        };
        
        var totals = {
            'revenue': {
                'value': 0,
                'value2': 0
            },
            'gross_cost': {
                'value': 0,
                'value2': 0
            }
        };

        var valuesAccessor = function(type, type2, year1, year2) {
            return function(d) {
                var value = d[type] && d[type][type2] ? d[type][type2][year1] : 0,
                    value2 = d[type] && d[type][type2] ? d[type][type2][year2] : 0,
                    numbers;

                if(value > 0) {
                    numbers = {
                        'value': value
                    }
                    if(value2) {
                        numbers.value2 = value2;
                    }
                }

                return numbers;
            }
        }
        
        var valuesAccessorForNodeType = {
            'revenue': valuesAccessor('revenue', 'budgets', '2013', '2012'),
            'gross_cost': valuesAccessor('gross_cost', 'budgets', '2013', '2012')
        }

        var diffPercent = function(value, value2) {
            var diff = value - value2;
            return d3.round(diff / (value2 / 100), 2);
        }

        var createNode = function(key, datum, parent) {
            if(!parent) return;

            var type = parent.type,
                depth = parent.depth+1,
                values = valuesAccessorForNodeType[type](datum);
            if(!values) return;


            var node = {
                'name': datum.name,
                'id': datum.number+type,
                'value': values.value,
                'value2': values.value2,
                'diff': diffPercent(values.value, values.value2),
                'type': type,
                'key': key,
                'depth': depth,
                'children': []
            }

            if(depth) {
                node.parent = parent;
                parent.children.push(node);
            }
            else {
                node.center = centers[type];

                rootNodes.push(node);

                totals[type].value += values.value;
                totals[type].value2 += values.value2;
            }
            nodes.push(node);

            return node;
        };

        var createNodes = function(key, datum, parents) {
            if(!parents) parents = {
                'revenue': {
                    'depth': -1,
                    'type': 'revenue'
                },
                'gross_cost': {
                    'depth': -1,
                    'type': 'gross_cost'
                }
            };
            return {
                'revenue': createNode(key, datum, parents['revenue']),
                'gross_cost': createNode(key, datum, parents['gross_cost'])
            };
        };

        var rootNodes = [];
        var nodes = [];

        $.each(data, function(key, directorate) {
            directorateNodes = createNodes(key, directorate);
            $.each(directorate.agencies, function(key, agency) {
                agencyNodes = createNodes(key, agency, directorateNodes);
                $.each(agency['product_groups'], function(key, productGroup) {
                    productGroupNodes = createNodes(key, productGroup, agencyNodes);
                    $.each(productGroup.products, function(key, product) {
                        createNodes(key, product, productGroupNodes);
                    });
                });
            });
        });

        var surplus = d3.round(totals.revenue.value - totals['gross_cost'].value, 2);
        var surplus2 = d3.round(totals.revenue.value2 - totals['gross_cost'].value2, 2);
        
        var surplusNode = {
            'name': surplus < 0 ? 'Defizit' : 'Überschuss',
            'value': surplus,
            'value2': surplus2,
            'diff': diffPercent(surplus, surplus2),
            'type': 'surplus',
            'depth': 0,
            'center': centers['surplus'],
            'id': 'surplus'
        };
        rootNodes.push(surplusNode);
        nodes.push(surplusNode);
        
        var valueAccessor = function(d) {
            return d.value;
        };
        
        var max = d3.max(nodes, valueAccessor);
        var min = d3.min(nodes, valueAccessor);
        
        var radiusScale = d3.scale.sqrt()
            .domain([0, d3.max([max, Math.abs(min)])]);
        
        var diffAccessor = function(d) {
            return d.diff;
        };

        var diffMax = d3.max(rootNodes, diffAccessor);
        var diffMin = d3.min(rootNodes, diffAccessor);

        var colorScale = d3.scale.linear()
            .domain([diffMin, 0, diffMax])
            .range(['rgb(230,20,20)', 'rgb(255,255,230)', 'rgb(20,230,20)']);
            //.range(['rgb(255,77,77)', 'rgb(255,255,230)', 'rgb(77,255,77)']);

        $.each(nodes, function(index, d) {
            var rgb = d3.rgb(colorScale(d.diff));
            d.fill = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',1)';
            d.stroke = rgb.darker().toString();
        });

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
            
            centers['surplus'].x = width / 2;
            centers['surplus'].y = height / 2;
            centers['gross_cost'].x = width / 4;
            centers['gross_cost'].y = height / 2;
            centers['revenue'].x = width / 4 * 3;
            centers['revenue'].y = height / 2;
            
            radiusScale.range([0, width / (rootNodes.length / 1.5)]);
            var i = 0,
                nodesLength = nodes.length,
                d;
            while(i < nodesLength) {
                d = nodes[i];
                d.radius = radiusScale(d.value);
                i += 1;
            }
            
            var circlesCollectionsLength = circlesCollections.length;
            i = 0;
            while(i < circlesCollectionsLength) {
                circlesCollections[i].transition().duration(2000).attr('r', function(d) { return d.radius; });
                i += 1;
            }
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
            return 'translate('+(d.x-d.radius)+','+(d.y-d.radius)+')';
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

                g.attr('width', nodeSize).attr('height', nodeSize);
                
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
                        .attr('cy', function(d) { return d.y; })
                        .transition().duration(2000).style('opacity', 1);
            })();
        }

        $window.resize();

        }, 2000);
    });
});