OpenBudget.table = function(config) {
    config = config || {};

    var colorScale;

    var types, activeType, activeDepth;

    function table(selection) {
        selection.each(function(data) {
            data = data.filter(function(d) {
                return d.cuts[activeType] && (
                    d.cuts[activeType]['2014'] ||
                    d.cuts[activeType]['2015'] ||
                    d.cuts[activeType]['2016'] ||
                    d.cuts[activeType]['2017']
                );
            });


            var tableSelection = d3.select(this);
            tableSelection.select('tbody').selectAll('tr').remove();

            tableSelection.select('th:nth-child(1)')
                .text(OpenBudget.meta.hierarchy[activeDepth - 1]);

            tableSelection.select('thead').selectAll('tr')
                .selectAll('th')
                    .selectAll('.format')
                        .text('(' + types[activeType].suffix + ')');

            var trs = tableSelection.select('tbody')
                .selectAll('tr').data(data)
                    .enter().append('tr')
                        .attr('class', function(d) {
                            return d.detail ? 'has-detail' : '';
                        });

            trs.on('click', config.detailCallback);

            trs.append('td')
                .append('span')
                    .classed('circle', 1)
                    .attr('title', function(d) { return d.parent.name; })
                    .style('border-color', function(d) {
                        return colorScale(d.cluster);
                    })
                    .style('background-color', function(d) {
                        var rgb = d3.rgb(colorScale(d.cluster));
                        return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
                    });

            trs.append('td')
                .text(function(d) { return (d.short_name ? d.short_name + ' ' : '') + d.name; });

            ['2014', '2015', '2016', '2017'].forEach(function(year, index) {
                var total = d3.sum(data, function(d) { return d.cuts[activeType][year]; });
                tableSelection.select('tfoot td:nth-child('+ (index + 2) +')')
                    .text(types[activeType].format(total));

                trs.append('td')
                    .text(function(d) { return types[activeType].format(d.cuts[activeType][year]); });

            });
        });
    }

    table.colorScale = function(value) {
        if (!arguments.length) return colorScale;
        colorScale = value;
        return table;
    };

    table.types = function(value) {
        if (!arguments.length) return types;
        types = value;
        return table;
    };

    table.activeType = function(value) {
        if (!arguments.length) return activeType;
        activeType = value;
        return table;
    };

    table.activeDepth = function(value) {
        if (!arguments.length) return activeDepth;
        activeDepth = value;
        return table;
    };

    return table;
};
