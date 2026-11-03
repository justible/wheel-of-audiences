export function csvCell(value){let text=String(value??'');if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function rosterCSV(records){
  const labels=new Map();for(const r of records)for(const c of r.components||[])labels.set(c.key,c.label);
  const keys=[...labels.keys()];
  return '\ufeff'+[['Date (UTC)','Student',...keys.map(k=>labels.get(k))],...records.map(r=>[new Date(r.time).toISOString(),r.name,...keys.map(k=>r.components?.find(c=>c.key===k)?.value||'')])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
