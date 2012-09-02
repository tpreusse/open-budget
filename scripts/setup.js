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

window.OpenBudget = {
  SVGSupport: (!!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', "svg").createSVGRect),
  track: function(category, action, opt_label, opt_value, opt_noninteraction) {
    if(!window._gaq) {
        window._gaq = [];
    }

    window.console.log('track event', arguments);
    window._gaq.push(['_trackEvent', category, action, opt_label, opt_value, opt_noninteraction]);
  }
};

$(function() {
  if(!OpenBudget.SVGSupport) {
        $('#sidebar').append('<div id="notsupported"><h2>Browser inkompatibel</h2><p>Leider unterstüzt ihr Browser kein SVG.<br /><br />Wir empfehlen die neuste Version von <span class="recommendation"></span>.</p></div>');
        // maybe OS dependant but Safari currently sucks
        $('#notsupported .recommendation').html('<a href="https://www.google.com/chrome" target="_blank">Google Chrome</a> oder <a href="http://www.mozilla.org/firefox/" target="_blank">Firefox</a>');

        OpenBudget.track('Setup', 'browser warning shown', undefined, undefined, true);
    }
});
