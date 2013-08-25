//= require underscore
//= require d3/d3.v3
//= require experiment/force_extension
//= require experiment/segmented_control
//= require experiment/tooltip
//= require experiment/circle_manager
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
        legendCircles, legendLabels,
        legendData;

    var force = d3.layout.force()
        .gravity(0)
        .charge(0)
        .on("tick", tick);

    function tick(e) {
        var cluster = forceExt.cluster(10 * e.alpha * e.alpha),
            collide = forceExt.collide(0.5);

        cutsCircles.tick(cluster, collide);
    }

    var cutsCircles = OpenBudget.circles({
            forceLayout: force,
            detailCallback: showDetail
        })
        .colorScale(color);

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
        if(nodes.length) {
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

    function showDetail(n) {
        if(n.data.detail) {
            $('#detail-modal').foundation('reveal', 'open', {
                url: '/be-asp/d/'+n.data.id
            });
        }
        else if(n.data.depth !== 1) {
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
                return color(d.id);
            })
            .style('background-color', function(d) {
                var rgb = d3.rgb(color(d.id));
                return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
            });

        // only needed if maxCluster > 10
        // color.domain(d3.range(maxCluster));
    }

    // called when level or year changes
    function updateVis() {
        tooltip.activeType(activeType);
        tooltip.activeYear(activeYear);

        cutsCircles
            .valueAccessor(function(d) {
                return d.cuts[activeType][activeYear];
            })
            .value2Accessor(function(d) {
                return ((d.gross_cost || {})[activeType] || {})["2012"];
            });

        mainG
            .datum(levels[activeDepth - 1])
            .call(cutsCircles);

        nodes = cutsCircles.nodes();

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
                    .attr('class', function(n) {
                        return n.data.detail ? 'has-detail' : '';
                    });

        trs.on('click', showDetail);

        trs.append('td')
            .append('span')
                .classed('circle', 1)
                .attr('title', function(n) { return n.data.parent.name; })
                .style('border-color', function(d) {
                    return d.color;
                })
                .style('background-color', function(d) {
                    var rgb = d3.rgb(d.color);
                    return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
                });

        trs.append('td')
            .text(function(n) { return (n.data.short_name ? n.data.short_name + ' ' : '') + n.data.name; });

        ['2014', '2015', '2016', '2017'].forEach(function(year, index) {
            var total = d3.sum(nodes, function(n) { return n.data.cuts[activeType][year]; });
            d3.select('table.main').select('tfoot td:nth-child('+ (index + 2) +')')
                .text(types[activeType].format(total));

            trs.append('td')
                .text(function(n) { return types[activeType].format(n.data.cuts[activeType][year]); });

        });

        force
            .nodes(nodes);
        forceExt
            .nodes(nodes);

        // calls force.start and updateRadius
        resize();
    }

    var firstRadiusUpdate = true;
    var updateRadius = _.debounce(function() {
        cutsCircles.updateRadius(radius);

        legendCircles
            .transition().duration(750)
                .attr('r', function(d) { return radius(d.value); })
                .attr('cy', function(d) { return -radius(d.value); });

        legendLabels
            .transition().duration(750)
                .attr('y', function(d) { return -5 + (-radius(d.value)*2); });


        legendR = radius(legendData[0].value);
        legendG
            .transition().duration(firstRadiusUpdate ? 0 : 750)
                .attr("transform", "translate("+(legendR + 20)+","+(height - 20)+")");

        if(firstRadiusUpdate) firstRadiusUpdate = false;
    }, 300, true);

});
