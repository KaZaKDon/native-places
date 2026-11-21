export const SPECIES_KINDS = [
  { value:'fish', label:'Рыба' }, { value:'bird', label:'Птица' },
  { value:'mammal', label:'Млекопитающее' }, { value:'plant', label:'Растение' },
  { value:'other', label:'Другое' },
];
export const EVIDENCE_LEVELS = [
  {value:'official',label:'Официальные данные'},
  {value:'research',label:'Научная публикация'},
  {value:'verified_observation',label:'Проверенное наблюдение'},
];
export const EMPTY_SPECIES = {id:null, kind:'fish', slug:'',common_name:'',scientific_name:'',summary:'',body:''};
export const EMPTY_OCCURRENCE = {id:null,species_id:'',entry_id:'',segment_id:'',source_id:'',evidence_level:'official',notes:'',verified_at:''};
export const PHOTO_ORIGINS = [
  {value:'photo',label:'Фотография'},
  {value:'ai_generated',label:'Иллюстрация, созданная ИИ'},
];
export const EMPTY_PHOTO = {image:null, image_origin:'photo', ai_tool:'ChatGPT (OpenAI)', caption:'',alt_text:'',author:'',license_name:'',license_url:'',source_url:'',attribution:'',rights_confirmed:false};
export const EMPTY_SOURCE = {title:'',source_kind:'official',publisher:'',url:'',accessed_at:'',published_on:'',license_name:'',license_url:'',comment:''};
export function validateSpecies(item) {
  const errors=[];
  if (!SPECIES_KINDS.some(k=>k.value===item.kind)) errors.push('Выберите группу.');
  if ((item.common_name || '').trim().length<2) errors.push('Введите название вида.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug || '') || item.slug.length>160) errors.push('Slug: латиница, цифры и дефисы.');
  if ((item.summary || '').length>500 || (item.body || '').length>10000) errors.push('Текст слишком длинный.');
  return errors;
}
export function validateOccurrence(item) {
  const errors=[];
  if (!Number(item.entry_id)) errors.push('Укажите природный объект.');
  if (!Number(item.source_id)) errors.push('Укажите источник подтверждения вида.');
  if (!EVIDENCE_LEVELS.some(x=>x.value===item.evidence_level)) errors.push('Укажите уровень подтверждения.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.verified_at || '')) errors.push('Укажите дату проверки.');
  return errors;
}
export function validatePhoto(photo) {
  const errors=[];
  if (!photo.image) errors.push('Выберите изображение.');
  else {
    if (photo.image.size>3*1024*1024) errors.push('Файл больше 3 МБ.');
    if (!['image/jpeg','image/png','image/webp'].includes(photo.image.type)) errors.push('Нужен JPEG, PNG или WebP.');
  }
  if (!PHOTO_ORIGINS.some(x => x.value === (photo.image_origin || 'photo'))) errors.push('Укажите происхождение изображения.');
  if (photo.image_origin === 'ai_generated') {
    if (!(photo.ai_tool || '').trim() || (photo.ai_tool || '').length > 190) errors.push('Укажите инструмент ИИ-генерации (до 190 символов).');
  } else {
    if (!(photo.author || '').trim()) errors.push('Укажите автора.');
    if (!(photo.license_name || '').trim()) errors.push('Укажите лицензию или основание использования.');
  }
  if (!photo.rights_confirmed) errors.push('Подтвердите права на фото.');
  return errors;
}
