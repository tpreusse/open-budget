OpenBudget.tooltip = function() {
    var touch = Modernizr.touch;

    var $body, $tip, $tipInner;

    function tooltip() {}

    var nameLabel, valueLabel, value2Label;
    tooltip.nameLabel = function(value) {
        if (!arguments.length) return nameLabel;
        nameLabel = value;
        return tooltip;
    };

    tooltip.valueLabel = function(value) {
        if (!arguments.length) return valueLabel;
        valueLabel = value;
        return tooltip;
    };

    tooltip.value2Label = function(value) {
        if (!arguments.length) return value2Label;
        value2Label = value;
        return tooltip;
    };

    // private
    var updatePos = function(e) {
        if(e.originalEvent.changedTouches) {
            e = e.originalEvent.changedTouches[0];
        }
        $tip.css({
            'top': e.pageY + 0,
            'left': e.pageX + 10
        });
    };
    var hide = function(e) {
        $(document)
            .off('touchmove', updatePos);
        $tip.hide();
    };

    $body = $('body');
    $tip = $('#tooltip');
    if(!$tip.length) {
        $tip = $('<div id="tooltip"></div>').html('<div></div>').hide().appendTo($body);
    }
    $tipInner = $tip.find('div');

    $(document).on(touch ? 'touchstart' : 'mouseover', 'svg g.main g', function(e){
        var n = this.__data__,
            d = n.data,
            directionName = '';
        if(d.depth == 2) {
            directionName = d.parent.name;
        }
        else {
            directionName = d.name;
        }

        var value2LabelHtml = value2Label ? value2Label(n, d) : undefined;

        $tipInner.html(
            nameLabel(n, d) + '<br />' +
            valueLabel(n, d) +
            (value2LabelHtml ? '<br />' + value2LabelHtml : '')
        );

        updatePos(e);
        $(document)
            .on(touch ? 'touchmove' : 'mousemove', updatePos)
            .one(touch? 'touchend' : 'mouseout', hide);
        $tip.show();
    });

    return tooltip;
};
