const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const zlib=require('node:zlib');
const context={document:{addEventListener(){},querySelectorAll(){return []}},window:{},console};
vm.createContext(context);
const script=fs.readFileSync('docs/dashboard.js','utf8').split(';(async()=>')[0];
vm.runInContext(script,context);
context.csv=fs.readFileSync('docs/downloads/relationship-ledger.csv','utf8');
context.locations=JSON.parse(fs.readFileSync('docs/location-matches.json','utf8'));
context.evidence=JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/evidence-data.json.gz')));
vm.runInContext('rows=csvParse(csv);locationMatches=locations;evidenceData=evidence;applyResearchCorrections()',context);
const result=vm.runInContext(`JSON.stringify({
 count:rows.length,refuge:rows.filter(r=>r.Relationship_ID==='P2B-T-005'),
 mapped:mappedRelationships().filter(r=>r.Relationship_ID==='P2B-T-005').map(r=>({name:r.Sender_Project_Name,point:coord(r,'Sender'),units:r.Units_Transferred,label:unitLabel(r),state:r.Evidence_Status})),
 palm:rows.find(r=>r.Relationship_ID==='P2B-ONSITE-005'),
 aggregate:homeAllocations(),panel:refugeResearchPanel()
})`,context);
const r=JSON.parse(result);
assert.equal(r.count,34);assert.equal(r.refuge.length,1);assert.equal(r.refuge[0].Units_Transferred,'41');assert.equal(r.refuge[0].Evidence_Status,'Candidate');
assert.deepEqual(r.mapped.map(x=>x.name),['Apollo','Flora + Fauna','Rowyn']);
for(const item of r.mapped){assert.equal(item.units,'');assert.equal(item.state,'Candidate');assert(item.point&&item.point[0]>32&&item.point[0]<34&&item.point[1]>-118&&item.point[1]<-116);assert(item.label.includes('Individual allocation unknown'))}
assert.equal(r.palm.Program,'Complete Communities Housing Solutions');assert.equal(r.palm.Evidence_Status,'Verified');assert(r.palm.Evidence_Summary.includes('CPRA-0307'));
assert(!r.aggregate.includes('origins are unresolved'));assert(r.aggregate.includes('counted once'));assert(r.panel.includes('CPRA-0335'));
const evidence=JSON.parse(zlib.gunzipSync(fs.readFileSync('docs/evidence-data.json.gz')));
assert(evidence.cpra_evidence.some(x=>x.Evidence_Row_ID==='CPRA-0307'));
assert(evidence.cpra_evidence.some(x=>x.Evidence_Row_ID==='CPRA-0335'));
console.log('PASS: 34 records; 41 counted once; three geocoded Candidate origins; unknown individual allocations; on-site Palm source; historical contrary evidence retained.');
