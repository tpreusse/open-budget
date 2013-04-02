OpenBudget.nodes = (function() {
    var centers = {
        'right': {x:0,y:0},
        'topRight': {x:0,y:0},
        'middle': {x:0,y:0},
        'topMiddle': {x:0,y:0},
        'left': {x:0,y:0},
        'topLeft': {x:0,y:0}
    };

    var totals,
        setupTotals = function() {
            totals = {
                'revenue': {
                    'value': 0,
                    'value2': 0
                },
                'gross_cost': {
                    'value': 0,
                    'value2': 0
                }
            };
        };
    setupTotals();

    var valuesAccessor = function(type, type2, year1, year2) {
        return function(d) {
            var dType = d[type],
                value = dType && dType[type2] ? dType[type2][year1] || 0 : 0,
                value2 = dType && dType[type2] ? dType[type2][year2] || 0 : 0,
                numbers;

            if(value > 0 || value2 > 0) {
                numbers = {
                    value: value,
                    value2: value2
                };
            }

            return numbers;
        };
    };

    var valuesAccessorForNodeType = {
        'revenue': valuesAccessor('revenue', 'budgets', '2013', '2012'),
        'gross_cost': valuesAccessor('gross_cost', 'budgets', '2013', '2012')
    };

    var diffPercent = function(value, value2) {
        if(!value2) {
            // ToDo: verify edge cases
            return 100;
        }
        var diff = value - value2;
        return d3.round(diff / (value2 / 100), 2);
    };

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
            'depth': depth,
            'children': []
        };

        if(depth) {
            node.parent = parent;
            node.id = parent.id + '-' + (datum.number || key);
            parent.children.push(node);
        }
        else {
            node.center = centers[type == 'gross_cost' ? 'left' : 'right'];
            node.id = type + '-' + (datum.number || key);

            rootNodes.push(node);

            totals[type].value += values.value;
            totals[type].value2 += values.value2;

            node.name = $.trim(node.name.replace(/^Direktion für/, ''));
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
            'revenue': createNode(key, datum, parents.revenue),
            'gross_cost': createNode(key, datum, parents.gross_cost)
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
    var stuffForceMinTick = 50;

    var moveTowardsCenter = function(alpha, parentRadius) {
        return function(d) {
            var c = parentRadius, da = 0.13 * alpha;
            d.x += (c - d.x) * da;
            d.y += (c - d.y) * da;
        };
    };

    var valueSort = function(a, b) {
        return b.value - a.value;
    };

    var fn = {
        process: function(data) {
            var recursiveCreate = function(nodes, parents) {
                _.each(nodes, function(node) {
                    key = node.id;
                    nodes = createNodes(key, node, parents);
                    if(node.children) {
                        recursiveCreate(node.children, nodes);
                    }
                });
            };

            recursiveCreate(data);

            surplus = d3.round(totals.revenue.value - totals['gross_cost'].value, 2);
            surplus2 = d3.round(totals.revenue.value2 - totals['gross_cost'].value2, 2);
            var surplusDiff = diffPercent(surplus, surplus2),
                isDeficit = surplus < 0;
            if(isDeficit) {
                surplus *= -1;
                surplus2 *= -1;
            }
            if(surplus2 < 0) {
                surplusDiff = 100;
            }

            surplusNode = {
                'name': isDeficit ? 'Defizit' : 'Überschuss',
                'value': surplus,
                'value2': surplus2,
                'diff': surplusDiff,
                'type': 'surplus',
                'depth': 0,
                'center': centers['middle'],
                'id': 'surplus'
            };
            rootNodes.push(surplusNode);
            nodes.push(surplusNode);
            // console.log(surplus, surplus2);

            var colorScale = d3.scale.linear()
                .domain([-100, 0, 100]).clamp(true)
                .range(['rgb(230,20,20)', 'rgb(255,255,230)', 'rgb(20,230,20)']);
                //.range(['rgb(255,77,77)', 'rgb(255,255,230)', 'rgb(77,255,77)']);

            _.each(nodes, function(d) {
                var rgb = d3.rgb(colorScale(d.diff));
                d.fill = 'rgb('+rgb.r+','+rgb.g+','+rgb.b+')';
                d.stroke = rgb.darker().toString();
            });

            var recursiveSort = function(nodes) {
                nodes.sort(valueSort);
                _.each(nodes, function(value) {
                    if(value.children) {
                        recursiveSort(value.children);
                    }
                });
            };
            recursiveSort(nodes);
        },
        setup: function() {
            var valueAccessor = function(d) {
                return d.value;
            };

            var max = d3.max(nodes, valueAccessor);
            var min = d3.min(nodes, valueAccessor);

            radiusScale.domain([0, d3.max([max, Math.abs(min)])]);
        },
        createCache: function() {
            var ready = function(data) {
                rootNodes = [];
                nodes = [];
                setupTotals();

                fn.process(data);
                fn.setup();
                fn.resize(1920, 1080);

                // this kills your browser
                stuffForceMinTick *= 10;
                var recursiveStuffing = function(nodes) {
                    var aRadiusScaleFactor = 300 / d3.max(nodes, function(d) { return d.unscaledRadius; });
                    _.each(nodes, function(value) {
                        if(value.children) {
                            fn.stuffChildren(value, aRadiusScaleFactor);
                            recursiveStuffing(value.children);
                        }
                    });
                };
                recursiveStuffing(rootNodes);
                stuffForceMinTick /= 10;

                var recursiveCleanup = function(nodes) {
                    _.each(nodes, function(value) {
                        value.parent = undefined;
                        value.center = undefined;
                        if(value.children) {
                            recursiveCleanup(value.children);
                        }
                    });
                };
                recursiveCleanup(rootNodes);

                $('body').append('<textarea></textarea>').find('textarea:last').css({
                    position: 'fixed',
                    'z-index': 99999,
                    top: '0px',
                    left: '0px',
                    width: '100%',
                    height: '100%'
                }).text(JSON.stringify(rootNodes));
            };

            var dataUrl = OpenBudget.data.meta.data_url;
            if(dataUrl) {
                d3.json(dataUrl, ready);
            }
            else {
                ready(OpenBudget.data.nodes);
            }
        },
        loadFromCache: function(loadCallback) {
            var ready = function(data) {
                rootNodes = data;

                var recursiveReferencing = function(someNodes) {
                    _.each(someNodes, function(value) {
                        if(!value.depth) {
                            value.center = centers[value.type == 'gross_cost' ? 'left' : 'right'];
                            if(value.type == 'surplus') {
                                value.center = centers['middle'];
                            }
                        }
                        if(value.children) {
                            _.each(value.children, function(value2) {
                                value2.parent = value;
                            });
                            recursiveReferencing(value.children);
                        }
                        nodes.push(value);
                    });
                };
                recursiveReferencing(rootNodes);

                fn.setup();
                fn.calculateRadius();

                loadCallback(rootNodes);
            };

            var cacheUrl = OpenBudget.data.meta.cache_url;
            if(cacheUrl) {
                d3.json(cacheUrl, ready);
            }
            else {
                ready(OpenBudget.data.cache);
            }
        },
        load: function(loadCallback) {
            var ready = function(data) {
                fn.process(data);
                fn.setup();

                loadCallback(rootNodes);
            };

            var dataUrl = OpenBudget.data.meta.data_url;
            if(dataUrl) {
                d3.json(dataUrl, ready);
            }
            else {
                ready(OpenBudget.data.nodes);
            }
        },
        resize: function(width, height) {
            centers.middle.x = width / 2;
            centers.middle.y = height / 2;
            centers.topMiddle.x = centers.middle.x;
            centers.topMiddle.y = centers.middle.y / 3;
            centers.left.x = width / 4;
            centers.left.y = height / 2;
            centers.topLeft.x = centers.left.x;
            centers.topLeft.y = centers.left.y / 3;
            centers.right.x = width / 4 * 3;
            centers.right.y = height / 2;
            centers.topRight.x = centers.right.x;
            centers.topRight.y = centers.right.y / 3;

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
        stuffChildren: function(node, scaleFactor) {
            var children = node.children || {},
                childrenLength = children.length,
                nodeRadius = scaleFactor !== undefined ? node.unscaledRadius * scaleFactor : node.radius,
                nodeSize = nodeRadius * 2,
                i, d;

            if(!childrenLength || node.stuffedChildrenRadius) {
                return;
            }

            if(scaleFactor !== undefined) {
                i = 0;
                while(i < childrenLength) {
                    d = children[i];
                    d.radius = d.unscaledRadius * scaleFactor;
                    i += 1;
                }
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
            if(tickIMax < stuffForceMinTick) tickIMax = stuffForceMinTick;
            for(tickI = 0; tickI < tickIMax; tickI+=1) stuffForce.tick();
            stuffForce.stop();

            i = 0;
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
