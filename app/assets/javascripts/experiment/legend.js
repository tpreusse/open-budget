OpenBudget.legend = function(config) {
    config = config || {};

    var height;

    var legendCircles, legendLabels, selections;

    function legend(selection) {
        selections = [];
        selection.each(function(data) {
            var parent = d3.select(this);
            selections.push([parent, data]);

            legendCircles = parent.selectAll("circle")
                .data(data);

            legendCircles.enter().append('circle')
                .classed('legend', 1)
                .attr('cx', 0);

            legendLabels = parent.selectAll('text').data(data);

            legendLabels.enter().append('text')
                .attr('x', -10);

            legendLabels
                .text(function(d) { return d.name; });

            // note: exit missing but not needed yet
        });
    }

    legend.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return legend;
    };

    var firstRadiusUpdate = true;
    legend.updateRadius = function(radiusScale) {
        legendCircles
            .transition().duration(750)
                .attr('r', function(d) { return radiusScale(d.value); })
                .attr('cy', function(d) { return -radiusScale(d.value); });

        legendLabels
            .transition().duration(750)
                .attr('y', function(d) { return -5 + (-radiusScale(d.value)*2); });

        selections.forEach(function(d) {
            var selection = d[0], data = d[1];
            var legendR = radiusScale(data[0].value);
            selection
                .transition().duration(firstRadiusUpdate ? 0 : 750)
                    .attr("transform", "translate("+(legendR + 20)+","+(height - 20)+")");
        });

        if(firstRadiusUpdate) firstRadiusUpdate = false;
    };

    return legend;
};