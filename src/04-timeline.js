(function() {
	var app = angular.module(paella.editor.APP_NAME);
	
	app.directive("timeLine", function() {
		return {
			restrict: "E",
			templateUrl: "templates/timeline.html",
			link:function($scope,elem,attrs) {
				let scrollContainer = $('.timeline-zoom-container')[0];
				scrollContainer.addEventListener('scroll', function(evt) {
					$scope.trackTitleStyle = { left: scrollContainer.scrollLeft + 'px' };
				});
			},
			controller: ["$rootScope","$scope","$translate","PaellaEditor","PluginManager",function($rootScope,$scope,$translate,PaellaEditor,PluginManager) {
				$scope.zoom = 100;
				$scope.zoomOptions = {
					floor:100,
					ceil:5000
				};
				
				$scope.trackSelector = {
					isOpen:false
				};
				
				$scope.divisionWidth = 60;

				$scope.currentTime = toTextTime(0);
				$scope.mouseTrackTime = toTextTime(0);

				// This is used to move the track title to the scroll position
				$scope.trackTitleStyle = { left: "0px" };

				function toTextTime(time) {
					let hours = Math.floor(time / (60 * 60));
					let seconds = time % (60 * 60);
					let minutes = Math.floor(seconds / 60);
					seconds = Math.ceil(seconds % 60);
					return hours + ":" +
							(minutes<10 ? "0":"") + minutes + ":" +
							(seconds<10 ? "0":"") + seconds;
				}
				
				function setTimeMark(time) {
					let p = time.currentTime * $scope.zoom / time.duration;
					$('#time-mark').css({ left: p + '%'});
					let timeMarkOffset = $('#time-mark').offset();
					// TODO: Refactor
					let leftOffset = 200;
					if (timeMarkOffset.left - leftOffset<0 || timeMarkOffset.left>$(window).width()) {
						$('.timeline-zoom-container')[0].scrollLeft += timeMarkOffset.left - leftOffset;
					}
				}
				
				paella.events.bind(paella.events.timeUpdate, function(evt,time) {
					setTimeMark(time);
					$scope.currentTime = toTextTime(time.currentTime);
					$scope.$apply();
				});
				
				function getTimePercentFromClientX(clientX) {
					let left = $('.timeline-zoom-container')[0].scrollLeft;
					let width = $('#timeline-ruler').width();
					let offset = clientX;// - $(window).width() * 0.1;
					
					left = left * 100 / width;
					offset = offset * 100 / width;
					return offset + left;
				}

				function setTime(clientX) {
					paella.player.videoContainer.seekTo(getTimePercentFromClientX(clientX));
				}
				
				function buildTimeDivisions(divisionWidth) {
					paella.player.videoContainer.duration()
						.then(function(duration) {
							let width = $('#timeline-content').width();
							let numberOfDivisions = Math.floor(width / divisionWidth);
							let timelineRuler = $('#timeline-ruler')[0];
							timelineRuler.innerHTML = "";
							let timeIncrement = divisionWidth * duration / width;
							
							let time = 0;
							for (let i=0; i<numberOfDivisions; ++i) {
								let elem = document.createElement('span');
								elem.className = 'time-division';
								
								let hours = Math.floor(time / (60 * 60));
								let seconds = time % (60 * 60);
								let minutes = Math.floor(seconds / 60);
								seconds = Math.ceil(seconds % 60);
								elem.innerHTML = hours + ":" +
												 (minutes<10 ? "0":"") + minutes + ":" +
												 (seconds<10 ? "0":"") + seconds;
								
								$(elem).css({ width:divisionWidth + 'px' });
								timelineRuler.appendChild(elem);
								
								time += timeIncrement;
							}
						});
				}
				
				$(window).resize(function(evt) {
					buildTimeDivisions($scope.divisionWidth);
				});
				
				$scope.mouseTrack = function(evt) {
					let x = evt.clientX;
					let $zoomContainer = $('.timeline-zoom-container');
					let scroll = $zoomContainer[0].scrollLeft;
					let left = $zoomContainer.offset().left;;
					$scope.mouseTrackPosition = x - left;
					$scope.timeLineContainerSize = $zoomContainer.width();

					let mouseTracker = $('#mouse-tracker');
					mouseTracker.css({ left:($scope.mouseTrackPosition + scroll) + 'px'});
					let percent = getTimePercentFromClientX(x);
					paella.player.videoContainer.duration()
						.then((duration) => {
							let time = percent * duration / 100;
							$scope.mouseTrackTime = toTextTime(time);
						});
				};

				$('#timeline-ruler-action').on('mousedown',(evt) => {
					setTime(evt.clientX);
					
					function cancelTracking() {
						$('#timeline-ruler-action').off("mouseup");
						$('#timeline-ruler-action').off("mousemove");
						$('#timeline-ruler-action').off("mouseout");
					}
					$('#timeline-ruler-action').on('mouseup',cancelTracking);
					$('#timeline-ruler-action').on('mouseout',cancelTracking);
					
					$('#timeline-ruler-action').on('mousemove',(evt) => {
						setTime(evt.clientX);
					});
				});

				$('.timeline-zoom-container')
					.scroll(function(e) {
						$('.track-names-container').css({'margin-top':(- $('.timeline-zoom-container')[0].scrollTop + 35) + 'px'});
					});
				
				$scope.selectTrack = function(t) {
					PaellaEditor.selectTrack(t);
				};

				$scope.selectTool = function(tool) {
					if (tool.isEnabled) {
						PaellaEditor.selectTool(tool.name);
					}
				};

				$scope.currentTrack = function() {
					return PaellaEditor.currentTrack;
				}

				$scope.currentTrackName = function() {
					return (PaellaEditor.currentTrack && PaellaEditor.currentTrack.name) || "";
				}

				$scope.saveAndClose = function() {
					PaellaEditor.saveAll()
						.then(() => {
							$scope.closeEditor(true);
						});
				};
				
				$scope.saveChanges = function() {
					PaellaEditor.saveAll()
						.then(() => {
							$rootScope.$apply();
						})
				};
				
				$scope.closeEditor = function(noConfirm) {
					if (noConfirm || confirm($translate.instant("Are you sure you want to discard all changes and close editor?"))) {
						let editorConfig = paella.$editor.config.editor || {};
						let url = editorConfig.loginFailedUrl || "index.html${LOCATION.SEARCH}";
						url = url.replace(/\$\{\s*LOCATION\.SEARCH\s*\}/,location.search);
						location.href = url;
					}
				};
				
				$scope.$watch('tracks', function() {
				
				});

				$scope.$watch('zoom',function() {
					$('#timeline-content').css({ width:$scope.zoom + "%" });
					buildTimeDivisions($scope.divisionWidth);
					paella.player.videoContainer.currentTime()
						.then((time) => {
							setTimeMark(time);
							return paella.player.videoContainer.currentTime();
						})

						.then((c) => {
							paella.player.videoContainer.setCurrentTime(c);
						})
				});

				$scope.setTimeToCursor = function(evt) {
					setTimeout(function() {
						setTime(evt.clientX);
					},50);
				};
				
				function reloadTracks() {
					PaellaEditor.tracks(true)
						.then(function(tracks) {
							$scope.tracks = tracks;
							$scope.currentTrack = PaellaEditor.currentTrack;
							
							
							$scope.tools = PaellaEditor.tools;
							$scope.currentTool = PaellaEditor.currentTool;
	
							$scope.$apply();
						});
				}
				
				reloadTracks();
				
				PaellaEditor.subscribe($scope, function() {
					$scope.currentTrack = PaellaEditor.currentTrack;
					$scope.tools = PaellaEditor.tools;
					$scope.currentTool = PaellaEditor.currentTool;
				});

				PluginManager.subscribeTrackReload($scope,() => {
					reloadTracks();
				});
			}]
		};
	});
	
	app.directive("track", function() {
		function cancelMouseTracking() {
			$(document).off("mouseup");
			$(document).off("mousemove");
		}
		
		return {
			restrict: "E",
			templateUrl: "templates/track.html",
			scope: {
				data: "="
			},
			controller: ["$scope","PaellaEditor","PluginManager",function($scope,PaellaEditor,PluginManager) {
				$scope.pluginId = $scope.data.pluginId;
				$scope.name = $scope.data.name;
				$scope.color = $scope.data.color;
				$scope.textColor = $scope.data.textColor || 'black';
				$scope.tracks = $scope.data.list;
				$scope.duration = $scope.data.duration;
				$scope.allowResize = $scope.data.allowResize;
				$scope.allowMove = $scope.data.allowMove;
				$scope.plugin = $scope.data.plugin;
				$scope.img = $scope.data.img;

				$scope.getStyle = function(item) {
					let style = `color: ${ $scope.textColor }; background-color: ${ $scope.color };`;
					if (item.img) {
						style += ` background-image: url(${ item.img }); background-size: auto 100%;`;
					}
					return style;
				}				
				
				function selectTrackItem(trackData,tracks) {
					PaellaEditor.selectTrack(tracks);
					PaellaEditor.selectTrackItem($scope.plugin,trackData,tracks);
				}

				$scope.seekToTrackStart = function(trackData) {
					paella.player.videoContainer.setCurrentTime(trackData.s);
				};

				$scope.highlightTrack = function(trackData) {
					PaellaEditor.tracks()
						.then((tracks) => {
							tracks.forEach(function(track) {
								track.list.forEach(function(trackItem) {
									trackItem.selected = false;
								});
							});
						});
					trackData.selected = true;
				};
				
				$scope.getLeft = function(trackData) {
					return (100 * trackData.s / $scope.duration);
				};
				
				$scope.getWidth = function(trackData) {
					return (100 * (trackData.e - trackData.s) / $scope.duration);
				};
				
				$scope.getDepth = function(trackData) {
					return $(window).width() - Math.round(trackData.e - trackData.s);
				};
				
				$scope.getTrackItemId = function(trackData) {
					return "track-" + $scope.pluginId + "-" + trackData.id;
				};

				$scope.leftHandlerDown = function(event,trackData,tracks) {
					selectTrackItem(trackData,tracks);
					if ($scope.allowResize) {
						var mouseDown = event.clientX;
						$(document).on("mousemove",function(evt) {
							var delta = evt.clientX - mouseDown;
							var elem = $('#' + $scope.getTrackItemId(trackData));
							var trackWidth = elem.width();
							var diff = trackWidth!=0 ? delta * (trackData.e - trackData.s) / trackWidth:0;
							var s = trackData.s + diff;
							var minDuration = trackData.minDuration!==undefined ? trackData.minDuration : delta;
							var newDuration = trackData.e - s;
							if (newDuration>minDuration && s>0 && s<trackData.e) {
								trackData.s = s;
								PaellaEditor.saveTrack($scope.pluginId,trackData);
								mouseDown = evt.clientX;
							}
							else {
								cancelMouseTracking();
							}
						});
						$(document).on("mouseup",function(evt) {
							cancelMouseTracking();
						});
					}
				};
				
				$scope.centerHandlerDown = function(event,trackData,tracks) {
					selectTrackItem(trackData,tracks);
					if ($scope.allowMove) {
						var mouseDown = event.clientX;
						$(document).on("mousemove",function(evt) {
							var delta = evt.clientX - mouseDown;
							var elem = $('#' + $scope.getTrackItemId(trackData));
							var trackWidth = elem.width();
							var trackLeft = elem.position().left;
							var diff = trackWidth!=0 ? delta * (trackData.e - trackData.s) / trackWidth : delta * (trackData.s / trackLeft) ;
							var s = trackData.s + diff;
							var e = trackData.e + diff;
							if (s>0 && e<=$scope.duration) {
								trackData.s = s;
								trackData.e = e;
								PaellaEditor.saveTrack($scope.pluginId,trackData);
								mouseDown = evt.clientX;
							}
							else {
								cancelMouseTracking();
							}
						});
						$(document).on("mouseup",function(evt) {
							cancelMouseTracking();
						});
					}
				};
				
				$scope.rightHandlerDown = function(event,trackData,tracks) {
					selectTrackItem(trackData,tracks);
					if ($scope.allowResize) {
						var mouseDown = event.clientX;
						$(document).on("mousemove",function(evt) {
							var delta = evt.clientX - mouseDown;
							var elem = $('#' + $scope.getTrackItemId(trackData));
							var trackWidth = elem.width();
							var diff = trackWidth!=0 ? delta * (trackData.e - trackData.s) / trackWidth : delta;
							var e = trackData.e + diff;
							var minDuration = trackData.minDuration!==undefined ? trackData.minDuration : 1;
							var newDuration = e - trackData.s;
							if (newDuration>minDuration && e<=$scope.duration && e>trackData.s) {
								trackData.e = e;
								PaellaEditor.saveTrack($scope.pluginId,trackData);
								mouseDown = evt.clientX;
							}
							else {
								cancelMouseTracking();
							}
						});
						$(document).on("mouseup",function(evt) {
							cancelMouseTracking();
						});						
					}
				};

				$scope.isZeroDurationTrack = function(trackData) {
					return (trackData.e - trackData.s)<1;
				};
			}]
		};
	});
})();