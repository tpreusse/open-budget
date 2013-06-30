//= require underscore
//= require d3/d3.v3.min
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

    var formatCHF = d3.format(',f');

    var layers = OpenBudget.layers(),
        nodes = [],
        all = [],
        levels = [],
        maxCluster;

    var margin = {top: 0, right: 0, bottom: 0, left: 0},
        width,
        height = 500 - margin.top - margin.bottom;

    var padding = 5,
        maxValue,
        radius,
        color = d3.scale.category10(),
        circle;

    var force = d3.layout.force()
        .gravity(0)
        .charge(0)
        .on("tick", tick);

    var svg = d3.select("svg.main")
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    $(window).resize(function() {
        width = $(window).width()  - margin.left - margin.right;

        svg.attr("width", width + margin.left + margin.right);
        force
            .size([width, height]);

        if(circle) {
            // will lead to fatal error otherwise
            force.start();
        }
    });

    // selects for level, year and data
    var $levelSelect = $('select#levels'),
        activeDepth = parseInt($levelSelect.val(), 10);
    $levelSelect.change(function() {
        activeDepth = parseInt($levelSelect.val(), 10);
        updateVis();
    });

    var $yearSelect = $('select#year'),
        activeYear = $yearSelect.val();
    $yearSelect.change(function() {
        activeYear = $yearSelect.val();
        updateVis();
    });

    var $dataSelect = $('select#data');
    $dataSelect.change(function() {
        d3.json($(this).val(), function(data) {
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
        else {
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

        color.domain(d3.range(maxCluster));
    }

    // called when level or year changes
    function updateVis() {
        nodes = levels[activeDepth - 1];

        nodes.forEach(function(d) {
            d.value = d.revenue.budgets[activeYear];
        });

        maxValue = d3.max(nodes, function(d) {
            return d.value;
        });

        radius = d3.scale.sqrt().domain([0, maxValue]).range([0, 60]);

        nodes.forEach(function(d) {
            d.color = color(d.parent.id || d.id);
            d.radius = radius(d.value);
        });

        d3.select('tbody').selectAll('tr').remove();
        var trs = d3.select('tbody')
            .selectAll('tr').data(nodes)
                .enter().append('tr')
                    .attr('class', function(d) {
                        return d.detail ? 'has-detail' : '';
                    });

        trs.on('click', showDetail);

        trs.append('td')
            .append('span')
                .attr('title', function(d) { return d.parent.name; })
                .style('border-color', function(d) {
                    return d.color;
                })
                .style('background-color', function(d) {
                    var rgb = d3.rgb(d.color);
                    return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
                });

        trs.append('td')
            .text(function(d) { return d.name; });
        ['2014', '2015', '2016', '2017'].forEach(function(year) {
            trs.append('td')
                .text(function(d) { return formatCHF(d.revenue.budgets[year]); });
        });

        force
            .nodes(nodes);

        circle = svg.selectAll("circle")
            .data(nodes, function(d) { return d.id; });

        circle.enter().append("circle")
            .attr("r", 0)
            .attr("class", function(d) {
                return d.detail ? 'has-detail' : '';
            })
            .style("stroke", function(d) { return d.color; })
            .style("fill", function(d) {
                var rgb = d3.rgb(d.color);
                return 'rgba('+rgb.r+','+rgb.g+','+rgb.b+',0.1)';
            })
            .on('click', showDetail)
            .call(force.drag);

        circle.exit()
            .transition().duration(750)
                // .attr("cx", function(d) { return d.cx; })
                // .attr("cx", function(d) { return d.x + width; })
                .attr("r", 0)
                .remove();

        circle
            // .attr("cy", function(d) { return d.y - height; })
            .transition().duration(750)
                .attr("r", function(d) { return d.radius; });

        // calls force.start
        $(window).resize();
    }

    // tooltip
    (function() {
        var $body = $('body');
        var formatDiffPercent = d3.format('+.2');
        var $tip = $('<div id="tooltip"></div>').html('<div></div>').hide().appendTo($body);
        var $tipInner = $tip.find('div');
        $(document).mousemove(function(e){
            $tip.css({
                'top': e.pageY + 0,
                'left': e.pageX + 10
            });
        });

        $(document).on('mouseover touchstart', 'svg circle', function(){
            var d = this.__data__, directionName = '';
            if(d.depth == 2) {
                directionName = d.parent.name;
            }
            else {
                directionName = d.name;
            }

            $tipInner.html(
                '<span class="name" style="color:'+d.color+'">'+directionName+'</span><br />'+
                '<span class="name">'+d.name+'</span><br />'+
                'CHF '+formatCHF(d.value)+''/*+'<br />'+
                valueLabel+'CHF '+formatCHF(d.value2)+' '+formatDiffPercent(d.diff)+'%'*/
            );
            // $tipInner.find('span.percent').css('color', d.stroke);
            $tip.show();
            // OpenBudget.table.highlight(d.id);
        });
        $(document).on('mouseout touchend', 'svg circle', function(){
            $tip.hide();
            // OpenBudget.table.highlight(null);
        });
    })();

    // clustered force by mbostock
    // http://bl.ocks.org/mbostock/1748247
    function tick(e) {
      circle
          .each(cluster(10 * e.alpha * e.alpha))
          .each(collide(0.5))
          .attr("cx", function(d) { return d.x; })
          .attr("cy", function(d) { return d.y; });
    }

    // Move d to be adjacent to the cluster node.
    function cluster(alpha) {
      var max = {};

      // Find the largest node for each cluster.
      nodes.forEach(function(d) {
        if (!(d.color in max) || (d.radius > max[d.color].radius)) {
          max[d.color] = d;
        }
      });

      return function(d) {
        var node = max[d.color],
            l,
            r,
            x,
            y,
            k = 1,
            i = -1;

        // For cluster nodes, apply custom gravity.
        if (node == d) {
          node = {x: width / 2, y: height / 2, radius: -d.radius};
          k = 0.1 * Math.sqrt(d.radius);
        }

        x = d.x - node.x;
        y = d.y - node.y;
        l = Math.sqrt(x * x + y * y);
        r = d.radius + node.radius;
        if (l != r) {
          l = (l - r) / l * alpha * k;
          d.x -= x *= l;
          d.y -= y *= l;
          node.x += x;
          node.y += y;
        }
      };
    }

    // Resolves collisions between d and all other circles.
    function collide(alpha) {
      var quadtree = d3.geom.quadtree(nodes);
      return function(d) {
        var r = d.radius + radius.domain()[1] + padding,
            nx1 = d.x - r,
            nx2 = d.x + r,
            ny1 = d.y - r,
            ny2 = d.y + r;
        quadtree.visit(function(quad, x1, y1, x2, y2) {
          if (quad.point && (quad.point !== d)) {
            var x = d.x - quad.point.x,
                y = d.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = d.radius + quad.point.radius + (d.color !== quad.point.color) * padding;
            if (l < r) {
              l = (l - r) / l * alpha;
              d.x -= x *= l;
              d.y -= y *= l;
              quad.point.x += x;
              quad.point.y += y;
            }
          }
          return x1 > nx2
              || x2 < nx1
              || y1 > ny2
              || y2 < ny1;
        });
      };
    }

});
