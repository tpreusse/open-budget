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
            valueLabel+'CHF '+formatCHF(d.value)+' '+formatDiffPercent(d.diff)+'%'/*+'<br />'+
            valueLabel+'CHF '+formatCHF(d.value2)+' '+formatDiffPercent(d.diff)+'%'*/
        );
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
            var diff = value2 - value;
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
                'value': values.value,
                'value2': values.value2,
                'diff': diffPercent(values.value2, values.value),
                'type': type,
                'key': key,
                'depth': depth
            }

            if(depth) {
                node.parent = parent;
            }
            else {
                node.parent = centers[type];
                totals[type].value += values.value;
                totals[type].value2 += values.value2;
            }

            nodes.push(node);
            while(depth > nodeDepth) {
                nodeDepth += 1;
                nodesByDepth[nodeDepth] = [];
            }
            nodesByDepth[depth].push(node);

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

        var nodes = [];
        var nodesByDepth = [];
        var nodeDepth = -1;

        $.each(data, function(key, directorate) {
            directorateNodes = createNodes(key, directorate);
            $.each(directorate.agencies, function(key, agency) {
                agencyNodes = createNodes(key, agency, directorateNodes);
                /*$.each(agency['product_groups'], function(key, productGroup) {
                    productGroupNodes = createNodes(key, productGroup, agencyNodes);
                    $.each(productGroup.products, function(key, product) {
                        createNodes(key, product, productGroupNodes);
                    });
                });*/
            });
        });
        
        //diff without surplus
        var diffAccessor = function(d) {
            return d.diff;
        };

        var diffMax = d3.max(nodes, diffAccessor);
        var diffMin = d3.min(nodes, diffAccessor);

        var surplus = d3.round(totals.revenue.value - totals['gross_cost'].value, 2);
        var surplus2 = d3.round(totals.revenue.value2 - totals['gross_cost'].value2, 2);
        
        var surplusNode = {
            'name': surplus < 0 ? 'Defizit' : 'Überschuss',
            'value': surplus,
            'value2': surplus2,
            'diff': diffPercent(surplus2, surplus),
            'type': 'surplus',
            'parent': centers['surplus']
        };
        nodes.push(surplusNode);
        nodesByDepth[0].push(surplusNode);
        
        var valueAccessor = function(d) {
            return d.value;
        };
        
        var max = d3.max(nodes, valueAccessor);
        var min = d3.min(nodes, valueAccessor);
        
        var radiusScale = d3.scale.sqrt()
            .domain([0, d3.max([max, Math.abs(min)])]);
        
        var colorScale = d3.scale.linear()
            .domain([diffMin, 0, diffMax])
            .range(['rgb(230,20,20)', 'rgb(255,255,230)', 'rgb(20,230,20)']);
            //.range(['rgb(255,77,77)', 'rgb(255,255,230)', 'rgb(77,255,77)']);

        $.each(nodes, function(index, d) {
            var rgb = d3.rgb(colorScale(d.diff));
            d.fill = 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.3)';
            d.stroke = rgb.darker().toString();
        });

        var svg = d3.select('body').select('svg');
        var force = d3.layout.force()
            .nodes(nodes)
            .gravity(0.0)
            .friction(0.9)
            .charge(0)
            .alpha(0.5)
            .start();
        
        var $window = $(window), $svg = $('svg'), $sidebar = $('#sidebar');
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
            
            radiusScale.range([0, width / (nodesByDepth[0].length / 1.5)]);
            $.each(nodes, function(index, d) {
                d.radius = radiusScale(d.value);
            });
            
            nodeCirles.transition().duration(2000).attr('r', function(d) { return d.radius; });
            force.resume();
        });
            
        var nodeCirles = svg.selectAll('circle')
            .data(nodes);
            
        /*var nodeGs = svg.selectAll('g.directorate')
            .data(nodes);
        
        nodeGs.enter()
            .append('g')
            .attr('transform', function(d) { return 'translate('+d.x+','+d.y+')'; })
            .append('circle').attr('r', function(d) { return 0; });*/
        
        nodeCirles.enter()
            .append('circle')
            .attr('class', function(d) { return d.type; })
            .attr('cx', function(d) { return d.x; })
            .attr('cy', function(d) { return d.y; })
            .attr('r', function(d) { return 0; })
            .style('fill', function(d) { return d.fill; })
            .style('stroke', function(d) { return d.stroke; })
            .call(force.drag);
        
        $window.resize();
        
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
        
        force.on('tick', function(e) {
            var depth = 0,
                nodes, nodesLength, q, i, k, o, c;
            while(nodeDepth >= depth) {
                nodes = nodesByDepth[depth];
                nodesLength = nodes.length;
                q = d3.geom.quadtree(nodes);
                i = 0;
                n = nodes.length;
                k = e.alpha * 0.1;

                while (i < n) {
                    o = nodes[i];
                    c = o.parent;

                    o.x += (c.x - o.x) * k;
                    o.y += (c.y - o.y) * k;

                    if(depth == 0)
                    q.visit(collide(o));
                    
                    i += 1;
                }

                depth += 1;
            }
            
            nodeCirles.attr('cx', function(d) { return d.x; }).attr('cy', function(d) { return d.y; });
            //nodeGs.attr('transform', function(d) { return 'translate('+d.x+','+d.y+')'; });
        });
    });
});