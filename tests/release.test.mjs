import test from 'node:test';
import {execFileSync} from 'node:child_process';

test('release verification reads fresh public metadata after each store write',()=>{
  execFileSync('python3',['-c',`
import importlib.util, sys, types
spec=importlib.util.spec_from_file_location('release','tools/release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)
requests=[]
def get(url, **kwargs):
    requests.append((url, kwargs))
    return types.SimpleNamespace(raise_for_status=lambda:None,
        json=lambda:{'data':[{'latest_release':{'version':'0.4.0'}}]})
sys.modules['requests']=types.SimpleNamespace(get=get)
assert release.public_app()['latest_release']['version']=='0.4.0'
release.public_app()
assert len(requests)==2
assert all(url==release.API+'/api/v1/apps/id/'+release.APP_ID for url, _ in requests)
assert all(kwargs['params']['_release_check'] and kwargs['timeout']==30 for _, kwargs in requests)
assert requests[0][1]['params']!=requests[1][1]['params'], 'A cached response must not verify a later write'
for tag in ['v0.3.5','0.4.0','v99.0.0']:
    try: release.version_for(tag)
    except ValueError: pass
    else: raise AssertionError('Accepted a mismatched release tag')
`],{stdio:'pipe'});
});
