$(function() {
    var init = function() {
        OpenBudget.visualisation.init();
    };

    if(!OpenBudget.SVGSupport) {
        $('<div class="try">trotzdem versuchen</div>').appendTo('#not-supported .message');
        OpenBudget.track('Setup', 'browser warning try anyway shown', undefined, undefined, true);
        $('#not-supported .try').click(function(){
            $('#not-supported').fadeOut();
            OpenBudget.track('Setup', 'browser warning try anyway clicked', undefined, undefined, true);
            init();
            OpenBudget.track('Setup', 'browser warning try anyway initialized', undefined, undefined, true);
        });
    }
    else {
        init();
    }
});