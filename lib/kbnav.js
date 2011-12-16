(function(){

var inited,
$prompt,
kbNav,
window = this,
$ = window.jQuery,
document = window.document,
actionGroups = {}, // name -> ActionGroup
defaultGroup = "default",
overlays = [];


function ActionGroup(){
	this.actions = {}; // name -> [func]
	this.visible = true;
}

ActionGroup.prototype = {
	add: function(name, f){
		if(this.actions[name] === undefined)
			this.actions[name] = [];
		
		this.actions[name].push(f);
	}
}

// a self-optimizing function!
// chars leaks, but it is supposed to. TODO: investigate whether this is a good idea or not
// TODO: also investigate whether len leaks. it doesn't have to, since it is overridden in the new function. probably leaks for some browsers tho....
function randomString(len){
	var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
	randomString = function(len){
		var str = '';
    	for (var i = 0; i < 5; i++)
        	str += chars[Math.floor(Math.random() * chars.length)];
    	return str;
	}
	return randomString(len);
}

function uid(){
	return 'UID:' + randomString(5) + ":" + new Date().getTime();
}

function a_to_f(a, options){
	if(typeof a == 'function')
		return a;
	
	return actionize(a, options);
}

function isEmpty(map){
	for(var i in map)
		return false;
	return true;
}

function getAction(sc) {
	var fs = [];
	for(var k in actionGroups) {
		var group = actionGroups[k];
		if(group.visible) {
			var f = group.actions[sc];
			if(f !== undefined)
				for(var i in f)
					fs.push(f[i]);
		}
	}
	return fs;
}

function showCommand(firstChar, $focusBack){
	kbNav.showPrompt($focusBack);
	$prompt.one("keydown", firstChar, makeSureTheresOne).one("keyup", firstChar, makeSureTheresOne);
}

function makeSureTheresOne(event){
	if ($prompt.val().length == 0)
		$prompt.val(event.data);
}

function hideCommand()
{
	$prompt.css("visibility", "hidden");
	$prompt.keydown().keyup(); // fire the makeSureTheresOne events
	$prompt.val(""); // clear it for future use
}

function acceptInput(e)
{	
	if(e.ctrlKey || e.altKey)
		return;

	// make sure you don't intercept input text
	if(isNoFocus()) {
		var keycode = e.which;
			
		var input = String.fromCharCode(keycode);
		
		if (input.match(/\w/))
			showCommand(input);
	}
}

function escPressed(e){
	var keycode = e.which;
	if (keycode === 27 && !isNoFocus()) { // esc
		$(document.activeElement).blur();
	}
}

function enterPressed(e){
    var keycode = e.which;
    if (keycode === 13) // enter
    {
        var val = $prompt.val();
        
        var x = getAction(val);
        if (x.length > 0) {
			$prompt.blur();
			for(var i in x)
				x[i]();
		}
		else {
			var oldcolor = $prompt.css("background-color");
			$prompt.css("background-color", "#ff8080").one("keydown", oldcolor, function(e){
				$prompt.css("background-color", oldcolor);
			});
		}
    }
	else
		resizeCommandline();
}

function resizeCommandline()
{
	var len = $prompt.val().length + 1;
	
	if (len < 3)
		len = 3;
	
	$prompt.css("width", 10*len + "pt");
}

function isNoFocus()
{	
	var nodename = document.activeElement.nodeName.toLowerCase();
	
	return (nodename === "body" || nodename === "html");
}

function init(options){
	if(options !== undefined) {
		if(options.window !== undefined) {
			window = options.window;
			document = window.document;
			$ = window.jQuery;
		}
	}
	
	// test size of map to see if we should disable everything else	
	// or if we already ran this
	if (isEmpty(actionGroups) || inited)
		return;
		
	inited = true;
	
	if (!$("#kbNavInput").length)	
		$("body").append('<input type="text" id="kbNavInput" maxlength="20" style="visibility:hidden"/>');
	
	$prompt = $("#kbNavInput");
	
	$prompt.css("visibility", "hidden").blur(hideCommand).keyup(enterPressed);
    
    $(document).keypress(acceptInput);
	
	$(document).keydown(escPressed);
};

// everything below is non-commandprompt specific

function setSelectionRange(input, selectionStart, selectionEnd){
    if (input.setSelectionRange) {
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
    }
    else if (input.createTextRange) {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveEnd('character', selectionEnd);
        range.moveStart('character', selectionStart);
        range.select();
    }
}

function actionize(elem, data) {
	var $o = $(elem),
	name = elem.nodeName.toLowerCase(),
	f = kbNav.processAction[name];
	
	return f($o, data);
}

function actionHref($obj){
	return function(){
		var clickEvent = $.Event("click");
		$obj.mousedown().mouseup().trigger(clickEvent);
//		alert(clickEvent.isDefaultPrevented() + "," + clickEvent.result);
		if(clickEvent.result !== false) { // TODO: && !clickEvent.isDefaultPrevented() ? (shouldn't guarantee any behavior based on jquery)
			var target = $obj.attr("target"),
			targetMap = {
				"_top": top,
				"_self": self,
				"_parent": parent
			},
			href = $obj.attr("href");
			
			if(!target) // is blank if it doesn't exist
				document.location = href;
			else if(target == "_new" || target == "_blank") {
				var oWin = window.open(href, target);
				if(oWin)
					$(oWin).focus();
			}
			else {
				var tmr = targetMap[target];
				if(tmr !== undefined)
					tmr.location = href;
				else
					top.frames[target].location = href;
			}
		}
	};
}

function actionButton($obj){
	return function(){
		$obj.mousedown();
		$obj.mouseup();
		$obj.click();
	};
}

function actionCheckBox($obj){
	return function(){
		$obj.attr("checked", (!$obj.attr("checked")));
	};
}

function actionRadio($obj){
	return function() {
		$obj.attr("checked", true);
	};
}

function actionFile($obj){
	return function(){
		$obj.focus();
	};
}

function actionText($obj, focusType) {
	var selStart = function(){
		return 0;
	},
	selEnd = function(){
		return $obj.val().length;
	};
	
	if(focusType)
		switch(focusType.charAt(0)){
			case "s":
				selEnd = selStart; // no need to break out here
			case "e":
				selStart = selEnd;
		}
	
	return function(){
		$obj.focus();
		setSelectionRange($obj[0], selStart(), selEnd());
	};
}

function textfunc($o, data)
{
	return actionText($o, data.focusType);
}

function registerF(sc_ns, func, options) {
	var sc_ns_a = String(sc_ns).split('|'),
	sc = sc_ns_a[0],
	group = defaultGroup;
	if(sc_ns_a.length > 1)
		group = sc_ns_a[1];
	else if(options && options.group)
		group = options.group;
		
	if(actionGroups[group] === undefined)
		actionGroups[group] = new ActionGroup();
	
	if(func.constructor == Array) {
		for(var i in func)
			actionGroups[group].add(sc, a_to_f(func[i], options));
	}
	else
		actionGroups[group].add(sc, a_to_f(func, options));
}

function registerM(input, options) {
	var labelizer = kbNav.labelize;
	
	if(options && options.labelizer)
		labelizer = options.labelizer;
	
	for(var sc in input) {
		var data = input[sc],
		label = data.l,
		both = data.b,
		action = data.a;
					
		if(both !== undefined)
			label = action = both;
		
		if(label !== undefined)
			labelizer(sc, label);
		
		if(options && options.group !== undefined)
			data.group = options.group;
			
		if(action !== undefined)
			registerF(sc, action, data);
	}
	init(options);
}

window.kbNav = kbNav = {
	/*
	 * A map of name -> {@link ActionGroups}.
	 */
	actionGroups: actionGroups,
	
	/*
	 * Shows the command prompt.
	 * @param focusBack the dom element to return focus to after the prompt closes.
	 */
	showPrompt: function(focusBack){
		$prompt.css({
			"visibility": "visible",
			"width": "30px"
		}).focus();
		
		if(focusBack !== undefined)
			$prompt.blur(function(){
				$(focusBack).focus();
			});
			
		return $prompt;
	},
	
	/*
	 * Adds an anonymous overlay of actions on top of of all the current action groups.
	 * @see createOverlay
	 */
	push: function(bubble) {
		overlays.push(kbNav.createOverlay(uid(), bubble));
	},
	
	/*
	 * Removes the topmost overlay added by {@link push}.
	 */
	pop: function() {
		overlays.pop().destroy();
	},
	
	/*
	 * Creates an overlay of actions ontop of all current actionGroups.
	 * @param name of the overlay
	 * @param bubble if this is true, actions the groups below will be visible. Otherwise, only actions in the overlay will be visible.
	 * @returns the overlay
	 */
	createOverlay: function(name, bubble){
		var visible = [];
		for(var i in actionGroups){
			var ag = actionGroups[i];
			if(ag.visible) {
				visible.push(ag);
				if(!bubble)
					ag.visible = false;
			}
		}
		
		var o = {
			oldDefault: defaultGroup,
			destroy: function() {
				for(var i in visible)
					visible[i].visible = true;
					
				kbNav.remove('|' + name);
				
				defaultGroup = this.oldDefault;
			}
		};
		
		defaultGroup = name;
		
		return o;
	},
	
	/*
	 * Adds a label to an element.
	 * @param {String|Number} sc the shortcut to add as a label
	 * @param {DOMelement} elem the DOMelement to add the label to
	 */
	labelize: function(sc, elem) {
		if(elem !== undefined) {
			var $o = $(elem),
			name = elem.nodeName.toLowerCase(),
			f = kbNav.processLabel[name];
			
			f !== undefined ? f(sc, $o) : kbNav.labelizeInside(sc, $o);
		}
	},
	
	/*
	 * Convenience method to register actions.
	 * @param {Map|String} action either a map of actions or a single action name
	 * @param {Function} [function] the function to bind to, if action is a single action
	 * @param {Map} options
	 */
	register: function(a, b, c) {
		if(typeof a == 'object')
			registerM(a,b);
		else
			registerF(a,b,c);
	},
	
	/*
	 * Removes a shortcut/actionGroup.
	 * @param sc_ns if this is a shortcut, it removes it from all actionGroups.
	 * If it is an actionGroup, it removes all actions in the action group.
	 * If both are specified, it removes the shortcut from that actiongroup.
	 */
	remove: function(sc_ns) {
		var sc_ns_a = String(sc_ns).split('|'),
		sc = sc_ns_a[0],
		group;
		if(sc_ns_a.length > 1)
			group = sc_ns_a[1];
			
		if(sc.length > 0 && group !== undefined)
			delete actionGroups[group].events[sc];
		else if(group !== undefined)
			delete actionGroups[group];
		else if(sc.length > 0)
			for(var i in actionGroups)
				delete actionGroups[i].events[sc];
	},
	
	/*
	 * The label that appears when no value tag has been set for a button,
	 * because chrome returns a blank string when asking for a button's default label.
	 */
	defaultButtonLbl: {
		button: "",
		submit: "Submit Query",
		reset: "Reset"
	},
	
	/*
	 * A mapping of tag names to labelizing functions.
	 * These are the tags which require different behavior than {@link labelizeInside}
	 * Add to or modify this if you want to create a custom labelizer for a tag.
	 */
	processLabel: {
		input: function(sc, $o){
			var type = $o.attr("type").toLowerCase(),
			defaultName = kbNav.defaultButtonLbl[type];
			if(defaultName !== undefined)
				kbNav.labelizeInput(sc, $o, defaultName);
		}
	},
	
	/*
	 * A mapping of tag names to actionizing functions.
	 * Add to or modify this if you want to create a custom actionizer for a tag.
	 */
	processAction: {
		a: actionHref,
		input: function($o, data){
			var type = $o.attr("type").toLowerCase();
			if(kbNav.defaultButtonLbl[type] !== undefined)
				return actionButton($o);
			else {
				var action = kbNav.inputAction[type];
				if(action !== undefined)
					return action($o, data);
			}
		},
		button: actionButton,
		textarea: function($o, data) {
			return actionText($o, data.focusType);
		}
	},
	
	/*
	 * A mapping actionizing functions for <input type="TYPE"> elements.
	 * Mapped as TYPE -> function
	 */
	inputAction: {
		checkbox: actionCheckBox,
		radio: actionRadio,
		file: actionFile,
		text: textfunc,
		password: textfunc
	},
	
	/*
	 * Labelizes any element where the text shown is the text between the opening and closing tag.
	 */
	labelizeInside: function(sc, $obj){
		var name = $obj.text(),
		prefix = sc + ") ";
		
		
		if(name.substr(0, prefix.length) !== prefix)
			$obj.prepend(prefix);
	},
	
	/*
	 * Labelizes an input element, where the text shown is inside the value attribute.
	 */
	labelizeInput: function(sc, $obj, defaultName){
		var name = $obj.val(),
		prefix = sc + ") ";
		
		// default name when name is either undefined or blank string (chrome)
		if (!name && defaultName !== undefined)
			name = defaultName;
		
		// if the name was already labelized we don't need to do it again
		// this handles the "back" behavior in chrome (and fixes an "unfixable" bug in linux chrome)
		// caveat, if the button already is prefixed, it won't add a prefix
		if (name.substr(0, prefix.length) !== prefix)
			$obj.val(prefix + name);
	}

};

})();