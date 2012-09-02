$(function() {
    var init = function() {
        OpenBudget.visualisation.init();
    };

    if(!OpenBudget.SVGSupport) {
        $('<div class="try">trotzdem versuchen</div>').appendTo('#notsupported');
        OpenBudget.track('Setup', 'browser warning try anyway shown', undefined, undefined, true);
        $('#notsupported .try').click(function(){
            $('#notsupported').fadeOut();
            OpenBudget.track('Setup', 'browser warning try anyway clicked', undefined, undefined, true);
            init();
            OpenBudget.track('Setup', 'browser warning try anyway initialized', undefined, undefined, true);
        });
    }
    else {
        init();
    }
});