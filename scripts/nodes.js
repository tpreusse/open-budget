TPOpenBudget.nodes = (function() {
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

    var surplus,
        surplus2,
        surplusNode;

    var radiusScale;

    return {
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

                surplus = d3.round(totals.revenue.value - totals['gross_cost'].value, 2);
                surplus2 = d3.round(totals.revenue.value2 - totals['gross_cost'].value2, 2);
                
                surplusNode = {
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
                
                radiusScale = d3.scale.sqrt()
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

                loadCallback(rootNodes);
            });
        },
        resize: function(width, height) {
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
        }
    };
})();
