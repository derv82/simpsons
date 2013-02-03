#!/usr/bin/python

""" Python script to return JSON-formatted responses. """

import cgitb; cgitb.enable() # Debugging
import cgi # CGI for getting key/value pairs from query

from JSON import json # For formatting python objects into JSON

from DB import DB # For querying database file
db = DB('simpsons.db')

import os

def main():
	""" Prints results of query """
	keys = get_keys()
	if not 'method' in keys:
		print '{"error": "Method not found"}'
		return
	
	if keys['method'] == 'count_seasons':
		print_season_count()

	elif keys['method'] == 'info' and \
			'season'  in keys and \
			'episode' in keys:
		# Show information for a specific episode
		print_episode_info(keys['season'], keys['episode'])

	elif keys['method'] == 'season_info' and \
			'season' in keys:
		# Show titles/synopses for a specific season
		print_season_info(keys['season'])

	else:
		print '{"error": "Unknown method"}'

def print_season_count():
	""" Counts # of seasons, returns in key 'count'. """
	print '{"count": %d}' % (db.select('COUNT(DISTINCT season)', 'Episodes')[0][0])

def print_season_info(season):
	""" Shows list of episodes for season; includes titles and synopses.
			returns keys 'season' (int) and 'episodes' (list) with keys 't' and 's' for title and synopsis.
	"""
	try:
		iseason = int(season)
	except:
		print '{"error": "incorrect season format"}'
		return
	l = db.select('title, synopsis', 'episodes', "season = %d ORDER BY episode" % iseason)
	result = []
	for i in l:
		result.append({'t': i[0], 's': i[1]})
	d = {'season': season, 'episodes': result}
	print json.dumps(d)


def print_episode_info(season, episode):
	try:
		s = int(season)
		e = int(episode)
	except:
		print '{"error": "incorrect season/episode format"}'
		return
	query = 'season = %d AND episode = %d' % (s, e)
	result = db.select('*', 'Episodes', query)
	if len(result) == 0 or len(result[0]) == 0:
		print '{"error": "could not find info for s%de%d"}' % (s, e)
		return
	struct = ['code', \
	          'season', \
						'episode', \
						'episodenum', \
						'thumbnail', \
						'videopath', \
						'airdate', \
						'title', \
						'synopsis', \
						'plot', \
						'notes', \
						'blackboard', \
						'couch_gag', \
						'director', \
						'writer']
	#print json.dumps(list(result[0]))
	d = {}
	values = list(result[0])
	for i in xrange(0, len(values)):
		d[struct[i]] = values[i]
	if os.path.exists(d['videopath']):
		d['videosize'] = os.path.getsize(d['videopath'])
	else:
		d['videosize'] = 0
	print json.dumps(d)

def get_keys():
	""" Retrieves key/value pairs from query, puts in dict """
	form = cgi.FieldStorage()
	keys = {}
	for key in form.keys():
		keys[key] = form[key].value
	return keys


if __name__ == '__main__':
	print "Content-Type: application/json"
	print ""
	main()
	print '\n\n'

