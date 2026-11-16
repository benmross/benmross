"""Minimal S-expression reader for .kicad_pcb files."""
import re

TOK = re.compile(r'\(|\)|"(?:[^"\\]|\\.)*"|[^\s()"]+')


def parse(text):
    stack = [[]]
    for m in TOK.finditer(text):
        t = m.group(0)
        if t == '(':
            stack.append([])
        elif t == ')':
            v = stack.pop()
            stack[-1].append(v)
        elif t[0] == '"':
            stack[-1].append(t[1:-1].replace('\\"', '"'))
        else:
            stack[-1].append(t)
    return stack[0][0]


def find(node, name):
    return [c for c in node[1:] if isinstance(c, list) and c and c[0] == name]


def one(node, name):
    r = find(node, name)
    return r[0] if r else None
