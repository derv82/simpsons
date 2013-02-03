/* Helper function: Shortened version of getElementById. */
function gebi(id) { return document.getElementById(id); }

/* Initialization. Runs when window first loads. */
function init() {
	// Request # of seasons from server
	sendRequest('simpsons.cgi?method=count_seasons', handleSeasonCount);
	// Request Season 1, Episode 1 from server
	// Note that this will auto-play the episode!
	showEpisode(1, 1);
}

/* Handles server response containing # of seasons. */
function handleSeasonCount(req) {
	var json;
	try {
		json = JSON.parse(req.responseText);
	} catch (error) {
		console.log("Unable to parse response:\n" + req.responseText);
		return;
	}
	// Build row of 'Seasons'
	var season_row = gebi('season_row');
	for (var season = 1; season <= json['count']; season++) {
		var td = document.createElement('td');
		td.className = 'index';
		td.innerHTML = season;
		td.id        = "season" + season;
		td.title     = "Season " + season;
		td.onclick = (function() { 
			var current_season = season;
			return function() { 
				gebi("episode_row").style.visibility = 'hidden';
				var query = 'simpsons.cgi?method=season_info&season=' + current_season
				sendRequest(query, handleSeasonInfo);
			};
		})();
		season_row.appendChild(td);
	}
}

/* Handles server response containing list of titles/synopses for
 * all episodes in a given season. */
function handleSeasonInfo(req) {
	var json;
	try {
		json = JSON.parse(req.responseText);
	} catch (error) {
		console.log("Unable to parse response:\n" + req.responseText);
		return;
	}
	var season = json['season']
	var episode_row = gebi('episode_row');
	// Reset UI
	setInactive('season');
	gebi('season' + season).className = 'active';
	// Remove existing episode nodes
	while (episode_row.lastChild.className !== 'label') {
		episode_row.removeChild(episode_row.lastChild);
	}
	// Build row of "Episodes"
	var episodes = json['episodes'];
	for (var i in episodes) {
		// Add node for every episode
		var episode_index = parseInt(i) + 1;
		var td = document.createElement('td');
		td.className = 'index';
		td.innerHTML = episode_index;
		td.id        = "s" + season + "e" + episode_index;
		td.title     = episodes[i]['t'] + '\n\n' + episodes[i]['s'];
		td.synopsis  = episodes[i]['s'];
		td.onclick   = (function() { 
			var current_season = season, current_episode = episode_index;
			return function() {
				showEpisode(current_season, current_episode);
			};
		})();
		episode_row.appendChild(td);
	}
	episode_row.style['visibility'] = 'visible';
}

/* Helper method. Marks existing Season or Episode nodes as 'inactive'. */
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

/* Sends request to view specific episode. */
function showEpisode(season, episode) {
	setInactive('s' + season + 'e');
	var se_text = 's' + season + 'e' + episode;
	if (gebi(se_text) != null) {
		gebi(se_text).className = "active";
	}
	var query = 'simpsons.cgi?method=info&season=' + season + '&episode=' + episode;
	sendRequest(query, handleEpisodeInfo);
}

/* Handles server response containing info about episode to be played. */
function handleEpisodeInfo(req) {
	var json;
	try {
		json = JSON.parse(req.responseText);
	} catch (error) {
		console.log("Unable to parse response:\n" + req.responseText);
		return;
	}
	loadMovie(json, true);
}

/* Loads episode using provided object containing title, video path, etc. */
function loadMovie(json, autoplay) {
	try {
		// Kill running videos if needed.
		_V_("video").destroy();
	} catch (error) { }
	gebi("info_top").innerHTML = json['title'];
	gebi("video_container").innerHTML = getContainerOutput(json);
	gebi("info_container").innerHTML = getInfoOutput(json);
	gebi("episode_content").style.display = 'table';
	if (autoplay === true) {
		var videojs = _V_("video");
		videojs.load();
		videojs.play();
	}
}

/* Helper method.
 * returns 'video container' inner HTML. 
 * This is vital for displaying the video. */
function getContainerOutput(json) {
	var output = '';
	output += '<video id="video" ';
	output += '       class="video-js vjs-default-skin" ';
	output += '       controls preload="auto" ';
	output += '       width="640" ';
	output += '       height="480" ';
	output += '       poster="' + json['thumbnail'] + '"';
	output += '       data-setup="{}">';
	output += '  <source src="' + json['videopath'] + '" type="video/mp4">';
	output += '</video>';
	return output;
}

/* Helper method.
 * Returns tabulated episode information. */
function getInfoOutput(json) {
	var info = '';
	info += '<table>';
	info += '<tr><td class="info_title">Title     </td><td class="info_content">' + json['title']      + '</td></tr>';
	var date = new Date(0);
	date.setUTCSeconds(parseInt(json['airdate']));
	json['airdate'] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear(); 
	info += '<tr><td class="info_title">Airdate   </td><td class="info_content">' + json['airdate']    + '</td></tr>';
	info += '<tr><td class="info_title">Download  </td><td class="info_content"><a href="' + json['videopath'] + '">' + json['videopath'] + '</a> (' + intToSize(json['videosize']) + ')';
	info += '<tr><td class="info_title">Synopsis  </td><td class="info_content">' + json['synopsis']   + '</td></tr>';
	if (json['blackboard'] != null && json['blackboard'] !== '') {
		info += '<tr><td class="info_title">Blackboard</td><td class="info_content">' + json['blackboard'] + '</td></tr>';
	}
	if (json['couch_gag'] != null && json['couch_gag'] !== '') {
		info += '<tr><td class="info_title">Couch gag </td><td class="info_content">' + json['couch_gag']  + '</td></tr>';
	}
	info += '<tr id="plot" style="display: none;"><td class="info_title">Plot      </td><td class="info_content">' + json['plot']       + '</td></tr>';
	if (json['notes'] != null && json['notes'] !== '') {
		info += '<tr><td class="info_title">Notes</td><td class="info_content">' + json['notes']  + '</td></tr>';
	}
	info += '<tr><td class="info_title">Director  </td><td class="info_content">' + json['director']   + '</td></tr>';
	info += '<tr><td class="info_title">Writer    </td><td class="info_content">' + json['writer']     + '</td></tr>';
	info += '</table>';
	return info;
}

/* Converts from # of bytes to humnan-readable format. */
function intToSize(size) {
  var tier = ['t', 'g', 'm', 'k', ''];
  var current = Math.pow(1024, tier.length - 1); 
  for (var i in tier) {
    if (size >= current) {
      var num = size / current;
      return num.toPrecision(2) + tier[i] + 'b' 
    }   
    current /= 1024;
  }
  return '0b';
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

/* Sends request, shoots request to handler if/when successful. */
function sendRequest(url, handler) {
	var req = makeHttpObject();
	req.open("GET", url, true);
	req.send(null);
	req.onreadystatechange = function() {
		if (req.readyState == 4) {
			if (req.status == 200) {
				handler(req);
			} else {
				console.log("Request status " + req.status + " for URL " + url);
				throw new Error("Request status " + req.status + " for URL " + url);
			}
		}
	}
}

// Call initialization function after entire JS file is parsed
window.onload = init;
