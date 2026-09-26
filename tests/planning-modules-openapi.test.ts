import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
const yaml=readFileSync(new URL('../contracts/CORE_COMMANDS.openapi.yaml',import.meta.url),'utf8');
function block(name:string,indent:number){
  const start=yaml.indexOf('# BEGIN P01 P02 PLANNING '+name),end=yaml.indexOf('# END P01 P02 PLANNING '+name);
  const text=yaml.slice(start,end),headers=[...text.matchAll(new RegExp(`^ {${indent}}([^\\n]+):\\n`,'gm'))];
  return Object.fromEntries(headers.map((header,i)=>[header[1],JSON.parse(text.slice(header.index!+header[0].length,headers[i+1]?.index??text.length).trim())]));
}
const paths=block('CONTRACTS',2),schemas=block('SCHEMAS',4),a='/projects/{projectId}/allocation-register',d='/projects/{projectId}/design-register',i='/projects/{projectId}/impact-register';
describe('Planning API contract',()=>{
  it('keeps both runtime mirrors identical and paths unique',()=>{
    expect(yaml).toBe(readFileSync(new URL('../packages/contracts/CORE_COMMANDS.openapi.yaml',import.meta.url),'utf8'));
    expect(yaml).toContain('  version: 1.8.0');
    const routes=[...yaml.matchAll(/^  (\/[^\n]+):$/gm)].map(m=>m[1]);expect(new Set(routes).size).toBe(routes.length);
    expect(Object.keys(paths)).toEqual(expect.arrayContaining([a,d,i,a+'/{id}/revisions',d+'/{id}/revisions',i+'/assessments']));
  });
  it('requires live scope, stable keys and reasons on every available command',()=>{
    for(const item of Object.values(paths) as any[]){const op=item.post;if(!op||op['x-eos-status']==='unavailable')continue;
      expect(op.description).toContain('Receipt replay never bypasses current authority');
      expect(op.parameters.find((p:any)=>p.name==='Idempotency-Key')).toMatchObject({required:true,schema:{minLength:1,maxLength:200}});
      const request=schemas[op.requestBody.content['application/json'].schema.$ref.split('/').at(-1)];
      expect(request.additionalProperties).toBe(false);expect(request.required).toContain('reason');expect(op.responses).toHaveProperty('409');
    }
  });
  it('preserves unknown quantities and location while pinning requirement versions',()=>{
    const request=schemas.AllocationPlanningCreate;expect(request.required).toEqual(['requirementId','expectedRequirementVersion','reason']);
    expect(request.properties.quantity.anyOf).toContainEqual({type:'null'});
    for(const field of ['zone','location','department','unit'])expect(request.properties[field].anyOf).toContainEqual({type:'null'});
    for(const field of ['status','completionPct','installationDate','isApproved'])expect(request.properties).not.toHaveProperty(field);
    expect(schemas.PlanningQuantityComparison.properties.applicability.const).toBe('unknown');
    expect(schemas.AllocationPlanningRevision.required).toContain('expectedVersion');
  });
  it('keeps design brief snapshots distinct from files and approval',()=>{
    expect(schemas.DesignBriefListResult.properties.data.maxItems).toBe(200);
    expect(schemas.AllocationPlanningListResult.properties.data.maxItems).toBe(500);
    expect(schemas.PlanningRevisionListResult.properties.data.maxItems).toBe(500);
    expect(schemas.DesignBriefCreate.properties.requirementRefs).toMatchObject({minItems:1,maxItems:100});
    expect(schemas.DesignBriefCreate.properties.allocationRefs.maxItems).toBe(100);
    expect(schemas.DesignBriefRecord.properties.fileStatus.const).toBe('missing');
    expect(schemas.DesignBriefRecord.properties.productionReleased.const).toBe(false);
    expect(schemas.DesignBriefRevision.required).toContain('expectedVersion');
    expect(paths[d].post.description).toContain('metadata snapshots, not uploaded file bytes');
  });
  it('binds advisory assessments to exact current impact and per-target role authority',()=>{
    expect(schemas.ImpactAssessmentCreate.required).toEqual(expect.arrayContaining(['expectedTargetVersion','impactFingerprint','assessment','proposedAction','reason']));
    expect(schemas.ImpactAssessmentCreate.properties).not.toHaveProperty('actorId');
    expect(schemas.PlanningImpactAssessment.properties.authorityEffect.const).toBe('advisory_only');
    expect(paths[i+'/assessments'].post.description).toContain('changed target or source returns 409');
    expect(paths[i].get.description).toContain('design targets also require projects.manage or design.version');
    expect(paths[i].get.description).toContain('At most 200 draft targets');
  });
  it('removes success responses from legacy design release',()=>{
    const op=paths['/projects/{projectId}/designs/{id}/release'].post;
    expect(op['x-eos-status']).toBe('unavailable');expect(op.responses).toHaveProperty('503');
    expect(Object.keys(op.responses).some(code=>code.startsWith('2'))).toBe(false);
  });
});
