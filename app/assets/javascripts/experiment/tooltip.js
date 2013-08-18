OpenBudget.tooltip = function() {
    var types, activeType;

    var touch = Modernizr.touch;

    var $body, $tip, $tipInner;

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
        var d = this.__data__, directionName = '';
        if(d.depth == 2) {
            directionName = d.parent.name;
        }
        else {
            directionName = d.name;
        }

        $tipInner.html(
            '<span class="name" style="color:'+d.color+'">'+directionName+'</span><br />'+
            (d.depth == 2 ?
                '<span class="name">'+ (d.short_name ? d.short_name + ' ' : '') + d.name+'</span><br />' : ''
            ) +
            'Sparmassnahme '+activeYear+': ' + types[activeType].format(d.value) + ' ' + types[activeType].suffix +
            (d.value2 ? '<br />' +
                'Budget 2012: ' + types[activeType].format(d.value2) + ' ' + types[activeType].suffix +
                ', ' + formatPercent(d.diff) + '%' : ''
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
