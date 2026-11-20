import mido
def load(path):
    m = mido.MidiFile(path)
    tracks = []
    for i, t in enumerate(m.tracks):
        abst = 0; on = {}; notes = []
        for msg in t:
            abst += msg.time
            if msg.is_meta: continue
            if msg.type == 'note_on' and msg.velocity > 0:
                on.setdefault((msg.channel, msg.note), []).append((abst, msg.velocity))
            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                k = (msg.channel, msg.note)
                if on.get(k):
                    s, v = on[k].pop(0)
                    notes.append(dict(s=s, d=abst - s, p=msg.note, v=v, ch=msg.channel))
        notes.sort(key=lambda n: (n['s'], n['p']))
        tracks.append(notes)
    return m, tracks
