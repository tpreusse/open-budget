OpenBudget.tooltip = function() {
    var types, activeType;

    var touch = Modernizr.touch;

    var $body, $tip, $tipInner;
    var formatPercent = d3.format('+.2');

    function tooltip() {

    }

    tooltip.types = function(value) {
        if (!arguments.length) return types;
        types = value;
        return tooltip;
    };

    tooltip.activeType = function(value) {
        if (!arguments.length) return activeType;
        activeType = value;
        return tooltip;
    };

    tooltip.activeYear = function(value) {
        if (!arguments.length) return activeYear;
        activeYear = value;
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

        $tipInner.html(
            '<span class="name" style="color:'+n.color+'">'+directionName+'</span><br />'+
            (d.depth == 2 ?
                '<span class="name">'+ (d.short_name ? d.short_name + ' ' : '') + d.name+'</span><br />' : ''
            ) +
            'Sparmassnahme '+activeYear+': ' + types[activeType].format(n.value) + ' ' + types[activeType].suffix +
            (n.value2 ? '<br />' +
                'Budget 2012: ' + types[activeType].format(n.value2) + ' ' + types[activeType].suffix +
                ', ' + formatPercent(n.diff) + '%' : ''
            )
        );

        updatePos(e);
        $(document)
            .on(touch ? 'touchmove' : 'mousemove', updatePos)
            .one(touch? 'touchend' : 'mouseout', hide);
        $tip.show();
    });

    return tooltip;
};
