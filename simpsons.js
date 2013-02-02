/* Helper function: Shortened version of getElementById. */
function gebi(id) { return document.getElementById(id); }

var EPISODE_COUNTS = new Array();
/* Initialization. Runs when window first loads. */
function init() {
	// Request seasons
	sendRequest('simpsons.cgi?method=count', handleEpisodeCounts);
	loadMovie('S1E1 Xmas special', 'videos/s01e01.mp4', 'pics/s1e1.jpg', false);
}

function handleEpisodeCounts(req) {
	var json;
	try {
		json = JSON.parse(req.responseText);
	} catch (error) {
		console.log("Unable to parse response:\n" + req.responseText);
		return;
	}
	EPISODE_COUNTS = json['counts'];
	var season_row = gebi('season_row');
	for (var i = 1; i <= EPISODE_COUNTS.length; i++) {
		var td = document.createElement('td');
		td.className = 'index';
		td.innerHTML = i;
		td.id = "season" + i;
		td.onclick = (function() { 
			var current_i = i, current_count = EPISODE_COUNTS[i-1];
			return function() { 
				showSeason(current_i, current_count);
			};
		})();
		season_row.appendChild(td);
	}
}

function setInactive(idPrefix) {
	var i = 1;
	while (true) {
		var node = gebi(idPrefix + i++);
		if (node == null) { 
			break;
		} else if (node.className === 'active') {
			node.className = 'index';
		}
	}
}


function showSeason(season, episode_count) {
	var episode_row = gebi('episode_row');
	setInactive('season');
	gebi('season' + season).className = 'active';
	// Remove existing episode nodes
	while (episode_row.lastChild.className !== 'label') {
		episode_row.removeChild(episode_row.lastChild);
	}
	// Add node for every episode
	for (i = 1; i <= episode_count; i++) {
		var td = document.createElement('td');
		td.className = 'index';
		td.innerHTML = (i);
		td.id = "s" + season + "e" + i;
		td.onclick = (function() { 
			var current_season = season, current_episode = i;
			return function() {
				showEpisode(current_season, current_episode);
			};
		})();
		episode_row.appendChild(td);
	}
	episode_row.style['visibility'] = 'visible';
}

function showEpisode(season, episode) {
	setInactive('s' + season + 'e');
	gebi('s' + season + 'e' + episode).className = "active";
	console.log("SHOULD SHOW SEASON " + season + " EPISODE " + episode);
	var query = 'simpsons.cgi?method=info&season=' + season + '&episode=' + episode;
	sendRequest(query, handleEpisodeInfo);
	// Request episode info from server
	// Play video
}

function handleEpisodeInfo(req) {
	var json;
	try {
		json = JSON.parse(req.responseText);
	} catch (error) {
		console.log("Unable to parse response:\n" + req.responseText);
		return;
	}
	var top = '';
	top += 'Season ' + json['season'];
	top += ' Episode ' + json['episode'];
	top += ' - ' + json['title'];
	var bottom = '';
	bottom += '<a href="' + json['videopath'] + '">download</a>';
	loadMovie(top, json['videopath'], json['thumbnail'], true);
}

function loadMovie(title, videopath, thumbnail, autoplay) {
	try {
		_V_("video").destroy();
	} catch (error) { }
	var output = '';
	output += '<video id="video" ';
	output += '       class="video-js vjs-default-skin" ';
	output += '       controls preload="auto" ';
	output += '       width="640" ';
	output += '       height="480" ';
	output += '       poster="' + thumbnail + '"';
	output += '       data-setup="{}">';
	output += '  <source src="' + videopath + '" type="video/mp4">';
	output += '</video>';
	gebi("info_top").innerHTML = title;
	gebi("video_container").innerHTML = output;
	gebi("info_bottom").innerHTML = '<a href="' + videopath + '">download</a>';
	
	if (autoplay === true) {
		var videojs = _V_("video");
		videojs.load();
		videojs.play();
	}
}

/* Create new XML/AJAX request object */
function makeHttpObject() {
	try { return new XMLHttpRequest();
	} catch (error) {}
	try { return new ActiveXObject("Msxml2.XMLHTTP");
	} catch (error) {}
	try { return new ActiveXObject("Microsoft.XMLHTTP");
	} catch (error) {}
	throw new Error("Could not create HTTP request object.");
}

/* Sends request, shoots request to handler when complete. */
function sendRequest(url, handler) {
	var req = makeHttpObject();
	req.open("GET", url, true);
	req.send(null);
	req.onreadystatechange = function() {
		if (req.readyState == 4) {
			if (req.status == 200) {
				handler(req);
			} else {
				console.log("Request status " + request.status + " for URL " + url);
				throw new Error("Request status " + request.status + " for URL " + url);
			}
		}
	}
}

window.onload = init;
