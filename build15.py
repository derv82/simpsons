#!/usr/bin/python

import os, sys
from datetime import datetime
import time

# For web requests
from Web import Web
web = Web()

from DB import DB
SCHEMA = {
	# TABLE
	'Episodes' : 
		# ROWS
		'\n\t' +
		'code       TEXT PRIMARY KEY, \n\t' +
		'season     INTEGER, \n\t' +
		'episode    INTEGER, \n\t' +
		'episodenum INTEGER, \n\t' +
		'thumbnail  TEXT,    \n\t' +
		'videopath  TEXT,    \n\t' +
		'airdate    TEXT,    \n\t' +
		'title      TEXT,    \n\t' +
		'synopsis   TEXT,    \n\t' +
		'plot       TEXT,    \n\t' +
		'notes      TEXT,    \n\t' +
		'blackboard TEXT,    \n\t' +
		'couch_gag  TEXT,    \n\t' +
		'director   TEXT,    \n\t' +
		'writer     TEXT     \n\t'
}
db = DB('simpsons.db', **SCHEMA)

episode_counts = [13, 22, 24, 22, 22, 25, 25, 25, 25, 23, 22, 21, 22, 22, 22, 21, 22, 22, 20, 21, 23, 22, 22, 22]

# Use episode list from wikipedia to find titles needed to grab the article
if os.path.exists("wiki_list.txt"):
	f = open('wiki_list.txt', 'r')
	wiki_list = f.read()
	f.close()
else:
	print 'grabbing list from wikipedia'
	wiki_list = web.get('http://en.wikipedia.org/w/api.php?action=query&rvprop=content&prop=revisions&format=json&titles=List_of_The_Simpsons_episodes')
	f = open('wiki_list.txt', 'w')
	f.write(wiki_list)
	f.close()


def fix_wiki_text(text):
	#print '\tparsing wiki text (len = %d)' % len(text)
	text = text.strip()
	if text.startswith('= '): text = text[2:]
	text = text.replace('\\"', '"')
	while True: 
		i = text.find('<')
		j = text.find('>', i)
		if i >= 0 and j >= 0:
			text = text[:i] + text[j+1:]
		else:
			break
	while '{{' and '}}' in text: text = text[:text.find('{{')] + text[text.find('}}')+2:]
	while '[[' in text:
		i = text.find('[[')
		j = text.find(']]', i)
		front = text[:i]
		middle = text[i+2:j]
		end = text[j+2:]
		if '|' in middle: middle = middle[middle.find('|')+1:]
		text = front + middle + end
	text = text.replace('\\n', '\n')
	text = text.strip()
	while text.startswith('\n'): text = text[1:]
	while text.endswith('\n'):   text = text[:-1]
	#print '\tparsed wiki text (len = %d)' % len(text)
	return text

def get_wikipedia(episode):
	r = web.get('http://en.wikipedia.org/w/api.php?action=query&rvprop=content&prop=revisions&format=json&titles=%s' % web.quote(episode))

	if 'episode_no' in r: episode_no = fix_wiki_text(web.between(r, 'episode_no', '\\n')[0])
	else: episode_no = ''
	episode_no = episode_no.replace('=', '').replace('|', '').strip()

	if 'writer' in r: writer = fix_wiki_text(web.between(r, 'writer', '\\n')[0])
	else: writer = ''

	if 'director' in r: director = fix_wiki_text(web.between(r, 'director', '\\n')[0])
	else: director = ''

	if 'blackboard' in r: blackboard = fix_wiki_text(web.between(r, 'blackboard', '\\n')[0])
	else: blackboard = ''

	if 'couch_gag' in r: couch_gag = fix_wiki_text(web.between(r, 'couch_gag', '\\n')[0])
	else: couch_gag = ''

	if '==Plot==' in r: 
		if r.find('==', r.find('==Plot==')+10) >= 0:
			plot = fix_wiki_text(web.between(r, '==Plot==', '==')[0])
		else:
			plot = fix_wiki_text(web.between(r, '==Plot==', '}')[0])
	elif '== Plot ==' in r: plot = fix_wiki_text(web.between(r, '== Plot ==', '==')[0])
	else: plot = ''
	
	#print '\twiki:\n\t\tepisode_no: %s\n\t\twriter: %s\n\t\tdirector: %s\n\t\tblackboard: %s\n\t\tcouch: %s\n\t\tplot %s\n' % (episode_no, writer, director, blackboard, couch_gag, plot)
	return (episode_no, writer, director, blackboard, couch_gag, plot)

# Gets info for eason
def get_season(season):
	if not os.path.exists('season%d.html' % season):
		r = web.get('http://www.snpp.com/episodeguide/season%d.html' % season)
		f = open('season%d.html' % season, 'w')
		f.write(r)
		f.close()
	else:
		f = open('season%d.html' % season, 'r')
		r = f.read()
		f.close()
	#chunks = web.between(r, '<p><table', '</table>')
	chunks = web.between(r, '<table border="0" cellpadding="0" cellspacing="0">', '</table>')
	episode = 1
	for chunk in chunks:
		if 'season1.html' in chunk: continue
		if '<td width="600">' in chunk: continue
		result = db.select('title', 'episodes', 'season = %d AND episode = %d' % (season, episode))
		if len(result) > 0: 
			episode += 1
			continue

		if '<b>The Mysterious Voyage of Homer</b>' in chunk:
			chunk = chunk.replace('<b>The Mysterious Voyage of Homer</b>', 'The Mysterious Voyage of Homer')
		if '<i>(Season Premiere)</i>' in chunk:
			chunk = chunk.replace('<i>(Season Premiere)</i>', '(Season Premiere)');
		if '<font size="2" face="Arial" color="#FF0000"> 300th Episode</font>' in chunk:
			chunk = chunk.replace('<font size="2" face="Arial" color="#FF0000"> 300th Episode</font>', '300th Episode')
		print "[+] SEASON %d, EPISODE %d" % (season, episode)
		fields = web.between(chunk, '>', '<')
		title = fields[12].replace('\n', '').strip()
		code  = fields[13].strip().replace('(', '').replace(')', '').replace('#', '')
		if ' /' in code: code = code[:code.find(' /')]
		sdate = fields[19].strip()
		date = datetime.strptime(sdate, '%d %b %Y')
		detail = web.between(chunk, '<td width="580" colspan="2"', '</td>')[0].strip()
		detail = detail[detail.find('>')+1:]
		detail = detail.replace('\n', ' ')
		notes = ''
		if '<br><b>NOTES:</b>' in detail:
			notes = detail[detail.find('<br><b>NOTES:</b>')+len('<br><b>NOTES:</b>'):].strip()
			detail = detail[:detail.find('<br><b>NOTES:</b>')].strip()
		while '  ' in detail: detail = detail.replace('  ', ' ')
		while '  ' in notes: notes = notes.replace('  ', ' ')
		if not os.path.exists('pics/'): os.mkdir('pics/')
		video_path = 'videos/s%de%d.mp4' % (season, episode)
		thumb_path = 'pics/s%de%d.jpg' % (season, episode)
		thumb_url  = 'http://www.simpsoncrazy.com/content/episodes/screenshots/%s.jpg' % code.lower()
		if not os.path.exists(thumb_path):
			print '\tdownloading thumbnail %s' % thumb_url
			result = web.download(thumb_url, thumb_path)
			if not result:
				thumb_url  = 'http://www.simpsoncrazy.com/content/episodes/screenshots/old/%s.jpg' % code.upper()
				if not web.download(thumb_url, thumb_path):
					print '\tUNABLE TO GET THUMBNAIL @ %s' % thumb_url
		#print "\t'%s' (%s) @ %s\n\t%s\n\t%s" % (title, code, date, detail, notes)
		
		print '\tCODE: %s' % code.upper()
		wiki_title = web.between(wiki_list, code.upper(), '\\n')[0]
		wiki_title = wiki_title.replace('||', '').replace('\\"', '"')
		wiki_title = wiki_title[wiki_title.find('[[')+2:]
		wiki_title = wiki_title[:wiki_title.find(']]')]
		if '|' in wiki_title: wiki_title = wiki_title[:wiki_title.find('|')]
		print "\twiki title: '%s'" % wiki_title
		(episode_no, writer, director, blackboard, couch_gag, plot) = get_wikipedia(wiki_title)
		#plot = plot.replace("\\'", '').replace("'", '').replace('"', '')
		tup = (\
				code, \
				season, \
				episode, \
				int(episode_no), \
				thumb_path, \
				video_path, \
				date.strftime("%s"), \
				title, \
				detail, \
				plot, \
				notes, \
				blackboard, \
				couch_gag, \
				director, \
				writer, \
				)
		#print '\tinsert tuple:'
		#for t in tup: print '\t\t%s' % t
		#print ''
		db.insert('Episodes', tup)
		db.commit()
		time.sleep(0.5)
		
		episode += 1

if __name__ == '__main__':
	#print str(get_wikipedia("'Round Springfield"))
	for season in xrange(15, len(episode_counts)+1):
		result = db.select('title', 'episodes', 'season = %d AND episode = %d' % (season, episode_counts[season-1]))
		if len(result) > 0: 
			print "skipping season %d" % season
			continue
		get_season(season)
