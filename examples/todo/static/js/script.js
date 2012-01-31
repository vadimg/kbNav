// An example Backbone application contributed by
// [JÃ©rÃ´me Gravel-Niquet](http://jgn.me/). .

function todo_init(user_id) {
  // Todo Model
  // ----------

  // Our basic **Todo** model has `text`, `order`, and `done` attributes.
  var Todo = Backbone.Model.extend({
	  idAttribute: "id",

    // Default attributes for a todo item.
    defaults: function() {
      return {
        done:  false,
        order: Todos.nextOrder(),
        id: 'id' + Date.now() + (Math.random() + '').split('.')[1],
      };
    },

    // Toggle the `done` state of this todo item.
    toggle: function() {
      this.save({done: !this.get("done")});
    }

  });

  // Todo Collection
  // ---------------

  // The collection of todos used to be backed by *localStorage* instead of a remote
  // server, but now uses our /api/todos backend for persistance.
  var TodoList = Backbone.Collection.extend({

    // Reference to this collection's model.
    model: Todo,

    // Save all of the todo items under the `"todos"` namespace.
	  url: '/api/todos/' + user_id,

    // Filter down the list of all todo items that are finished.
    done: function() {
      return this.filter(function(todo){ return todo.get('done'); });
    },

    // Filter down the list to only todo items that are still not finished.
    remaining: function() {
      return this.without.apply(this, this.done());
    },

    // We keep the Todos in sequential order, despite being saved by unordered
    // GUID in the database. This generates the next order number for new items.
    nextOrder: function() {
      if (!this.length) return 1;
      return this.last().get('order') + 1;
    },

    // Todos are sorted by their original insertion order.
    comparator: function(todo) {
      return todo.get('order');
    }

  });

  // Create our global collection of **Todos**.
  var Todos = new TodoList;

  // fetch data from server before DOM is ready
  Todos.fetch();

  // calculates the kbnav number for the todo with given id
  var calcKbnavNum = function(id) {
     var ids = Todos.pluck('id');
     var idx = ids.indexOf(id);

     // if last element, add 1 to previous element's num
     if(Todos.length > 1 && idx == Todos.length - 1)
         return Todos.at(Todos.length - 2).get('kbnavNum') + 1;

     return idx + 1;
  };

// Load the application once the DOM is ready, using `jQuery.ready`:
$(function(){
    //
  // Todo Item View
  // --------------

  // The DOM element for a todo item...
  window.TodoView = Backbone.View.extend({

    //... is a list tag.
    tagName:  "li",

    // Cache the template function for a single item.
    template: _.template($('#item-template').html()),

    // The DOM events specific to an item.
    events: {
      "click .check"              : "toggleDone",
      "dblclick div.todo-text"    : "edit",
      "click span.todo-destroy"   : "clear",
      "keypress .todo-input"      : "updateOnEnter"
    },

    // The TodoView listens for changes to its model, re-rendering.
    initialize: function() {
      this.model.bind('change', this.render, this);
      this.model.bind('destroy', this.remove, this);
    },

    // Re-render the contents of the todo item.
    render: function() {
      var locals = this.model.toJSON();
      locals.kbnavNum = this.model.get('kbnavNum');
      $(this.el).html(this.template(locals));
      var self = this;
      var num = this.model.get('kbnavNum');
      kbNav.remove(num);
      kbNav.remove(num + 'd');
      kbNav.remove(num + 'e');
      kbNav.register(num, function() { self.toggleDone(); });
      kbNav.register(num + 'd', function() { self.clear(); });
      kbNav.register(num + 'e', function() { self.edit(); });
      this.setText();
      return this;
    },

    // To avoid XSS (not that it would be harmful in this particular app),
    // we use `jQuery.text` to set the contents of the todo item.
    setText: function() {
      var text = this.model.get('text');
      this.$('.todo-text-content').text(text);
      this.input = this.$('.todo-input');
      this.input.bind('blur', _.bind(this.close, this)).val(text);
    },

    // Toggle the `"done"` state of the model.
    toggleDone: function() {
      this.model.toggle();
    },

    // Switch this view into `"editing"` mode, displaying the input field.
    edit: function() {
      $(this.el).addClass("editing");
      this.input.focus();
    },

    // Close the `"editing"` mode, saving changes to the todo.
    close: function() {
      this.model.save({text: this.input.val()});
      $(this.el).removeClass("editing");
    },

    // If you hit `enter`, we're through editing the item.
    updateOnEnter: function(e) {
      if (e.keyCode == 13) this.close();
    },

    // Remove this view from the DOM.
    remove: function() {
      $(this.el).remove();
    },

    // Remove the item, destroy the model.
    clear: function() {
      var num = this.model.get('kbnavNum');
      kbNav.remove(num);
      kbNav.remove(num + 'd');
      kbNav.remove(num + 'e');
      this.model.destroy();
    }

  });

  // The Application
  // ---------------

  // Our overall **AppView** is the top-level piece of UI.
  window.AppView = Backbone.View.extend({

    // Instead of generating a new element, bind to the existing skeleton of
    // the App already present in the HTML.
    el: $("#todoapp"),

    // Our template for the line of statistics at the bottom of the app.
    statsTemplate: _.template($('#stats-template').html()),

    // Delegated events for creating new items, and clearing completed ones.
    events: {
      "keypress #new-todo":  "createOnEnter",
      "keyup #new-todo":     "showTooltip",
      "click .todo-clear a": "clearCompleted"
    },

    // At initialization we bind to the relevant events on the `Todos`
    // collection, when items are added or changed.
    initialize: function() {
      this.input    = this.$("#new-todo");

      Todos.bind('add',   this.addOne, this);
      Todos.bind('reset', this.addAll, this);
      Todos.bind('all',   this.render, this);
    },

    // Re-rendering the App just means refreshing the statistics -- the rest
    // of the app doesn't change.
    render: function() {
      this.$('#todo-stats').html(this.statsTemplate({
        total:      Todos.length,
        done:       Todos.done().length,
        remaining:  Todos.remaining().length
      }));
      kbNav.remove('c');
      var $clearlink = $(".todo-clear > a");
      if($clearlink.length) {
          kbNav.register({
              c: { b: $clearlink.get(0) }
          });
      }
    },

    // Add a single todo item to the list by creating a view for it, and
    // appending its element to the `<ul>`.
    addOne: function(todo) {
      todo.set({kbnavNum: calcKbnavNum(todo.id)});
      var view = new TodoView({model: todo});
      this.$("#todo-list").append(view.render().el);
    },

    // Add all items in the **Todos** collection at once.
    addAll: function() {
      Todos.each(this.addOne);
    },

    // If you hit return in the main input field, and there is text to save,
    // create new **Todo** model persisting it to *localStorage*.
    createOnEnter: function(e) {
      var text = this.input.val();
      if (!text || e.keyCode != 13) return;
      Todos.create({text: text});
      this.input.val('');
    },

    // Clear all done todo items, destroying their models.
    clearCompleted: function() {
      _.each(Todos.done(), function(todo){ todo.destroy(); });
      return false;
    },

    // Lazily show the tooltip that tells you to press `enter` to save
    // a new todo item, after one second.
    showTooltip: function(e) {
      var tooltip = this.$(".ui-tooltip-top");
      var val = this.input.val();
      tooltip.fadeOut();
      if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
      if (val == '' || val == this.input.attr('placeholder')) return;
      var show = function(){ tooltip.show().fadeIn(); };
      this.tooltipTimeout = _.delay(show, 1000);
    }

  });

  // Finally, we kick things off by creating the **App**.
  window.App = new AppView;

  // focus on the input
  kbNav.register({
      a: { b: $("#new-todo").get(0) }
  });

});

}
