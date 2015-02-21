// ==UserScript==
// @name		pr0gramm Friendlist
// @author		holzmaster
// @namespace	holzmaster
// @include		http://pr0gramm.com*
// @version		1.0.0
// @copyright	2015+, holzmaster
// @description	Wir haben eigentlich keine.
// @downloadURL		https://raw.githubusercontent.com/pr0nopoly/friendlist/master/friendlist.user.js
// @updateURL		https://raw.githubusercontent.com/pr0nopoly/friendlist/master/friendlist.user.js
// @icon		http://pr0gramm.com/media/pr0gramm-favicon.png
// @grant		none
// ==/UserScript==

(function() {

	var friendCss =
	" .extension-is-friend:before { content: 'FAG'; color: #FFF; padding: 1px 6px; vertical-align: baseline; text-align: center; font-weight: bold; border-radius: 0.25em; background-color: #3B5998; margin-right: 5px; }";

	function addGlobalStyle(css) {
		var head = document.getElementsByTagName("head")[0];
		if (!head)
			return;
		var style = document.createElement("style");
		style.type = "text/css";
		style.innerHTML = css;
		head.appendChild(style);
	};

	p.FriendList = p.Class.extend({
		cookie: {},
		store: null,
		currentList: null,

		init: function() {
			var restored = JSON.parse($.cookie(CONFIG.COOKIE.NAME) || '{}');
			if (restored)
			{
				this.cookie = p.merge(this.cookie, restored);
				this.id = this.cookie.id;
				this.flags = parseInt(this.cookie.fl) || 1;
				this.name = this.cookie.n;
				this.admin = !!this.cookie.a;
			}
			this._updateDatabaseName();
		},

		_updateDatabaseName: function() {
			if(this.name)
			{
				this.store = new p.LocalStore(this.name);
				this.ensureList(null);
			}
		},

		ensureList: function(cb) {
			var that = this;
			cb = cb || (function(){});
			if(that.currentList === null)
			{
				that.store.getItem("friendlist", function(error, friends) {
					that.currentList = friends || {};
					cb();
				});
			}
			else
			{
				cb();
			}
		},

		addFriend: function(name) {
			if(!name)
				return;

			var that = this;
			if(that.store && that.store.status === p.LocalStore.STATUS.OPEN)
			{
				that.ensureList(function() {
					that._addFriendInternal(that.currentList, name);
				});
			}
			else
			{
				console.error("No database.");
			}
		},
		_addFriendInternal: function(currentList, name) {
			name = name.toLowerCase();
			currentList[name] = null;
			this._saveList(currentList);
			console.log("Added %s", name);
		},

		removeFriend: function(name) {
			if(!name)
				return;

			var that = this;
			if(that.store && that.store.status === p.LocalStore.STATUS.OPEN)
			{
				that.ensureList(function() {
					that._removeFriendInternal(that.currentList, name);
				});
			}
			else
			{
				console.error("No database.");
			}
		},
		_removeFriendInternal: function(currentList, name) {
			name = name.toLowerCase();
			delete currentList[name];
			this._saveList(currentList);
			console.log("Removed %s", name);
		},

		_saveList: function(list) {
			this.store.setItem("friendlist", list);
		},

		isFriend: function(name) {
			if(!name)
				return false;
			if(!this.currentList)
				return false;
			return this.currentList.hasOwnProperty(name.toLowerCase());
		},
		getFriendClass: function(name) {
			if(this.isFriend(name))
				return " extension-is-friend";
			return "";
		}
	});

	p.FriendList.inst = new p.FriendList();

	p.View.FriendList = p.View.Base.extend({
		template: '<h1 class="pane-head">Freunde</h1> <div> <p> Hier kannst du deine Freunde hinzufügen und entfernen. </p> <div> <ul><?js for(var x in manager.currentList) { ?><li><a href="#user/{x}">{x}</a></li><?js } ?></ul> </div> <div> <input type="text" placeholder="Name des Hurensohns" id="extension-friend-input"> <input type="button" id="extension-friend-submit" value="Hinzufügen"> </div></div>',

		data: {
			manager: null
		},

		init: function (container, parent) {
			this.parent(container, parent);
			p.mainView.setTab(null);
			this.data.manager = p.FriendList.inst;
		},

		render: function() {
			this.parent();
		},

		load: function() {
			this.data.manager.ensureList(this.loaded.bind(this));
			return false;
		},

		loaded: function() {
			var that = this;
			that.render();
			$("#extension-friend-submit").click(function() {
				var $inp = $("#extension-friend-input");
				var name = $inp.val();
				if(name)
				{
					that.data.manager.addFriend(name);
					p.reload(); //dem laziness
				}
			});
		},

		show: function(params) {
			return this.parent(params);
		}
	});

	var errPage = p._routes.last();
	p._routes.splice(errPage, 1);
	p.addRoute(p.View.FriendList, 'fags');
	p._routes.push(errPage);

	$(function() {
		addGlobalStyle(friendCss);

		p.View.Stream.Comments.prototype.template =
		p.View.Stream.Comments.prototype.template.replace(
			'class="user um{c.mark}">',
			'class="user um{c.mark}{p.FriendList.inst.getFriendClass(c.name)}">'
		);

		p.View.Stream.Item.prototype.template =
		p.View.Stream.Item.prototype.template.split(
			'class="user um{item.mark}">'
		).join(
			'class="user um{item.mark}{p.FriendList.inst.getFriendClass(item.user)}">'
		);

		p.View.User.prototype.template =
		p.View.User.prototype.template.replace(
			'<em class="user-mark user um{user.mark}">',
			'<em class="user-mark user um{user.mark}{p.FriendList.inst.getFriendClass(user.name)}">'
		).split(
			'class="user um{user.mark}">'
		).join(
			'class="user um{user.mark}{p.FriendList.inst.getFriendClass(user.name)}">'
		);

		p.View.User.Comments.prototype.template =
		p.View.User.Comments.prototype.template.replace(
			'class="user um{user.mark}">',
			'class="user um{user.mark}{p.FriendList.inst.getFriendClass(user.name)}">'
		);

		p.View.Inbox.prototype.template =
		p.View.Inbox.prototype.template.split(
			'class="user um{m.senderMark}'
		).join(
			'class="user um{m.senderMark}{p.FriendList.inst.getFriendClass(m.senderName)}'
		).split(
			'class="user um{m.mark}"'
		).join(
			'class="user um{m.mark}{p.FriendList.inst.getFriendClass(m.name)} schwanz"'
		);

		// Somehow some pages are buggy, so force template recompilation.
		switch(p.currentView.__proto__.classId)
		{
			case p.View.User.classId:
			case p.View.Inbox.classId:
				var t = p.compileTemplate(p.currentView.__proto__.template);
				p._compiledTemplates[p.currentView.__proto__.classId] = t;
				p.currentView.compiledTemplate = t;
		}

		if(p.getLocation() === "fags")
		{
			p.setView(p.View.FriendList, {});
		}
	});
})();
