//= require underscore
//= require d3/d3.v3
//= require experiment/force_extension
//= require experiment/segmented_control
//= require experiment/tooltip
//= require foundation

(function() {
    OpenBudget.layers = function() {
        var hierarchy = d3.layout.hierarchy();

        function layers(d, i) {
            var nodes = hierarchy.call(this, d, i);

            return nodes;
        }

        return d3_layout_hierarchyRebind(layers, hierarchy);
        // return layers;
    };

    // ToDo properly import from d3

    // A method assignment helper for hierarchy subclasses.
    function d3_layout_hierarchyRebind(object, hierarchy) {
        d3.rebind(object, hierarchy, "sort", "children", "value");

        // Add an alias for nodes and links, for convenience.
        object.nodes = object;
        object.links = d3_layout_hierarchyLinks;

        return object;
    }

    // Returns an array source+target objects for the specified nodes.
    function d3_layout_hierarchyLinks(nodes) {
        return d3.merge(nodes.map(function(parent) {
          return (parent.children || []).map(function(child) {
            return {source: parent, target: child};
          });
        }));
    }
})();

OpenBudget.vis = function() {
    var x;

    function vis(selection) {
        selection.each(function(levels, i) {
        });
    }

    vis.x = function(value) {
        if (!arguments.length) return x;
        x = value;
        return vis;
    };

    return vis;
};

$(function(){

    $(document).foundation();

    var formatCHF = d3.format(',.2f');

    function formatMioCHF(n) {
        return formatCHF(n / Math.pow(10, 6));
    }

    types = {
        'budgets': {
            format: formatMioCHF,
            suffix: 'Mio. CHF'
        },
        'positions': {
            format: d3.format(',.1f'),
            suffix: 'Vollzeitstellen'
        }
    };

    $('.segmented-control').segmentedControl();

    var layers = OpenBudget.layers(),
        nodes = [],
        all = [],
        levels = [],
        maxCluster;

    var width,
        height;

    var maxValue,
        radius = d3.scale.sqrt(),
        color = d3.scale.category10().domain(d3.range(10)),
        // svg eles for radius update
        circleGroups, legendCircles, legendLabels,
        legendData;

    var force = d3.layout.force()
        .gravity(0)
        .charge(0)
        .on("tick", tick);

    function tick(e) {
      circleGroups
          .each(forceExt.cluster(10 * e.alpha * e.alpha))
          .each(forceExt.collide(0.5))
          .attr('transform', function(d) {
            return 'translate('+d.x+', '+d.y+')';
          });
    }

    var forceExt = d3.layout.forceExtension()
        .radius(radius);

    var tooltip = OpenBudget.tooltip()
        .types(types);

    var svg = d3.select("svg.main");

    var legendG = svg.append("g");

    var mainG = svg.append("g")
        .classed('main', 1);

    function resize() {
        width = $(window).width();
        height = Math.max($(window).height() / 100 * 75, 520);

        svg.style('width', Math.round(width) + 'px');
        svg.style('height', Math.round(height) + 'px');

        var radiusHeight = height;
        if(width < 768) {
            radiusHeight -= 200;
        }

        radius.range([0, radiusHeight/8]);

        force
            .size([width, height]);
        forceExt
            .size([width, height]);

        // will lead to fatal error otherwise
        if(circleGroups) {
            force.start();

            updateRadius();
        }
    }
    $(window).resize(_.debounce(resize, 166)); // 166 = 5 * 33.3 = every 5th frame

    // controls for level, year and data
    var $levelControl = $('.segmented-control.levels'),
        activeDepth = parseInt($levelControl.segmentedControl('val'), 10);
    $levelControl.change(function() {
        activeDepth = parseInt($levelControl.segmentedControl('val'), 10);
        updateVis();
    });

    var $yearControl = $('.segmented-control.year'),
        activeYear = $yearControl.segmentedControl('val');
    $yearControl.change(function() {
        activeYear = $yearControl.segmentedControl('val');
        updateVis();
    });

    var $typeControl = $('.segmented-control.type'),
        activeType = $typeControl.segmentedControl('val');
    $typeControl.change(function() {
        activeType = $typeControl.segmentedControl('val');
        updateVis();
    });

    var $dataControl = $('.segmented-control.data');
    $dataControl.find('a:first').addClass('active');
    $dataControl.change(function() {
        d3.json($(this).segmentedControl('val'), function(data) {
            setup({"children": data});

            updateVis();
        });
    }).change();

    function showDetail(d) {
        if(d.detail) {
            $('#detail-modal').foundation('reveal', 'open', {
                url: '/be-asp/d/'+d.id
            });
        }
        else if(d.depth !== 1) {
            $('#no-detail-modal').foundation('reveal', 'open');
        }
    }

    // called after new data is loaded
    function setup(data) {
        all = layers(data);
        levels = [
            all.filter(function(d) { return d.depth === 1; }),
            all.filter(function(d) { return d.depth === 2; })
        ];
        maxCluster = levels[0].length;

        d3.select('.legend').selectAll('li').remove();
        var lis = d3.select('.legend').selectAll('li')
            .data(levels[0]);

        lis.enter().append('li');

        lis.html(function(d) { return '<span class="circle"></span>' + d.name; });
        lis.select('span')
            .style('border-color', function(d) {
                return color(d.parent.id || d.id);
            })
            .style('background-color', function(d) {
                var rgb = d3.rgb(color(d.parent.id || d.id));
                return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
            });

        // only needed if maxCluster > 10
        // color.domain(d3.range(maxCluster));
    }

    // called when level or year changes
    function updateVis() {
        tooltip.activeType(activeType);
        tooltip.activeYear(activeYear);

        nodes = levels[activeDepth - 1].filter(function(d) {
            return d.cuts[activeType];
        });

        nodes.forEach(function(d) {
            d.value = d.cuts[activeType][activeYear];
            var value2 = ((d.gross_cost || {})[activeType] || {})["2012"];
            if(value2) {
                d.value2 = value2;
                d.diff = d3.round((100 + ((d.value - value2) / (value2 / 100))) * -1, 2);
            }
            else {
                d.value2 = d.diff = undefined;
            }
        });

        maxValue = d3.max(nodes, function(d) {
            return d.value;
        });

        radius.domain([0, maxValue]);

        legendData = activeType == 'positions' ? [
            {value: 100, name: '100 Stellen', color:'gray'},
            {value: 10, name: '10 Stellen', color:'gray'},
            {value: 1, name: '1 Stellen', color:'gray'}
        ] : [
            {value: 50000000, name: '50 Mio.', color:'gray'},
            {value: 10000000, name: '10 Mio.', color:'gray'},
            {value: 1000000, name: '1 Mio.', color:'gray'}
        ];
        legendCircles = legendG.selectAll('circle').data(legendData);

        legendCircles.enter().append('circle')
            .classed('legend', 1)
            .attr('cx', 0);

        legendLabels = legendG.selectAll('text').data(legendData);

        legendLabels.enter().append('text')
            .attr('x', -10);

        legendLabels
            .text(function(d) { return d.name; });

        nodes.forEach(function(d) {
            d.color = color(d.parent.id || d.id);
        });

        d3.select('table.main').select('tbody').selectAll('tr').remove();

        d3.select('table.main').select('th:nth-child(1)')
            .text(OpenBudget.meta.hierarchy[activeDepth - 1]);

        d3.select('table.main').select('thead').selectAll('tr')
            .selectAll('th')
                .selectAll('.format')
                    .text('(' + types[activeType].suffix + ')');

        var trs = d3.select('table.main').select('tbody')
            .selectAll('tr').data(nodes)
                .enter().append('tr')
                    .attr('class', function(d) {
                        return d.detail ? 'has-detail' : '';
                    });

        trs.on('click', showDetail);

        trs.append('td')
            .append('span')
                .classed('circle', 1)
                .attr('title', function(d) { return d.parent.name; })
                .style('border-color', function(d) {
                    return d.color;
                })
                .style('background-color', function(d) {
                    var rgb = d3.rgb(d.color);
                    return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
                });

        trs.append('td')
            .text(function(d) { return (d.short_name ? d.short_name + ' ' : '') + d.name; });

        ['2014', '2015', '2016', '2017'].forEach(function(year, index) {
            var total = d3.sum(nodes, function(d) { return d.cuts[activeType][year]; });
            d3.select('table.main').select('tfoot td:nth-child('+ (index + 2) +')')
                .text(types[activeType].format(total));

            trs.append('td')
                .text(function(d) { return types[activeType].format(d.cuts[activeType][year]); });

        });

        force
            .nodes(nodes);
        forceExt
            .nodes(nodes);

        circleGroups = mainG.selectAll("g")
            .data(nodes, function(d) { return d.id; });

        var enterGs = circleGroups.enter().append('g')
            .on('touchmove', function(d) {
                d3.event.preventDefault();
            })
            .on('click', function(d) {
                if(!d3.event.defaultPrevented) {
                    showDetail(d);
                }
            })
            .attr('class', function(d) {
                return d.detail ? 'has-detail' : '';
            })
            .call(force.drag);

        enterGs
            .append("circle")
                .attr("r", 0)
                .attr("cx", 0)
                .attr("cy", 0)
                .style("stroke", function(d) { return d.color; })
                .style("fill", function(d) {
                    var rgb = d3.rgb(d.color);
                    return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
                });
        enterGs
            .append('text')
                .style('opacity', 0)
                .style('fill', function(d) { return d.color; })
                .attr('text-anchor', 'middle')
                .attr('dy', function(d) { return '.5em'; })
                .text(function(d) { return d.short_name; });

        circleGroups
            .selectAll('circle')
                .datum(function() {
                    return this.parentNode.__data__;
                });
        circleGroups
            .selectAll('text')
                .datum(function() {
                    return this.parentNode.__data__;
                });

        var cGET = circleGroups.exit()
            .transition().duration(750)
                .remove();

        cGET.selectAll('circle')
            .attr("r", 0);
        cGET.selectAll('text')
            .style('opacity', 0);

        // calls force.start and updateRadius
        resize();
    }

    var firstRadiusUpdate = true;
    var updateRadius = _.debounce(function() {
        nodes.forEach(function(d) {
            d.radius = radius(d.value);
        });

        legendCircles
            .transition().duration(750)
                .attr('r', function(d) { return radius(d.value); })
                .attr('cy', function(d) { return -radius(d.value); });

        legendLabels
            .transition().duration(750)
                .attr('y', function(d) { return -5 + (-radius(d.value)*2); });

        cGT = circleGroups
            .transition().duration(750);

        cGT.selectAll('circle')
            .attr("r", function(d) { return d.radius; });

        cGT.selectAll('text')
            .style('opacity', function(d) { return d.radius > 15 ? 1: 0; });

        legendR = radius(legendData[0].value);
        legendG
            .transition().duration(firstRadiusUpdate ? 0 : 750)
                .attr("transform", "translate("+(legendR + 20)+","+(height - 20)+")");

        if(firstRadiusUpdate) firstRadiusUpdate = false;
    }, 300, true);

});
