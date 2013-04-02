if (!(window.console && console.log)) {
    (function() {
        var noop = function() {};
        var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'markTimeline', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
        var length = methods.length;
        var console = window.console = {};
        while (length--) {
            console[methods[length]] = noop;
        }
    }());
}

if (!window.OpenBudget) {
    window.OpenBudget = {};
}

window.OpenBudget.SVGSupport = (!!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect);
window.OpenBudget.track = function(category, action, opt_label, opt_value, opt_noninteraction) {
    if(!window._gaq) {
        window._gaq = [];
    }

    window.console.log('track event', arguments);
    window._gaq.push(['_trackEvent', category, action, opt_label, opt_value, opt_noninteraction]);
};

$(function() {
  if(!OpenBudget.SVGSupport) {
        var $notSupported = $('<div id="not-supported"></div>');
            $notSupportedImg = $('<img src="images/browser-teaser.png">');
        $notSupportedImg.appendTo($notSupported);
        $notSupported.append('<div class="message"><h2>Browser inkompatibel</h2><p>Leider unterstüzt ihr Browser SVG nicht.<br /><br />Wir empfehlen die neuste Version von <span class="recommendation"></span>.</p></div>');
        $notSupported.find('.recommendation').html('<a href="http://goo.gl/Z0UIl" target="_blank">Google Chrome</a> oder <a href="http://goo.gl/LwIPJ" target="_blank">Firefox</a>');
        if($.browser.msie) {
            $notSupported.find('.message')
                .append('<p>Alternativ können sie eine Erweiterung für ihren jetzigen Browser installieren: <a href="http://goo.gl/3i1hs" target="_blank">Google Chrome Frame</a>.<br /><em>Nach der Installation muss Internet Explorer neugestartet werden (alle "Internet Explorer"-Fenster schliessen und wieder öffnen).</em></p>');
        }
        $notSupported.prependTo('body');
        $(window).resize(function() {
            $notSupportedImg.css('margin-top', ($notSupportedImg.height() / -2) + 'px');
        });
        $(window).load(function() {
            $(window).resize();
        });
        OpenBudget.track('Setup', 'browser warning shown', undefined, undefined, true);
    }
});
