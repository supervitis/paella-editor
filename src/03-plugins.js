Class ("paella.editor.PluginManager", {
	trackPlugins:[],
	rightBarPlugins:[],
	toolbarPlugins:[],
	
	plugins:[],
	
	initialize:function() {
		
	},

	registerPlugin:function(plugin) {
		this.plugins.push(plugin);
		this.plugins.sort(function(a,b) {
			return a.getIndex() - b.getIndex();
		});
	},
	
	loadPlugins:function() {
		var This = this;
		this.foreach(function(plugin,config) {
			if (config.enabled) {
				plugin.config = config;
				This.addPlugin(plugin);
			}
		});
	},

	foreach:function(callback) {
		var enablePluginsByDefault = false;
		var pluginsConfig = {};
		try {
			enablePluginsByDefault = paella.$editor.config.plugins.enablePluginsByDefault;
		}
		catch(e){}
		try {
			pluginsConfig = paella.player.config.plugins.list;
		}
		catch(e){}
				
		this.plugins.forEach(function(plugin){			
			var name = plugin.getName();
			var config = pluginsConfig[name];
			if (!config) {
				config = { enabled: enablePluginsByDefault };
			}
			callback(plugin, config);
		});
	},

	addPlugin:function(plugin) {
		var This = this;
		plugin.checkEnabled(function(isEnabled) {
			if (isEnabled) {
				plugin.setup();
				if (plugin.type=='editorTrackPlugin') {
					This.trackPlugins.push(plugin);
				}
				if (plugin.type=='editorRightBarPlugin') {
					This.rightBarPlugins.push(plugin);
				}
				if (plugin.type=='editorToolbarPlugin') {
					This.toolbarPlugins.push(plugin);
				}
			}
		});
	},

	onTrackChanged:function(newTrack) {
		// Notify tab plugins
		this.rightBarPlugins.forEach(function(plugin) {
			plugin.onTrackSelected(newTrack);
		});

		// Notify toolbar plugins
		this.toolbarPlugins.forEach(function(plugin) {
			plugin.onTrackSelected(newTrack);
		});
	},

	onSave:function() {
		var defer = $.Deferred();
		var deferArray = [];
		
		var handleOnSave = function(plugin) {
			deferArray.push(plugin.onSave());
		};
		
		this.trackPlugins.forEach(handleOnSave);
		this.rightBarPlugins.forEach(handleOnSave);
		this.toolbarPlugins.forEach(handleOnSave);
		
		$.when.apply($, deferArray)
			.done(function() {
				var status = true;
				for (var i=0; i<arguments.length; ++i) {
					var def = arguments[i];
					if (def.state()=="rejected") {
						status = false;
						break;
					}
				}
				if (status) {
					defer.resolve();
				}
				else {
					defer.reject();
				}
			});
			
		return defer;
	},

	onDiscard:function() {
		
	}
});

paella.editor.pluginManager = new paella.editor.PluginManager();

Class ("paella.editor.EditorPlugin", {
	initialize:function() {
		paella.editor.pluginManager.registerPlugin(this);
	},
	
	setup:function() {
		
	},
	
	onSave:function() {
		return paella_DeferredResolved();
	},

	onDiscard:function() {
		return paella_DeferredResolved();
	},

	contextHelpString:function() {
		return "";
	}
});

Class ("paella.editor.TrackPlugin", paella.editor.EditorPlugin,{
	type:'editorTrackPlugin',

	getIndex:function() {
		return 10000;
	},

	getName:function() {
		return "editorTrackPlugin";
	},

	getTrackName:function() {
		return "My Track";
	},

	getColor:function() {
		return "#5500FF";
	},

	getTextColor:function() {
		return "#F0F0F0";
	},

	getTrackType:function() {
		return "secondary";
	},

	getTrackItems:function() {
		var exampleTracks = [{id:1,s:10,e:70},{id:2,s:110,e:340}];
		return exampleTracks;
	},

	allowResize:function() {
		return true;
	},

	allowDrag:function() {
		return true;
	},

	allowEditContent:function() {
		return true;
	},

	onTrackChanged:function(id,start,end) {
		//base.log.debug('Track changed: id=' + id + ", start: " + start + ", end:" + end);
		paella.events.trigger(paella.events.documentChanged);
	},

	onTrackContentChanged:function(id,content) {
		//base.log.debug('Track content changed: id=' + id + ', new content: ' + content);
		paella.events.trigger(paella.events.documentChanged);
	},

	onSelect:function(trackItemId) {
		base.log.debug('Track list selected: ' + this.getTrackName());
	},

	onUnselect:function() {
		base.log.debug('Track list unselected: ' + this.getTrackName());
	},

	onDblClick:function(trackData) {
	},

	getTools:function() {
		return [];
	},

	onToolSelected:function(toolName) {
		//base.log.debug('Tool selected: ' + toolName);
		paella.events.trigger(paella.events.documentChanged);
	},

	isToolEnabled:function(toolName) {
		return true;
	},
	
	isToggleTool:function(toolName) {
		return true;
	},

	buildToolTabContent:function(tabContainer) {

	},

	getSettings:function() {
		return null;
	}
});

Class ("paella.editor.MainTrackPlugin", paella.editor.TrackPlugin,{
	getTrackType:function() {
		return "master";
	},

	getTrackItems:function() {
		var exampleTracks = [{id:1,s:30,e:470}];
		return exampleTracks;
	},

	getName:function() {
		return "editorMainTrackPlugin";
	},
});

Class ("paella.editor.RightBarPlugin", paella.editor.EditorPlugin,{
	type:'editorRightBarPlugin',

	getIndex:function() {
		return 10000;
	},

	getName:function() {
		return "editorRightbarPlugin";
	},

	getTabName:function() {
		return "My Rightbar Plugin";
	},

	getContent:function() {
		// 
	},

	onLoadFinished:function() {

	}
});

Class ("paella.editor.EditorToolbarPlugin", paella.editor.EditorPlugin,{
	type:'editorToolbarPlugin',
	trackList:[],

	getIndex:function() {
		return 10000;
	},

	getName:function() {
		return "editorToolbarPlugin";
	},

	getButtonName:function() {
		return "Toolbar Plugin";
	},

	getIcon:function() {
		return "icon-edit";
	},

	getOptions:function() {
		return [];
	},

	onOptionSelected:function(optionIndex) {
	}
});