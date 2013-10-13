//= require underscore
//= require d3/d3.v3
//= require experiment/force_extension
//= require experiment/segmented_control
//= require experiment/tooltip
//= require experiment/circles
//= require experiment/table
//= require experiment/layers
//= require experiment/legend
//= require foundation

$(function(){

    $(document).foundation();

    var formatCHF = d3.format(',.2f');

    function formatMioCHF(n) {
        return formatCHF(n / Math.pow(10, 6));
    }
    var formatPercent = d3.format('+.2');

    // ToDo: move to meta or auto detect
    var types = {
            'budgets': {
                format: formatMioCHF,
                suffix: 'Mio. CHF'
            },
            'positions': {
                format: d3.format(',.1f'),
                suffix: 'Vollzeitstellen'
            }
        },
        legendData = {
            'budgets': [
                {value: 50000000, name: '50 Mio.', color:'gray'},
                {value: 10000000, name: '10 Mio.', color:'gray'},
                {value: 1000000, name: '1 Mio.', color:'gray'}
            ],
            'positions': [
                {value: 100, name: '100 Stellen', color:'gray'},
                {value: 10, name: '10 Stellen', color:'gray'},
                {value: 1, name: '1 Stellen', color:'gray'}
            ]
        };

    $('.segmented-control').segmentedControl();

    var layers = OpenBudget.layers(),
        nodes = [],
        levels = [];

    var width,
        height;

    var radius = d3.scale.sqrt(),
        color = d3.scale.category10().domain(d3.range(10));

    var force = d3.layout.force()
        .gravity(0)
        .charge(0)
        .on("tick", function(e) {
            var cluster = forceExt.cluster(10 * e.alpha * e.alpha),
                collide = forceExt.collide(0.5);

            cutsCircles.tick(cluster, collide);
        });

    var forceExt = d3.layout.forceExtension()
        .radius(radius);

    var cutsCircles = OpenBudget.circles({
            forceLayout: force,
            detailCallback: showDetail
        })
        .colorScale(color);

    var nameLabel = function(d) { return (d.short_name ? d.short_name + ' ' : '') + d.name; };

    var table = OpenBudget.table({
            detailCallback: showDetail
        });
    var tableNameColumn = {
        foot: 'Total',
        cells: [
            {
                value: function(d) { return color(d.cluster); },
                creator: function(value) {
                    this.append('span')
                        .classed('circle', 1)
                        .attr('title', function(d) { return d.parent.name; })
                        .style('border-color', function() {
                            return value;
                        })
                        .style('background-color', function() {
                            var rgb = d3.rgb(value);
                            return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
                        });
                }
            },
            {
                value: nameLabel
            }
        ]
    };

    var tooltip = OpenBudget.tooltip()
        .nameLabel(function(n, d) {
            var directionName = d.depth == 2 ? d.parent.name : d.name;
            return '<span class="name" style="color:' + n.color + '">' + directionName + '</span>' +
            (d.depth == 2 ?
                '<br /><span class="name">'+ nameLabel(d) +'</span>' : ''
            );
        });

    var legend = OpenBudget.legend();

    var svg = d3.select("svg.main");

    var legendG = svg.append("g");

    var mainG = svg.append("g")
        .classed('main', 1);

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

        legend
            .height(height);

        // will lead to fatal error otherwise
        if(nodes.length) {
            force.start();

            updateRadius();
        }
    }
    $(window).resize(_.debounce(resize, 166)); // 166 = 5 * 33.3 = every 5th frame

    // called after new data is loaded
    function setup(data) {
        var all = layers(data);
        levels = [
            all.filter(function(d) { return d.depth === 1; }),
            all.filter(function(d) { return d.depth === 2; })
        ];

        // cluster legend
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

        // var maxCluster = levels[0].length;
        // only needed if maxCluster > 10
        // color.domain(d3.range(maxCluster));
    }

    // called when level or year changes
    function updateVis() {
        tooltip.valueLabel(function(n, d) {
            return 'Sparmassnahme ' + activeYear + ': ' + types[activeType].format(n.value) + ' ' + types[activeType].suffix;
        });
        tooltip.value2Label(function(n, d) {
            if(n.value2) {
                return 'Budget 2012: ' + types[activeType].format(n.value2) + ' ' + types[activeType].suffix +
                ', ' + formatPercent(n.diff) + '%';
            }
        });

        cutsCircles
            .valueAccessor(function(d) {
                return d.cuts[activeType][activeYear];
            })
            .value2Accessor(function(d) {
                return ((d.gross_cost || {})[activeType] || {})["2012"];
            });

        var level = levels[activeDepth - 1];
        level.forEach(function(d) {
            d.cluster = d.parent.id || d.id;
        });

        mainG
            .datum(level)
            .call(cutsCircles);

        nodes = cutsCircles.nodes();

        var maxValue = d3.max(nodes, function(d) {
            return d.value;
        });

        radius.domain([0, maxValue]);

        legendG
            .datum(legendData[activeType])
            .call(legend);

        tableNameColumn.label = OpenBudget.meta.hierarchy[activeDepth - 1];
        var columns = [tableNameColumn];
        ['2014', '2015', '2016', '2017'].forEach(function(year, index) {
            columns.push({
                label: year,
                foot: function(data) {
                    var cell = this.cells[0];
                    return cell.format.format(d3.sum(data, function(d) { return cell.value(d); }));
                },
                cells: [
                    {
                        value: function(d) { return d.cuts[activeType][year]; },
                        format: types[activeType]
                    }
                ]
            });
        });
        table.columns(columns);

        d3.select('table.main')
            .datum(level.filter(function(d) {
                return d.cuts[activeType] && (
                    d.cuts[activeType]['2014'] ||
                    d.cuts[activeType]['2015'] ||
                    d.cuts[activeType]['2016'] ||
                    d.cuts[activeType]['2017']
                );
            }))
            .call(table);

        force
            .nodes(nodes);
        forceExt
            .nodes(nodes);

        // calls force.start and updateRadius
        resize();
    }

    var updateRadius = _.debounce(function() {
        cutsCircles.updateRadius(radius);
        legend.updateRadius(radius);
    }, 300, true);

});
