(function(){
var kbNav = window.kbNav;

var POPUP_ID = 'kbNavSelectBox';

function actionSelect($obj, autonum, nums) {
    return function() {
        var hasNums = false;
        $obj.focus();
        var $copy = $obj.clone();
        var pos = $obj.position();
        $('body').append('<div id="' + POPUP_ID + '"></div>');
        var top = getDropDownTop($obj, $copy, ($obj.attr('size') > 1));
        var $box = $('#' + POPUP_ID);

        copySelected($obj.get(0).options, $copy.get(0).options);

        kbNav.push();

        // number the options and register kbNav handlers for them
        var $options = $('option', $copy);
        var i = 0;
        $options.each(function() {
            var opt = this,
            $o = $(opt),
            num = autonum ? i+1 :
                    nums !== undefined ? nums[i] : undefined;

            if(num !== undefined) {
                hasNums = true;
                kbNav.register(num, function() {
                    $copy.focus();
                    opt.selected = !opt.selected;
                });
                $o.prepend(num + ') ');
            }
            i++;
        });

        $box.css({
            position: 'absolute',
            top: top + 'px',
            left: pos.left + 'px'
        }).append($copy);

        var openingCommandPrompt = false;

        $copy.blur(function() {
            if(!openingCommandPrompt) {
                $box.remove();
                kbNav.pop();
            }
        }).keypress(function(e) {
            var keycode = e.which;
            if(keycode === 27) // esc
                $copy.blur();
            else if(keycode === 13) { // enter
                copySelected(this.options, $obj.get(0).options);
                $copy.blur();
            }
        }).focus();

        if(hasNums) {
            $copy.keydown(function(e) {
                if(e.ctrlKey || e.altKey)
                    return;

                var keycode = e.which;
                var input = String.fromCharCode(keycode);
                if(input.match(/\w/)) {
                    openingCommandPrompt = true;
                    kbNav.showPrompt($copy.get(0)).keyup(function() {
                        openingCommandPrompt = false;
                    });
                }
            });
        }
    };
}

function getDropDownTop($target, $copy, isML) {
    var pos = $target.offset();
    var height = $target.outerHeight();
    var scrollTop = $(window).scrollTop();

    // make the selet display all of its options
    var select = $copy.get(0);
    select.size = select.options.length;

    // temporarily insert it into the page to see its height
    var $elem = $copy.appendTo('body');
    var targetHeight = $copy.outerHeight();
    $elem.remove();

    // TODO: find better way of doing this :(
    // safari doesn't return correct values for window.height()
    var windowHeight = $.browser.safari ? document.documentElement.clientHeight : $(window).height();
    var spaceAbove = pos.top - scrollTop;
    var spaceBelow = windowHeight - spaceAbove - height;

    var setTop;
    var setHeight;
    if(isML) {
        // if multiline, place popup box over the select
        var center = pos.top + height/2;
        var radius = targetHeight/2;

        if(targetHeight <= height) {
            // popup box fits within the select
            setHeight = height;
            setTop = pos.top;
        }
        else if(center - radius >= scrollTop && center + radius <= scrollTop + windowHeight) {
            // popup box is centered on the middle of the select
            setHeight = targetHeight;
            setTop = center - radius;
        }
        else {
            // popup box is centered on the middle of the screen
            setHeight = Math.min(targetHeight, windowHeight);
            setTop = scrollTop + (windowHeight - setHeight) / 2;
        }
    }
    else {
        // if not, place popup box under the select
        if(targetHeight <= spaceBelow) {
            // popup box fits below the select
            setHeight = targetHeight;
            setTop = pos.top + height;
        }
        else if(targetHeight <= spaceAbove) {
            // popup box fits above the select
            setHeight = targetHeight;
            setTop = pos.top - setHeight;
        }
        else {
            // popup box is centered on the middle of the screen
            setHeight = Math.min(targetHeight, windowHeight);
            setTop = scrollTop + (windowHeight - setHeight) / 2;
        }
    }

    $copy.height(setHeight);
    return setTop;
}

function copySelected(from, to) {
    for(var i=0, l=from.length; i<l; i++) {
        to[i].selected = from[i].selected;
    }
}

kbNav.processAction.select = function($o, data) {
    return actionSelect($o, data.autoNum, data.nums);
};

})();
