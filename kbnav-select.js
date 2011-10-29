(function(){
var kbNav = window.kbNav;

function actionSelect($obj, autonum, nums) {
    return function(){
        var hasNums = false;
        $obj.focus();
        var $copy = $obj.clone();
        var pos = $obj.position();
        $("body").append('<div id="kbNavSelectBox"></div>');
        var top = getDropDownTop($obj, $copy, ($obj.attr("size") > 1));
        var $box = $("#kbNavSelectBox");

        copySelected($obj.get(0).options, $copy.get(0).options);

        kbNav.push();
        var $options = $("option", $copy);
        var i = 0;
        $options.each(function(){
            var opt = this,
            $o = $(opt),
            num = autonum ? i+1 :
                    nums !== undefined ? nums[i] : undefined;

            if(num !== undefined) {
                hasNums = true;
                kbNav.register(num, function(){
                    $copy.focus();
                    opt.selected = !opt.selected;
                });
                $o.prepend(num + ") ");
            }
            i++;
        });

        $box.css({
            position: "absolute",
            top: top + "px",
            left: pos.left + "px"
        }).append($copy);

        var openingCommandPrompt = false;

        $copy.blur(function(){
            if(!openingCommandPrompt) {
                $box.remove();
                kbNav.pop();
            }
        }).keypress(function(e){
            var keycode = e.which;
            if(keycode === 27) // esc
                $copy.blur();
            else if(keycode === 13) { // enter
                copySelected(this.options, $obj.get(0).options);
                $copy.blur();
            }
        }).focus();

        if(hasNums)
            $copy.keydown(function(e){
                if(e.ctrlKey || e.altKey)
                    return;

                var keycode = e.which;
                var input = String.fromCharCode(keycode);
                if(input.match(/\w/)) {
                    openingCommandPrompt = true;
                    kbNav.showPrompt($copy.get(0)).keyup(function(){
                        openingCommandPrompt = false;
                    });
                }
            });
    };
}

function getDropDownTop($target, $copy, isML) {
    var pos = $target.offset();
    var height = $target.outerHeight();
    var scrollTop = $(window).scrollTop();

    var select = $copy.get(0);
    select.size = select.options.length;
    var $elem = $copy.appendTo("body");
    var targetHeight = $copy.outerHeight();
    $elem.remove();

    // TODO: find better way of doing this :(
    var windowHeight = $.browser.safari ? document.documentElement.clientHeight : $(window).height();
    var spaceAbove = pos.top - scrollTop;
    var spaceBelow = windowHeight - spaceAbove - height;

    var setTop;
    var setHeight;
    if(isML) {
        var center = pos.top + height/2;
        var radius = targetHeight/2;

        if(targetHeight <= height) {
            setHeight = height;
            setTop = pos.top;
        }
        else if(center + radius <= scrollTop + windowHeight && center - radius >= scrollTop) {
            setHeight = targetHeight;
            setTop = center - radius;
        }
        else {
            setHeight = Math.min(targetHeight, windowHeight);
            setTop = (pos.top - spaceAbove) + (windowHeight - setHeight)/2;
        }
    }
    else {
        if(targetHeight <= spaceBelow) {
            setHeight = Math.min(targetHeight, spaceBelow);
            setTop = pos.top + height;
        }
        else
            if(targetHeight <= spaceAbove) {
                setHeight = Math.min(targetHeight, spaceAbove);
                setTop = pos.top - setHeight;
            }
            else {
                setHeight = Math.min(targetHeight, windowHeight);
                setTop = (pos.top - spaceAbove) + (windowHeight - setHeight) / 2;
            }
    }

    $copy.css("height", setHeight + "px");
    return setTop;
}

function copySelected(from, to) {
    var len = from.length;
    for(var i=0; i<len; i++) {
        to[i].selected = from[i].selected;
    }
}

kbNav.processAction.select = function($o, data) {
    return actionSelect($o, data.autoNum, data.nums);
};

})();
