/* Helper function: Shortened version of getElementById. */
function gebi(id) { return document.getElementById(id); }

var EPISODE_COUNTS = new Array();
/* Initialization. Runs when window first loads. */
function init() {
	// Request seasons
	sendRequest('simpsons.cgi?method=count', handleEpisodeCounts);
	var json = {"plot": "After attending the Springfield Elementary School Christmas pageant, the Simpsons prepare for the holiday season. Marge asks Bart and Lisa for their letters to Santa. Lisa requests a pony, and Bart requests a tattoo. The next day, Marge takes the kids to the mall to go Christmas shopping at a department store in the mall. Bart slips away to the tattoo parlor and attempts to get a tattoo that reads \"Mother\". With the tattoo partially completed, Marge bursts in and drags Bart two doors down to the dermatologist to have it removed. Counting on Homer's Christmas bonus, Marge spends all of the family's holiday money on the procedure. Meanwhile, at the power plant Homer's boss, Mr. Burns, announces that there will be no Christmas bonus this year.\n\nHomer, discovering there is no money for Christmas presents and not wanting to worry the family, takes a job as a shopping mall Santa Claus at the suggestion of his friend Barney Gumble. On Christmas Eve, Bart goes to the mall and harasses Santa, exposing Homer's secret. After Homer is paid less than expected for his Department Store Santa work, he and Bart receive a hot dog racing tip from Barney.\n\nAt Springfield Downs, Homer, inspired by an announcement about a last-minute entry named Santa's Little Helper, bet all his money on the 99-1 long shot. The greyhound finishes last. As Homer and Bart leave the track, they watch the dog's owner angrily disowning him for losing the race. Bart pleads with Homer to keep the dog as a pet, and he reluctantly agrees. When Bart and Homer return home, Homer finally comes clean to the family that he didn't get his bonus, but all is forgiven with the arrival of Santa's Little Helper who is assumed to be a Christmas present for the whole family.", "code": "7G08", "episode": 1, "videopath": "videos\/s01e01.mp4", "episodenum": 1, "season": 1, "notes": "Patty, Selma, Ned and Todd Flanders, Mr. Burns, Smithers, and Grampa Simpson are introduced (although Smithers has a voice-only part). <br>This episode is on the <i>Christmas with the Simpsons<\/i> DVD (as well as on the Season 1 DVD set).", "airdate": "629884800", "videosize": 100908321, "director": "David Silverman", "couch_gag": "", "synopsis": "It's a not-so-merry Christmas for the Simpsons, when Mr. Burns decides to cut the Christmas bonuses and Marge had to spend the Christmas savings to erase a tattoo Bart thought would make a great Christmas present. In order to hide the fact that he did not get the bonus, Homer takes a second job as a store Santa.", "blackboard": "", "title": "Simpsons Roasting on an Open Fire (The Simpsons Christmas Special)", "writer": "Mimi Pond", "thumbnail": "pics\/s1e1.jpg"};
	loadMovie(json, false);
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
	var query = 'simpsons.cgi?method=info&season=' + season + '&episode=' + episode;
	sendRequest(query, handleEpisodeInfo);
}

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

function loadMovie(json, autoplay) { //title, videopath, thumbnail, autoplay) {
	try {
		_V_("video").destroy();
	} catch (error) { }
	gebi("info_top").innerHTML = json['title'];
	gebi("video_container").innerHTML = getContainerOutput(json);
	gebi("info_container").innerHTML = getInfoOutput(json);
	if (autoplay === true) {
		var videojs = _V_("video");
		videojs.load();
		videojs.play();
	}
}

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

function getInfoOutput(json) {
	var info = '';
	info += '<table>';
	info += '<tr><td class="info_title">Title     </td><td class="info_content">' + json['title']      + '</td></tr>';
	var date = new Date(0);
	date.setUTCSeconds(parseInt(json['airdate']));
	console.log("date = " + date);
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

// Converts from bytes to humnan-readable format
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
