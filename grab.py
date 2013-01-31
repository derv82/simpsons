#!/usr/bin/python

import subprocess as sub

from Web import Web
web = Web() #user_agent='curl/7.27.0')
import os, sys

def get_video(link):
	args = ['curl', link]
	p = sub.Popen(args, stdout=sub.PIPE, stderr=sub.PIPE)
	(r, errors) = p.communicate()
	if not '"fname" value="' in r:
		print 'no fname found'
		return False
	d = {}
	for inchunk in web.between(r, '<input type="hidden"', '>'):
		if not 'name="' in inchunk or not 'value="' in inchunk:
			print '\nno name/value inside: "%s"\n' % inchunk
			continue
		key = web.between(inchunk, 'name="', '"')[0]
		values = web.between(inchunk, 'value="', '"')
		if len(values) == 0: value = ''
		else: value = values[0]
		d[key] = value
	r = web.post(link, postdict=d)
	if not 'file: "' in r:
		print 'no file: " found'
		return False
	files = web.between(r, 'file: "', '"')
	fname = d['fname'].replace(' ', '')
	if fname == '':
		print 'fname is empty! skipping'
		return False
	if not os.path.exists("videos"): os.mkdir("videos")
	result = web.download(files[0], 'videos/' + fname)
	return result

def get_episode(eplist):
	name = eplist #'episodes/s2e7 - Bart vs. Thanksgiving.lst'
	f = open(name, 'r')
	txt = f.read()
	f.close()
	first = False
	for link in txt.split('\n'):
		if not first:
			first = True
			continue
		if link.strip() == '': continue
		print "loading %s" % link
		if get_video(link):
			return True
			break
		else:
			print 'failed'

def main():
	for eplist in sorted(os.listdir('episodes')):
		if not '.lst' in eplist: continue
		print 'parsing episodes/%s' % eplist
		result = get_episode('episodes/%s' % eplist)
		if result: 
			print 'SUCESS, deleting episodes/%s' % eplist
			os.remove('episodes/%s' % eplist)
		else:
			print 'FAILED to get episode!! leaving episodes/%s as a reminder of the failure' % eplist

if __name__ == '__main__':
	main()
