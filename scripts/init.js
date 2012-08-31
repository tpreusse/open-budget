$(function() {
    var init = function() {
        OpenBudget.table.init();
        OpenBudget.visualisation.init();
    };

    if(!OpenBudget.SVGSupport) {        
        $('<div class="try">trotzdem versuchen</div>').appendTo('#notsupported');
        $('#notsupported .try').click(function(){
            $('#notsupported').fadeOut();
            init();
        });
    }
    else {
        init();
    }
});