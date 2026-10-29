import json,sys
for r in json.load(open(sys.argv[1],encoding='utf-8')):
    print(r['page'][4:] if r['page'].startswith('app/') else r['page'],r['i'],r['tag'],r['act'],r['text'][:25],'|',r['href'],'|',r['result'],r.get('errors') or '')
