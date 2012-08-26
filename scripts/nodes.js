OpenBudget.nodes = (function() {
    var centers = {
        'right': {x:0,y:0},
        'middle': {x:0,y:0},
        'left': {x:0,y:0}
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
        if(!value2) {
            // ToDo: verify edge cases
            return 100;
        }
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
            node.id = parent.id + '-' + datum.number;
            parent.children.push(node);
        }
        else {
            node.center = centers[type == 'gross_cost' ? 'left' : 'right'];
            node.id = type + '-' + datum.number;

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

    var surplus,
        surplus2,
        surplusNode;

    var radiusScale = d3.scale.sqrt(),
        radiusScaleFactor = 1;


    var stuffForce = d3.layout.force()
        .gravity(-0.01)
        .friction(0.9)
        .alpha(0.01)
        .charge(function(d) { return -Math.pow(d.radius, 2.0) / 16; });

    var moveTowardsCenter = function(alpha, parentRadius) {
        return function(d) {
            var c = parentRadius, da = 0.13 * alpha;
            d.x += (c - d.x) * da;
            d.y += (c - d.y) * da;
        }
    };

    var valueSort = function(a, b) {
        return b.value - a.value;
    };

    var fn = {
        load: function(loadCallback) {
            d3.json('data/bern-budget2013.json', function(data) {
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

                // surplus = d3.round(totals.revenue.value - totals['gross_cost'].value, 2);
                // surplus2 = d3.round(totals.revenue.value2 - totals['gross_cost'].value2, 2);
                
                // surplusNode = {
                //     'name': surplus < 0 ? 'Defizit' : 'Überschuss',
                //     'value': surplus,
                //     'value2': surplus2,
                //     'diff': diffPercent(surplus, surplus2),
                //     'type': 'surplus',
                //     'depth': 0,
                //     'center': centers['middle'],
                //     'id': 'surplus'
                // };
                // rootNodes.push(surplusNode);
                // nodes.push(surplusNode);
                
                var recursiveSort = function(nodes) {
                    nodes.sort(valueSort);
                    $.each(nodes, function(key, value) {
                        if(value.children) {
                            recursiveSort(value.children);
                        }
                    });
                }
                recursiveSort(nodes);

                var valueAccessor = function(d) {
                    return d.value;
                };
                
                var max = d3.max(nodes, valueAccessor);
                var min = d3.min(nodes, valueAccessor);
                
                radiusScale.domain([0, d3.max([max, Math.abs(min)])]);

                // var colorScale = d3.scale.linear()
                //     .domain([-100, 0, 100]).clamp(true)
                //     .range(['rgb(230,20,20)', 'rgb(255,255,230)', 'rgb(20,230,20)']);
                //     //.range(['rgb(255,77,77)', 'rgb(255,255,230)', 'rgb(77,255,77)']);

                // $.each(nodes, function(index, d) {
                //     var rgb = d3.rgb(colorScale(d.diff));
                //     d.fill = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
                //     d.stroke = rgb.darker().toString();
                // });

                loadCallback(rootNodes, data);
            });
        },
        resize: function(width, height) {
            centers['middle'].x = width / 2;
            centers['middle'].y = height / 2;
            centers['left'].x = width / 4;
            centers['left'].y = height / 2;
            centers['right'].x = width / 4 * 3;
            centers['right'].y = height / 2;

            radiusScale.range([0, width / (rootNodes.length / 1.5)]);
            fn.calculateRadius();
        },
        calculateRadius: function() {
            var i = 0,
                nodesLength = nodes.length,
                d,
                r;
            while(i < nodesLength) {
                d = nodes[i];
                r = radiusScale(d.value);
                d.unscaledRadius = r;
                d.radius = r * radiusScaleFactor;
                i += 1;
            }
        },
        setRadiusScaleFactor: function(scaleFactor) {
            radiusScaleFactor = scaleFactor;
        },
        stuffChildren: function(node) {
            var children = node.children || {},
                childrenLength = children.length,
                nodeRadius = node.radius,
                nodeSize = nodeRadius * 2;

            if(!childrenLength || node.stuffedChildrenRadius) {
                return;
            }

            stuffForce.size([nodeSize, nodeSize]).nodes(children);

            stuffForce.on('tick', function(e) {
                var i = 0, 
                    c = children, 
                    cl = childrenLength, 
                    f = moveTowardsCenter(e.alpha, nodeRadius), 
                    d;

                while(i < cl) {
                    d = c[i];
                    f(d);
                    i += 1;
                }
            }).start();

            var tickI, tickIMax = childrenLength * 6;
            if(tickIMax < 50) tickIMax = 50;
            for(tickI = 0; tickI < tickIMax; tickI+=1) stuffForce.tick();
            stuffForce.stop();

            var i = 0, d;
            while(i < childrenLength) {
                d = children[i];
                d.sx = d.x;
                d.sy = d.y;
                d.sr = d.radius;
                i += 1;
            }

            node.stuffedChildrenRadius = nodeRadius;
        },
        centers: centers
    };

    return fn;
})();
