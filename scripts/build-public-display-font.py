"""uv run --no-project --with 'fonttools[woff]==4.61.1' scripts/build-public-display-font.py

Derive public heading bytes from the committed face; keep the full face as the
CSS fallback for characters outside the subset. No network font is fetched.
"""
from io import BytesIO
from pathlib import Path
from fontTools import subset
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source = TTFont('public/fonts/space-grotesk.woff2', recalcTimestamp=False)
original = instantiateVariableFont(source, {'wght': 700}, inplace=False)
public = instantiateVariableFont(source, {'wght': 700}, inplace=False)
options = subset.Options()
options.recalc_timestamp = False
options.layout_features = ['*']
options.glyph_names = True
options.notdef_outline = True
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=subset.parse_unicodes('U+0000-024F,U+0300-036F,U+2000-206F,U+20A0-20CF,U+2190-21FF,U+2212,U+2215,U+FEFF,U+FFFD'))
subsetter.subset(public)
public.recalcTimestamp = False
public.flavor = 'woff2'
path = Path('public/fonts/space-grotesk-public-700.woff2')
public.save(path)
encoded = TTFont(path, recalcTimestamp=False)
# TrueType serialization rounds fractional instancing coordinates to font units.
# Compare against the complete, normally serialized 700-weight instance.
reference = BytesIO()
original.recalcTimestamp = False
original.save(reference)
original = TTFont(BytesIO(reference.getvalue()), recalcTimestamp=False)
assert encoded.getBestCmap().items() <= original.getBestCmap().items()
assert len(encoded.getBestCmap()) >= 250
for name in encoded.getGlyphOrder():
    before, after = RecordingPen(), RecordingPen()
    original.getGlyphSet()[name].draw(before)
    encoded.getGlyphSet()[name].draw(after)
    assert before.value == after.value, name
    assert original['hmtx'][name] == encoded['hmtx'][name], name
for table in ['hhea', 'OS/2']:
    for metric in ['ascent', 'descent', 'lineGap', 'sTypoAscender', 'sTypoDescender', 'sTypoLineGap']:
        if hasattr(original[table], metric):
            assert getattr(original[table], metric) == getattr(encoded[table], metric)
print(f'{path}: {path.stat().st_size} bytes; outlines match the serialized 700 instance, widths and line metrics unchanged.')
