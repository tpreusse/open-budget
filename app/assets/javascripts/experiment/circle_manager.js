OpenBudget.nodeSpec = {
    id: '', // needs to be unique per manager
    // radius: 0, // radius
    value: 0, // value
    value2: 0, // value 2 (optional)
    diff: 0, // % (optional)
    cluster: '', // id, also used to derive center
    data: {} // ref to datum
};

OpenBudget.circles = function(config) {
    config = config || {};

    var id = config['id'] || '',
        colorScale;

    var circleGroups;

    var valueAccessor,
        value2Accessor;

    var nodes,
        nodesIndex = {};

    function circleManager(selection) {
        var oldNodeIndex = nodesIndex;

        nodesIndex = {};
        nodes = [];

        selection.each(function(data) {
            data.forEach(function(d) {
                var value;
                try {
                    value = valueAccessor(d);
                }
                catch(error) {}

                if(!value) return;

                var n;
                if(oldNodeIndex[d.id]) {
                    n = oldNodeIndex[d.id];
                }
                else {
                    n = {
                        id: id + d.id,
                        cluster: d.parent.id || d.id,
                        data: d
                    };
                }
                nodesIndex[d.id] = n;

                n.color = colorScale(n.cluster);

                n.value = valueAccessor(d);
                var value2 = value2Accessor(d);
                if(value2) {
                    n.value2 = value2;
                    n.diff = d3.round((100 + ((n.value - value2) / (value2 / 100))) * -1, 2);
                }

                nodes.push(n);
            });

            circleGroups = d3.select(this).selectAll("g")
                .data(nodes, function(d) { return d.id; });

            var enterGs = circleGroups.enter().append('g')
                .attr('class', function(n) {
                    return n.data.detail ? 'has-detail' : '';
                })
                .call(config.forceLayout.drag)
                .on('click', function(d) {
                    if(!d3.event.defaultPrevented) {
                        config.detailCallback(d);
                    }
                });

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
                    .text(function(n) { return n.data.short_name; });

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

        });
    }

    circleManager.tick = function(cluster, collide) {
        circleGroups
            .each(cluster)
            .each(collide)
            .attr('transform', function(d) {
                return 'translate('+d.x+', '+d.y+')';
            });
    };

    circleManager.updateRadius = function(radiusScale) {
        nodes.forEach(function(d) {
            d.radius = radiusScale(d.value);
        });

        var cGT = circleGroups
            .transition().duration(750);

        cGT.selectAll('circle')
            .attr("r", function(d) { return d.radius; });

        cGT.selectAll('text')
            .style('opacity', function(d) { return d.radius > 15 ? 1: 0; });
    };

    circleManager.nodes = function(value) {
        if (!arguments.length) return nodes;
        nodes = value;
        return circleManager;
    };

    circleManager.circleGroups = function(value) {
        if (!arguments.length) return circleGroups;
        circleGroups = value;
        return circleManager;
    };

    circleManager.colorScale = function(value) {
        if (!arguments.length) return colorScale;
        colorScale = value;
        return circleManager;
    };

    circleManager.valueAccessor = function(value) {
        if (!arguments.length) return valueAccessor;
        valueAccessor = value;
        return circleManager;
    };

    circleManager.value2Accessor = function(value) {
        if (!arguments.length) return value2Accessor;
        value2Accessor = value;
        return circleManager;
    };

    return circleManager;
};
