jQuery(function($) {
    $.fn.segmentedControl = function(fn) {
        if(fn == 'val') {
            var $ele = $('.active', this);
            return $ele.data('value') || $ele.text();
        }
        return this.each(function() {
            var $control = $(this),
                $options = $control.find('a');

            $('a', this).click(function() {
                $options.removeClass('active');
                $(this).addClass('active');
                $control.change();
            });
        });
    };
});
