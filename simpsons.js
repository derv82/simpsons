/* Helper function: Shortened version of getElementById. */
function gebi(id) { return document.getElementById(id); }

/* Initialization. Runs when window first loads. */
function init() {
	// Request # of seasons from server
	sendRequest('simpsons.cgi?method=count_seasons', handleSeasonCount);
	// Request Season 1, Episode 1 from server
	// Note that this will auto-play the episode!
	var url = String(window.location);
	if (url.lastIndexOf('#') >= 0) {
		var hash = url.substring(url.lastIndexOf('#')+1);
		var season = hash.replace(/s/, '').replace(/e.*$/, '');
		var episode = hash.replace(/^.*e/, '');
		showEpisode(season, episode);
	} else if (getCookie('season') !== '' && getCookie('episode') !== '') {
		// Load last episode viewed
		showEpisode(getCookie('season'), getCookie('episode'));
	} else {
		// Load random episode
		randomClick();
	}
	gebi("endless").onclick = function() { endlessClick(); };
	gebi("shuffle").onclick = function() { shuffleClick(); };
	gebi("random").onclick  = function() { randomClick();  };
	gebi("knob_previous").onclick = function() { prevEpisode(); };
	gebi("knob_next").onclick     = function() { nextEpisode(); };
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
				if (this.className == 'active') return;
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
				if (this.className == 'active') return;
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
	// Select current season in row of Seasons
	setInactive('season');
	var season = json['season'];
	// Wait for "Seasons" row to appear
	var tid = setTimeout(function() {
		if (gebi('season' + season) != null) {
			clearTimeout(tid);
		} else {
			console.log("waiting for season to appear");
		}
	}, 500);
	while (gebi('season' + season) == null) { }
	gebi('season' + season).className = 'active';
	var episode_row = gebi('episode_row');
	while (episode_row.lastChild.className !== 'label') {
		episode_row.removeChild(episode_row.lastChild);
	}
	// Build row of "Episodes"
	var episodes = json['episodes'];
	for (var i = 0; i < json['episode_count']; i++) {
		// Add node for every episode
		var episode_index = parseInt(i) + 1;
		var td = document.createElement('td');
		td.className = 'index';
		td.innerHTML = episode_index;
		td.id        = "s" + season + "e" + episode_index;
		td.onclick   = (function() { 
			var current_season = season, current_episode = episode_index;
			return function() {
				showEpisode(current_season, current_episode);
			};
		})();
		episode_row.appendChild(td);
	}
	// Select the current episode
	var episode = json['episode'];
	setInactive('s' + season + 'e');
	var se_text = 's' + season + 'e' + episode;
	if (gebi(se_text) != null) {
		gebi(se_text).className = "active";
	}
	episode_row.style['visibility'] = 'visible';

	// Set current URL to include hash to this season/episode
	// So users can copy/paste the link & be brought back to this episode
	var hash = "#s" + json['season'] + "e" + json['episode'];
	window.location = String(window.location).replace(/\#.*$/, "") + hash;
	setCookie('season', json['season']);
	setCookie('episode', json['episode']);
	gebi("info_top").innerHTML = 'S' + json['season'] + ' E' + json['episode'] + ' - ' + json['title'];
	gebi("video_container").innerHTML = getContainerOutput(json);
	gebi("info_container").innerHTML = getInfoOutput(json);
	gebi("episode_content").style.display = 'table';
	if (autoplay === true) {
		var videojs = _V_("video");
		videojs.load();
		videojs.play();
	}
	_V_("video").ready(function() {
		this.addEvent("ended", function() {
			videoEnded();
		});
	});
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
	output += '       poster="' + json['thumbnail'] + '" ';
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
	info += '<tr><td class="info_title">Title</td><td class="info_content">' + json['title'] + '</td></tr>';
	// Figure out airdate based on UTC timestamp
	var date = new Date(0);
	date.setUTCSeconds(parseInt(json['airdate']));
	json['airdate'] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][date.getMonth()] + ' ' + date.getDate() + ' ' + date.getFullYear(); 
	info += infoRow('Airdate',    json['airdate']); 
	info += infoRow('Download', '<a href="' + json['videopath'] + '">' + json['videopath'] + '</a> (' + intToSize(json['videosize']) + ')'); 
	info += infoRow('Synopsis',   json['synopsis']); 
	info += infoRow('Blackboard', json['blackboard']); 
	info += infoRow('Couch gag',  json['couch_gag']); 
	// Manually add table because we want to set plot BUT NOT DISPLAY IT
	info += '<tr id="plot" style="display: none;"><td class="info_title">Plot</td><td class="info_content">' + json['plot'] + '</td></tr>';
	info += infoRow('Notes',      json['notes']); 
	info += infoRow('Director',   json['director']); 
	info += infoRow('Writer',     json['writer']); 
	info += '</table>';
	return info;
}

/* Helper function. Returns table row with relevant label/content. */
function infoRow(label, content) {
	if (content == null || content === '') return '';
	return '<tr><td class="info_title">' + label + '</td><td class="info_content">' + content + '</td></tr>';
}

/* Converts from # of bytes to humnan-readable format. */
function intToSize(size) {
  var tier = ['T', 'G', 'M', 'K', ''];
  var current = Math.pow(1024, tier.length - 1); 
  for (var i in tier) {
    if (size >= current) {
      var num = size / current;
      return num.toFixed(2) + tier[i] + 'B' 
    }   
    current /= 1024;
  }
  return '0B';
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

/* Event when video has finished playing. */
function videoEnded() {
	if (gebi("endless").className !== 'option_enabled') { return; }
	var query = 'simpsons.cgi?method=next';
	if (gebi("shuffle").className === 'option_enabled') {
		query += '&random=true';
	}
	// Need to send current episode to know next episode
	var src = gebi("video").baseURI;
	src = src.substring(src.lastIndexOf('#')+1);
	query += '&current=' + src;
	sendRequest(query, handleEpisodeInfo);
}

/* Enable/disable endless play. */
function endlessClick() {
	var element = gebi('endless');
	if (element.className === 'option_enabled') {
		element.setAttribute('class', 'option_disabled');
	} else {
		element.setAttribute('class', 'option_enabled');
	}
}
/* Enable/disable shuffle during endless play. */
function shuffleClick() {
	var element = gebi('shuffle');
	if (element.className === 'option_enabled') {
		element.setAttribute('class', 'option_disabled');
	} else {
		element.setAttribute('class', 'option_enabled');
	}
}
/* Select a random episode. */
function randomClick() {
	var query = 'simpsons.cgi?method=next';
	query += '&random=true';
	// Need to send current episode to calc random episode
	if (gebi("video") != null) {
		var src = gebi("video").baseURI;
		src = src.substring(src.lastIndexOf('#')+1);
		query += '&current=' + src;
	} else {
		query += '&current=s30e30';
	}
	sendRequest(query, handleEpisodeInfo);
}

function prevEpisode() {
	var query = 'simpsons.cgi?method=prev';
	// Need to send current episode to know prev episode
	if (gebi("video") != null) {
		var src = gebi("video").baseURI;
		src = src.substring(src.lastIndexOf('#')+1);
		query += '&current=' + src;
	} else {
		query += '&current=s1e2';
	}
	sendRequest(query, handleEpisodeInfo);
}
function nextEpisode() {
	var query = 'simpsons.cgi?method=next';
	// Need to send current episode to know prev episode
	if (gebi("video") != null) {
		var src = gebi("video").baseURI;
		src = src.substring(src.lastIndexOf('#')+1);
		query += '&current=' + src;
	} else {
		query += '&current=s1e1';
	}
	sendRequest(query, handleEpisodeInfo);
}

/** COOKIES! */
function setCookie(key, value) {
	document.cookie = key + '=' + value + '; expires=Fri, 27 Dec 2999 00:00:00 UTC; path=/';
}
function getCookie(key) {
	var cookies = document.cookie.split('; ');
	for (var i in cookies) {
		var pair = cookies[i].split('=');
		if (pair[0] == key) {
			return pair[1];
		}
	}
	return ""; 
}

// Call initialization function after entire JS file is parsed
window.onload = init;
