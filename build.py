import re,os,glob
B=os.path.dirname(os.path.abspath(__file__))
head=open(f'{B}/src/partials/head.html').read(); foot=open(f'{B}/src/partials/foot.html').read()
for p in glob.glob(f'{B}/src/pages/*.html'):
    s=open(p).read(); m=re.match(r'<!--(.*?)-->\n',s,re.S); meta={}
    for line in m.group(1).strip().splitlines():
        k,v=line.split(':',1); meta[k.strip()]=v.strip()
    body=s[m.end():]; name=os.path.basename(p)
    h=head; f=foot
    for k in ['title','desc','page','extra_head','extra_js']:
        h=h.replace('{{'+k+'}}',meta.get(k,'')); f=f.replace('{{'+k+'}}',meta.get(k,''))
    h=h.replace(f'class="nav-link" href="{name}"',f'class="nav-link" href="{name}" aria-current="page"')
    open(f'{B}/{name}','w').write(h+body+f)
    print('built',name)
