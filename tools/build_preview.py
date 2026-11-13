#!/usr/bin/env python3
"""Builds a single-file preview of index.html (CSS/JS inlined, Google Fonts instead of local font files, no CSP).
Only for hosts that serve one file (e.g. a chat preview). The real site uses the multi-file version."""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
s = (root/'index.html').read_text(encoding='utf8')
s = re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?', '', s)
s = s.replace('<link rel="stylesheet" href="fonts/fonts.css">',
  '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600&family=Nunito:wght@400;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet">')
s = s.replace('<link rel="stylesheet" href="theme.css">', lambda m: '<style>'+(root/'theme.css').read_text(encoding='utf8')+'</style>') if False else s.replace('<link rel="stylesheet" href="theme.css">', '<style>'+(root/'theme.css').read_text(encoding='utf8')+'</style>')
s = s.replace('<script src="theme.js"></script>', '<script>'+(root/'theme.js').read_text(encoding='utf8')+'</script>')
s = s.replace('<script src="bodymap.js"></script>', '<script>'+(root/'bodymap.js').read_text(encoding='utf8')+'</script>')
s = s.replace('<script src="personalize.js"></script>', '<script>'+(root/'personalize.js').read_text(encoding='utf8')+'</script>')
s = s.replace('<link rel="stylesheet" href="personalize.css">', '<style>'+(root/'personalize.css').read_text(encoding='utf8')+'</style>')
s = s.replace('<script src="supabase.js"></script>\n', '').replace('<script src="config.js"></script>\n', '')   # the single-file preview is not connected to Supabase
s = s.replace('<script src="catalog.js"></script>', '<script>'+(root/'catalog.js').read_text(encoding='utf8')+'</script>')
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else root/'preview.single.html'); out.write_text(s, encoding='utf8'); print('wrote', out, len(s), 'bytes')
