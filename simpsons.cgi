#!/usr/bin/python

""" Python script to return JSON-formatted responses. """

MAX_SEASON = 21

import cgitb; cgitb.enable() # Debugging
import cgi # CGI for getting key/value pairs from query

from JSON import json # For formatting python objects into JSON

from DB import DB # For querying database file
db = DB('simpsons.db')

import os
from random import randint

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
	
	elif keys['method'] == 'next' and \
			'current' in keys:
		if 'random' in keys:
			print_random_episode(keys['current'])
		else:
			print_next_episode(keys['current'])

	else:
		print '{"error": "Unknown method"}'

def print_random_episode(current):
	try:
		(s, e) = parse_season_episode(current)
	except:
		print '{"error": "incorrect season/episode format"}'
		return
	l = db.select('season, episode', 'Episodes', 'season != %d AND season <= %d' % (s, MAX_SEASON))
	(next_s, next_e) = l[randint(0, len(l)-1)]
	print_episode_info(str(next_s), str(next_e))

def print_next_episode(current):
	try:
		(s, e) = parse_season_episode(current)
	except:
		print '{"error": "incorrect season/episode format"}'
		return
	# Try to get the next episode in the season
	l = db.select('season, episode', 'Episodes', 'season == %d AND episode == %d' % (s, e + 1))
	if len(l) > 0: # If it exists
		e += 1
	elif s < MAX_SEASON: # If not, start at next season
		s += 1
		e = 1
	else: # Start over if we hit the last ep in last season
		s = 1
		e = 1
	print_episode_info(str(s), str(e))

def parse_season_episode(current):
	if not 's' in current and 'e' in current:
		raise Exception()
	season  = current[1:current.find('e')]
	episode = current[current.find('e')+1:]
	try:
		s = int(season)
		e = int(episode)
	except ValueError:
		raise Exception()
	return (s, e)

def print_season_count():
	""" Counts # of seasons, returns in key 'count'. """
	print '{"count": %d}' % (db.select('COUNT(DISTINCT season)', 'Episodes', 'season <= %d' % MAX_SEASON)[0][0])

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

