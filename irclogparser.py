# -*- coding: utf-8 -*-
# Log parsing from launchpad/irclog2html: http://bit.ly/YapY5m
import enchant
import re

class Enum(object):
    """Enumerated value."""

    def __init__(self, value):
        self.value = value

    def __repr__(self):
        return self.value


class LogParser(object):
    """Parse an IRC log file.

    When iterated, yields the following events:

        time, COMMENT, (nick, text)
        time, ACTION, text
        time, JOIN, text
        time, PART, text,
        time, NICKCHANGE, (text, oldnick, newnick)
        time, SERVER, text

    Text is a pure ASCII or Unicode string.
    """

    COMMENT = Enum('COMMENT')
    ACTION = Enum('ACTION')
    JOIN = Enum('JOIN')
    PART = Enum('PART')
    NICKCHANGE = Enum('NICKCHANGE')
    SERVER = Enum('SERVER')
    OTHER = Enum('OTHER')

    TIME_REGEXP = re.compile(
            r'^\[?(' # Optional [
            r'(?:\d{4}-\d{2}-\d{2}T|\d{2}-\w{3}-\d{4} |\w{3} \d{2} |\d{2} \w{3} )?' # Optional date
            r'\d\d:\d\d(:\d\d)?' # Mandatory HH:MM, optional :SS
            r')\]? +') # Optional ], mandatory space
    NICK_REGEXP = re.compile(r'^<(.*?)(!.*)?>\s')
    TARGET_REGEXP = re.compile(r'^@?(.*?)([:,\.])?\s(.*)')
    DIRCPROXY_NICK_REGEXP = re.compile(r'^<(.*?)(!.*)?>\s[\+-]?')
    JOIN_REGEXP = re.compile(r'^(?:\*\*\*|-->)\s.*joined')
    PART_REGEXP = re.compile(r'^(?:\*\*\*|<--)\s.*(quit|left)')
    SERVMSG_REGEXP = re.compile(r'^(?:\*\*\*|---)\s')
    NICK_CHANGE_REGEXP = re.compile(
            r'^(?:\*\*\*|---|===)\s+(.*?) (?:are|is) now known as (.*)')

    def __init__(self, infile, dircproxy=False):
        self.infile = infile
        self.nicks = set()
        self.prev_nicks = set()
        self.d = enchant.Dict('en_US')
        if dircproxy:
            self.NICK_REGEXP = self.DIRCPROXY_NICK_REGEXP

    def decode(self, s):
        """Convert 8-bit string to Unicode.

        Supports xchat's hybrid Latin/Unicode encoding, as documented here:
        http://xchat.org/encoding/
        """
        try:
            # Try to be nice and return 8-bit strings if they contain pure
            # ASCII, primarily because I don't want to clutter my doctests
            # with u'' prefixes.
            s.decode('US-ASCII')
            return s
        except UnicodeError:
            try:
                return s.decode('UTF-8')
            except UnicodeError:
                return s.decode('cp1252', 'replace')

    def check(self, s):
        if len(s) == 0:
            return True
        return self.d.check(s)

    def get_target(self, text):
        m = self.TARGET_REGEXP.match(text)
        if m is not None:
            target = m.group(1)
            if target in self.nicks or target in self.prev_nicks:
                if m.group(2) is not None or not self.check(target):
                    return target, m.group(3)
        return None, None

    def __iter__(self):
        for line in self.infile:
            line = line.rstrip('\r\n')
            if not line:
                continue

            m = self.TIME_REGEXP.match(line)
            if m:
                time = self.decode(m.group(1))
                line = line[len(m.group(0)):]
            else:
                time = None

            m = self.NICK_REGEXP.match(line)
            if m:
                line = line.replace('\t', ' ')
                nick = self.decode(m.group(1))
                text = self.decode(line[len(m.group(0)):])
                target, rest = self.get_target(text)
                self.nicks.add(nick)
                yield time, self.COMMENT, (nick, target, rest if rest else text)
            elif line.startswith('* ') or line.startswith('*\t'):
                yield time, self.ACTION, self.decode(line)
            elif self.JOIN_REGEXP.match(line):
                yield time, self.JOIN, self.decode(line)
            elif self.PART_REGEXP.match(line):
                yield time, self.PART, self.decode(line)
            else:
                m = self.NICK_CHANGE_REGEXP.match(line)
                if m:
                    oldnick = m.group(1)
                    newnick = m.group(2)
                    line = self.decode(line)
                    yield time, self.NICKCHANGE, (line, oldnick, newnick)
                elif self.SERVMSG_REGEXP.match(line):
                    yield time, self.SERVER, self.decode(line)
                else:
                    yield time, self.OTHER, self.decode(line)
