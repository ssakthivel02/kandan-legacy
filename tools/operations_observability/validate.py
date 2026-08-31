from __future__ import annotations
import argparse,glob,hashlib,json,subprocess
from pathlib import Path
def read_json(path:Path): return json.loads(path.read_text(encoding='utf-8'))
def json_value(payload,dotted):
    current=payload
    for part in dotted.split('.') if dotted else []: current=current[part]
    return current
def evaluate(root:Path,check:dict)->dict:
    if check['mode']=='advisory': return {'id':check['id'],'status':'ADVISORY','message':'human review required'}
    target=str(check.get('target',''));path=root/target;probe=check['probe'];exp=check.get('expectation') or {}
    try:
        if probe=='file_exists': ok=path.is_file()
        elif probe=='file_absent': ok=not path.exists()
        elif probe=='text_contains': ok=path.is_file() and str(exp['text']) in path.read_text(encoding='utf-8')
        elif probe=='text_not_contains': ok=path.is_file() and str(exp['text']) not in path.read_text(encoding='utf-8')
        elif probe=='json_equals': ok=json_value(read_json(path),str(exp['path']))==exp.get('value')
        elif probe=='glob_no_match': ok=not [p for p in glob.glob(str(root/target),recursive=True) if Path(p).is_file()]
        else: ok=False
    except (OSError,KeyError,ValueError,TypeError,json.JSONDecodeError): ok=False
    return {'id':check['id'],'status':'PASS' if ok else 'FAIL','target':target}
def git_blob_sha(path:Path)->str:
    content=path.read_bytes()
    return hashlib.sha1(f'blob {len(content)}\0'.encode()+content).hexdigest()
def validate_alignment(root:Path)->list[dict]:
    summary=read_json(root/'data/operations/summary.json')
    routes=read_json(root/'data/operations/route-health.json')
    pwa=read_json(root/'data/operations/pwa-health.json')
    attestation=read_json(root/'data/operations/deployment-attestation.json')
    catalog=read_json(root/'data/operations/check-catalog.json')
    policy=read_json(root/'policies/operations-observability.json')
    conformance=read_json(root/'data/deployment-conformance.json')
    deployment=summary['release'];baseline=summary['baselineRelease']
    repository_blobs=attestation.get('repositoryAlignmentBlobs',attestation['verifiedGitBlobs'])
    mismatches=[]
    for path,expected_sha in repository_blobs.items():
        candidate=root/path
        actual_sha=git_blob_sha(candidate) if candidate.is_file() else None
        if actual_sha!=expected_sha:
            mismatches.append({'path':path,'expected':expected_sha,'actual':actual_sha})
    checks=[
        ('alignment-summary-policy',deployment==policy['release'],'policies/operations-observability.json'),
        ('alignment-baseline-catalog',baseline==policy['baselineRelease']==catalog['release'],'data/operations/check-catalog.json'),
        ('alignment-route-release',routes['release']==deployment,'data/operations/route-health.json'),
        ('alignment-pwa-release',pwa['release']==deployment,'data/operations/pwa-health.json'),
        ('alignment-pwa-cache',str(pwa['cacheRelease'])==str(deployment),'data/operations/pwa-health.json'),
        ('alignment-attestation-release',attestation['release']==deployment,'data/operations/deployment-attestation.json'),
        ('alignment-conformance-release',conformance['release']==deployment,'data/deployment-conformance.json'),
        ('alignment-conformance-cache',str(conformance['expectedCacheRelease'])==str(deployment),'data/deployment-conformance.json'),
        ('alignment-service-worker',f"const RELEASE = '{deployment}';" in (root/'service-worker.js').read_text(encoding='utf-8'),'service-worker.js'),
        ('alignment-verified-blobs',not mismatches,'data/operations/deployment-attestation.json')
    ]
    results=[{'id':item,'status':'PASS' if ok else 'FAIL','target':target} for item,ok,target in checks]
    if mismatches:
        for result in results:
            if result['id']=='alignment-verified-blobs':
                result['mismatches']=mismatches
                break
    return results
def validate_repository(root:Path,mode:str='package')->dict:
    catalog=read_json(root/'data/operations/check-catalog.json');baseline=read_json(root/'data/production-baseline.json');manifest=read_json(root/baseline['manifest'])
    policy=read_json(root/'policies/deployment-attestation.json')
    results=[evaluate(root,c) for c in catalog['checks']]
    alignment=validate_alignment(root)
    failed=[r for r in [*results,*alignment] if r['status']=='FAIL']
    report={'release':read_json(root/'data/operations/summary.json')['release'],'baselineRelease':manifest['release'],'mode':mode,'status':'PASS' if not failed else 'FAIL','checkCount':len(results),'alignmentCheckCount':len(alignment),'automatedCount':catalog['automatedCount'],'advisoryCount':catalog['advisoryCount'],'failedCount':len(failed),'results':results,'alignmentResults':alignment}
    if mode=='final':
        parent=subprocess.check_output(['git','rev-parse','HEAD^'],cwd=root,text=True).strip();subject=subprocess.check_output(['git','log','-1','--pretty=%s'],cwd=root,text=True).strip()
        if policy.get('requireExactParentOnPush') and parent!=manifest['base_commit']: report['status']='FAIL'
        if policy.get('requireExactTitleOnPush') and subject!=manifest['required_commit_title']: report['status']='FAIL'
    return report
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--root',default='.');ap.add_argument('--mode',choices=['package','final'],default='package');ap.add_argument('--report');args=ap.parse_args();report=validate_repository(Path(args.root).resolve(),args.mode)
    if args.report:
        p=Path(args.report);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2)+'\n')
    print(f"Operations observability: {report['status']} ({report['failedCount']} failed, {report['advisoryCount']} advisory)");raise SystemExit(0 if report['status']=='PASS' else 1)
if __name__=='__main__':main()
