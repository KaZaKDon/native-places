import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSpecies,validateOccurrence,validatePhoto} from './speciesModel.js';
test('species draft requires valid title and slug, but not made-up sources',()=>{
  assert.deepEqual(validateSpecies({kind:'fish',common_name:'Окунь',slug:'okun',summary:'',body:''}),[]);
  assert.match(validateSpecies({kind:'fish',common_name:'',slug:'Плотва',summary:'',body:''}).join(' '),/название|Slug/);
});
test('occurrence cannot be saved without source and verification date',()=>{
  assert.ok(validateOccurrence({entry_id:'1',source_id:'',evidence_level:'official',verified_at:''}).length>0);
  assert.deepEqual(validateOccurrence({entry_id:'1',source_id:'3',evidence_level:'research',verified_at:'2026-11-16'}),[]);
});
test('photo requires allowed format and rights attestation',()=>{
  const photo={image:{size:10000,type:'image/jpeg'},author:'Автор',license_name:'Моё фото',rights_confirmed:true};
  assert.deepEqual(validatePhoto(photo),[]);
  assert.match(validatePhoto({...photo,rights_confirmed:false}).join(' '),/права/);
  assert.match(validatePhoto({...photo,image:{size:200,type:'image/svg+xml'}}).join(' '),/JPEG/);
});

test('AI-generated image needs generator and rights confirmation, not photo license',()=>{
  const ai={image:{size:12000,type:'image/png'},image_origin:'ai_generated',ai_tool:'ChatGPT (OpenAI)',author:'',license_name:'',rights_confirmed:true};
  assert.deepEqual(validatePhoto(ai), []);
  assert.match(validatePhoto({...ai,ai_tool:''}).join(' '),/инструмент ИИ/);
  assert.match(validatePhoto({...ai,rights_confirmed:false}).join(' '),/права/);
  assert.deepEqual(validatePhoto({...ai,image_origin:'photo'}).length>0,true);
  assert.match(validatePhoto({...ai,image_origin:'unknown'}).join(' '),/происхождение/);
});
