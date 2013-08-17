d3.layout.forceExtension = function() {
    var nodes = [], size, width, height, radius, padding = 5;

    function forceExtension() {

    }

    forceExtension.size = function(value) {
        if (!arguments.length) return size;
        size = value;
        width = value[0];
        height = value[1];
        return forceExtension;
    };
    forceExtension([1, 1]);

    forceExtension.radius = function(value) {
        if (!arguments.length) return radius;
        radius = value;
        return forceExtension;
    };

    forceExtension.padding = function(value) {
        if (!arguments.length) return padding;
        padding = value;
        return forceExtension;
    };

    forceExtension.nodes = function(value) {
        if (!arguments.length) return nodes;
        nodes = value;
        return forceExtension;
    };

    // clustered force by mbostock
    // http://bl.ocks.org/mbostock/1748247

    // Move d to be adjacent to the cluster node.
    forceExtension.cluster = function(alpha) {
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
    };

    // Resolves collisions between d and all other circles.
    forceExtension.collide = function(alpha) {
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
    };

    return forceExtension;
};
